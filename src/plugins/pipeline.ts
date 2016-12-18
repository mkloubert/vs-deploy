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
 * A deploy target configuration for a "pipeline".
 */
export interface DeployTargetPipeline extends deploy_contracts.DeployTarget {
    /**
     * The optional data to use in execution of script functions.
     */
    options?: any;
    /**
     * The script to execute.
     */
    script: string;
    /**
     * The target.
     */
    target: string;
}

/**
 * Arguments for the 'pipe()' function of a "pipeline" module.
 */
export interface PipeArguments {
    /**
     * The (new) root directory to use.
     */
    baseDirectory?: string;
    /**
     * Indicates if operation has been canceled or not.
     */
    canceled?: boolean;
    /**
     * The underlying deploy context.
     */
    context: deploy_contracts.DeployContext;
    /**
     * Deploy options.
     */
    deployOptions: deploy_contracts.DeployFileOptions;
    /**
     * The (new) list of files to deploy.
     */
    files?: string[];
    /**
     * The underlying "parent" object.
     */
    sender: any;
    /**
     * The target.
     */
    target: DeployTargetPipeline;
    /**
     * Options from the target configuration.
     */
    targetOptions: any;
}

interface PipeContext extends deploy_objects.MultiTargetContext {
}

/**
 * A pipeline module.
 */
export interface PipelineModule {
    /**
     * Pipes a list of source files.
     * 
     * @param {PipeArguments} args The arguments.
     * 
     * @return {Promise<PipeArguments>} The promise.
     */
    pipe: (args: PipeArguments) => Promise<PipeArguments>;
}

function getScriptFile(target: DeployTargetPipeline): string {
    let scriptFile = deploy_helpers.toStringSafe(target.script);
    if (!scriptFile) {
        scriptFile = './pipe.js';
    }

    if (!Path.isAbsolute(scriptFile)) {
        scriptFile = Path.join(vscode.workspace.rootPath, scriptFile);
    }

    return scriptFile;
}

function loadScriptModule(scriptFile: string): PipelineModule {
    scriptFile = Path.resolve(scriptFile);

    delete require.cache[scriptFile];
    return require(scriptFile);
}

class PipelinePlugin extends deploy_objects.MultiTargetDeployPluginBase {
    protected createContext(target: DeployTargetPipeline): PipeContext {
        return {
            targets: this.getTargetsWithPlugins(target, target.target),
        };
    }

    public deployWorkspace(files: string[], target: DeployTargetPipeline, opts?: deploy_contracts.DeployWorkspaceOptions) {
        if (!opts) {
            opts = {};
        }

        let me = this;
        
        let completed = (err?: any, canceled?: boolean) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: canceled,
                    target: target,
                });
            }
        };

        if (this.context.isCancelling()) {
            completed(null, true);
            return;
        }

        try {
            let scriptFile = getScriptFile(target);

            let relativeScriptPath = deploy_helpers.toRelativePath(scriptFile);
            if (false === relativeScriptPath) {
                relativeScriptPath = scriptFile;
            }

            let scriptModule = loadScriptModule(scriptFile);
            if (!scriptModule.pipe) {
                throw new Error(`'${relativeScriptPath}' implements no 'pipe()' function!`);
            }

            let args: PipeArguments = {
                baseDirectory: opts.baseDirectory,
                context: me.context,
                deployOptions: opts,
                files: files,
                sender: me,
                target: target,
                targetOptions: target.options,
            };

            scriptModule.pipe(args).then((a) => {
                if (me.context.isCancelling()) {
                    completed(null, true);
                    return;
                }

                a = a || args;

                let newFileList = deploy_helpers.asArray(a.files)
                                                .filter(x => !deploy_helpers.isEmptyString(x));

                super.deployWorkspace(newFileList,
                                      target,
                                      {
                                          baseDirectory: a.baseDirectory,
                                          onBeforeDeployFile: (sender, e) => {
                                              if (opts.onBeforeDeployFile) {
                                                  opts.onBeforeDeployFile(sender, {
                                                      destination: e.destination,
                                                      file: e.file,
                                                      target: e.target,
                                                  });
                                              }
                                          },
                                          onCompleted: (sender, e) => {
                                              completed(e.error, e.canceled);
                                          },
                                          onFileCompleted: (sender, e) => {
                                              if (opts.onFileCompleted) {
                                                  opts.onFileCompleted(sender, {
                                                      file: e.file,
                                                      target: e.target,
                                                  });
                                              }
                                          }
                                      })
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
            description: 'Pipes a list of sources files to a new destination by using a script and sends the new file list to a target.',
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
    return new PipelinePlugin(ctx);
}
