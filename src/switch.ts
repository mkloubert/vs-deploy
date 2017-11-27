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
import * as deploy_plugins_switch from './plugins/switch';
import * as Enumerable from 'node-enumerable';
import * as i18 from './i18';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


type SavedStates = { [switchName: string]: string };

/**
 * Stores the new option data for a target.
 */
export interface NewSwitchOptionState {
    /**
     * The new option.
     */
    option: deploy_plugins_switch.DeployTargetSwitchOption;
    /**
     * The underlying target.
     */
    target: deploy_plugins_switch.DeployTargetSwitch;
}

/**
 * Repository of selected switch options.
 */
export type SelectedSwitchOptions = { [name: string]: deploy_plugins_switch.DeployTargetSwitchOption };


const KEY_SWITCH_STATES = 'vsdSwitchStates';

let switchStates: SelectedSwitchOptions = {};

/**
 * Changes a switch target.
 */
export async function changeSwitch() {
    const ME: vs_deploy.Deployer = this;

    const TARGETS = <deploy_plugins_switch.DeployTargetSwitch[]>ME.getTargets().filter(t => {
        return isSwitch(t);
    });

    let selectedOption: deploy_plugins_switch.DeployTargetSwitchOption;
    let selectedTarget: deploy_plugins_switch.DeployTargetSwitch;

    const SELECT_OPTION = async () => {
        if (!selectedOption) {
            return;
        }

        setCurrentOptionFor(selectedTarget, selectedOption);
        await saveStates.apply(ME, []);

        printSwitchStates.apply(ME, []);
    };

    const SELECT_TARGET_OPTION = async (index: number) => {
        if (!selectedTarget) {
            return;
        }

        const SWITCH_NAME = getSwitchName(selectedTarget, index);
        
        const OPTIONS = Enumerable.from( getTargetOptionsOf(selectedTarget) )
            .toArray()
            .sort((x, y) => {
                      return deploy_helpers.compareValuesBy(x, y,
                                                            i => deploy_helpers.getSortValue(i,
                                                                                             () => ME.name));
                  });
        
        const OPTION_QUICK_PICKS: deploy_contracts.DeployActionQuickPick[] = OPTIONS.map((o, i) => {
            const LABEL = getSwitchOptionName(o, i);
            const DESCRIPTION = deploy_helpers.toStringSafe(o.description).trim();

            let details = '';
            let isSelected = false;

            const SELECTED_OPTION_OF_TARGET = getCurrentOptionOf(selectedTarget);
            if (SELECTED_OPTION_OF_TARGET) {
                if (o.__id === SELECTED_OPTION_OF_TARGET.__id) {
                    isSelected = true;
                }
            }
            
            return {
                action: async () => {
                    selectedOption = o;

                    await SELECT_OPTION();
                },
                description: DESCRIPTION,
                detail: isSelected ? `(${i18.t('selected')})` : '',
                label: LABEL,
            };
        });
        
        if (OPTION_QUICK_PICKS.length < 1) {
            vscode.window.showWarningMessage(
                '[vs-deploy] ' + i18.t('plugins.switch.noOptionsDefined',
                                       SWITCH_NAME),
            );

            return;
        }

        let action: Function;

        if (1 === OPTION_QUICK_PICKS.length) {
            action = OPTION_QUICK_PICKS[0].action;
        }
        else {
            const SELECTED_ITEM = await vscode.window.showQuickPick(OPTION_QUICK_PICKS, {
                placeHolder: i18.t('plugins.switch.selectOption',
                                   SWITCH_NAME),
            });
            if (SELECTED_ITEM) {
                action = SELECTED_ITEM.action;
            }
        }

        if (action) {
            await Promise.resolve(action());
        }
    };

    const QUICK_PICKS: deploy_contracts.DeployActionQuickPick[] = TARGETS.map((t, i) => {
        const LABEL = getSwitchName(t, i);
        const DESCRIPTION = deploy_helpers.toStringSafe(t.description).trim();

        return {
            action: async () => {
                selectedTarget = t;

                await SELECT_TARGET_OPTION(i);
            },
            description: DESCRIPTION,
            label: LABEL,
        };
    });

    if (QUICK_PICKS.length < 1) {
        vscode.window.showWarningMessage(
            '[vs-deploy] ' + i18.t('plugins.switch.noDefined'),
        );

        return;
    }

    let targetAction: Function;

    if (1 === QUICK_PICKS.length) {
        targetAction = QUICK_PICKS[0].action;
    }
    else {
        const SELECTED_ITEM = await vscode.window.showQuickPick(QUICK_PICKS, {
            placeHolder: i18.t('plugins.switch.selectSwitch'),
        });
        if (SELECTED_ITEM) {
            targetAction = SELECTED_ITEM.action;
        }
    }

    if (targetAction) {
        await Promise.resolve(
            targetAction()
        );
    }
}

