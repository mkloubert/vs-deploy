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
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Common "deploy" arguments.
 */
export interface DeployArguments extends deploy_contracts.ScriptArguments {
    /**
     * Indicates if operation has been canceled or not.
     */
    canceled?: boolean;
    /**
     * The underlying deploy context.
     */
    context: deploy_contracts.DeployContext;
    /**
     * The downloaded data.
     */
    data?: Buffer;
    /**
     * Deploy options.
     */
    deployOptions: deploy_contracts.DeployFileOptions;
    /**
     * The direction.
     */
    direction: deploy_contracts.DeployDirection;
    /**
     * A state value for the ALL scripts that exists while the
     * current session.
     */
    globalState?: Object;
    /**
     * The underlying "parent" object.
     */
    sender: any;
    /**
     * A state value for the current script that exists while the
     * current session.
     */
    state?: any;
    /**
     * The target.
     */
    target: DeployTargetScript;
    /**
     * Options from the target configuration.
     */
    targetOptions: any;
}

/**
 * Arguments for deploying a file.
 */
export interface DeployFileArguments extends DeployArguments {
    /**
     * The file to deploy.
     */
    file: string;
}

/**
 * 'script' target settings.
 */
export interface DeployTargetScript extends deploy_contracts.DeployTarget {
    /**
     * The optional data to use in execution of script functions.
     */
    options?: any;
    /**
     * The script to execute.
     */
    script: string;
}

/**
 * Arguments for deploying the workspace.
 */
export interface DeployWorkspaceArguments extends DeployArguments {
    /**
     * The list of files to deploy.
     */
    files: string[];
}

/**
 * A script module.
 */
export interface ScriptModule {
    /**
     * Deploys a file.
     * 
     * @param {DeployFileArguments} args Arguments for the execution.
     * 
     * @return {Promise<DeployFileArguments>} The promise.
     */
    deployFile?: (args: DeployFileArguments) => Promise<DeployFileArguments>;
    /**
     * Deploys the workspace.
     * 
     * @param {DeployWorkspaceArguments} args Arguments for the execution.
     * 
     * @return {Promise<any>} The promise.
     */
    deployWorkspace?: (args: DeployWorkspaceArguments) => Promise<DeployWorkspaceArguments>;
    /**
     * Pulls a file to the workspace.
     * 
     * @param {DeployFileArguments} args Arguments for the execution.
     * 
     * @return {Promise<DeployFileArguments>} The promise.
     */
    pullFile?: (args: DeployFileArguments) => Promise<DeployFileArguments>;
    /**
     * Pulls files to the workspace.
     * 
     * @param {DeployWorkspaceArguments} args Arguments for the execution.
     * 
     * @return {Promise<any>} The promise.
     */
    pullWorkspace?: (args: DeployWorkspaceArguments) => Promise<DeployWorkspaceArguments>;
}

function getScriptFile(target: DeployTargetScript): string {
    let scriptFile = deploy_helpers.toStringSafe(target.script);
    if (!scriptFile) {
        scriptFile = './deploy.js';
    }

    if (!Path.isAbsolute(scriptFile)) {
        scriptFile = Path.join(vscode.workspace.rootPath, scriptFile);
    }

    return scriptFile;
}

function loadScriptModule(scriptFile: string): ScriptModule {
    scriptFile = Path.resolve(scriptFile);

    delete require.cache[scriptFile];
    return require(scriptFile);
}

class ScriptPlugin extends deploy_objects.DeployPluginBase {
    protected _globalState: Object = {};
    protected _scriptStates: Object = {};

    public get canPull(): boolean {
        return true;
    }

    public deployFile(file: string, target: DeployTargetScript, opts?: deploy_contracts.DeployFileOptions): void {
        this.deployOrPullFile(deploy_contracts.DeployDirection.Deploy,
                              file, target, opts);
    }

