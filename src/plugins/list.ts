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
import * as deploy_plugins from '../plugins';
import * as FS from 'fs';
import * as i18 from '../i18';
import * as Path from 'path';
import * as Workflows from 'node-workflows';
import * as vscode from 'vscode';


interface DeployTargetList extends deploy_contracts.DeployTarget {
    entries: DeployTargetListEntry | DeployTargetListEntry[];
    placeholder?: string;
    targets: string | string[];
}

interface DeployTargetListEntry {
    description?: string;
    detail?: string;
    name?: string;
    settings?: { [key: string]: any };
}

interface DeployTargetListEntryQuickPickItem extends vscode.QuickPickItem {
    entry: DeployTargetListEntry;
}


class ListPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetList, opts?: deploy_contracts.DeployWorkspaceOptions): void {
        if (!opts) {
            opts = {};
        }

        let hasCancelled = false;
        let completedInvoked = false;
        let completed = (err: any) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        let me = this;

        me.onCancelling(() => hasCancelled = true, opts);

        let afterWorkflowsAction = (err: any, ctx: Workflows.WorkflowActionContext) => {
            if (ctx && hasCancelled) {
                ctx.finish();
            }
        };

        try {
            let allEntries = deploy_helpers.asArray(target.entries)
                                           .filter(x => x);

            let targets = deploy_helpers.asArray(target.targets)
                                        .map(t => deploy_helpers.normalizeString(t))
                                        .filter(t => '' !== t);
            targets = deploy_helpers.distinctArray(targets);

            let wf = Workflows.create();

            // let user select one entry
            wf.next((wfCtx) => {
                return new Promise<any>((resolve, reject) => {
                    if (allEntries.length > 0) {
                        let quickPicks: DeployTargetListEntryQuickPickItem[] = allEntries.map((e, i) => {
                            let label = deploy_helpers.toStringSafe(e.name).trim();
                            if ('' === label) {
                                label = `Entry #${i}`;
                            }

                            let desc = deploy_helpers.toStringSafe(e.description).trim();
                            
                            let detail = me.context.replaceWithValues(e.detail);
                            if (deploy_helpers.isEmptyString(detail)) {
                                detail = undefined;
                            }

                            return {
                                description: desc,
                                detail: detail,
                                entry: e,
                                label: label,
                            };
                        });

                        let placeholder = deploy_helpers.toStringSafe(target.placeholder).trim();
                        if ('' === placeholder) {
                            placeholder = i18.t('plugins.list.selectEntry');
                        }

                        vscode.window.showQuickPick(quickPicks, {
                            placeHolder: placeholder,
                        }).then((qp) => {
                            if (qp) {
                                wfCtx.value = qp.entry;
                            }

                            resolve();
                        }, (err) => {
                            reject(err);
                        });
                    }
                    else {
                        resolve();
                    }
                });
            });

            // cancel if user has NOT selected
            // any entry
            wf.next((wfCtx) => {
                if (!wfCtx.value) {
                    hasCancelled = true;
                    afterWorkflowsAction(null, wfCtx);
                }
            });

            // create an action for each target
            me.getTargetsWithPlugins(target, targets).forEach(tp => {
                wf.next(async (wfCtx) => {
                    let entry: DeployTargetListEntry = wfCtx.value;
                    let wfTarget = Workflows.create();

                    // deploy for each plugin
                    tp.plugins.forEach(p => {
                        let clonedTarget: Object = deploy_helpers.cloneObject(tp.target);

                        // apply settings
                        let settings = deploy_helpers.cloneObject(entry.settings);
                        for (let prop in settings) {
                            clonedTarget[prop] = settings[prop];
                        }

                        wfTarget.next((wfTargetCtx) => {
                            return new Promise<any>((resolve, reject) => {
                                p.deployWorkspace(files, clonedTarget, {
                                    baseDirectory: opts.baseDirectory,
                                    context: deploy_plugins.createPluginContext(opts.context || me.context),

                                    onBeforeDeployFile: (sender, e) => {
                                        if (opts.onBeforeDeployFile) {
                                            opts.onBeforeDeployFile(me, {
                                                destination: e.destination,
                                                file: e.file,
                                                target: clonedTarget,
                                            });
                                        }
                                    },
                                    
                                    onCompleted: (sender, e) => {
                                        if (e.error) {
                                            reject(e.error);
                                        }
                                        else {
                                            resolve();
                                        }
                                    },

                                    onFileCompleted: (sender, e) => {
                                        if (opts.onFileCompleted) {
                                            opts.onFileCompleted(me, {
                                                canceled: e.canceled,
                                                error: e.error,
                                                file: e.file,
                                                target: clonedTarget,
                                            });
                                        }
                                    },
                                });
                            });
                        });
                    });

                    wfTarget.on('action.after',
                                afterWorkflowsAction);

                    await wfTarget.start();
                });
            });

            wf.on('action.after',
                  afterWorkflowsAction);

            // start the workflow
            wf.start().then(() => {
                completed(null);
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.list.description'),
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
    return new ListPlugin(ctx);
}
