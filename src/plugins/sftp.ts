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
import * as i18 from '../i18';
import * as Path from 'path';
const SFTP = require('ssh2-sftp-client');
import * as TMP from 'tmp';
import * as vscode from 'vscode';


interface DeployTargetSFTP extends deploy_contracts.TransformableDeployTarget {
    dir?: string;
    hashAlgorithm?: string;
    hashes?: string | string[];
    host?: string;
    privateKey?: string;
    privateKeyPassphrase?: string;
    port?: number;
    user?: string;
    password?: string;
    unix?: {
        convertCRLF?: boolean;
        encoding?: string;
    };
    agent?: string;
    agentForward?: boolean;
    tryKeyboard?: boolean;
    readyTimeout?: number;
}

interface SFTPContext {
    cachedRemoteDirectories: any;
    connection: any;
    dataTransformer: deploy_contracts.DataTransformer;
    dataTransformerOptions?: any;
    hasCancelled: boolean;
}

function getDirFromTarget(target: DeployTargetSFTP): string {
    let dir = deploy_helpers.toStringSafe(target.dir);
    if (!dir) {
        dir = '/';
    }

    return dir;
}

function toHashSafe(hash: string): string {
    return deploy_helpers.toStringSafe(hash)
                         .toLowerCase()
                         .trim();
}

function toSFTPPath(path: string): string {
    return deploy_helpers.replaceAllStrings(path, Path.sep, '/');
}


class SFtpPlugin extends deploy_objects.DeployPluginWithContextBase<SFTPContext> {
    public get canPull(): boolean {
        return true;
    }

    protected createContext(target: DeployTargetSFTP,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<SFTPContext>> {
        let me = this;

        return new Promise<deploy_objects.DeployPluginContextWrapper<SFTPContext>>((resolve, reject) => {
            let completed = (err: any, conn?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    let dataTransformer: deploy_contracts.DataTransformer;
                    if (target.unix) {
                        if (deploy_helpers.toBooleanSafe(target.unix.convertCRLF)) {
                            let textEnc = deploy_helpers.toStringSafe(target.unix.encoding).toLowerCase().trim();
                            if (!textEnc) {
                                textEnc = 'ascii';
                            }

                            dataTransformer = (ctx) => {
                                return new Promise<Buffer>((resolve2, reject2) => {
                                    let completed2 = deploy_helpers.createSimplePromiseCompletedAction<Buffer>(resolve2, reject2);

                                    deploy_helpers.isBinaryContent(ctx.data).then((isBinary) => {
                                        try {
                                            let newData = ctx.data;
                                            if (!isBinary) {
                                                // seems to be a text file
                                                newData = new Buffer(deploy_helpers.replaceAllStrings(newData.toString(textEnc),
                                                                                                      "\r\n", "\n"),
                                                                     textEnc);
                                            }

                                            completed2(null, newData);
                                        }
                                        catch (e) {
                                            completed2(e);
                                        }
                                    }).catch((err2) => {
                                        completed2(err2);
                                    });
                                });
                            };
                        }
                    }

                    let ctx: SFTPContext = {
                        cachedRemoteDirectories: {},
                        connection: conn,
                        dataTransformer: deploy_helpers.toDataTransformerSafe(dataTransformer),
                        hasCancelled: false,
                    };

                    me.onCancelling(() => ctx.hasCancelled = true, opts);

                    let wrapper: deploy_objects.DeployPluginContextWrapper<SFTPContext> = {
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

            let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
            let port = parseInt(deploy_helpers.toStringSafe(target.port, '22').trim());

            let user = deploy_helpers.toStringSafe(target.user);
            if (!user) {
                user = undefined;
            }
            let pwd = deploy_helpers.toStringSafe(target.password);
            if (!pwd) {
                pwd = undefined;
            }

            let hashes = deploy_helpers.asArray(target.hashes)
                                       .map(x => toHashSafe(x))
                                       .filter(x => x);
            hashes = hashes = deploy_helpers.distinctArray(hashes);

            let hashAlgo = deploy_helpers.toStringSafe(target.hashAlgorithm)
                                         .toLowerCase()
                                         .trim();
            if (!hashAlgo) {
                hashAlgo = 'md5';
            }

            let privateKeyFile = deploy_helpers.toStringSafe(target.privateKey);
            if (privateKeyFile) {
                if (!Path.isAbsolute(privateKeyFile)) {
                    privateKeyFile = Path.join(vscode.workspace.rootPath, privateKeyFile);
                }
            }

            let agent = deploy_helpers.toStringSafe(target.agent);
            if ('' === agent.trim()) {
                agent = undefined;
            }

            let agentForward = deploy_helpers.toBooleanSafe(target.agentForward);

            let tryKeyboard = deploy_helpers.toBooleanSafe(target.tryKeyboard);

            let readyTimeout = parseInt(deploy_helpers.toStringSafe(target.readyTimeout).trim());
            if (isNaN(readyTimeout)) {
                readyTimeout = undefined;
            }

            try {
                let privateKey: Buffer;
                let openConnection = () => {
                    if (!privateKey) {
                        if (!user) {
                            user = 'anonymous';
                        }
                    }

                    let conn = new SFTP();

                    if (tryKeyboard) {
                        conn.client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
                            try {
                                finish([ pwd ]);
                            }
                            catch (e) {
                                console.log(i18.t('errors.withCategory',
                                                  'plugins.sftp.keyboard-interactive', e));
                            }
                        });
                    }

                    conn.connect({
                        host: host,
                        port: port,
                        username: user,
                        password: pwd,

                        privateKey: privateKey,
                        passphrase: target.privateKeyPassphrase,

                        hostHash: hashAlgo,
                        hostVerifier: (hashedKey, cb) => {
                            hashedKey = toHashSafe(hashedKey);
                            if (hashes.length < 1) {
                                return true;
                            }

                            return hashes.indexOf(hashedKey) > -1;
                        },

                        agent: agent,
                        agentForward: agentForward,

                        tryKeyboard: tryKeyboard,

                        readyTimeout: readyTimeout,
                    }).then(() => {
                        completed(null, conn);
                    }).catch((err) => {
                        completed(err);
                    });
                };

                if (privateKeyFile) {
                    // try read private key

                    FS.readFile(privateKeyFile, (err, data) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        privateKey = data;
                        openConnection();
                    });
                }
                else {
                    openConnection();
                }
            }
            catch (e) {
                completed(e);  // global error
            }
        });
    }

