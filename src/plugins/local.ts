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
import * as Path from 'path';
import * as vscode from 'vscode';


interface DeployTargetLocal extends deploy_contracts.DeployTarget {
    dir?: string;
    empty?: boolean;
}

function getFullDirPathFromTarget(target: DeployTargetLocal): string {
    let dir = target.dir;
    if (!dir) {
        dir = '';
    }
    dir = '' + dir;

    if (!dir) {
        dir = './';
    }

    if (!Path.isAbsolute(dir)) {
        dir = Path.join(vscode.workspace.rootPath);
    }

    return dir;
}

class LocalPlugin implements deploy_contracts.DeployPlugin {
    protected _CONTEXT: deploy_contracts.DeployContext;

    constructor(ctx: deploy_contracts.DeployContext) {
        this._CONTEXT = ctx;
    }

    public get context(): deploy_contracts.DeployContext {
        return this._CONTEXT;
    }

    public deployFile(file: string, target: DeployTargetLocal): void {
        this.context.outputChannel().show();

        this.context.outputChannel().appendLine('');
        this.deployFileInner(file, target);
    }

    protected deployFileInner(file: string, target: DeployTargetLocal, callback?: (err: any) => void): void {
        let me = this;

        let dir = getFullDirPathFromTarget(target);

        let relativeFilePath = deploy_helpers.toRelativePath(file);
        if (false === relativeFilePath) {
            vscode.window.showWarningMessage(`Could not get relative path for '${file}'!`);
            return;
        }

        let targetFile = Path.join(dir, <string>relativeFilePath);
        let targetDirectory = Path.dirname(targetFile);

        let completed = (err?: any) => {
            if (err) {
                me.context.writeLine(`[FAILED: ${deploy_helpers.toStringSafe(err)}]`);
            }

            if (callback) {
                callback(err);
            }
        };

        let deployFile = () => {
            me.context.write(`Deploying '${relativeFilePath}' to LOCAL directory '${targetDirectory}'... `);

            try {
                FSExtra.copy(file, targetFile, {
                    clobber: true,
                    preserveTimestamps: true,
                }, function (err) {
                    if (err) {
                        completed(err);
                        return;
                    }

                    me.context.writeLine("[OK]");

                    completed();
                });
            }
            catch (e) {
                completed(e);
            }
        };

        if (!FS.existsSync(targetDirectory)) {
            let quickPicks: deploy_contracts.DeployActionQuickPick[] = [
                {
                    label: 'Yes',
                    description: 'Creates the target directory',
                    action: () => {
                        FSExtra.mkdirsSync(targetDirectory);

                        deployFile();
                    }
                },
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
                            item = quickPicks[1];  // no => default
                        }

                        try {
                            if (item.action) {
                                item.action(me);
                            }
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(`Could not create target directory '${targetDirectory}': ` + e);

                            completed(e);
                        }
                    });
        }
        else {
            deployFile();
        }
    }

    public deployWorkspace(files: string[], target: DeployTargetLocal) {
        let me = this;

        let targetDir = deploy_helpers.toStringSafe(target.dir);
        if (!Path.isAbsolute(targetDir)) {
            targetDir = Path.join(vscode.workspace.rootPath, targetDir);
        }

        let failed = 0;
        let succeeded = 0;
        let filesTodo = files.map(x => x);
        let completed = () => {
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
        };

        let deployNextFile: () => void;
        deployNextFile = () => {
            if (filesTodo.length < 1) {
                completed();
                return;
            }

            let f = filesTodo.pop();

            let logError = (err) => {
                me.context.log(`[ERROR] Could not deploy file '${f}': ${err}`);
            };
            
            try {
                me.deployFileInner(f, target, (err) => {
                    if (err) {
                        ++failed;
                        logError(err);
                    }
                    else {
                        ++succeeded;
                    }

                    deployNextFile();
                });
            }
            catch (e) {
                ++failed;
                logError(e);
            }
        };

        let emptyDir = () => {
            let doEmptyDir = !!target.empty;
            if (doEmptyDir) {
                me.context.outputChannel().append(`Empty LOCAL target directory '${targetDir}'... `);

                FSExtra.emptyDir(targetDir, (err) => {
                    if (err) {
                        me.context.outputChannel().appendLine(`[FAILED: ${err}]`);

                        vscode.window.showErrorMessage(`Could not empty LOCAL target directory '${targetDir}': ${err}`);
                        return;
                    }

                    me.context.outputChannel().appendLine(`[OK]`);
                    deployNextFile();
                });
            }
            else {
                deployNextFile();
            }
        };

        emptyDir();
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
    return new LocalPlugin(ctx);
}