/**
 * Returns the current option of a target.
 * 
 * @param {deploy_plugins_switch.DeployTargetSwitch} target The target.
 * @param {TDefault} [defaultValue] The custom default value.
 * 
 * @return {deploy_plugins_switch.DeployTargetSwitchOption|TDefault} The option (if found).
 */
export function getCurrentOptionOf<TDefault = false>(target: deploy_plugins_switch.DeployTargetSwitch,
                                                     defaultValue = <TDefault><any>false): deploy_plugins_switch.DeployTargetSwitchOption | TDefault {
    if (!target) {
        return <any>target;
    }

    const TARGET_NAME = deploy_helpers.normalizeString( target.name );

    const STATES = getSelectedSwitchOptions();
    if (STATES) {
        const OPTION = STATES[TARGET_NAME];
        if ('object' === typeof OPTION) {
            return OPTION;  // found
        }
        else {
            // get first (default) one
            // instead

            return Enumerable.from(
                getTargetOptionsOf(target)
            ).orderBy(o => {
                return deploy_helpers.toBooleanSafe(o.isDefault) ? 0 : 1;
            }).firstOrDefault(x => true,
                              defaultValue);
        }
    }

    return defaultValue;
}

/**
 * Returns the object that stores the states of all switches.
 * 
 * @return {SelectedSwitchOptions} The object with the states.
 */
export function getSelectedSwitchOptions(): SelectedSwitchOptions {
    return switchStates || <any>{};
}

function getSwitches(): deploy_plugins_switch.DeployTargetSwitch[] {
    const ME: vs_deploy.Deployer = this;

    return <deploy_plugins_switch.DeployTargetSwitch[]>ME.getTargets().filter(t => {
        return isSwitch(t);
    });
}

function getSwitchName(target: deploy_plugins_switch.DeployTargetSwitch, index: number): string {
    if (!target) {
        return <any>target;
    }

    let name = deploy_helpers.toStringSafe(target.name).trim();
    if ('' === name) {
        name = i18.t('plugins.switch.defaultName',
                     index + 1);
    }

    return name;
}

function getSwitchOptionName(target: deploy_plugins_switch.DeployTargetSwitchOption, index: number): string {
    if (!target) {
        return <any>target;
    }

    let name = deploy_helpers.toStringSafe(target.name).trim();
    if ('' === name) {
        name = i18.t('plugins.switch.defaultOptionName',
                     index + 1);
    }

    return name;
}

/**
 * Returns the options of a switch target.
 * 
 * @param {deploy_plugins_switch.DeployTargetSwitch} target The target.
 * 
 * @return {deploy_plugins_switch.DeployTargetSwitchOption[]} The options.
 */
export function getTargetOptionsOf(target: deploy_plugins_switch.DeployTargetSwitch): deploy_plugins_switch.DeployTargetSwitchOption[] {
    if (deploy_helpers.isNullOrUndefined(target)) {
        return <any>target;
    }

    const TARGET_NAME = deploy_helpers.normalizeString(target.name);

    const OPTIONS: deploy_plugins_switch.DeployTargetSwitchOption[] = [];

    let objIndex = -1;
    Enumerable.from( deploy_helpers.asArray(target.options) ).where(v => {
        return !deploy_helpers.isNullOrUndefined(v);
    }).select(v => {
                  ++objIndex;

                  v = deploy_helpers.cloneObject(v);

                  if ('object' !== typeof v) {
                      v = {
                          targets: [ deploy_helpers.normalizeString(v) ]
                      };
                  }

                  v.__id = `${target.__id}\n` + 
                           `${deploy_helpers.normalizeString(deploy_helpers.getSortValue(v))}\n` + 
                           `${objIndex}\n` + 
                           `${deploy_helpers.normalizeString(v.name)}`;
                  v.__index = objIndex;

                  v.targets = Enumerable.from( deploy_helpers.asArray(v.targets) ).select(t => {
                      return deploy_helpers.normalizeString(t);  
                  }).where(t => '' !== t &&
                                TARGET_NAME !== t)
                    .distinct()
                    .toArray();

                  return v;
              })
      .pushTo(OPTIONS);

    return OPTIONS.sort((x, y) => {
        return deploy_helpers.compareValuesBy(x, y,
                                              o => deploy_helpers.getSortValue(o));
    });
}

