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
import * as vscode from 'vscode';


interface DeployTargetSFTP extends deploy_contracts.DeployTarget {
    dir?: string;
    hashAlgorithm?: string;
    hashes?: string | string[];
    host?: string;
    privateKey?: string;
    privateKeyPassphrase?: string;
    port?: number;
    user?: string;
    password?: string;
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


class SFtpPlugin extends deploy_objects.DeployPluginWithContextBase<any> {
    protected createContext(target: DeployTargetSFTP): Promise<deploy_objects.DeployPluginContextWrapper<any>> {
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

            try {
                let privateKey: Buffer;
                let openConnection = () => {
                    if (!privateKey) {
                        if (!user) {
                            user = 'anonymous';
                        }
                    }

                    let conn = new SFTP();
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
                        }
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
        }));
    }

    protected deployFileWithContext(conn: any,
                                    file: string, target: DeployTargetSFTP, opts?: deploy_contracts.DeployFileOptions) {
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
            completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
            return;
        }

        let dir = getDirFromTarget(target);

        let targetFile = toSFTPPath(Path.join(dir, relativeFilePath));
        let targetDirectory = toSFTPPath(Path.dirname(targetFile));

        // upload the file
        let uploadFile = () => {
            if (me.context.isCancelling()) {
                completed(null, true);  // cancellation requested
                return;
            }

            try {
                conn.put(file, targetFile).then(() => {
                    completed();
                }).catch((err) => {
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

        // first check if target directory exists
        conn.list(targetDirectory).then(() => {
            uploadFile();
        }).catch((err) => {
            // no => try to create

            if (me.context.isCancelling()) {
                completed(null, true);  // cancellation requested
                return;
            }

            conn.mkdir(targetDirectory, true).then(() => {
                uploadFile();
            }).catch((err) => {
                completed(err);
            });
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
