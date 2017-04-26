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
import * as deploy_diff from './diff';
import * as deploy_helpers from './helpers';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


export function getTargetsByFile(file: string): deploy_contracts.DeployTarget[] {
    let me: vs_deploy.Deployer = this;

    let targets: deploy_contracts.DeployTarget[] = [];

    if (!Path.isAbsolute(file)) {
        file = Path.join(vscode.workspace.rootPath, file);
    }
    file = Path.resolve(file);
    file = deploy_helpers.replaceAllStrings(file, Path.sep, '/');

    

    return targets;
}

export function onWillSaveTextDocument(e: vscode.TextDocumentWillSaveEvent) {
    let me: vs_deploy.Deployer = this;

    e.waitUntil(new Promise<vscode.TextEdit[]>((resolve, reject) => {
        try {
            let cfg = me.config;

            let docFile = e.document.fileName;
            docFile = Path.resolve(docFile);
            docFile = deploy_helpers.replaceAllStrings(docFile, Path.sep, '/');

            let relativeDocFilePath = deploy_helpers.toRelativePath(docFile);
            if (false === relativeDocFilePath) {
                relativeDocFilePath = docFile;
            }

            let plugins = me.plugins;

            let targetWithPlugins = getTargetsByFile.apply(me, [ docFile ]).map(t => {
                let twp: deploy_contracts.DeployTargetWithPlugins = {
                    plugins: undefined,
                    target: t,
                };

                let targetType = deploy_helpers.normalizeString(t.type);

                twp.plugins = plugins.filter(pi => {
                    let pluginType = deploy_helpers.normalizeString(pi.__type);

                    return ('' === pluginType) ||
                           (pluginType == targetType);
                });

                return twp;
            });

            let wf = Workflows.create();

            wf.next((ctx) => {
                ctx.result = false;  // marker for "cancelled"
            });

            wf.on('action.after', (err: any, ctx: Workflows.WorkflowActionContext) => {
                if (!err && ctx.result) {
                    ctx.finish();
                }
            });

            targetWithPlugins.forEach((twp) => {
                if (!deploy_helpers.toBooleanSafe(twp.target.checkBeforeSave)) {
                    return;  // no check before save
                }

                // create "check" action
                // for each underlying plugin
                twp.plugins.forEach(p => {
                    wf.next((ctx) => {
                        return new Promise<boolean>((res, rej) => {
                            deploy_diff.checkForNewerFiles([ docFile ], twp.target, p).then((doDeploy) => {
                                ctx.result = !doDeploy;
                                
                                res();
                            }).catch((e) => {
                                rej(e);
                            });
                        });
                    });
                });
            });

            wf.start().then((cancelled: boolean) => {
                if (cancelled) {
                    reject(new Error("Cancelled"));
                }
                else {
                    resolve();
                }
            }).catch((err) => {
                reject(err);
            });
        }
        catch (e) {
            reject(e);
        }
    }));
}
