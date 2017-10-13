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
import * as deploy_globals from '../globals';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as deploy_plugins from '../plugins';
import * as deploy_values from '../values';
import * as deploy_workspace from '../workspace';
import * as FS from 'fs';
import * as i18 from '../i18';
import * as Path from 'path';
import * as Workflows from 'node-workflows';
import * as vscode from 'vscode';


interface DeployTargetPrompt extends deploy_contracts.DeployTarget {
    prompts?: PromptEntry | PromptEntry[];
    targets: string | string[];
}

interface PromptEntry {
    cache?: boolean;
    converter?: string;
    converterOptions?: any;
    defaultValue?: any;
    ignoreFocusOut?: boolean;
    isPassword?: boolean;
    properties?: string | string[];
    showAlways?: boolean;
    text?: string;
    type?: string;
    validator?: string;
    validatorOptions?: any;
    valuePlaceHolder?: string;
    handleAs?: string;
}

/**
 * A module for converting a (string) value.
 */
export interface ValueConverterModule {
    /**
     * The converter function / method.
     */
    convert: ValueConverterModuleExecutor;
}

/**
 * Converts a (string) value.
 * 
 * @param {ValueConverterModuleExecutorArguments} args The arguments for the execution.
 * 
 * @return {any} The result.
 */
export type ValueConverterModuleExecutor = (args: ValueConverterModuleExecutorArguments) => any;

/**
 * Arguments for a value converter function / method.
 */
export interface ValueConverterModuleExecutorArguments extends deploy_contracts.ScriptArguments {
    /**
     * Options for the script.
     */
    options: any;
    /**
     * The name of the properties where to write the value to.
     */
    properties: string[];
    /**
     * The name of the targets where to write the value to.
     */
    targets: string[];
    /**
     * The type from the target settings.
     */
    type: string;
    /**
     * The value to convert.
     */
    value: string;
}

/**
 * A validator module.
 */
export interface ValueValidatorModule {
    /**
     * Validates a value.
     */
    validate: ValueValidatorModuleExecutor;
}

/**
 * A validator function / method.
 * 
 * @param {ValueValidatorModuleExecutorArguments} args The arguments.
 * 
 * @return {boolean|undefined|null} User value is valid or not.
 */
export type ValueValidatorModuleExecutor = (args: ValueValidatorModuleExecutorArguments) => boolean | undefined | null;

/**
 * Arguments for a validator function.
 */
export interface ValueValidatorModuleExecutorArguments extends deploy_contracts.ScriptArguments {
    /**
     * The custom error message.
     */
    message?: string;
    /**
     * Options for the script.
     */
    options: any;
    /**
     * The name of the properties where to write the value to.
     */
    properties: string[];
    /**
     * The name of the targets where to write the value to.
     */
    targets: string[];
    /**
     * The user value to check.
     */
    value: string;
}


const NOT_FOUND_IN_CACHE = Symbol('NOT_FOUND_IN_CACHE');

class PromptPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetPrompt, opts?: deploy_contracts.DeployWorkspaceOptions): void {
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
            // target.targets
            let targets = deploy_helpers.asArray(target.targets)
                                        .map(t => deploy_helpers.normalizeString(t))
                                        .filter(t => '' !== t);
            targets = deploy_helpers.distinctArray(targets);

            // target.prompts
            let prompts = deploy_helpers.asArray(target.prompts)
                                        .filter(x => x);

            let wf = Workflows.create();

            // prepare workflow
            wf.next((wfCtx) => {
                wfCtx.value = {
                    properties: {},
                    propertiesToCache: [],
                };
            });

