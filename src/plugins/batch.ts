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
import * as vscode from 'vscode';


interface BatchContext {
    targets: TargetWithPlugins[];
}

interface DeployTargetBatch extends deploy_contracts.DeployTarget {
    targets: string | string[];
}

interface TargetWithPlugins {
    plugins: deploy_contracts.DeployPlugin[];
    target: deploy_contracts.DeployTarget;
}

class BatchPlugin extends deploy_objects.MultiFileDeployPluginBase {
    protected createContext(target: DeployTargetBatch): BatchContext {
        return {
            targets: this.getTargetsWithPlugins(target),
        };
    }

    public deployWorkspace(files: string[], target: DeployTargetBatch, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;

        let ctx = this.createContext(target);
        
        let targetsTodo = ctx.targets.map(x => x);
        let completed = (err?: any, canceled?: boolean) => {
            targetsTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: canceled,
                    target: target,
                });
            }
        };

        try {
            let deployNextTarget: () => void;
            deployNextTarget = () => {
                if (targetsTodo.length < 1) {
                    completed();
                    return;
                }

                if (me.context.isCancelling()) {
                    completed(null, true);
                    return;
                }

                let currentTarget = targetsTodo.shift();
                let pluginsTodo = currentTarget.plugins.map(x => x);

                let targetCompleted = (err?: any) => {
                    pluginsTodo = [];

                    deployNextTarget();
                };

                let deployNextPlugin: () => void;
                deployNextPlugin = () => {
                    if (pluginsTodo.length < 1) {
                        targetCompleted();
                        return;
                    }

                    if (me.context.isCancelling()) {
                        completed(null, true);
                        return;
                    }

                    let pluginCompleted = (err?: any, canceled?: boolean) => {
                        deployNextPlugin();
                    };

                    let currentPlugin = pluginsTodo.shift();
                    try {
                        currentPlugin.deployWorkspace(files, currentTarget.target, {
                            onBeforeDeployFile: (sender, e) => {
                                if (opts.onBeforeDeployFile) {
                                    let destination = deploy_helpers.toStringSafe(currentTarget.target.name).trim();
                                    if (!destination) {
                                        destination = deploy_helpers.toStringSafe(currentPlugin.__type).trim();
                                    }
                                    if (!destination) {
                                        deploy_helpers.toStringSafe(currentPlugin.__file).trim();
                                    }

                                    let originalDestination = deploy_helpers.toStringSafe(e.destination);
                                    if (destination) {
                                        destination = `[${destination}] ${originalDestination}`;
                                    }
                                    else {
                                        destination = originalDestination;
                                    }

                                    opts.onBeforeDeployFile(me, {
                                        destination: destination,
                                        file: e.file,
                                        target: e.target,
                                    });
                                }
                            },
                            onCompleted: (sender, e) => {
                                pluginCompleted(e.error, e.canceled);
                            },
                            onFileCompleted: (sender, e) => {
                                if (opts.onFileCompleted) {
                                    opts.onFileCompleted(me, {
                                        canceled: e.canceled,
                                        file: e.file,
                                        target: e.target,
                                    });
                                }
                            }
                        });
                    }
                    catch (e) {
                        targetCompleted(e);
                    }
                };

                deployNextPlugin();
            };

            deployNextTarget();
        }
        catch (e) {
            completed(e);
        }
    }

    protected getTargetsWithPlugins(target: DeployTargetBatch): TargetWithPlugins[] {
        let batchTargets: TargetWithPlugins[] = [];

        let normalizeString = (val: any): string => {
            return deploy_helpers.toStringSafe(val)
                                 .toLowerCase().trim();
        };

        let batchTargetName = normalizeString(target.name);

        let targetNames = deploy_helpers.asArray(target.targets)
                                        .map(x => normalizeString(x))
                                        .filter(x => x);

        if (targetNames.indexOf(batchTargetName) > -1) {
            // no recurrence!
            vscode.window.showWarningMessage(`[vs-deploy :: batch] Cannot use target '${batchTargetName}' (recurrence)!`);
        }

        // prevent recurrence
        targetNames = targetNames.filter(x => x != batchTargetName);

        let knownTargets = this.context.targets();
        let knownPlugins = this.context.plugins();

        // first find targets by name
        let foundTargets: deploy_contracts.DeployTarget[] = [];
        targetNames.forEach(tn => {
            let found = false;
            knownTargets.forEach(t => {
                if (normalizeString(t.name) == tn) {
                    found = true;
                    foundTargets.push(t);
                }
            });

            if (!found) {
                // we have an unknown target here
                vscode.window.showWarningMessage(`[vs-deploy :: batch] Could not find target '${tn}'!`);
            }
        });

        // now collect plugins for each
        // found target
        foundTargets.forEach(t => {
            let newBatchTarget: TargetWithPlugins = {
                plugins: [],
                target: t,
            };

            knownPlugins.forEach(pi => {
                let pluginType = normalizeString(pi.__type);

                if (!pluginType || (pluginType == normalizeString(t.type))) {
                    newBatchTarget.plugins
                                  .push(pi);
                }
            });

            batchTargets.push(newBatchTarget);
        });

        return batchTargets;
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
    return new BatchPlugin(ctx);
}
