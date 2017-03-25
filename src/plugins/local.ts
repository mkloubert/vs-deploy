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
import * as i18 from '../i18';
import * as Path from 'path';
import * as vscode from 'vscode';


interface DeployTargetLocal extends deploy_contracts.DeployTarget {
    dir?: string;
    empty?: boolean;
}

class LocalPlugin extends deploy_objects.DeployPluginBase {
    public get canPull(): boolean {
        return true;
    }

    public deployFile(file: string, target: DeployTargetLocal, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let dir = getFullDirPathFromTarget(target, me);

        let hasCancelled = false;
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        me.onCancelling(() => hasCancelled = true, opts);

        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            let relativeTargetFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativeTargetFilePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let targetFile = Path.join(dir, <string>relativeTargetFilePath);
            let targetDirectory = Path.dirname(targetFile);

            let deployFile = () => {
                try {
                    if (opts.onBeforeDeploy) {
                        opts.onBeforeDeploy(me, {
                            destination: targetDirectory,
                            file: file,
                            target: target,
                        });
                    }

                    // copy file...
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

            // check if target directory exists
            FS.exists(targetDirectory, (exists) => {
                if (exists) {
                    deployFile();
                }
                else {
                    // no, try to create...
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
    }

    public deployWorkspace(files: string[], target: DeployTargetLocal, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;

        let targetDir = deploy_helpers.toStringSafe(target.dir);
        targetDir = me.context.replaceWithValues(targetDir);
        if (!Path.isAbsolute(targetDir)) {
            targetDir = Path.join(vscode.workspace.rootPath, targetDir);
        }

        let hasCancelled = false;
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        me.onCancelling(() => hasCancelled = true, opts);

        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            let startDeploying = () => {
                super.deployWorkspace(files, target, opts);    
            };

            let doEmptyDir = deploy_helpers.toBooleanSafe(target.empty, false);
            if (doEmptyDir) {
                me.context.outputChannel().append(i18.t('plugins.local.emptyTargetDirectory', targetDir));

                FSExtra.emptyDir(targetDir, (err) => {
                    if (err) {
                        me.context.outputChannel().append(i18.t('failed', err));

                        completed(err);
                        return;
                    }

                    me.context.outputChannel().appendLine(i18.t('ok'));
                    startDeploying();
                });
            }
            else {
                startDeploying();
            }
        }
    }
    
    public downloadFile(file: string, target: DeployTargetLocal, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        if (!opts) {
            opts = {};
        }

        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let dir = getFullDirPathFromTarget(target, me);

            let hasCancelled = false;
            let completed = (err: any, data?: Buffer) => {
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: hasCancelled,
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

            me.onCancelling(() => hasCancelled = true, opts);

            if (hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                let relativeTargetFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativeTargetFilePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                let targetFile = Path.join(dir, <string>relativeTargetFilePath);
                let targetDirectory = Path.dirname(targetFile);

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: targetDirectory,
                        file: file,
                        target: target,
                    });
                }

                FS.readFile(targetFile, (err, data) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, data);
                    }
                });
            }
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.local.description'),
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
    return new LocalPlugin(ctx);
}

function getFullDirPathFromTarget(target: DeployTargetLocal,
                                  plugin: LocalPlugin): string {
    let dir = deploy_helpers.toStringSafe(target.dir);
    dir = plugin.context.replaceWithValues(dir);
    if ('' === dir) {
        dir = './';
    }

    if (!Path.isAbsolute(dir)) {
        dir = Path.join(vscode.workspace.rootPath, dir);
    }

    return dir;
}