    protected deployFileWithContext(ctx: SFTPContext,
                                    file: string, target: DeployTargetSFTP, opts?: deploy_contracts.DeployFileOptions) {
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

            let targetFile = toSFTPPath(Path.join(dir, relativeFilePath));
            let targetDirectory = toSFTPPath(Path.dirname(targetFile));

            // upload the file
            let uploadFile = (initDirCache?: boolean) => {
                if (ctx.hasCancelled) {
                    completed();  // cancellation requested
                    return;
                }

                if (deploy_helpers.toBooleanSafe(initDirCache)) {
                    ctx.cachedRemoteDirectories[targetDirectory] = [];
                }

                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    ctx.dataTransformer({
                        context: {
                            sftp: ctx,
                        },
                        data: data,
                        emitGlobal: function() {
                            return me.context
                                     .emitGlobal
                                     .apply(me.context, arguments);
                        },
                        globals: me.context.globals(),
                        mode: deploy_contracts.DataTransformerMode.Transform,
                        options: ctx.dataTransformerOptions,
                        replaceWithValues: (val) => {
                            return me.context.replaceWithValues(val);
                        },
                        require: function(id) {
                            return me.context.require(id);
                        },
                    }).then((data) => {
                        try {
                            let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform);
                            tCtx.data = data;

                            let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                            Promise.resolve(tResult).then((dataToUpload) => {
                                ctx.connection.put(dataToUpload, targetFile).then(() => {
                                    completed();
                                }).catch((e) => {
                                    completed(e);
                                });
                            }).catch((e) => {
                                completed(e);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }).catch((err) => {
                        completed(err);
                    });
                });
            };

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: targetDirectory,
                    file: file,
                    target: target,
                });
            }

            if (deploy_helpers.isNullOrUndefined(ctx.cachedRemoteDirectories[targetDirectory])) {
                // first check if target directory exists
                ctx.connection.list(targetDirectory).then(() => {
                    uploadFile(true);
                }).catch((err) => {
                    // no => try to create

                    if (ctx.hasCancelled) {
                        completed();  // cancellation requested
                        return;
                    }

                    ctx.connection.mkdir(targetDirectory, true).then(() => {
                        uploadFile(true);
                    }).catch((err) => {
                        completed(err);
                    });
                });
            }
            else {
                uploadFile();
            }
        }
    }

    protected downloadFileWithContext(ctx: SFTPContext,
                                      file: string, target: DeployTargetSFTP, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
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

                let targetFile = toSFTPPath(Path.join(dir, relativeFilePath));
                let targetDirectory = toSFTPPath(Path.dirname(targetFile));

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: targetDirectory,
                        file: file,
                        target: target,
                    });
                }

                ctx.connection.get(targetFile).then((data: NodeJS.ReadableStream) => {
                    if (data) {
                        try {
                            data.once('error', (err) => {;
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
                                            FS.readFile(tmpFile, (err, transformedData) => {
                                                if (err) {
                                                    deleteTempFile(err);
                                                }
                                                else {
                                                    try {
                                                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Restore);
                                                        tCtx.data = transformedData;

                                                        let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Restore)(tCtx);
                                                        Promise.resolve(tResult).then((untransformedJsonData) => {
                                                            deleteTempFile(null, untransformedJsonData);
                                                        }).catch((e) => {
                                                            deleteTempFile(e);
                                                        });
                                                    }
                                                    catch (e) {
                                                        deleteTempFile(e);
                                                    }
                                                }
                                            });
                                        }
                                    };

                                    try {
                                        // copy to temp file
                                        let pipe = data.pipe(FS.createWriteStream(tmpFile));

                                        pipe.once('error', (err) => {;
                                            downloadCompleted(err);
                                        });

                                        data.once('end', () => {
                                            downloadCompleted(null);
                                        });
                                    }
                                    catch (e) {
                                        downloadCompleted(e);
                                    }
                                }
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                    else {
                        completed(new Error("No data!"));  //TODO
                    }
                }).catch((err) => {
                    completed(err);
                });
            }
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.sftp.description'),
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
    return new SFtpPlugin(ctx);
}
