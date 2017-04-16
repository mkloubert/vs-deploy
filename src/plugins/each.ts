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


interface DeployTargetEach extends deploy_contracts.DeployTarget {
    from: string | any[];
    'to': string | string[];
    targets: string | string[];
    usePlaceholders?: boolean;
}


class EachPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetEach, opts?: deploy_contracts.DeployWorkspaceOptions): void {
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
            // target.targets
            let targets = deploy_helpers.asArray(target.targets)
                                        .map(t => deploy_helpers.normalizeString(t))
                                        .filter(t => '' !== t);
            targets = deploy_helpers.distinctArray(targets);

            // target.to
            let properties = deploy_helpers.asArray(target['to'])
                                           .map(p => deploy_helpers.toStringSafe(p).trim())
                                           .filter(p => '' !== p);
            properties = deploy_helpers.distinctArray(properties);

            let wf = Workflows.create();

            wf.next(async () => {
                // target.from
                let values: any[];
                if (!deploy_helpers.isNullOrUndefined(target.from)) {
                    if (Array.isArray(target.from)) {
                        values = deploy_helpers.asArray(target.from);
                    }
                    else {
                        // from file

                        let src = deploy_helpers.toStringSafe(target.from);

                        let loadedValues = JSON.parse( (await deploy_helpers.loadFrom(src)).data.toString('utf8') );
                        if (!deploy_helpers.isNullOrUndefined(loadedValues)) {
                            values = deploy_helpers.asArray(loadedValues);
                        }
                    }
                }

                values = deploy_helpers.asArray(deploy_helpers.isNullOrUndefined(values) ? [] : values);

                return values.map(v => {
                    if (deploy_helpers.toBooleanSafe(target.usePlaceholders)) {
                        if ('string' === typeof v) {
                            v = me.context.replaceWithValues(v);
                        }
                    }
                    
                    return v;
                });
            });

            wf.next(async (ctx) => {
                let values = ctx.previousValue;

                let wfTargets = Workflows.create();

                // collect targets
                me.getTargetsWithPlugins(target, targets).forEach(tp => {
                    // deploy to current target
                    // for each value
                    values.forEach(v => {
                        let clonedTarget: Object = deploy_helpers.cloneObject(tp.target);

                        // fill properties with value
                        wfTargets.next(() => {
                            properties.forEach(p => {
                                clonedTarget[p] = deploy_helpers.cloneObject(v);
                            });
                        });

                        // deploy
                        wfTargets.next(async () => {
                            let wfPlugins = Workflows.create();

                            // to each underlying plugin
                            tp.plugins.forEach(p => {
                                wfPlugins.next(() => {
                                    return new Promise<any>((resolve, reject) => {
                                        try {
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
                                                }
                                            });
                                        }
                                        catch (e) {
                                            reject(e);
                                        }
                                    });
                                });
                            });

                            wfPlugins.on('action.after',
                                         afterWorkflowsAction);

                            await wfPlugins.start();
                        });
                    });
                });

                wfTargets.on('action.after',
                             afterWorkflowsAction);

                await wfTargets.start();
            });

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
