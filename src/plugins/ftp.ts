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
const FTP = require('ftp');
import * as Path from 'path';
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

class FtpPlugin extends deploy_objects.DeployPluginWithContextBase<any> {
    protected createContext(target: DeployTargetFTP): Promise<deploy_objects.DeployPluginContextWrapper<any>> {
        return new Promise<deploy_objects.DeployPluginContextWrapper<any>>(((resolve, reject) => {
            let completed = (err: any, conn?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    let wrapper: deploy_objects.DeployPluginContextWrapper<any> = {
                        context: conn,
                        destroy: function(): Promise<any> {
                            return new Promise<any>((resolve2, reject2) => {
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
        }));
    }

    protected deployFileWithContext(conn: any,
                                    file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;
        
        let completed = (err?: any, canceled?: boolean) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: canceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        if (me.context.isCancelling()) {
            completed(null, true);  // cancellation requested
            return;
        }

        let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
        if (false === relativeFilePath) {
            completed(new Error(`Could not get relative path for '${file}'!`));
            return;
        }

        let dir = getDirFromTarget(target);

        let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
        let targetDirectory = toFTPPath(Path.dirname(targetFile));

        let uploadFile = () => {
            try {
                conn.put(file, targetFile, (err) => {
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

        conn.cwd(targetDirectory, (err) => {
            if (err) {
                // directory not found
                // try to create...

                conn.mkdir(targetDirectory, true, (err) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    uploadFile();
                });
            }
            else {
                uploadFile();
            }
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: 'Deploys to a FTP server',
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
