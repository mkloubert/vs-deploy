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
import * as i18 from '../i18';
import * as Workflows from 'node-workflows';


interface DeployTargetEach extends deploy_contracts.DeployTarget {
    from: any[];
    'in': string | string[];
    targets: string | string[];
    usePlaceholders?: boolean;
}

class EachPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetEach, opts?: deploy_contracts.DeployWorkspaceOptions): void {
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

        // target.targets
        let targets = deploy_helpers.asArray(target.targets)
                                    .map(t => deploy_helpers.normalizeString(t))
                                    .filter(t => '' !== t);
        targets = deploy_helpers.distinctArray(targets);

        // target.in
        let properties = deploy_helpers.asArray(target['in'])
                                       .map(p => deploy_helpers.toStringSafe(p).trim())
                                       .filter(p => '' !== p);
        properties = deploy_helpers.distinctArray(properties);

        // target.from
        let values: any[];
        if (deploy_helpers.isNullOrUndefined(target.from)) {
            values = [];
        }
        else {
            values = deploy_helpers.asArray<any>(target.from);
        }

        values = values.map(v => {
            if (deploy_helpers.toBooleanSafe(target.usePlaceholders)) {
                v = me.context.replaceWithValues(v);
            }
            
            return v;
        });

        let myName = deploy_helpers.normalizeString(target.name);

        let wfTargets = Workflows.create();

        me.getTargetsWithPlugins(target, targets).forEach(tp => {
            values.forEach(v => {
                let clonedTarget: Object = deploy_helpers.cloneObject(tp.target);

                // fill properties with value
                wfTargets.next((ctx) => {
                    properties.forEach(p => {
                        clonedTarget[p] = deploy_helpers.cloneObject(v);
                    });
                });

                wfTargets.next((ctx) => {
                    return new Promise<any>((resolve, reject) => {
                        let wfPlugins = Workflows.create();

                        tp.plugins.forEach(p => {
                            wfPlugins.next((ctx2) => {
                                return new Promise<any>((resolve2, reject2) => {
                                    try {
                                        p.deployWorkspace(files, clonedTarget, {
                                            baseDirectory: opts.baseDirectory,
                                            context: opts.context,

                                            onBeforeDeployFile: (sender, e) => {
                                                //TODO

                                                if (opts.onBeforeDeployFile) {

                                                }
                                            },
                                            
                                            onCompleted: (sender, e) => {
                                                if (e.error) {
                                                    reject2(e.error);
                                                }
                                                else {
                                                    resolve2();
                                                }
                                            },

                                            onFileCompleted: (sender, e) => {
                                                //TODO

                                                if (opts.onFileCompleted) {
                                                    
                                                }
                                            }
                                        });
                                    }
                                    catch (e) {
                                        reject2(e);
                                    }
                                });
                            });
                        });

                        wfPlugins.on('action.after',
                                     afterWorkflowsAction);

                        wfPlugins.start().then(() => {
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                });
            });
        });

        wfTargets.on('action.after',
                     afterWorkflowsAction);

        wfTargets.start().then(() => {
            completed(null);
        }).catch((err) => {
            completed(err);
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.each.description'),
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
    return new EachPlugin(ctx);
}
