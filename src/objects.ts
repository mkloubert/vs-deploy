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


/**
 * A basic deploy plugin that is specially based on single
 * file operations (s. deployFile() method).
 */
export abstract class DeployPluginBase implements deploy_contracts.DeployPlugin {
    /**
     * Stores the deploy context.
     */
    protected _context: deploy_contracts.DeployContext;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {deploy_contracts.DeployContext} [ctx] The underlying deploy context.
     */
    public constructor(ctx?: deploy_contracts.DeployContext) {
        this._context = ctx;
    }

    /**
     * Gets the underlying deploy context.
     */
    public get context(): deploy_contracts.DeployContext {
        return this._context;
    }

    /** @inheritdoc */
    public abstract deployFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions);
    
    /** @inheritdoc */
    public deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let filesTodo = files.map(x => x);
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };
        
        try {
            let deployNextFile: () => void;

            let fileCompleted = function(sender: any, e: deploy_contracts.FileDeployedCompletedEventArguments) {
                try {
                    if (opts.onFileCompleted) {
                        opts.onFileCompleted(sender, e);
                    }

                    deployNextFile();
                }
                catch (err) {
                    me.context.log('[ERROR] DeployPluginBase.deployWorkspace(1): ' + err);
                }
            };

            deployNextFile = () => {
                if (filesTodo.length < 1) {
                    completed();
                    return;
                }

                let f = filesTodo.pop();
                if (!f) {
                    completed();
                    return;
                }
                
                try {
                    me.deployFile(f, target, {
                        onBeforeDeploy: (sender, e) => {
                            if (opts.onBeforeDeployFile) {
                                opts.onBeforeDeployFile(sender, e);
                            }
                        },
                        onCompleted: (sender, e) => {
                            fileCompleted(sender, e);
                        }
                    });
                }
                catch (e) {
                    fileCompleted(me, {
                        error: e,
                        file: f,
                        target: target,
                    });
                }
            };

            deployNextFile();
        }
        catch (e) {
            completed(e);
        }
    }
}

/**
 * An object that wraps the object that
 * is used in a plugin that uses a context.
 */
export interface DeployPluginContextWrapper<TContext> {
    /**
     * The context.
     */
    context: TContext;
    /**
     * Optional logic to "destroy" / "dispose" the context.
     */
    destroy?: () => Promise<TContext>;
}

/**
 * A basic deploy plugin that is specially based on multi
 * file operations (s. deployWorkspace() method).
 */
export abstract class MultiFileDeployPluginBase extends DeployPluginBase {
    /** @inheritdoc */
    public deployFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        this.deployWorkspace([ file ], target, {
            onBeforeDeployFile: (sender, e) => {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(sender, {
                        file: e.file,
                        target: e.target,
                    });
                }
            },

            onFileCompleted: (sender, e) => {
                if (opts.onCompleted) {
                    opts.onCompleted(sender, {
                        error: e.error,
                        file: e.file,
                        target: e.target,
                    });
                }
            }
        });
    }

    /** @inheritdoc */
    public abstract deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions);
}

/**
 * A basic deploy plugin that is specially based on multi
 * file operations which uses a context, like a network connection (s. deployFileWithContext() method).
 */
export abstract class DeployPluginWithContextBase<TContext> extends MultiFileDeployPluginBase {
    /**
     * Creates a new context for a target.
     * 
     * @param {target: deploy_contracts.DeployTarget} target The target.
     * 
     * @return {Promise<DeployPluginContextWrapper<TContext>>} The promise.
     */
    protected abstract createContext(target: deploy_contracts.DeployTarget): Promise<DeployPluginContextWrapper<TContext>>;

    /**
     * Deploys a file by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    protected abstract deployFileWithContext(ctx: TContext,
                                             file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void

    /** @inheritdoc */
    public deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        // report that whole operation has been completed
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };

        // destroy context before raise
        // "completed" event
        let destroyContext = (wrapper: DeployPluginContextWrapper<TContext>, completedErr?: any) => {
            try {
                if (wrapper) {
                    // destroy context

                    wrapper.destroy().then(() => {
                        completed(completedErr);
                    }).catch((e) => {
                        me.context.log(`[ERROR] DeployPluginWithContextBase.deployWorkspace(2): ${deploy_helpers.toStringSafe(e)}`);

                        completed(completedErr);
                    });
                }
                else {
                    completed(completedErr);
                }
            }
            catch (e) {
                me.context.log(`[ERROR] DeployPluginWithContextBase.deployWorkspace(1): ${deploy_helpers.toStringSafe(e)}`);

                completed(completedErr);
            }
        };

        try {
            // create context...
            this.createContext(target).then((wrapper) => {
                try {
                    let deployNext: () => void;

                    // report that single file
                    // deployment has been completed
                    let fileCompleted = function(file: string, err?: any) {
                        if (opts.onFileCompleted) {
                            opts.onFileCompleted(me, {
                                error: err,
                                file: file,
                                target: target,
                            });
                        }

                        deployNext();  // deploy next
                    };

                    let filesTodo = files.map(x => x);  // create "TODO"" list
                    deployNext = () => {
                        if (filesTodo.length < 1) {
                            destroyContext(wrapper);
                            return;
                        }

                        let currentFile = filesTodo.shift();
                        try {
                            me.deployFileWithContext(wrapper.context,
                                                     currentFile, target, {
                                                         onBeforeDeploy: (sender, e) => {
                                                             if (opts.onBeforeDeployFile) {
                                                                 opts.onBeforeDeployFile(sender, {
                                                                     file: e.file,
                                                                     target: e.target,
                                                                 });
                                                             }
                                                         },

                                                         onCompleted: (sender, e) => {
                                                             fileCompleted(e.file, e.error);
                                                         }
                                                     });
                        }
                        catch (e) {
                            fileCompleted(currentFile, e); // deploy error
                        }
                    };

                    deployNext();  // start with first file
                }
                catch (e) {
                    destroyContext(wrapper, e);  // global deploy error
                }
            }).catch((err) => {
                completed(err);  // could not create context
            });
        }
        catch (e) {
            completed(e);  // global error
        }
    }
}
