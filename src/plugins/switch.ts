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
import * as Enumerable from 'node-enumerable';
import * as i18 from '../i18';


/**
 * The current repository of selected switch options.
 */
export let switchStates: SelectedSwitchOptions = {};


/**
 * A switch target.
 */
export interface DeployTargetSwitch extends deploy_contracts.DeployTarget {
    /**
     * One or more options for the switch.
     */
    options?: DeployTargetSwitchOptionValue | DeployTargetSwitchOptionValue[];
}

/**
 * An option entry for of a switch target.
 */
export interface DeployTargetSwitchOption extends deploy_contracts.Sortable {
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the ID of that option.
     */
    __id?: any;

    /**
     * The description.
     */
    description?: string;
    /**
     * Is default or not.
     */
    isDefault?: boolean;
    /**
     * The (display) name.
     */
    name?: string;
    /**
     * One or more other target names.
     */
    targets?: string | string[];
}

/**
 * A switch option value.
 */
export type DeployTargetSwitchOptionValue = DeployTargetSwitchOption | string;

/**
 * Repository of selected switch options.
 */
export type SelectedSwitchOptions = { [name: string]: DeployTargetSwitchOption };


/**
 * Returns the current option of a target.
 * 
 * @param {DeployTargetSwitch} target The target.
 * @param {TDefault} [defaultValue] The custom default value.
 * 
 * @return {DeployTargetSwitchOption|TDefault} The option (if found).
 */
export function getCurrentOptionOf<TDefault = false>(target: DeployTargetSwitch,
                                                     defaultValue = <TDefault><any>false): DeployTargetSwitchOption | TDefault {
    if (!target) {
        return <any>target;
    }

    const TARGET_NAME = deploy_helpers.normalizeString( target.name );

    const STATES = switchStates;
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
 * Returns the options of a switch target.
 * 
 * @param {DeployTargetSwitch} target The target.
 * 
 * @return {DeployTargetSwitchOption[]} The options.
 */
export function getTargetOptionsOf(target: DeployTargetSwitch): DeployTargetSwitchOption[] {
    if (deploy_helpers.isNullOrUndefined(target)) {
        return <any>target;
    }

    const TARGET_NAME = deploy_helpers.normalizeString(target.name);

    const OPTIONS: DeployTargetSwitchOption[] = [];

    Enumerable.from( deploy_helpers.asArray(target.options) ).where(v => {
        return !deploy_helpers.isNullOrUndefined(v);
    }).select(v => {
                  v = deploy_helpers.cloneObject(v);

                  if ('object' !== typeof v) {
                      v = {
                          targets: [ deploy_helpers.normalizeString(v) ]
                      };
                  }

                  v.__id = `${target.__id}\n` + 
                           `${deploy_helpers.normalizeString(deploy_helpers.getSortValue(v))}\n` + 
                           `${deploy_helpers.normalizeString(v.name)}`;

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

/**
 * Resets the switch states.
 */
export function resetStates() {
    switchStates = {};
}

/**
 * Sets the current option for a switch target.
 * 
 * @param {DeployTargetSwitch} target The target.
 * @param {DeployTargetSwitchOption} option The option to set.
 * 
 * @return {Object} The new data.
 */
export function setCurrentOptionFor(target: DeployTargetSwitch, option: DeployTargetSwitchOption): { option: DeployTargetSwitchOption, target: DeployTargetSwitch } {
    if (!target) {
        return <any>target;
    }

    const NAME = deploy_helpers.normalizeString( target.name );

    const STATES = switchStates;
    if (STATES) {
        STATES[NAME] = option;

        return {
            option: STATES[NAME],
            target: target,
        };
    }
}

class SwitchPlugin extends deploy_objects.DeployPluginBase {
    public get canGetFileInfo(): boolean {
        return true;
    }
    
    public get canPull(): boolean {
        return true;
    }

    public deployFile(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): void {
        //TODO
    }

    private findCurrentTargetsFor(target: DeployTargetSwitch): deploy_contracts.DeployTarget[] {
        const FOUND_TARGETS: deploy_contracts.DeployTarget[] = [];

        //TODO

        return FOUND_TARGETS;
    }

    public async getFileInfo(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        //TODO
        return;
    }
    
    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.switch.description'),
        };
    }

    public pullFile(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): void {
        //TODO
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
    return new SwitchPlugin(ctx);
}
