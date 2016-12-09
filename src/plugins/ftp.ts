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
import * as FS from 'fs';
let FSExtra = require('fs-extra');
let FTP = require('ftp');
import * as Path from 'path';
import * as vscode from 'vscode';


interface DeployTargetFTP extends deploy_contracts.DeployTarget {
    dir?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
}

function getDirFromTarget(target: DeployTargetFTP): string {
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

function openFtpConnection(target: DeployTargetFTP, callback: (err: any, conn?: any) => void) {
    let host = deploy_helpers.toStringSafe(target.host, 'localhost');
    let port = parseInt(deploy_helpers.toStringSafe(target.port, '21').trim());

    let user = deploy_helpers.toStringSafe(target.user, 'anonymous');
    let pwd = deploy_helpers.toStringSafe(target.password);

    let completed = (err, conn?) => {
        callback(err, conn);
    };

    try {
        let conn = new FTP();
        conn.on('error', function(err) {
            if (err) {
                completed(err);
            }
        });
        conn.on('ready', function() {
            completed(null, conn);
        });
        conn.connect({
            host: host, port: port,
            user: user, password: pwd,
        });
    }
    catch (e) {
        completed(e);
    }
}

function toFTPPath(path: string): string {
    return deploy_helpers.replaceAllStrings(path, Path.sep, '/');
}

class FtpPlugin implements deploy_contracts.DeployPlugin {
    protected _CONTEXT: deploy_contracts.DeployContext;

    constructor(ctx: deploy_contracts.DeployContext) {
        this._CONTEXT = ctx;
    }

    public get context(): deploy_contracts.DeployContext {
        return this._CONTEXT;
    }

    public deployFile(file: string, target: DeployTargetFTP): void {
        this.deployFileInner(file, target);
    }

    protected deployFileInner(file: string, target: DeployTargetFTP): void {
        let me = this;

        let relativeFilePath = deploy_helpers.toRelativePath(file);
        if (false === relativeFilePath) {
            vscode.window.showWarningMessage(`Could not get relative path for '${file}'!`);
            return;
        }

        let dir = getDirFromTarget(target);

        let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
        let targetDirectory = toFTPPath(Path.dirname(targetFile));

        let deployFile = () => {
            console.log('Deploying...');
            me.context.log(`Deploying ${file}`);

            let completed = (err?, conn?) => {
                if (err) {
                    vscode.window.showErrorMessage(`Could not deploy file '${file}' to local directory '${targetDirectory}': ` + err);
                }
                
                if (conn) {
                    try {
                        conn.end();
                    }
                    catch (e) { /* ignore */ }
                }
            };

            try {
                openFtpConnection(target, (err, conn) => {
                    if (err) {
                        completed(err, conn);
                        return;
                    }

                    let uploadFile = (conn) => {
                        try {
                            conn.put(file, targetFile, (err) => {
                                if (!err) {
                                    vscode.window.showInformationMessage(`File '${relativeFilePath}' has been successfully deployed to FTP directory '${targetDirectory}'.`);
                                }

                                completed(err, conn);
                            });
                        }
                        catch (e) {
                            completed(e, conn);
                        }
                    };

                    conn.cwd(dir, (err) => {
                        if (err) {
                            let quickPicks: deploy_contracts.DeployActionQuickPick[] = [
                                // "Yes"
                                {
                                    label: 'Yes',
                                    description: 'Creates the directory on FTP server',
                                    action: () => {
                                        conn.mkdir(targetDirectory, true, (err) => {
                                            if (err) {
                                                completed(err);
                                                return;
                                            }

                                            uploadFile(conn);
                                        });
                                    }
                                },

                                // "No"
                                {
                                    label: 'No',
                                    description: 'Does NOT create the target directory and cancels the operation.',
                                    action: () => { 
                                        vscode.window.showInformationMessage("Deploy operation cancelled.");
                                    }
                                }
                            ];

                            vscode.window.showQuickPick(quickPicks, {
                                placeHolder: 'Create target directory?',
                            }).then((item) => {
                                        if (!item) {
                                            item = quickPicks[1];  // Default: "No"
                                        }

                                        try {
                                            if (item.action) {
                                                item.action(me);
                                            }
                                        }
                                        catch (e) {
                                            vscode.window.showErrorMessage(`Could not create directory '${targetDirectory}' on FTP server: ` + e);
                                        }
                                    });
                        }
                        else {
                            uploadFile(conn);
                        }
                    });
                });
            }
            catch (e) {
                completed(e);
            }
        };

        deployFile();
    }

    public deployWorkspace(files: string[], target: DeployTargetFTP) {
        let me = this;

        let failed = 0;
        let succeeded = 0;
        files.forEach(x => {
            try {
                me.deployFileInner(x, target);
                ++succeeded;
            }
            catch (e) {
                ++failed;
                me.context.log(`[ERROR] Could not deploy file '${x}': ` + e);
            }
        });

        if (failed < 1) {
            vscode.window.showInformationMessage('All files were deployed successfully.');
        }
        else {
            if (failed >= files.length) {
                vscode.window.showErrorMessage('No file could be deployed!');
            }
            else {
                vscode.window.showWarningMessage(`${failed} file(s) could not be deployed!`);
            }
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
    return new FtpPlugin(ctx);
}
