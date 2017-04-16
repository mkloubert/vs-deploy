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


interface DeployTargetMap extends deploy_contracts.DeployTarget {
    from: MapItem | MapItem[];
    targets: string | string[];
    usePlaceholders?: boolean;
}

type MapItem = string | Object;


async function flattenMapItem(items: MapItem | MapItem[], context: deploy_contracts.DeployContext,
                              level = 0, maxDepth = 64): Promise<Object[]> {
    let objs: Object[] = [];

    if (level < maxDepth) {
        let itemList = deploy_helpers.asArray(items).filter(mi => {
            if ('object' !== typeof mi) {
                return !deploy_helpers.isEmptyString(mi);
            }    

            return !deploy_helpers.isNullOrUndefined(mi);
        });

        for (let i = 0; i < itemList.length; i++) {
            let mi = itemList[i];

            if ('object' !== typeof mi) {
                let src = deploy_helpers.toStringSafe(mi);

                let json = JSON.parse( (await deploy_helpers.loadFrom(src)).data.toString('utf8') );
                if (json) {
                    let subObjs = await flattenMapItem(json, context,
                                                       level + 1, maxDepth);

                    objs = objs.concat(subObjs);
                }
            }
            else {
                objs.push(mi);
            }
        }
    }

    return objs;
}

function parsePlaceHolders(v: any, usePlaceHolders: boolean, context: deploy_contracts.DeployContext,
                           level = 0, maxDepth = 64): any {
    v = deploy_helpers.cloneObject(v);

    if (level < maxDepth) {
        usePlaceHolders = deploy_helpers.toBooleanSafe(usePlaceHolders);
        if (usePlaceHolders) {
            if ('object' === typeof v) {
                for (let p in v) {
                    v[p] = parsePlaceHolders(v[p], usePlaceHolders, context,
                                             level + 1, maxDepth);
                }
            }
            else {
                if ('string' === typeof v) {
                    v = context.replaceWithValues(v);
                }
            }
        }
    }
    else {
        context.log(`[WARNING] map.parsePlaceHolders(): Maximum reached: ${level}`);
    }

    return v;
}

class MapPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetMap, opts?: deploy_contracts.DeployWorkspaceOptions): void {
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

            let wf = Workflows.create();

            // collect values
            wf.next(async (ctx) => {
                // targets.from
                return deploy_helpers.asArray(await flattenMapItem(target.from, me.context))
                                     .map(v => parsePlaceHolders(v, target.usePlaceholders, me.context));
            });

            wf.next(async (ctx) => {
                let values: Object[] = ctx.previousValue;

                let wfTargets = Workflows.create();

                // collect targets
                me.getTargetsWithPlugins(target, targets).forEach(tp => {
                    // deploy to current target
                    // for each value
                    values.forEach(async v => {
                        let clonedTarget: Object = deploy_helpers.cloneObject(tp.target);

                        // fill properties with value
                        wfTargets.next(() => {
                            for (let p in v) {
                                clonedTarget[p] = deploy_helpers.cloneObject(v[p]);
                            }
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
            description: i18.t('plugins.map.description'),
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
    return new MapPlugin(ctx);
}
