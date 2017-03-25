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
import * as deploy_globals from './globals';
import * as deploy_helpers from './helpers';
import * as Events from 'events';
import * as FS from 'fs';
import * as i18 from './i18';
import * as vscode from 'vscode';
const Zip = require('node-zip');


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
 * A multi target context.
 */
export interface MultiTargetContext {
    /**
     * Stores if operation has been cancelled or not.
     */
    hasCancelled: boolean;
    /**
     * The targets.
     */
    targets: deploy_contracts.DeployTargetWithPlugins[];
}

/**
 * A basic deploy plugin that is specially based on single
 * file operations (s. deployFile() method).
 */
export abstract class DeployPluginBase extends Events.EventEmitter implements deploy_contracts.DeployPlugin, vscode.Disposable {
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
        super();

        this._context = ctx;

        deploy_globals.EVENTS.on(deploy_contracts.EVENT_CONFIG_RELOADED,
                                 this.onConfigReloaded);
    }

    /** @inheritdoc */
    public get canPull(): boolean {
        return false;
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

        let hasCancelled = false;
        let filesTodo = files.map(x => x);
        let completed = (err?: any) => {
            filesTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        hasCancelled = me.context.isCancelling();
        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            try {
                let deployNextFile: () => void;

                let fileCompleted = function(sender: any, e: deploy_contracts.FileDeployCompletedEventArguments) {
                    try {
                        if (opts.onFileCompleted) {
                            opts.onFileCompleted(sender, e);
                        }

                        hasCancelled = hasCancelled || deploy_helpers.toBooleanSafe(e.canceled);
                        if (hasCancelled) {
                            completed();  // cancellation requested
                        }
                        else {
                            deployNextFile();
                        }
                    }
                    catch (err) {
                        me.context.log(i18.t('errors.withCategory',
                                             'DeployPluginBase.deployWorkspace(1)', err));
                    }
                };

                deployNextFile = () => {
                    if (filesTodo.length < 1) {
                        completed();
                        return;
                    }

                    let f = filesTodo.shift();
                    if (!f) {
                        completed();
                        return;
                    }
                    
                    try {
                        me.deployFile(f, target, {
                            context: opts.context,
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

    /** @inheritdoc */
    public dispose() {
        deploy_globals.EVENTS.removeListener(deploy_contracts.EVENT_CONFIG_RELOADED,
                                             this.onConfigReloaded);
    }

    /** @inheritdoc */
    public downloadFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> | Buffer {
        throw new Error("Not implemented!");
    }

    /**
     * Registers for a callback for a 'cancel' event that is called once.
     * 
     * @param {deploy_contracts.EventHandler} callback The callback to register.
     * @param {deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions} [opts] The underlying options.
     */
    protected onCancelling(callback: deploy_contracts.EventHandler,
                           opts?: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions) {
        let ctx: deploy_contracts.DeployContext;
        if (opts) {
            ctx = opts.context;
        }
        ctx = ctx || this.context;
        
        if (ctx) {
            ctx.once(deploy_contracts.EVENT_CANCEL_DEPLOY,
                     callback);
        }
    }

    /**
     * Is invoked after app config has been reloaded.
     * 
     * @param {deploy_contracts.DeployConfiguration} cfg The new config.
     */
    protected onConfigReloaded(cfg: deploy_contracts.DeployConfiguration) {
    }

    /** @inheritdoc */
    public pullFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }
        
        let hasCancelled = false;
        let completed = (err: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        let downloadCompleted = (downloadedData: Buffer) => {
            try {
                if (!downloadedData) {
                    downloadedData = Buffer.alloc(0);
                }

                if (hasCancelled) {
                    completed(null);
                }
                else {
                    FS.writeFile(file, downloadedData, (err) => {
                        completed(err);
                    });
                }
            }
            catch (e) {
                completed(e);
            }
        };

        me.onCancelling(() => hasCancelled = true);

        if (hasCancelled) {
            completed(null);
        }
        else {
            try {
                let result = this.downloadFile(file, target, {
                    baseDirectory: opts.baseDirectory,
                    context: opts.context,
                    onBeforeDeploy: opts.onBeforeDeploy,
                });

                if (result) {
                    if (hasCancelled) {
                        completed(null);
                    }
                    else {
                        if (Buffer.isBuffer(result)) {
                            downloadCompleted(result);
                        }
                        else {
                            result.then((d) => {
                                downloadCompleted(d);
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                    }
                }
                else {
                    downloadCompleted(null);
                }
            }
            catch (e) {
                completed(e);
            }
        }
    }

    /** @inheritdoc */
    public pullWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let hasCancelled = false;
        let filesTodo = files.map(x => x);
        let completed = (err?: any) => {
            filesTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        hasCancelled = me.context.isCancelling();
        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            try {
                let pullNextFile: () => void;

                let fileCompleted = function(sender: any, e: deploy_contracts.FileDeployCompletedEventArguments) {
                    try {
                        if (opts.onFileCompleted) {
                            opts.onFileCompleted(sender, e);
                        }

                        hasCancelled = hasCancelled || deploy_helpers.toBooleanSafe(e.canceled);
                        if (hasCancelled) {
                            completed();  // cancellation requested
                        }
                        else {
                            pullNextFile();
                        }
                    }
                    catch (err) {
                        me.context.log(i18.t('errors.withCategory',
                                             'DeployPluginBase.pullWorkspace(1)', err));
                    }
                };

                pullNextFile = () => {
                    if (filesTodo.length < 1) {
                        completed();
                        return;
                    }

                    let f = filesTodo.shift();
                    if (!f) {
                        completed();
                        return;
                    }
                    
                    try {
                        me.pullFile(f, target, {
                            context: opts.context,
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

                pullNextFile();
            }
            catch (e) {
                completed(e);
            }
        }
    }
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
            context: opts.context,

            onBeforeDeployFile: (sender, e) => {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(sender, {
                        destination: e.destination,
                        file: e.file,
                        target: e.target,
                    });
                }
            },

            onFileCompleted: (sender, e) => {
                if (opts.onCompleted) {
                    opts.onCompleted(sender, {
                        canceled: e.canceled,
                        error: e.error,
                        file: file,
                        target: e.target,
                    });
                }
            }
        });
    }

    /** @inheritdoc */
    public abstract deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions);

    /** @inheritdoc */
    public pullFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        this.pullWorkspace([ file ], target, {
            context: opts.context,

            onBeforeDeployFile: (sender, e) => {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(sender, {
                        destination: e.destination,
                        file: e.file,
                        target: e.target,
                    });
                }
            },

            onFileCompleted: (sender, e) => {
                if (opts.onCompleted) {
                    opts.onCompleted(sender, {
                        canceled: e.canceled,
                        error: e.error,
                        file: file,
                        target: e.target,
                    });
                }
            },
        });
    }

    /** @inheritdoc */
    public pullWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let hasCancelled = false;

        files.forEach(x => {
            hasCancelled = hasCancelled || me.context.isCancelling();

            if (opts.onBeforeDeployFile) {
                opts.onBeforeDeployFile(me, {
                    destination: null,
                    file: x,
                    target: target,
                });
            }

            if (opts.onFileCompleted) {
                opts.onFileCompleted(me, {
                    canceled: hasCancelled,
                    error: new Error("Not implemented!"),
                    file: x,
                    target: target,
                });
            }
        });

        hasCancelled = hasCancelled || me.context.isCancelling();

        if (opts.onCompleted) {
            opts.onCompleted(me, {
                canceled: hasCancelled,
                error: new Error("Not implemented!"),
                target: target,
            });
        }
    }
}

/**
 * A basic deploy plugin that is specially based on multi
 * file operations which uses a context, like a network connection (s. deployFileWithContext() method).
 */
export abstract class DeployPluginWithContextBase<TContext> extends MultiFileDeployPluginBase {
    /**
     * Creates a new context for a target.
     * 
     * @param {deploy_contracts.DeployTarget} target The target.
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployFileOptions|deploy_contracts.DeployWorkspaceOptions} opts The underlying options.
     * @param {deploy_contracts.DeployDirection} direction The direction.
     * 
     * @return {Promise<DeployPluginContextWrapper<TContext>>} The promise.
     */
    protected abstract createContext(target: deploy_contracts.DeployTarget,
                                     files: string[],
                                     opts: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions,
                                     direction: deploy_contracts.DeployDirection): Promise<DeployPluginContextWrapper<TContext>>;

    /**
     * Deploys a file by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    protected abstract deployFileWithContext(ctx: TContext,
                                             file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void;

    /** @inheritdoc */
    public deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        if (!opts) {
            opts = {};
        }

        let me = this;
        
        // report that whole operation has been completed
        let filesTodo = files.map(x => x);  // create "TODO"" list
        let hasCancelled = false;
        let completed = (err?: any) => {
            filesTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        hasCancelled = me.context.isCancelling();
        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            // destroy context before raise
            // "completed" event
            let destroyContext = (wrapper: DeployPluginContextWrapper<TContext>, completedErr?: any) => {
                try {
                    if (wrapper.destroy) {
                        // destroy context

                        wrapper.destroy().then(() => {
                            completed(completedErr);
                        }).catch((e) => {
                            me.context.log(i18.t('errors.withCategory',
                                                 'DeployPluginWithContextBase.deployWorkspace(2)', e));

                            completed(completedErr);
                        });
                    }
                    else {
                        completed(completedErr);
                    }
                }
                catch (e) {
                    me.context.log(i18.t('errors.withCategory',
                                         'DeployPluginWithContextBase.deployWorkspace(1)', e));

                    completed(completedErr);
                }
            };

            try {
                // create context...
                this.createContext(target, files, opts, deploy_contracts.DeployDirection.Deploy).then((wrapper) => {
                    try {
                        let deployNext: () => void;

                        // report that single file
                        // deployment has been completed
                        let fileCompleted = function(file: string, err?: any, canceled?: boolean) {
                            if (opts.onFileCompleted) {
                                opts.onFileCompleted(me, {
                                    canceled: canceled,
                                    error: err,
                                    file: file,
                                    target: target,
                                });
                            }

                            hasCancelled = hasCancelled || deploy_helpers.toBooleanSafe(canceled);
                            if (hasCancelled) {
                                destroyContext(wrapper, null);
                            }
                            else {
                                deployNext();  // deploy next
                            }
                        };

                        deployNext = () => {
                            if (filesTodo.length < 1) {
                                destroyContext(wrapper);
                                return;
                            }

                            let currentFile = filesTodo.shift();
                            try {
                                me.deployFileWithContext(wrapper.context,
                                                         currentFile, target, {
                                                             context: opts.context,

                                                             onBeforeDeploy: (sender, e) => {
                                                                 if (opts.onBeforeDeployFile) {
                                                                     opts.onBeforeDeployFile(sender, {
                                                                         destination: e.destination,
                                                                         file: e.file,
                                                                         target: e.target,
                                                                     });
                                                                 }
                                                             },

                                                             onCompleted: (sender, e) => {
                                                                 fileCompleted(e.file, e.error, e.canceled);
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

    /** @inheritdoc */
    public downloadFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> | Buffer {
        if (!opts) {
            opts = {};
        }
        
        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let completed = (err: any, data?: Buffer) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            };

            // destroy context before raise
            // "completed" event
            let destroyContext = (wrapper: DeployPluginContextWrapper<TContext>,
                                  completedErr: any, data?: Buffer) => {
                try {
                    if (wrapper.destroy) {
                        // destroy context

                        wrapper.destroy().then(() => {
                            completed(completedErr, data);
                        }).catch((e) => {
                            me.context.log(i18.t('errors.withCategory',
                                                 'DeployPluginWithContextBase.downloadFile(2)', e));

                            completed(completedErr, data);
                        });
                    }
                    else {
                        completed(completedErr, data);
                    }
                }
                catch (e) {
                    me.context.log(i18.t('errors.withCategory',
                                         'DeployPluginWithContextBase.downloadFile(1)', e));

                    completed(completedErr, data);
                }
            };

            // create context...
            me.createContext(target, [ file ], opts, deploy_contracts.DeployDirection.Download).then((wrapper) => {
                try {
                    let result = me.downloadFileWithContext(wrapper.context, file, target, opts);
                    if (result) {
                        if (Buffer.isBuffer(result)) {
                            destroyContext(wrapper, null, result);
                        }
                        else {
                            result.then((data) => {
                                destroyContext(wrapper, null, data);
                            }).catch((err) => {
                                destroyContext(wrapper, err);
                            });
                        }
                    }
                    else {
                        destroyContext(wrapper, null);
                    }
                }
                catch (e) {
                    destroyContext(wrapper, e);
                }
            }).catch((err) => {
                completed(err);
            });
        });
    }
    
    /**
     * Downloads a file by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    protected downloadFileWithContext(ctx: TContext,
                                      file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> | Buffer {
        throw new Error("Not implemented!");
    }

    /**
     * Pulls a file by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    protected pullFileWithContext(ctx: TContext,
                                  file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;
        
        if (!opts) {
            opts = {};
        }
        
        let hasCancelled = false;
        let completed = (err: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        let downloadCompleted = (downloadedData: Buffer) => {
            try {
                if (!downloadedData) {
                    downloadedData = Buffer.alloc(0);
                }

                if (hasCancelled) {
                    completed(null);
                }
                else {
                    FS.writeFile(file, downloadedData, (err) => {
                        completed(err);
                    });
                }
            }
            catch (e) {
                completed(e);
            }
        };

        me.onCancelling(() => hasCancelled = true);

        if (hasCancelled) {
            completed(null);
        }
        else {
            try {
                let result = this.downloadFileWithContext(ctx, file, target, {
                    baseDirectory: opts.baseDirectory,
                    context: opts.context,
                    onBeforeDeploy: opts.onBeforeDeploy,
                });

                if (result) {
                    if (hasCancelled) {
                        completed(null);
                    }
                    else {
                        if (Buffer.isBuffer(result)) {
                            downloadCompleted(result);
                        }
                        else {
                            result.then((d) => {
                                downloadCompleted(d);
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                    }
                }
                else {
                    downloadCompleted(null);
                }
            }
            catch (e) {
                completed(e);
            }
        }
    }

    /** @inheritdoc */
    public pullWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        if (!opts) {
            opts = {};
        }

        let me = this;
        
        // report that whole operation has been completed
        let filesTodo = files.map(x => x);  // create "TODO"" list
        let hasCancelled = false;
        let completed = (err?: any) => {
            filesTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        hasCancelled = me.context.isCancelling();
        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            // destroy context before raise
            // "completed" event
            let destroyContext = (wrapper: DeployPluginContextWrapper<TContext>, completedErr?: any) => {
                try {
                    if (wrapper.destroy) {
                        // destroy context

                        wrapper.destroy().then(() => {
                            completed(completedErr);
                        }).catch((e) => {
                            me.context.log(i18.t('errors.withCategory',
                                                 'DeployPluginWithContextBase.pullWorkspace(2)', e));

                            completed(completedErr);
                        });
                    }
                    else {
                        completed(completedErr);
                    }
                }
                catch (e) {
                    me.context.log(i18.t('errors.withCategory',
                                         'DeployPluginWithContextBase.pullWorkspace(1)', e));

                    completed(completedErr);
                }
            };

            try {
                // create context...
                this.createContext(target, files, opts, deploy_contracts.DeployDirection.Pull).then((wrapper) => {
                    try {
                        let pullNext: () => void;

                        // report that single file
                        // pull has been completed
                        let fileCompleted = function(file: string, err?: any, canceled?: boolean) {
                            if (opts.onFileCompleted) {
                                opts.onFileCompleted(me, {
                                    canceled: canceled,
                                    error: err,
                                    file: file,
                                    target: target,
                                });
                            }

                            hasCancelled = hasCancelled || deploy_helpers.toBooleanSafe(canceled);
                            if (hasCancelled) {
                                destroyContext(wrapper, null);
                            }
                            else {
                                pullNext();  // pull next
                            }
                        };

                        pullNext = () => {
                            if (filesTodo.length < 1) {
                                destroyContext(wrapper);
                                return;
                            }

                            let currentFile = filesTodo.shift();
                            try {
                                me.pullFileWithContext(wrapper.context,
                                                       currentFile, target, {
                                                           context: opts.context,

                                                           onBeforeDeploy: (sender, e) => {
                                                               if (opts.onBeforeDeployFile) {
                                                                   opts.onBeforeDeployFile(sender, {
                                                                       destination: e.destination,
                                                                       file: e.file,
                                                                       target: e.target,
                                                                   });
                                                               }
                                                           },

                                                           onCompleted: (sender, e) => {
                                                               fileCompleted(e.file, e.error, e.canceled);
                                                           }
                                                       });
                            }
                            catch (e) {
                                fileCompleted(currentFile, e);  // pull error
                            }
                        };

                        pullNext();  // start with first file
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
}

/**
 * A deployer plugin that creates a ZIP file to deploy files to.
 */
export abstract class ZipFileDeployPluginBase extends DeployPluginWithContextBase<any> {
    /** @inheritdoc */
    protected createContext(target: deploy_contracts.DeployTarget,
                            files: string[], opts: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions,
                            direction: deploy_contracts.DeployDirection): Promise<DeployPluginContextWrapper<any>> {
        let me = this;

        let funcArgs = arguments;
        
        return new Promise<DeployPluginContextWrapper<any>>((resolve, reject) => {
            try {
                me.createZipFile.apply(me, funcArgs).then((zipFile) => {
                    let wrapper: DeployPluginContextWrapper<any> = {
                        context: zipFile,
                    };

                    if (deploy_contracts.DeployDirection.Deploy == direction) {
                        wrapper.destroy = () => {
                            return me.deployZipFile(zipFile, target);
                        };
                    }

                    resolve(wrapper);
                }, (err) => {
                    reject(err);
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Creates or loads a ZIP file instance.
     * 
     * @param {deploy_contracts.DeployTarget} target The target.
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployFileOptions|deploy_contracts.DeployWorkspaceOptions} opts The underlying options.
     * @param {deploy_contracts.DeployDirection} direction The direction.
     * 
     * @return {Promise<any>} The promise.
     */
    protected createZipFile(target: deploy_contracts.DeployTarget,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions,
                            direction: deploy_contracts.DeployDirection): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                resolve(new Zip());
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /** @inheritdoc */
    protected deployFileWithContext(zipFile: any,
                                    file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let hasCancelled = false;
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        hasCancelled = me.context.isCancelling();
        if (hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativePath) {
                relativePath = file;
            }

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: `zip://${relativePath}`,
                    file: file,
                    target: target,
                });
            }

            try {
                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    try {
                        let zipEntry = (<string>relativePath).trim();
                        while (0 === zipEntry.indexOf('/')) {
                            zipEntry = zipEntry.substr(1);
                        }

                        zipFile.file(zipEntry, data);

                        completed();
                    }
                    catch (e) {
                        completed(e);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        }
    }

    /**
     * Deploys a ZIP file.
     * 
     * @param {any} zipFile The file to deploy.
     * @param {deploy_contracts.DeployTarget} target The target where the file should be deployed to.
     * 
     * @return {Promise<any>} The promise.
     */
    protected abstract deployZipFile(zipFile: any, target: deploy_contracts.DeployTarget): Promise<any>;

    /** @inheritdoc */
    protected downloadFileWithContext(zipFile: any,
                                      file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> | Buffer {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let hasCancelled = false;
        let result: Buffer = null;

        me.onCancelling(() => hasCancelled = true);

        let err: any;
        try {
            if (!hasCancelled) {
                let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativePath) {
                    relativePath = file;
                }

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: `zip://${relativePath}`,
                        file: file,
                        target: target,
                    });
                }

                let zipEntry = (<string>relativePath).trim();
                while (0 === zipEntry.indexOf('/')) {
                    zipEntry = zipEntry.substr(1);
                }

                if (zipFile.files && zipFile.files[zipEntry]) {
                    let f = zipFile.files[zipEntry];
                    if (f) {
                        result = f.asNodeBuffer();
                        if (!result) {
                            throw new Error('No data!');  //TODO
                        }
                    }
                    else {
                        throw i18.t('plugins.zip.fileNotFound');
                    }
                }
                else {
                    throw i18.t('plugins.zip.fileNotFound');
                }
            }
        }
        catch (e) {
            err = e;
        }

        if (opts.onCompleted) {
            opts.onCompleted(me, {
                canceled: hasCancelled,
                error: err,
                file: file,
                target: target,
            });
        }
        
        if (err) {
            throw err;
        }

        return result;
    }
}

/**
 * A base plugin that deploys to other targets.
 */
export abstract class MultiTargetDeployPluginBase extends MultiFileDeployPluginBase {
    /**
     * Creates the context for this plugin.
     * 
     * @param {deploy_contracts.DeployTarget} target The target for this plugin.
     * 
     * @return {MultiTargetContext} The created context.
     */
    protected abstract createContext(target: deploy_contracts.DeployTarget): MultiTargetContext;

    /** @inheritdoc */
    public deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        if (!opts) {
            opts = {};
        }
        
        let me = this;

        let ctx = this.createContext(target);
        
        let targetsTodo = ctx.targets.map(x => x);
        let completed = (err?: any) => {
            targetsTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: ctx.hasCancelled,
                    target: target,
                });
            }
        };

        me.onCancelling(() => ctx.hasCancelled = true, opts);

        if (ctx.hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            try {
                let deployNextTarget: () => void;
                deployNextTarget = () => {
                    if (targetsTodo.length < 1) {
                        completed();
                        return;
                    }

                    if (ctx.hasCancelled) {
                        completed();
                        return;
                    }

                    let currentTarget = targetsTodo.shift();
                    let pluginsTodo = currentTarget.plugins.map(x => x);

                    let targetCompleted = (err?: any) => {
                        pluginsTodo = [];

                        deployNextTarget();
                    };

                    let deployNextPlugin: () => void;
                    deployNextPlugin = () => {
                        if (pluginsTodo.length < 1) {
                            targetCompleted();
                            return;
                        }

                        if (ctx.hasCancelled) {
                            completed();
                            return;
                        }

                        let pluginCompleted = (err?: any, canceled?: boolean) => {
                            deployNextPlugin();
                        };

                        let currentPlugin = pluginsTodo.shift();
                        try {
                            currentPlugin.deployWorkspace(files, currentTarget.target, {
                                context: opts.context,

                                onBeforeDeployFile: (sender, e) => {
                                    if (opts.onBeforeDeployFile) {
                                        let destination = deploy_helpers.toStringSafe(currentTarget.target.name).trim();
                                        if (!destination) {
                                            destination = deploy_helpers.toStringSafe(currentPlugin.__type).trim();
                                        }
                                        if (!destination) {
                                            deploy_helpers.toStringSafe(currentPlugin.__file).trim();
                                        }

                                        let originalDestination = deploy_helpers.toStringSafe(e.destination);
                                        if (destination) {
                                            destination = `[${destination}] ${originalDestination}`;
                                        }
                                        else {
                                            destination = originalDestination;
                                        }

                                        opts.onBeforeDeployFile(me, {
                                            destination: destination,
                                            file: e.file,
                                            target: e.target,
                                        });
                                    }
                                },
                                onCompleted: (sender, e) => {
                                    ctx.hasCancelled = ctx.hasCancelled || e.canceled;

                                    pluginCompleted(e.error, e.canceled);
                                },
                                onFileCompleted: (sender, e) => {
                                    if (opts.onFileCompleted) {
                                        opts.onFileCompleted(me, {
                                            canceled: e.canceled,
                                            error: e.error,
                                            file: e.file,
                                            target: e.target,
                                        });
                                    }
                                }
                            });
                        }
                        catch (e) {
                            targetCompleted(e);
                        }
                    };

                    deployNextPlugin();
                };

                deployNextTarget();
            }
            catch (e) {
                completed(e);
            }
        }
    }

    /**
     * Returns the others targets and their plugins.
     * 
     * @param {deploy_contracts.DeployTarget} target The target for this plugin.
     * @param {string | string[]} otherTargets The list of names of the "others" targets.
     * 
     * @return {deploy_contracts.DeployTargetWithPlugins[]} The targets and their plugins.
     */
    protected getTargetsWithPlugins(target: deploy_contracts.DeployTarget, otherTargets: string | string[]): deploy_contracts.DeployTargetWithPlugins[] {
        let batchTargets: deploy_contracts.DeployTargetWithPlugins[] = [];

        let normalizeString = (val: any): string => {
            return deploy_helpers.toStringSafe(val)
                                 .toLowerCase().trim();
        };

        let myTargetName = normalizeString(target.name);

        let targetNames = deploy_helpers.asArray(otherTargets)
                                        .map(x => normalizeString(x))
                                        .filter(x => x);

        if (targetNames.indexOf(myTargetName) > -1) {
            // no recurrence!
            vscode.window.showWarningMessage(i18.t('targets.cannotUseRecurrence', myTargetName));
        }

        // prevent recurrence
        targetNames = targetNames.filter(x => x != myTargetName);

        let knownTargets = this.context.targets();
        let knownPlugins = this.context.plugins();

        // first find targets by name
        let foundTargets: deploy_contracts.DeployTarget[] = [];
        targetNames.forEach(tn => {
            let found = false;
            knownTargets.forEach(t => {
                if (normalizeString(t.name) == tn) {
                    found = true;
                    foundTargets.push(t);
                }
            });

            if (!found) {
                // we have an unknown target here
                vscode.window.showWarningMessage(i18.t('targets.notFound', tn));
            }
        });

        // now collect plugins for each
        // found target
        foundTargets.forEach(t => {
            let newBatchTarget: deploy_contracts.DeployTargetWithPlugins = {
                plugins: [],
                target: t,
            };

            knownPlugins.forEach(pi => {
                let pluginType = normalizeString(pi.__type);

                if (!pluginType || (pluginType == normalizeString(t.type))) {
                    newBatchTarget.plugins
                                  .push(pi);
                }
            });

            batchTargets.push(newBatchTarget);
        });

        return batchTargets;
    }

    /** @inheritdoc */
    public pullWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions) {
        if (!opts) {
            opts = {};
        }
        
        let me = this;

        let ctx = this.createContext(target);
        
        let targetsTodo = ctx.targets.map(x => x);
        let completed = (err?: any) => {
            targetsTodo = [];

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: ctx.hasCancelled,
                    target: target,
                });
            }
        };

        ctx.hasCancelled = me.context.isCancelling();
        if (ctx.hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            try {
                let pullNextTarget: () => void;
                pullNextTarget = () => {
                    if (targetsTodo.length < 1) {
                        completed();
                        return;
                    }

                    if (ctx.hasCancelled) {
                        completed();
                        return;
                    }

                    let currentTarget = targetsTodo.shift();
                    let pluginsTodo = currentTarget.plugins.map(x => x);

                    let targetCompleted = (err?: any) => {
                        pluginsTodo = [];

                        pullNextTarget();
                    };

                    let pullNextPlugin: () => void;
                    pullNextPlugin = () => {
                        if (pluginsTodo.length < 1) {
                            targetCompleted();
                            return;
                        }

                        if (ctx.hasCancelled) {
                            completed();
                            return;
                        }

                        let pluginCompleted = (err?: any, canceled?: boolean) => {
                            pullNextPlugin();
                        };

                        let currentPlugin = pluginsTodo.shift();
                        try {
                            currentPlugin.pullWorkspace(files, currentTarget.target, {
                                context: opts.context,

                                onBeforeDeployFile: (sender, e) => {
                                    if (opts.onBeforeDeployFile) {
                                        let destination = deploy_helpers.toStringSafe(currentTarget.target.name).trim();
                                        if (!destination) {
                                            destination = deploy_helpers.toStringSafe(currentPlugin.__type).trim();
                                        }
                                        if (!destination) {
                                            deploy_helpers.toStringSafe(currentPlugin.__file).trim();
                                        }

                                        let originalDestination = deploy_helpers.toStringSafe(e.destination);
                                        if (destination) {
                                            destination = `[${destination}] ${originalDestination}`;
                                        }
                                        else {
                                            destination = originalDestination;
                                        }

                                        opts.onBeforeDeployFile(me, {
                                            destination: destination,
                                            file: e.file,
                                            target: e.target,
                                        });
                                    }
                                },
                                onCompleted: (sender, e) => {
                                    ctx.hasCancelled = ctx.hasCancelled || e.canceled;

                                    pluginCompleted(e.error, e.canceled);
                                },
                                onFileCompleted: (sender, e) => {
                                    if (opts.onFileCompleted) {
                                        opts.onFileCompleted(me, {
                                            canceled: e.canceled,
                                            error: e.error,
                                            file: e.file,
                                            target: e.target,
                                        });
                                    }
                                }
                            });
                        }
                        catch (e) {
                            targetCompleted(e);
                        }
                    };

                    pullNextPlugin();
                };

                pullNextTarget();
            }
            catch (e) {
                completed(e);
            }
        }
    }
}

/**
 * A simple popup button.
 */
export class SimplePopupButton implements deploy_contracts.PopupButton {
    /**
     * Stores the action.
     */
    protected _action: deploy_contracts.PopupButtonAction;
    /**
     * Stores the value that should be linked with that instance.
     */
    protected _tag: any;
    /**
     * Stores the title.
     */
    protected _title: string;

    /** @inheritdoc */
    public get action(): deploy_contracts.PopupButtonAction {
        return this._action;
    }
    public set action(newValue: deploy_contracts.PopupButtonAction) {
        this._action = newValue;
    }

    /** @inheritdoc */
    public get tag(): any {
        return this._tag;
    }
    public set tag(newValue: any) {
        this._tag = newValue;
    }

    /** @inheritdoc */
    public get title(): string {
        return this._title;
    }
    public set title(newValue: string) {
        this._title = newValue;
    }

    /** @inheritdoc */
    public toString(): string {
        return this._title || 'SimplePopupButton';
    }
}