    protected deployOrPullFile(direction: deploy_contracts.DeployDirection,
                               file: string, target: DeployTargetScript, opts?: deploy_contracts.DeployFileOptions): Promise<DeployFileArguments> {
        if (!opts) {
            opts = {};
        }

        let me = this;

        return new Promise<DeployFileArguments>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err: any, args?: DeployFileArguments) => {
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: hasCancelled,
                        error: err,
                        file: file,
                        target: target,
                    });
                }

                if (err) {
                    reject(err);
                }
                else {
                    resolve(args);
                }
            };

            me.onCancelling(() => hasCancelled = true, opts);

            if (hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                try {
                    let scriptFile = getScriptFile(target);

                    let relativeScriptPath = deploy_helpers.toRelativePath(scriptFile, opts.baseDirectory);
                    if (false === relativeScriptPath) {
                        relativeScriptPath = scriptFile;
                    }

                    let scriptModule = loadScriptModule(scriptFile);

                    let scriptFunction: Function;
                    switch (direction) {
                        case deploy_contracts.DeployDirection.Pull:
                            scriptFunction = scriptModule['pullFile'] || scriptModule['deployFile'];
                            break;

                        default:
                            // deploy
                            scriptFunction = scriptModule['deployFile'] || scriptModule['pullFile'];
                            break;
                    }

                    if (!scriptFunction) {
                        throw new Error(i18.t('plugins.script.noDeployFileFunction', relativeScriptPath));
                    }

                    let allStates = me._scriptStates;

                    let args: DeployFileArguments = {
                        context: me.context,
                        deployOptions: opts,
                        direction: direction,
                        emitGlobal: function() {
                            return me.context
                                    .emitGlobal
                                    .apply(me.context, arguments);
                        },
                        file: file,
                        globals: me.context.globals(),
                        require: function(id) {
                            return me.context.require(id);
                        },
                        sender: me,
                        target: target,
                        targetOptions: target.options,
                    };

                    // args.globalState
                    Object.defineProperty(args, 'globalState', {
                        enumerable: true,
                        get: () => {
                            return me._globalState;
                        },
                    });

                    // args.state
                    Object.defineProperty(args, 'state', {
                        enumerable: true,
                        get: () => {
                            return allStates[scriptFile];
                        },
                        set: (v) => {
                            allStates[scriptFile] = v;
                        },
                    });

                    scriptFunction(args).then((a) => {
                        hasCancelled = (a || args).canceled;
                        completed(null, a || args);
                    }).catch((err) => {
                        if (!err) {
                            // define generic error message
                            err = new Error(i18.t('plugins.script.deployFileFailed', file, relativeScriptPath));
                        }

                        completed(err);
                    });
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }

    public deployWorkspace(files: string[], target: DeployTargetScript, opts?: deploy_contracts.DeployWorkspaceOptions) {
        this.deployOrPullWorkspace(deploy_contracts.DeployDirection.Deploy,
                                   files, target, opts);
    }

    protected deployOrPullWorkspace(direction: deploy_contracts.DeployDirection,
                                    files: string[], target: DeployTargetScript, opts?: deploy_contracts.DeployWorkspaceOptions): Promise<DeployWorkspaceArguments> {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        return new Promise<DeployWorkspaceArguments>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err: any, args?: DeployWorkspaceArguments) => {
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: hasCancelled,
                        error: err,
                        target: target,
                    });
                }

                if (err) {
                    reject(err);
                }
                else {
                    resolve(args);
                }
            };

            me.onCancelling(() => hasCancelled = true, opts);

            if (hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                try {
                    let scriptFile = getScriptFile(target);

                    let relativeScriptPath = deploy_helpers.toRelativePath(scriptFile, opts.baseDirectory);
                    if (false === relativeScriptPath) {
                        relativeScriptPath = scriptFile;
                    }

                    let scriptModule = loadScriptModule(scriptFile);

                    let scriptFunction: Function;
                    switch (direction) {
                        case deploy_contracts.DeployDirection.Pull:
                            scriptFunction = scriptModule['pullWorkspace'] || scriptModule['deployWorkspace'];
                            break;

                        default:
                            // deploy
                            scriptFunction = scriptModule['deployWorkspace'] || scriptModule['pullWorkspace'];
                            break;
                    }

                    if (scriptFunction) {
                        // custom function

                        let allStates = me._scriptStates;

                        let args: DeployWorkspaceArguments = {
                            context: me.context,
                            deployOptions: opts,
                            direction: direction,
                            emitGlobal: function() {
                                return me.context
                                        .emitGlobal
                                        .apply(me.context, arguments);
                            },
                            files: files,
                            globals: me.context.globals(),
                            require: function(id) {
                                return me.context.require(id);
                            },
                            sender: me,
                            target: target,
                            targetOptions: target.options,
                        };

                        // args.globalState
                        Object.defineProperty(args, 'globalState', {
                            enumerable: true,
                            get: () => {
                                return me._globalState;
                            },
                        });

                        // args.state
                        Object.defineProperty(args, 'state', {
                            enumerable: true,
                            get: () => {
                                return allStates[scriptFile];
                            },
                            set: (v) => {
                                allStates[scriptFile] = v;
                            },
                        });

                        scriptFunction(args).then((a) => {
                            hasCancelled = (a || args).canceled;
                            completed(null, a || args);
                        }).catch((err) => {
                            if (!err) {
                                // define generic error message
                                err = new Error(i18.t('plugins.script.deployWorkspaceFailed', relativeScriptPath));
                            }

                            completed(err);
                        });
                    }
                    else {
                        // use default
                        super.deployWorkspace(files, target, opts);
                    }
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }

    public downloadFile(file: string, target: DeployTargetScript, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        let me = this;
        
        return new Promise<Buffer>((resolve, reject) => {
            me.deployOrPullFile(deploy_contracts.DeployDirection.Pull, file, target, opts).then((args) => {
                resolve(args.data);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.script.description'),
        };
    }

    protected onConfigReloaded(cfg: deploy_contracts.DeployConfiguration) {
        this._globalState = {};
        this._scriptStates = {};
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
    return new ScriptPlugin(ctx);
}
