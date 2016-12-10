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
const FSExtra = require('fs-extra');
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

class LocalPlugin extends deploy_objects.DeployPluginBase {
    constructor(ctx: deploy_contracts.DeployContext) {
        super(ctx);
    }

    public deployFile(file: string, target: DeployTargetLocal, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

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
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        let deployFile = () => {
            try {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        file: file,
                        target: target,
                    });
                }

                FSExtra.copy(file, targetFile, {
                    clobber: true,
                    preserveTimestamps: true,
                }, function (err) {
                    if (err) {
                        completed(err);
                        return;
                    }

                    completed();
                });
            }
            catch (e) {
                completed(e);
            }
        };

        FS.exists(targetDirectory, (exists) => {
            if (exists) {
                deployFile();
            }
            else {
                FSExtra.mkdirs(targetDirectory, function (err) {
                    if (err) {
                        completed(err);
                        return;
                    }

                    deployFile();
                });
            }
        });
    }

    public deployWorkspace(files: string[], target: DeployTargetLocal, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;

        let targetDir = deploy_helpers.toStringSafe(target.dir);
        if (!Path.isAbsolute(targetDir)) {
            targetDir = Path.join(vscode.workspace.rootPath, targetDir);
        }

        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };

        let startDeploying = () => {
            super.deployWorkspace(files, target, opts);    
        };

        let doEmptyDir = !!target.empty;
        if (doEmptyDir) {
            me.context.outputChannel().append(`Empty LOCAL target directory '${targetDir}'... `);

            FSExtra.emptyDir(targetDir, (err) => {
                if (err) {
                    me.context.outputChannel().append(`[FAILED: ${deploy_helpers.toStringSafe(err)}]`);

                    completed(err);
                    return;
                }

                me.context.outputChannel().appendLine('[OK]');
                startDeploying();
            });
        }
        else {
            startDeploying();
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
    return new LocalPlugin(ctx);
}
