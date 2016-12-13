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
import * as Path from 'path';
const SFTP = require('ssh2-sftp-client');
import * as vscode from 'vscode';


interface DeployTargetSFTP extends deploy_contracts.DeployTarget {
    dir?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
}

function getDirFromTarget(target: DeployTargetSFTP): string {
    let dir = target.dir;
    if (!dir) {
        dir = '';
    }
    dir = '' + dir;

    if (!dir) {
        dir = '';
    }

    return dir;
}

function openSftpConnection(target: DeployTargetSFTP, callback: (err: any, conn?: any) => void) {
    let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
    let port = parseInt(deploy_helpers.toStringSafe(target.port, '22').trim());

    let user = deploy_helpers.toStringSafe(target.user, 'anonymous');
    let pwd = deploy_helpers.toStringSafe(target.password);

    let completed = (err, conn?) => {
        callback(err, conn);
    };

    try {
        let conn = new SFTP();
        conn.connect({
            host: host,
            port: port,
            username: user,
            password: pwd,
        }).then(() => {
            completed(null, conn);
        }).catch((err) => {
            completed(err);
        });
    }
    catch (e) {
        completed(e);
    }
}

function toFTPPath(path: string): string {
    return deploy_helpers.replaceAllStrings(path, Path.sep, '/');
}

class SFtpPlugin extends deploy_objects.DeployPluginBase {
    public deployFile(file: string, target: DeployTargetSFTP, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let relativeFilePath = deploy_helpers.toRelativePath(file);
        if (false === relativeFilePath) {
            vscode.window.showWarningMessage(`Could not get relative path for '${file}'!`);
            return;
        }

        let dir = getDirFromTarget(target);

        let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
        let targetDirectory = toFTPPath(Path.dirname(targetFile));

        let completed = (err?, conn?) => {
            if (conn) {
                try {
                    conn.end();
                }
                catch (e) {
                    me.context.log(`[ERROR] FtpPlugin.deployFile(1): ${deploy_helpers.toStringSafe(e)}`);
                }
            }

            if (opts.onCompleted) {
                opts.onCompleted(this, {
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        try {
            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    file: file,
                    target: target,
                });
            }

            openSftpConnection(target, (err, conn) => {
                if (err) {
                    completed(err, conn);  // could not connect
                    return;
                }

                let uploadFile = () => {
                    try {
                        conn.put(file, targetFile).then(() => {
                            completed(null, conn);
                        }).catch((err) => {
                            completed(err, conn);
                        });
                    }
                    catch (e) {
                        completed(e, conn);
                    }
                };

                conn.list(targetDirectory).then(() => {
                    uploadFile();
                }).catch((err) => {
                    conn.mkdir(targetDirectory, true).then(() => {
                        uploadFile();
                    }).catch((err) => {
                        completed(err);
                    });
                });
            });
        }
        catch (e) {
            completed(e);
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: 'Deploys to a SFTP server',
        }
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
