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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as deploy_targets from './targets';
import * as Enumerable from 'node-enumerable';
import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
import * as i18 from './i18';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * Pulls all files from a target.
 */
export function pullAllFilesFromTarget() {
    let me: vs_deploy.Deployer = this;

    let targets = me.getTargets()
                    .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
    if (targets.length < 1) {
        vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
        return;
    }

    let completed = (err: any) => {
        if (err) {
            //TODO: better error messages

            vscode.window
                  .showErrorMessage(i18.t('errors.withCategory',
                                          'pull.pullAllFilesFromTarget', err));
        }
    };

    let pullDirectory: (target: deploy_contracts.DeployTarget, dir?: string, pullCompleted?: (err: any) => void) => void;
    pullDirectory = function(target: deploy_contracts.DeployTarget, dir?: string, pullCompleted?: (err: any) => void) {
        try {
            if (arguments.length < 2) {
                dir = '/';
            }

            let workspaceDir = vscode.workspace.rootPath;

            let targetWithPlugins = deploy_targets.getPluginsForTarget(target, me.plugins)[0];

            let wf = Workflows.create();

            targetWithPlugins.plugins.forEach(pi => {
                wf.next((ctx) => {
                    return new Promise<any>((resolve, reject) => {
                        try {
                            Promise.resolve( pi.list(dir, targetWithPlugins.target) ).then((items) => {
                                try {
                                    items =  deploy_helpers.asArray(items)
                                                           .filter(x => x);

                                    let wfItems = Workflows.create();

                                    wfItems.next((ctxItems) => {
                                        ctxItems.value = [];
                                    });

                                    items.filter(i => i.type === deploy_contracts.FileSystemType.Directory &&
                                                      '/.vscode' !== dir + deploy_helpers.normalizeString(i.name)).forEach(i => {
                                        let d = <deploy_contracts.DirectoryInfo>i;

                                        wfItems.next((ctxItems) => {
                                            return new Promise<any>((res, rej) => {
                                                try {
                                                    let subDir = dir + '/' + d.name;

                                                    pullDirectory(target, subDir, (err) => {
                                                        if (err) {
                                                            rej(err);
                                                        }
                                                        else {
                                                            res();
                                                        }
                                                    });
                                                }
                                                catch (e) {
                                                    rej(e);
                                                }
                                            });
                                        });
                                    });

                                    items.filter(i => i.type === deploy_contracts.FileSystemType.File).forEach(i => {
                                        let f = <deploy_contracts.FileSystemInfo>i;

                                        wfItems.next((ctxItems) => {
                                            let filesToPull: string[] = ctxItems.value;

                                            return new Promise<any>((res, rej) => {
                                                try {
                                                    let localFilePath = Path.join(workspaceDir, dir, f.name);

                                                    let relativeTargetFilePath = deploy_helpers.toRelativeTargetPathWithValues(localFilePath, target, me.getValues(), workspaceDir);
                                                    if (false === relativeTargetFilePath) {
                                                        rej(new Error(i18.t('relativePaths.couldNotResolve', localFilePath)));
                                                        return;
                                                    }

                                                    let localDir = Path.dirname(localFilePath);

                                                    let addFileForPull = () => {
                                                        try {
                                                            filesToPull.push(localFilePath);

                                                            res();
                                                        }
                                                        catch (e) {
                                                            rej(e);
                                                        }
                                                    };

                                                    let createFileIfNeeded = () => {
                                                        FS.exists(localFilePath, (exists) => {
                                                            if (exists) {
                                                                addFileForPull();
                                                            }
                                                            else {
                                                                FS.writeFile(localFilePath, Buffer.alloc(0), (err) => {
                                                                    if (err) {
                                                                        rej(err);
                                                                    }
                                                                    else {
                                                                        addFileForPull();
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    };

                                                    let checkIfDirectory = () => {
                                                        FS.lstat(localDir, (err, stats) => {
                                                            if (err) {
                                                                rej(err);
                                                            }
                                                            else {
                                                                if (stats.isDirectory()) {
                                                                    createFileIfNeeded();
                                                                }
                                                                else {
                                                                    rej(new Error(i18.t('isNo.directory', localDir)));
                                                                }
                                                            }
                                                        });
                                                    };

                                                    FS.exists(localDir, (exists) => {
                                                        if (exists) {
                                                            checkIfDirectory()
                                                        }
                                                        else {
                                                            FSExtra.mkdirs(localDir, (err) => {
                                                                if (err) {
                                                                    rej(err);
                                                                }
                                                                else {
                                                                    createFileIfNeeded();
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                                catch (e) {
                                                    rej(e);
                                                }
                                            });
                                        });
                                    });

                                    wfItems.next((ctxItems) => {
                                        let filesToPull: string[] = ctxItems.value;

                                        return new Promise<any>((res, rej) => {
                                            if (filesToPull.length > 0) {
                                                try {
                                                    pi.pullWorkspace(filesToPull, targetWithPlugins.target, {
                                                        onCompleted: (sender, e) => {
                                                            if (e.error) {
                                                                rej(e.error);
                                                            }
                                                            else {
                                                                res();
                                                            }
                                                        }
                                                    });
                                                }
                                                catch (e) {
                                                    rej(e);
                                                }
                                            }
                                            else {
                                                res();
                                            }
                                        });
                                    });

                                    wfItems.start().then(() => {
                                        resolve();
                                    }).catch((err) => {
                                        reject(err);
                                    });
                                }
                                catch (e) {
                                    reject(e);
                                }
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            });

            let completedAction = pullCompleted || completed;

            wf.start().then(() => {
                completedAction(null);
            }).catch((err) => {
                completedAction(err);
            });
        }
        catch (e) {
            completed(e);
        }
    };

    let targetQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                      me.getValues()));

    if (targetQuickPicks.length > 1 || deploy_helpers.toBooleanSafe(me.config.alwaysShowTargetList)) {
        vscode.window.showQuickPick(targetQuickPicks, {
            placeHolder: i18.t('targets.select'),
        }).then((item) => {
            if (item) {
                pullDirectory(item.target);
            }
            else {
                completed(null);  // aborted
            }
        }, (err) => {
            completed(err);
        });
    }
    else {
        // auto select
        pullDirectory(targetQuickPicks[0].target);
    }
}
