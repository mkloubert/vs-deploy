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
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Arguments for deploying a file.
 */
export interface DeployFileArguments {
    /**
     * The underlying deploy context.
     */
    context: deploy_contracts.DeployContext;
    /**
     * Deploy options.
     */
    deployOptions: deploy_contracts.DeployFileOptions;
    /**
     * The file to deploy.
     */
    file: string;
    /**
     * The underlying "parent" object.
     */
    sender: any;
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
export interface DeployWorkspaceArguments {
    /**
     * The underlying deploy context.
     */
    context: deploy_contracts.DeployContext;
    /**
     * Deploy options.
     */
    deployOptions: deploy_contracts.DeployWorkspaceOptions;
    /**
     * The list of files to deploy.
     */
    files: string[];
    /**
     * The underlying "parent" object.
     */
    sender: any;
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
 * A script module.
 */
export interface ScriptModule {
    /**
     * Deploys a file.
     * 
     * @param {DeployFileArguments} args Arguments for the execution.
     * 
     * @return {Promise<any>} The promise.
     */
    deployFile?: (args: DeployFileArguments) => Promise<any>;
    /**
     * Deploys the workspace.
     * 
     * @param {DeployWorkspaceArguments} args Arguments for the execution.
     * 
     * @return {Promise<any>} The promise.
     */
    deployWorkspace?: (args: DeployWorkspaceArguments) => Promise<any>;
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
    public deployFile(file: string, target: DeployTargetScript, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let completed = (err?: any, value?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        try {
            let scriptFile = getScriptFile(target);

            let relativeScriptPath = deploy_helpers.toRelativePath(scriptFile);
            if (false === relativeScriptPath) {
                relativeScriptPath = scriptFile;
            }

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    file: file,
                    target: target,
                });
            }
            
            let scriptModule = loadScriptModule(scriptFile);
            if (!scriptModule.deployFile) {
                throw new Error(`'${relativeScriptPath}' implements no 'deployFile()' function!`);
            }

            scriptModule.deployFile({
                context: me.context,
                deployOptions: opts,
                file: file,
                sender: me,
                target: target,
                targetOptions: target.options,
            }).then((value) => {
                completed(null, value);
            }).catch((err) => {
                if (!err) {
                    err = new Error(`Could not deploy file '${file}' by script '${relativeScriptPath}'!`);
                }

                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    }

    public deployWorkspace(files: string[], target: DeployTargetScript, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };
        
        try {
            let scriptFile = getScriptFile(target);

            let relativeScriptPath = deploy_helpers.toRelativePath(scriptFile);
            if (false === relativeScriptPath) {
                relativeScriptPath = scriptFile;
            }

            let scriptModule = loadScriptModule(scriptFile);
            if (scriptModule.deployWorkspace) {
                // custom function

                scriptModule.deployWorkspace({
                    context: me.context,
                    deployOptions: opts,
                    files: files,
                    sender: me,
                    target: target,
                    targetOptions: target.options,
                }).then(() => {
                    completed();
                }).catch((err) => {
                    if (!err) {
                        err = new Error(`Could not deploy workspace by script '${relativeScriptPath}'!`);
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

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: 'Deploys via a JS script',
        }
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
