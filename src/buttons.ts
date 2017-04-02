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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as i18 from './i18';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


interface PackageButton {
    button: vscode.StatusBarItem;
    command: vscode.Disposable;
    index: number;
}

let nextDeployPackageCommandId = Number.MAX_SAFE_INTEGER;
let packageButtons: PackageButton[] = [];


/**
 * Reloads the package buttons.
 */
export function reloadPackageButtons() {
    let me: vs_deploy.Deployer = this;

    // remove old
    unloadPackageButtons();

    me.getPackages().forEach((p, idx) => {
        let btn: vscode.StatusBarItem;
        let cmd: vscode.Disposable;
        let disposeItems = false;
        try {
            let packageButton: deploy_contracts.DeployPackageButton;
            if (!deploy_helpers.isNullOrUndefined(p.button)) {
                if ('object' !== typeof p.button) {
                    packageButton = {
                        enabled: deploy_helpers.toBooleanSafe(p.button),
                    };
                }
                else {
                    packageButton = p.button;
                }
            }

            if (packageButton && deploy_helpers.toBooleanSafe(packageButton.enabled, true)) {
                // command ID
                let cmdName = deploy_helpers.toStringSafe(packageButton.command).trim();
                if ('' === cmdName) {
                    cmdName = 'extension.deploy.deployPackageByButton' + (nextDeployPackageCommandId--);
                }

                // alignment
                let align = vscode.StatusBarAlignment.Left;
                if (deploy_helpers.toBooleanSafe(packageButton.isRight)) {
                    align = vscode.StatusBarAlignment.Right;
                }
                
                // priority
                let prio = parseFloat(deploy_helpers.toStringSafe(packageButton.priority).trim());
                if (isNaN(prio)) {
                    prio = undefined;
                }

                // text
                let text = deploy_helpers.toStringSafe(packageButton.text);
                text = me.replaceWithValues(text);
                if (deploy_helpers.isEmptyString(text)) {
                    text = deploy_helpers.toStringSafe(p.name).trim();
                }
                if (deploy_helpers.isEmptyString(text)) {
                    text = i18.t('packages.defaultName', idx + 1);
                }

                // tooltip
                let tooltip = deploy_helpers.toStringSafe(packageButton.tooltip);
                tooltip = me.replaceWithValues(tooltip);
                if (deploy_helpers.isEmptyString(tooltip)) {
                    tooltip = deploy_helpers.toStringSafe(p.description).trim();
                }
                if (deploy_helpers.isEmptyString(tooltip)) {
                    tooltip = cmdName;
                }

                // create and setup button
                btn = vscode.window.createStatusBarItem(align, prio);
                if (!deploy_helpers.isEmptyString(text)) {
                    btn.text = text;
                }
                if (!deploy_helpers.isEmptyString(tooltip)) {
                    btn.tooltip = tooltip;
                }

                // register underlying command
                cmd = vscode.commands.registerCommand(cmdName, () => {
                    try {
                        let allTargets = me.getTargets();

                        // collect explicit targets
                        let targetNames = deploy_helpers.asArray(packageButton.targets)
                                                        .map(x => deploy_helpers.normalizeString(x))
                                                        .filter(x => '' !== x);
                        targetNames = deploy_helpers.distinctArray(targetNames);

                        let targetToDeployTo: deploy_contracts.DeployTarget[] = [];
                        targetNames.forEach(tn => {
                            // find matching targets by name
                            let machtingTargets: deploy_contracts.DeployTarget[] = [];
                            for (let i = 0; i < allTargets.length; i++) {
                                let t = allTargets[i];
                                if (deploy_helpers.normalizeString(t.name) === tn) {
                                    machtingTargets.push(t);
                                }
                            }

                            if (machtingTargets.length > 0) {
                                targetToDeployTo = targetToDeployTo.concat(machtingTargets);
                            }
                            else {
                                // could not find any target
                                vscode.window.showWarningMessage(i18.t('packages.couldNotFindTarget',
                                                                       tn, p.name));
                            }
                        });

                        me.deployWorkspace(p, targetToDeployTo).then((code) => {
                            //TODO
                        }).catch((err) => {
                            me.log(i18.t('errors.withCategory',
                                         'buttons.reloadPackageButtons(3.${idx})', err));
                        });
                    }
                    catch (e) {
                        me.log(i18.t('errors.withCategory',
                                     'buttons.reloadPackageButtons(2.${idx})', e));
                    }
                });

                btn.command = cmdName;

                btn.show();
            }

            if (btn && cmd) {
                let btnEntry: PackageButton = {
                    button: btn,
                    command: cmd,
                    index: undefined,
                };

                btnEntry.index = packageButtons.push(btnEntry) - 1;
            }
            else {
                disposeItems = true;
            }
        }
        catch (e) {
            disposeItems = true;

            me.log(i18.t('errors.withCategory',
                         `buttons.reloadPackageButtons(1.${idx})`, e));
        }
        finally {
            if (disposeItems) {
                deploy_helpers.tryDispose(btn);
                deploy_helpers.tryDispose(cmd);
            }
        }
    });
}

/**
 * Unloads current package buttons.
 */
export function unloadPackageButtons() {
    while (packageButtons.length > 0) {
        let pb = packageButtons.shift();
        pb.index = null;

        deploy_helpers.tryDispose(pb.button);
        deploy_helpers.tryDispose(pb.command);
    }
}
