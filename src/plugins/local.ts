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
        let me = this;

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

        let relativeFilePath = deploy_helpers.toRelativePath(file);
        if (false === relativeFilePath) {
            vscode.window.showWarningMessage(`Could not get relative path for '${file}'!`);
            return;
        }

        let targetFile = Path.join(dir, <string>relativeFilePath);
        let targetDirectory = Path.dirname(targetFile);

        let deployFile = () => {
            console.log('Deploying...');

            let showError = (err) => {
                vscode.window.showErrorMessage(`Could not deploy file '${file}' to local directory '${targetDirectory}': ` + err);
            };

            try {
                FSExtra.copy(file, targetFile, {
                    clobber: true,
                    preserveTimestamps: true,
                }, function (err) {
                    if (err) {
                        showError(err);
                        return;
                    }

                    vscode.window.showInformationMessage(`File '${relativeFilePath}' has been successfully deployed to local directory '${targetDirectory}'.`);
                });
            }
            catch (e) {
                showError(e);
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
                        }
                    });
        }
        else {
            deployFile();
        }
    }
}

/**
 * Creates a new Plugin.
 * 
 * @returns {deploy_contracts.DeployPlugin} The new instance.
 */
export function createPlugin(ctx: deploy_contracts.DeployContext): deploy_contracts.DeployPlugin {
    return new LocalPlugin(ctx);
}