            // create an action
            // for each entry in
            // 'prompts'
            prompts.forEach((p, propmptIndex) => {
                // collect property names
                let propertyNames = deploy_helpers.asArray(p.properties)
                                                  .map(x => deploy_helpers.toStringSafe(x).trim())
                                                  .filter(x => '' !== x);
                propertyNames = deploy_helpers.distinctArray(propertyNames);

                let promptValueToString = (v: any, defValue?: string) => {
                    return deploy_helpers.isNullOrUndefined(v) ? defValue : deploy_helpers.toStringSafe(v);
                };
                
                let cacheKey = `prompts::${propmptIndex}`;
                let doCache = deploy_helpers.toBooleanSafe(p.cache);
                let ignoreFocusOut = deploy_helpers.toBooleanSafe(p.ignoreFocusOut, true);
                let showAlways = deploy_helpers.toBooleanSafe(p.showAlways);

                // the validator for the input
                let validator: ValueValidatorModuleExecutor;
                if (!deploy_helpers.isEmptyString(p.validator)) {
                    let validatorScript = deploy_helpers.toStringSafe(p.validator);
                    validatorScript = me.context.replaceWithValues(validatorScript);
                    if (!Path.isAbsolute(validatorScript)) {
                        validatorScript = Path.join(deploy_workspace.getRootPath(), validatorScript);
                    }
                    validatorScript = Path.resolve(validatorScript);

                    let validatorModule = deploy_helpers.loadModule<ValueValidatorModule>(validatorScript);
                    if (validatorModule) {
                        validator = validatorModule.validate;
                    }
                }
                if (!validator) {
                    validator = (args) => {
                        return true;
                    };
                }

                let converter: ValueConverterModuleExecutor;
                if (!deploy_helpers.isEmptyString(p.converter)) {
                    let converterScript = deploy_helpers.toStringSafe(p.converter);
                    converterScript = me.context.replaceWithValues(converterScript);
                    if (!Path.isAbsolute(converterScript)) {
                        converterScript = Path.join(deploy_workspace.getRootPath(), converterScript);
                    }
                    converterScript = Path.resolve(converterScript);

                    let converterModule = deploy_helpers.loadModule<ValueConverterModule>(converterScript);
                    if (converterModule) {
                        converter = converterModule.convert;
                    }
                }

                // create action
                wf.next((wfCtx) => {
                    let properties = wfCtx.value['properties'];
                    let propertiesToCache: any[] = wfCtx.value['propertiesToCache'];

                    let targetType = deploy_helpers.normalizeString(p.type);

                    let valueConverter = converter;

                    // define value converter
                    if (!valueConverter) {
                        valueConverter = (args) => {
                            switch (args.type) {
                                case 'bool':
                                case 'boolean':
                                    {
                                        switch (deploy_helpers.normalizeString(args.value)) {
                                            case '1':
                                            case 'true':
                                            case 'yes':
                                            case 'y':
                                                return true;

                                            case '':
                                                return undefined;
                                        }
                                        
                                        return false;
                                    }
                                    // bool

                                case 'int':
                                case 'integer':
                                    return parseInt(deploy_helpers.toStringSafe(args.value).trim());

                                case 'float':
                                case 'number':
                                    return parseFloat(deploy_helpers.toStringSafe(args.value).trim());

                                case 'json':
                                case 'obj':
                                case 'object':
                                    return JSON.parse(args.value);

                                case 'file':
                                    {
                                        let src = deploy_values.replaceWithValues(me.context.values(), args.value);

                                        return new Promise<any>((res, rej) => {
                                            deploy_helpers.loadFrom(src).then((result) => {
                                                try {
                                                    let val: any;

                                                    if (result.data && result.data.length > 0) {
                                                        val = JSON.parse(result.data.toString('utf8'));
                                                    }

                                                    res(val);
                                                }
                                                catch (e) {
                                                    rej(e);
                                                }
                                            }).catch((err) => {
                                                rej(err);
                                            });
                                        });
                                    }
                                    // file
                            }

                            return args.value;
                        };
                    }

                    return new Promise<any>((resolve, reject) => {
                        let completed = (err: any, userValue?: any) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                if ('undefined' !== typeof userValue) {
                                    if (doCache) {
                                        propertiesToCache.push({
                                            'key': cacheKey,
                                            'value': userValue,
                                        });
                                    }

                                    let args: ValueConverterModuleExecutorArguments = {
                                        emitGlobal: function() {
                                            return deploy_globals.EVENTS
                                                                 .emit
                                                                 .apply(deploy_globals.EVENTS, arguments);
                                        },
                                        globals: me.context.globals(),
                                        options: deploy_helpers.cloneObject(p.converterOptions),
                                        properties: propertyNames,
                                        require: function(id) {
                                            return me.context.require(id);
                                        },
                                        targets: targets,
                                        type: targetType,
                                        value: userValue,
                                    };

                                    try {
                                        Promise.resolve( valueConverter(args) ).then((valueToSet) => {
                                            propertyNames.forEach(pn => {
                                                properties[pn] = valueToSet;
                                            });

                                            resolve();
                                        }).catch((err) => {
                                            reject(err);
                                        });
                                    }
                                    catch (e) {
                                        reject(e);
                                    }
                                }
                                else {
                                    wfCtx.finish();
                                    hasCancelled = true;

                                    resolve();
                                }
                            }
                        };

                        let cachedValue = me.context.targetCache().get(target, cacheKey, NOT_FOUND_IN_CACHE);
                        let defaultValue = p.defaultValue;
                        if (NOT_FOUND_IN_CACHE !== cachedValue) {
                            defaultValue = cachedValue;  // use cached value as default one
                        }

                        if (!showAlways && doCache && (NOT_FOUND_IN_CACHE !== cachedValue)) {
                            // is cached
                            
                            completed(null,
                                      cachedValue);
                        }
                        else {
                            // ask the user for value

                            let propertyPlaceHolders: deploy_values.ValueBase[] = [];
                            for (let pn in properties) {
                                propertyPlaceHolders.push(new deploy_values.StaticValue({
                                    name: pn,
                                    value: properties[pn],
                                }));
                            }

                            let promptText = deploy_helpers.toStringSafe(p.text);
                            promptText = deploy_values.replaceWithValues(propertyPlaceHolders, promptText);
                            promptText = deploy_values.replaceWithValues(me.context.values(), promptText);
                            promptText = !deploy_helpers.isEmptyString(promptText) ? promptText : undefined;

                            let placeHolderText = deploy_helpers.toStringSafe(p.valuePlaceHolder);
                            placeHolderText = deploy_values.replaceWithValues(propertyPlaceHolders, placeHolderText);
                            placeHolderText = deploy_values.replaceWithValues(me.context.values(), placeHolderText);
                            placeHolderText = !deploy_helpers.isEmptyString(placeHolderText) ? placeHolderText : undefined;

                            const CONVERT_INPUT_VALUE = (inputVal: string): any => {
                                switch (deploy_helpers.normalizeString(p.handleAs)) {
                                    case 'list':
                                        return JSON.parse('[ ' + inputVal + ' ]');
                                    
                                    case 'object':
                                        if (deploy_helpers.isEmptyString(inputVal)) {
                                            return undefined;
                                        }
                                        return JSON.parse(inputVal);
                                }

                                return inputVal;
                            };

                            vscode.window.showInputBox({
                                ignoreFocusOut: ignoreFocusOut,
                                password: deploy_helpers.toBooleanSafe(p.isPassword),
                                placeHolder: placeHolderText,
                                prompt: promptText,
                                value: promptValueToString(defaultValue),
                                validateInput: (v) => {
                                    let errMsg: string;
                                    
                                    try {
                                        let args: ValueValidatorModuleExecutorArguments = {
                                            emitGlobal: function() {
                                                return deploy_globals.EVENTS
                                                                     .emit
                                                                     .apply(deploy_globals.EVENTS, arguments);
                                            },
                                            globals: me.context.globals(),
                                            options: deploy_helpers.cloneObject(p.validatorOptions),
                                            properties: propertyNames,
                                            require: function(id) {
                                                return me.context.require(id);
                                            },
                                            targets: targets,
                                            value: CONVERT_INPUT_VALUE(v),
                                        };

                                        let isValid = deploy_helpers.toBooleanSafe(validator(args), true);
                                        if (!isValid) {
                                            errMsg = deploy_helpers.toStringSafe(args.message);
                                            if (deploy_helpers.isEmptyString(errMsg)) {
                                                errMsg = i18.t('plugins.prompt.invalidInput');
                                            }
                                        }
                                    }
                                    catch (e) {
                                        errMsg = i18.t('errors.withCategory',
                                                       'PromptPlugin.deployWorkspace().showInputBox().validateInput', e);
                                    }

                                    if (deploy_helpers.isEmptyString(errMsg)) {
                                        errMsg = undefined;
                                    }

                                    return errMsg;
                                },
                            }).then((userValue) => {
                                try {
                                    completed(null,
                                              CONVERT_INPUT_VALUE(userValue));
                                }
                                catch (e) {
                                    completed(e);
                                }
                            }, (err) => {
                                completed(err);
                            });
                        }
                    });
                });
            });

            // start deployment
            wf.next(async (wfCtx) => {
                let properties = wfCtx.value['properties'];

                let wfTargets = Workflows.create();

                // create a sub workflow for
                // each target
                me.getTargetsWithPlugins(target, targets).forEach(tp => {
                    let clonedTarget: Object = deploy_helpers.cloneObject(tp.target);

                    // fill properties of
                    // current target with data
                    wfTargets.next(() => {
                        for (let p in properties) {
                            clonedTarget[p] = properties[p];
                        }
                    });

                    // execute for each underlying plugin
                    wfTargets.next(async () => {
                        let wfPlugins = Workflows.create();

                        tp.plugins.forEach(pi => {
                            wfPlugins.next(() => {
                                return new Promise<any>((resolve, reject) => {
                                    try {
                                        pi.deployWorkspace(files, clonedTarget, {
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

                wfTargets.on('action.after',
                             afterWorkflowsAction);

                await wfTargets.start();
            });

            // cache values
            wf.next((wfCtx) => {
                let propertiesToCache: any[] = wfCtx.value['propertiesToCache'];
                
                propertiesToCache.forEach(ptc => {
                    me.context.targetCache()
                              .set(target, ptc.key, ptc.value);
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
            description: i18.t('plugins.prompt.description'),
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
    return new PromptPlugin(ctx);
}
