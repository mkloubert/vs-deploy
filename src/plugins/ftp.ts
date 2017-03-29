/// <reference types="node" />

// The MIT License (MIT)
// 
// vs-deploy (https://github.com/mkloubert/vs-deploy)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as FS from 'fs';
const FTP = require('ftp');
import * as i18 from '../i18';
import * as Path from 'path';
import * as TMP from 'tmp';
import * as vscode from 'vscode';


interface DeployTargetFTP extends deploy_contracts.DeployTarget {
    dir?: string;
    host?: string;
    port?: number;
    rejectUnauthorized?: boolean;
    user?: string;
    password?: string;
    secure?: boolean;
}

interface FTPContext {
    cachedRemoteDirectories: any;
    connection: any;
    hasCancelled: boolean;
}

function getDirFromTarget(target: DeployTargetFTP): string {
    let dir = deploy_helpers.toStringSafe(target.dir);
    if (!dir) {
        dir = '/';
    }

    return dir;
}

function toFTPPath(path: string): string {
    return deploy_helpers.replaceAllStrings(path, Path.sep, '/');
}

class FtpPlugin extends deploy_objects.DeployPluginWithContextBase<FTPContext> {
    public get canPull(): boolean {
        return true;
    }

    protected createContext(target: DeployTargetFTP,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<FTPContext>> {
        let me = this;

        return new Promise<deploy_objects.DeployPluginContextWrapper<FTPContext>>((resolve, reject) => {
            let completed = (err: any, conn?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    let ctx: FTPContext = {
                        cachedRemoteDirectories: {},
                        connection: conn,
                        hasCancelled: false,
                    };

                    me.onCancelling(() => ctx.hasCancelled = true, opts);

                    let wrapper: deploy_objects.DeployPluginContextWrapper<any> = {
                        context: ctx,
                        destroy: function(): Promise<any> {
                            return new Promise<any>((resolve2, reject2) => {
                                delete ctx.cachedRemoteDirectories;

                                try {
                                    conn.end();

                                    resolve2(conn);
                                }
                                catch (e) {
                                    reject2(e);
                                }
                            });
                        },
                    };

                    resolve(wrapper);
                }
            };

            try {
                let isSecure = deploy_helpers.toBooleanSafe(target.secure, false);

                let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
                let port = parseInt(deploy_helpers.toStringSafe(target.port, isSecure ? '990' : '21').trim());

                let user = deploy_helpers.toStringSafe(target.user, 'anonymous');
                let pwd = deploy_helpers.toStringSafe(target.password);

                let rejectUnauthorized = target.rejectUnauthorized;
                if (deploy_helpers.isNullOrUndefined(rejectUnauthorized)) {
                    rejectUnauthorized = true;
                }
                rejectUnauthorized = !!rejectUnauthorized;

                try {
                    let conn = new FTP();
                    conn.on('error', function(err) {
                        if (err) {
                            completed(err);
                        }
                        else {
                            completed(null, conn);
                        }
                    });
                    conn.on('ready', function() {
                        completed(null, conn);
                    });
                    conn.connect({
                        host: host, port: port,
                        user: user, password: pwd,
                        secure: isSecure,
                        secureOptions: {
                            rejectUnauthorized: rejectUnauthorized,
                        },
                    });
                }
                catch (e) {
                    completed(e);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    protected deployFileWithContext(ctx: FTPContext,
                                    file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;
        
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: ctx.hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        if (ctx.hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativeFilePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let dir = getDirFromTarget(target);

            let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
            let targetDirectory = toFTPPath(Path.dirname(targetFile));

            let uploadFile = (initDirCache?: boolean) => {
                if (ctx.hasCancelled) {
                    completed();  // cancellation requested
                    return;
                }

                if (deploy_helpers.toBooleanSafe(initDirCache)) {
                    ctx.cachedRemoteDirectories[targetDirectory] = [];
                }

                try {
                    ctx.connection.put(file, targetFile, (err) => {
                        completed(err);
                    });
                }
                catch (e) {
                    completed(e);
                }
            };

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: targetDirectory,
                    file: file,
                    target: target,
                });
            }

            if (deploy_helpers.isNullOrUndefined(ctx.cachedRemoteDirectories[targetDirectory])) {
                ctx.connection.cwd(targetDirectory, (err) => {
                    if (ctx.hasCancelled) {
                        completed();  // cancellation requested
                        return;
                    }

                    if (err) {
                        // directory not found
                        // try to create...

                        ctx.connection.mkdir(targetDirectory, true, (err) => {
                            if (err) {
                                completed(err);
                                return;
                            }

                            uploadFile(true);
                        });
                    }
                    else {
                        uploadFile(true);
                    }
                });
            }
            else {
                uploadFile();
            }
        }
    }

    protected downloadFileWithContext(ctx: FTPContext,
                                      file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        let me = this;
        
        return new Promise<Buffer>((resolve, reject) => {
            let completedInvoked = false;
            let completed = (err: any, data?: Buffer) => {
                if (completedInvoked) {
                    return;
                }

                completedInvoked = true;
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: ctx.hasCancelled,
                        error: err,
                        file: file,
                        target: target,
                    });
                }

                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            };

            if (ctx.hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativeFilePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                let dir = getDirFromTarget(target);

                let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
                let targetDirectory = toFTPPath(Path.dirname(targetFile));

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: targetDirectory,
                        file: file,
                        target: target,
                    });
                }

                try {
                    ctx.connection.get(targetFile, (err, stream) => {
                        try {
                            if (err) {
                                completed(err);
                            }
                            else {
                                if (stream) {
                                    stream.once('error', (err) => {;
                                        completed(err);
                                    });

                                    TMP.tmpName({
                                        keep: true,
                                    }, (err, tmpFile) => {
                                        if (err) {
                                            completed(err);
                                        }
                                        else {
                                            let deleteTempFile = (err: any, data?: Buffer) => {
                                                // delete temp file ...
                                                FS.exists(tmpFile, (exists) => {
                                                    if (exists) {
                                                        // ... if exist

                                                        FS.unlink(tmpFile, () => {
                                                            completed(err, data);
                                                        });
                                                    }
                                                    else {
                                                        completed(err, data);
                                                    }
                                                });
                                            };

                                            let downloadCompleted = (err: any) => {
                                                if (err) {
                                                    deleteTempFile(err);
                                                }
                                                else {
                                                    FS.readFile(tmpFile, (err, data) => {
                                                        if (err) {
                                                            deleteTempFile(err);
                                                        }
                                                        else {
                                                            deleteTempFile(null, data);
                                                        }
                                                    });
                                                }
                                            };

                                            try {
                                                // copy to temp file
                                                stream.pipe(FS.createWriteStream(tmpFile));

                                                stream.once('end', () => {
                                                    downloadCompleted(null);
                                                });

                                                stream.once('close', () => {
                                                    ctx.connection.end();
                                                });
                                            }
                                            catch (e) {
                                                downloadCompleted(e);
                                            }
                                        }
                                    });
                                }
                                else {
                                    completed(new Error("No data!"));  //TODO
                                }
                            }
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }
    
    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.ftp.description'),
        };
    }
}

/**
 * Creates a new Plugin.
 * 
 * @param {deploy_contracts.DeployContext} ctx The deploy context.
 * 
 * @returns {deploy_contracts.DeployPlugin} The new instance.
 */
export function createPlugin(ctx: deploy_contracts.DeployContext): deploy_contracts.DeployPlugin {
    return new FtpPlugin(ctx);
}