function isSwitch(target: deploy_contracts.DeployTarget): target is deploy_plugins_switch.DeployTargetSwitch {
    if (target) {
        return [
            'switch'
        ].indexOf( deploy_helpers.normalizeString(target.type) ) > -1;
    }

    return false;
}

export function printSwitchStates() {
    const ME: vs_deploy.Deployer = this;

    try {
        const SWITCHES: deploy_plugins_switch.DeployTargetSwitch[] = getSwitches.apply(ME, []);
        if (SWITCHES.length > 0) {
            ME.outputChannel.appendLine('');
            ME.outputChannel.appendLine(
                i18.t('plugins.switch.states')
            );

            SWITCHES.forEach((s, i) => {
                const TARGET_NAME = getSwitchName(s, i);

                ME.outputChannel.append(
                    i18.t('plugins.switch.item',
                          TARGET_NAME),
                );

                const OPTION = getCurrentOptionOf(s);
                if (false === OPTION) {
                    ME.outputChannel.appendLine(
                        `<${i18.t('plugins.switch.noOptionSelected')}>`,
                    );
                }
                else {
                    ME.outputChannel.appendLine(
                        "'" + getSwitchOptionName(OPTION, OPTION.__index)  + "'",
                    );
                }
            });

            ME.outputChannel.appendLine('');
        }
    }
    catch (e) {
        ME.log(`[ERROR :: vs-deploy] switch.printSwitchStates(): ${deploy_helpers.toStringSafe(e)}`);
    }
}

/**
 * Reloads the target states for switches.
 */
export function reloadTargetStates() {
    const ME: vs_deploy.Deployer = this;

    resetTargetStates();
    try {
        const STATES = ME.context.workspaceState.get<SavedStates>(KEY_SWITCH_STATES);
        if (STATES) {
            const SWITCHES: deploy_plugins_switch.DeployTargetSwitch[] = getSwitches.apply(ME, []);

            for (let p in STATES) {
                const OPTION_ID = STATES[p];
                if (deploy_helpers.isEmptyString(OPTION_ID)) {
                    continue;
                }

                const TARGET_NAME = deploy_helpers.normalizeString(p);

                SWITCHES.filter(s => {
                    return TARGET_NAME === deploy_helpers.normalizeString(s.name);
                }).forEach(s => {
                    Enumerable.from( getTargetOptionsOf(s) ).where(o => {
                        return o.__id === OPTION_ID;
                    }).forEach(o => {
                        setCurrentOptionFor(s, o);
                    });
                });
            }
        }

        // clean update
        saveStates.apply(ME, []).then(() => {
        }).catch((err) => {
            ME.log(`[ERROR :: vs-deploy] switch.reloadTargetStates(2): ${deploy_helpers.toStringSafe(err)}`);
        });
    }
    catch (e) {
        ME.log(`[ERROR :: vs-deploy] switch.reloadTargetStates(1): ${deploy_helpers.toStringSafe(e)}`);
    }
}

/**
 * Resets all target states for switches.
 */
export function resetTargetStates() {
    switchStates = {};
}

/**
 * Saves the states to the current workspace.
 */
export async function saveStates() {
    const ME: vs_deploy.Deployer = this;

    try {
        let newValue: SavedStates;

        const STATES = getSelectedSwitchOptions();
        if (STATES) {
            newValue = {};

            for (let p in STATES) {
                newValue[p] = STATES[p].__id;
            }
        }

        await ME.context.workspaceState.update(KEY_SWITCH_STATES,
                                               newValue);
    }
    catch (e) {
        ME.log(`[ERROR :: vs-deploy] switch.saveStates(): ${deploy_helpers.toStringSafe(e)}`);
    }
}

/**
 * Sets the current option for a switch target.
 * 
 * @param {deploy_plugins_switch.DeployTargetSwitch} target The target.
 * @param {deploy_plugins_switch.DeployTargetSwitchOption} option The option to set.
 * 
 * @return {Object} The new data.
 */
export function setCurrentOptionFor(target: deploy_plugins_switch.DeployTargetSwitch, option: deploy_plugins_switch.DeployTargetSwitchOption): NewSwitchOptionState {
    if (!target) {
        return <any>target;
    }

    const NAME = deploy_helpers.normalizeString( target.name );

    const STATES = getSelectedSwitchOptions();
    if (STATES) {
        STATES[NAME] = option;

        return {
            option: STATES[NAME],
            target: target,
        };
    }
}
