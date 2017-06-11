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
import * as FS from 'fs';
import * as i18 from './i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';
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
export abstract class DeployPluginBase implements deploy_contracts.DeployPlugin, vscode.Disposable {
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

        deploy_globals.EVENTS.on(deploy_contracts.EVENT_CONFIG_RELOADED,
                                 this.onConfigReloaded);
    }

    /** @inheritdoc */
    public get canGetFileInfo(): boolean {
        return false;
    }

    /** @inheritdoc */
    public get canList(): boolean {
        return false;
    }

    /** @inheritdoc */
    public get canPull(): boolean {
        return false;
    }

    /** @inheritdoc */
    public async compareFiles(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileCompareResult> {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let wf = Workflows.create();

        // get info about REMOTE file
        wf.next(async (ctx) => {
            return await me.getFileInfo(file, target, opts);
        });

        // check if local file exists
        wf.next((ctx) => {
            let right: deploy_contracts.FileInfo = ctx.previousValue;

            return new Promise<any>((resolve, reject) => {
                try {
                    let left: deploy_contracts.FileInfo = {
                        exists: undefined,
                        isRemote: false,
                        type: deploy_contracts.FileSystemType.File,
                    };

                    FS.exists(file, (exists) => {
                        left.exists = exists;

                        if (!left.exists) {
                            ctx.finish();  // no need to get local file info
                        }

                        let result: deploy_contracts.FileCompareResult = {
                            left: left,
                            right: right,
                        };

                        ctx.result = result;
                        resolve(result);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        });

        // get local file info
        wf.next((ctx) => {
            let result: deploy_contracts.FileCompareResult = ctx.previousValue;

            return new Promise<any>((resolve, reject) => {
                FS.lstat(file, (err, stat) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        try {
                            result.left.name = Path.basename(file);
                            result.left.path = Path.dirname(file);
                            result.left.modifyTime = Moment(stat.ctime);
                            result.left.size = stat.size;

                            resolve(result);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });

        return await wf.start();
    }

    /** @inheritdoc */
    public async compareWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileCompareResult[]> {
        let me = this;
        
        let wf = Workflows.create();

        wf.next((ctx) => {
            ctx.result = [];
        });

        files.forEach(f => {
            wf.next(async (ctx) => {
                let compareResult = await me.compareFiles(f, target, opts);
                ctx.result.push(compareResult);

                return compareResult;
            });
        });

        return await wf.start();
    }

    /**
     * Gets the underlying deploy context.
     */
    public get context(): deploy_contracts.DeployContext {
        return this._context;
    }

    /**
     * Creates a basic data transformer context.
     * 
     * @param {deploy_contracts.TransformableDeployTarget} target The target.
     * @param {deploy_contracts.DataTransformerMode} mode The mode.
     * @param {any} [subCtx] The "sub" context. 
     */
    protected createDataTransformerContext(target: deploy_contracts.TransformableDeployTarget,
                                           mode: deploy_contracts.DataTransformerMode,
                                           subCtx: any = {}): deploy_contracts.DataTransformerContext {
        let me = this;

        return {
            context: subCtx,
            data: undefined,
            emitGlobal: function() {
                return me.context
                         .emitGlobal
                         .apply(me.context, arguments);
            },
            globals: me.context.globals(),
            mode: mode,
            options: deploy_helpers.cloneObject((target || {}).transformerOptions),
            replaceWithValues: (val) => {
                return me.context.replaceWithValues(val);
            },
            require: function(id) {
                return me.context.require(id);
            },
        };
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

    /** @inheritdoc */
    public getFileInfo(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): PromiseLike<deploy_contracts.FileInfo> | deploy_contracts.FileInfo {
        throw new Error("Not implemented!");
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
            return deploy_helpers.normalizeString(val);
        };

        let myTargetName = normalizeString(target.name);

        let targetNames = deploy_helpers.asArray(otherTargets)
                                        .map(x => normalizeString(x))
                                        .filter(x => '' !== x);

        if (targetNames.indexOf(myTargetName) > -1) {
            // no recurrence!
            vscode.window.showWarningMessage(i18.t('targets.cannotUseRecurrence', myTargetName));
        }

        // prevent recurrence
        targetNames = targetNames.filter(x => x !== myTargetName);

        let knownTargets = this.context.targets();
        let knownPlugins = this.context.plugins();

        // first find targets by name
        let foundTargets: deploy_contracts.DeployTarget[] = [];
        targetNames.forEach(tn => {
            let found = false;
            knownTargets.forEach(t => {
                if (normalizeString(t.name) === tn) {
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

                if (!pluginType || (pluginType === normalizeString(t.type))) {
                    newBatchTarget.plugins
                                  .push(pi);
                }
            });

            batchTargets.push(newBatchTarget);
        });

        return batchTargets;
    }

    /** @inheritdoc */
    public list(path: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.ListDirectoryOptions): deploy_contracts.ListDirectoryResult {
        throw new Error("Not implemented!");
    }

    /**
     * Loads a data transformer by target.

     * @param {TTarget} target The target.
     * @param {deploy_contracts.DataTransformerMode} mode The mode.
     * @param {(t: TTarget) => string} [scriptProvider] The custom logic to get the script path.
     * 
     * @returns {deploy_contracts.DataTransformer} The loaded transformer.
     */
    protected loadDataTransformer<TTarget extends deploy_contracts.TransformableDeployTarget>(target: TTarget,
                                                                                              mode: deploy_contracts.DataTransformerMode,
                                                                                              scriptProvider?: (t: TTarget) => string): deploy_contracts.DataTransformer {
        if (!scriptProvider) {
            scriptProvider = (t) => t.transformer;  // default
        }
        
        let transformer: deploy_contracts.DataTransformer;

        let script = deploy_helpers.toStringSafe(scriptProvider(target));
        script = this.context.replaceWithValues(script);
        if (!deploy_helpers.isEmptyString(script)) {
            let scriptModule = deploy_helpers.loadDataTransformerModule(script);
            if (scriptModule) {
                switch (mode) {
                    case deploy_contracts.DataTransformerMode.Restore:
                        transformer = scriptModule.restoreData;
                        if (!transformer) {
                            transformer = scriptModule.transformData;
                        }
                        break;

                    case deploy_contracts.DataTransformerMode.Transform:
                        transformer = scriptModule.transformData;
                        if (!transformer) {
                            transformer = scriptModule.restoreData;
                        }
                        break;
                }
            }
        }

        return deploy_helpers.toDataTransformerSafe(transformer);
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

        let completedInvoked = false;
        let completed = (sender: any, e: deploy_contracts.FileDeployCompletedEventArguments) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;
            if (opts.onCompleted) {
                opts.onCompleted(sender, {
                    canceled: e.canceled,
                    error: e.error,
                    file: e.file,
                    target: e.target,
                });
            }
        };

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
                completed(sender, e);
            },

            onCompleted: (sender, e) => {
                completed(sender, {
                    canceled: e.canceled,
                    error: e.error,
                    file: file,
                    target: e.target,
                });
            },
        });
    }

    /** @inheritdoc */
    public abstract deployWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployWorkspaceOptions);

    /** @inheritdoc */
    public pullFile(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let completedInvoked = false;
        let completed = (sender: any, e: deploy_contracts.FileDeployCompletedEventArguments) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;
            if (opts.onCompleted) {
                opts.onCompleted(sender, {
                    canceled: e.canceled,
                    error: e.error,
                    file: e.file,
                    target: e.target,
                });
            }
        };

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
                completed(sender, e);
            },

            onCompleted: (sender, e) => {
                completed(sender, {
                    canceled: e.canceled,
                    error: e.error,
                    file: file,
                    target: e.target,
                });
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
    /** @inheritdoc */
    public compareFiles(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileCompareResult> {
        let me = this;

        if (!opts) {
            opts = {};
        }
        
        return new Promise<deploy_contracts.FileCompareResult>((resolve, reject) => {
            let wrapper: DeployPluginContextWrapper<TContext>;
            let completed = (err: any, result?: deploy_contracts.FileCompareResult) => {
                let finished = () => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                };

                me.destroyContext(wrapper).then(() => {
                    finished();
                }).catch(() => {
                    finished();
                });
            };
            
            let wf = Workflows.create();

            // create context
            wf.next(async (wfCtx) => {
                wrapper = await me.createContext(target, [ file ], opts,
                                                 deploy_contracts.DeployDirection.FileInfo);
            });

            // compare file
            wf.next(async (wfCtx) => {
                wfCtx.result = await me.compareFilesWithContext(wrapper.context,
                                                                file, target, opts);
            });

            wf.start().then((result: deploy_contracts.FileCompareResult) => {
                completed(null, result);
            }).catch((err) => {
                completed(err);
            });
        });
    }

    /**
     * Compares a local file with a remote one by using a context.
     * 
     * @param {TContext} ctx The context.
     * @param {string} file The file to compare.
     * @param {DeployTarget} target The source from where to download the file from.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {Promise<FileCompareResult>} The result.
     */
    protected async compareFilesWithContext(ctx: TContext,
                                            file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileCompareResult> {
        let me = this;

        let wf = Workflows.create();

        // get info about REMOTE file
        wf.next(async () => {
            return await me.getFileInfoWithContext(ctx,
                                                   file, target, opts);
        });

        // check if local file exists
        wf.next((ctx) => {
            let right: deploy_contracts.FileInfo = ctx.previousValue;

            return new Promise<any>((resolve, reject) => {
                try {
                    let left: deploy_contracts.FileInfo = {
                        exists: undefined,
                        isRemote: false,
                        type: deploy_contracts.FileSystemType.File,
                    };

                    FS.exists(file, (exists) => {
                        left.exists = exists;

                        if (!left.exists) {
                            ctx.finish();  // no need to get local file info
                        }

                        let result: deploy_contracts.FileCompareResult = {
                            left: left,
                            right: right,
                        };

                        ctx.result = result;
                        resolve(result);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        });

        // get local file info
        wf.next((ctx) => {
            let result: deploy_contracts.FileCompareResult = ctx.previousValue;

            return new Promise<any>((resolve, reject) => {
                FS.lstat(file, (err, stat) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        try {
                            result.left.name = Path.basename(file);
                            result.left.path = Path.dirname(file);
                            result.left.modifyTime = Moment(stat.ctime);
                            result.left.size = stat.size;

                            resolve(result);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });

        return await wf.start();
    }

    /** @inheritdoc */
    public compareWorkspace(files: string[], target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileCompareResult[]> {
        let me = this;

        if (!opts) {
            opts = {};
        }
        
        return new Promise<deploy_contracts.FileCompareResult[]>((resolve, reject) => {
            let wrapper: DeployPluginContextWrapper<TContext>;
            let completed = (err: any, result?: deploy_contracts.FileCompareResult[]) => {
                let finished = () => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                };

                me.destroyContext(wrapper).then(() => {
                    finished();
                }).catch(() => {
                    finished();
                });
            };
            
            let wf = Workflows.create();

            // create context
            wf.next(async (ctx) => {
                wrapper = await me.createContext(target, files, opts,
                                                 deploy_contracts.DeployDirection.FileInfo);

                ctx.result = [];
            });

            // check files
            files.forEach(f => {
                wf.next(async (ctx) => {
                    let compareResult = await me.compareFilesWithContext(wrapper.context,
                                                                         f, target, opts);
                    ctx.result.push(compareResult);

                    return compareResult;
                });
            });

            wf.start().then((result: deploy_contracts.FileCompareResult[]) => {
                completed(null, result);
            }).catch((err) => {
                completed(err);
            });
        });
    }

    /**
     * Creates a new context for a target.
     * 
     * @param {deploy_contracts.DeployTarget} target The target.
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployFileOptions|deploy_contracts.DeployWorkspaceOptions|deploy_contracts.ListDirectoryOptions} opts The underlying options.
     * @param {deploy_contracts.DeployDirection} direction The direction.
     * 
     * @return {Promise<DeployPluginContextWrapper<TContext>>} The promise.
     */
    protected abstract createContext(target: deploy_contracts.DeployTarget,
                                     files: string[],
                                     opts: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions | deploy_contracts.ListDirectoryOptions,
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

    /**
     * Destroys a context.
     * 
     * @param {DeployPluginContextWrapper<TContext>} wrapper The wrapper with the context.
     * 
     * @return {Promise<TContext>} The promise.
     */
    protected async destroyContext(wrapper: DeployPluginContextWrapper<TContext>): Promise<TContext> {
        if (wrapper) {
            if (wrapper.destroy) {
                return await wrapper.destroy();
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
     * 
     * @return {Promise<Buffer>|Buffer} The result.
     */
    protected downloadFileWithContext(ctx: TContext,
                                      file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> | Buffer {
        throw new Error("Not implemented!");
    }

    /** @inheritdoc */
    public getFileInfo(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        let me = this;

        if (!opts) {
            opts = {};
        }

        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<deploy_contracts.FileInfo>(resolve, reject);

            let wf = Workflows.create();
            
            let wrapper: DeployPluginContextWrapper<TContext>;
            wf.once('end', (err: any, wcnt: number, info?: deploy_contracts.FileInfo) => {
                if (wrapper) {
                    if (wrapper.destroy) {
                        try {
                            Promise.resolve(wrapper.destroy()).then(() => {
                                completed(err, info);
                            }).catch((e) => {
                                me.context.log(i18.t('errors.withCategory',
                                                     'DeployPluginWithContextBase.getFileInfo(2)', e));

                                completed(err, info);
                            });
                        }
                        catch (e) {
                            me.context.log(i18.t('errors.withCategory',
                                                 'DeployPluginWithContextBase.getFileInfo(1)', e));

                            completed(err, info);
                        }
                    }
                    else {
                        completed(err, info);
                    }
                }
                else {
                    completed(err, info);
                }
            });

            // create context
            wf.next(async (ctx) => {
                return await me.createContext(target, [ file ], opts, deploy_contracts.DeployDirection.FileInfo);
            });

            // get file info
            wf.next(async (ctx) => {
                wrapper = ctx.previousValue;

                return await me.getFileInfoWithContext(wrapper.context,
                                                       file, target, opts);
            });

            // write result
            wf.next((ctx) => {
                ctx.result = ctx.previousValue;
            });

            wf.start().then(() => {
                // is done by 'end' event
            }).catch((err) => {
                // is done by 'end' event
            });
        });
    }

    /**
     * Gets the info of a file by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {Promise<deploy_contracts.FileInfo>|deploy_contracts.FileInfo} The result.
     */
    protected getFileInfoWithContext(ctx: TContext,
                                     file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> | deploy_contracts.FileInfo {
        throw new Error("Not implemented!");
    }

    /** @inheritdoc */
    public list(path: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.ListDirectoryOptions): deploy_contracts.ListDirectoryResult {
        let me = this;

        if (!opts) {
            opts = {};
        }

        return new Promise<deploy_contracts.FileSystemInfo[]>((resolve, reject) => {
            let completed = (err: any, items?: deploy_contracts.FileSystemInfo[]) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve( deploy_helpers.asArray(items)
                                           .filter(x => x) );
                }
            };

            let wf = Workflows.create();
            
            let wrapper: DeployPluginContextWrapper<TContext>;
            wf.once('end', (err: any, wcnt: number, items?: deploy_contracts.FileSystemInfo[]) => {
                me.destroyContext(wrapper).then(() => {
                    completed(err, items);
                }).catch(() => {
                    completed(err, items);
                });
            });

            // create context
            wf.next(async (ctx) => {
                return await me.createContext(target, [ ], opts, deploy_contracts.DeployDirection.ListDirectory);
            });

            // get file info
            wf.next(async (ctx) => {
                wrapper = ctx.previousValue;

                return await me.listWithContext(wrapper.context,
                                                null, target, opts);
            });

            // write result
            wf.next((ctx) => {
                ctx.result = ctx.previousValue;
            });

            wf.start().then(() => {
                // is done by 'end' event
            }).catch((err) => {
                // is done by 'end' event
            });
        });
    }

    /**
     * Lists the content of a directory by using a context.
     * 
     * @param {TContext} ctx The context to use.
     * @param {string} path The path of the directory to list.
     * @param {DeployTarget} target The target that contains the file to pull.
     * @param {deploy_contracts.ListDirectoryOptions} opts Additional options.
     * 
     * @return {deploy_contracts.ListDirectoryResult} The result.
     */
    protected listWithContext(ctx: TContext,
                              path: string, target: deploy_contracts.DeployTarget, opts: deploy_contracts.ListDirectoryOptions): deploy_contracts.ListDirectoryResult {
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
    public get canGetFileInfo(): boolean {
        return true;
    }

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

                    if (deploy_contracts.DeployDirection.Deploy === direction) {
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
            let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory);
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
                let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory);
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

    /** @inheritdoc */
    public getFileInfo(file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        let me = this;

        if (!opts) {
            opts = {};
        }

        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<deploy_contracts.FileInfo>(resolve, reject);

            let wf = Workflows.create();
            
            let wrapper: DeployPluginContextWrapper<any>;
            let destroyContext = (err: any, info?: deploy_contracts.FileInfo) => {
                if (!info) {
                    info = {
                        exists: false,
                        isRemote: true,
                        type: deploy_contracts.FileSystemType.File,
                    };
                }

                if (wrapper) {
                    if (wrapper.destroy) {
                        try {
                            Promise.resolve(wrapper.destroy()).then(() => {
                                completed(null, info);
                            }).catch((e) => {
                                me.context.log(i18.t('errors.withCategory',
                                                     'ZipFileDeployPluginBase.getFileInfo(2)', e));

                                completed(null, info);
                            });
                        }
                        catch (e) {
                            me.context.log(i18.t('errors.withCategory',
                                                 'ZipFileDeployPluginBase.getFileInfo(1)', e));

                            completed(null, info);
                        }
                    }
                    else {
                        completed(null, info);
                    }
                }
                else {
                    completed(null, info);
                }
            };

            // create context
            wf.next(async (ctx) => {
                return await me.createContext(target, [ file ], opts, deploy_contracts.DeployDirection.FileInfo);
            });

            // get file info
            wf.next(async (ctx) => {
                wrapper = ctx.previousValue;

                return await me.getFileInfoWithContext(wrapper.context,
                                                       file, target, opts);
            });

            // write result
            wf.next((ctx) => {
                ctx.result = ctx.previousValue;
            });

            wf.start().then((info) => {
                destroyContext(null, info);
            }).catch((err) => {
                destroyContext(err);
            });
        });
    }

    /** @inheritdoc */
    protected getFileInfoWithContext(zipFile: any,
                                     file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): deploy_contracts.FileInfo {
        if (!opts) {
            opts = {};
        }

        let me = this;

        me.getFileInfo

        let hasCancelled = false;
        let result: deploy_contracts.FileInfo = {
            exists: false,
            isRemote: true,
            type: deploy_contracts.FileSystemType.File,
        };

        me.onCancelling(() => hasCancelled = true);

        let err: any;
        try {
            if (!hasCancelled) {
                let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory);
                if (false === relativePath) {
                    relativePath = file;
                }

                let zipEntry = (<string>relativePath).trim();
                while (0 === zipEntry.indexOf('/')) {
                    zipEntry = zipEntry.substr(1);
                }

                if (zipFile.files && zipFile.files[zipEntry]) {
                    let f = zipFile.files[zipEntry];
                    if (f) {
                        result.exists = true;

                        // last change date
                        if (!deploy_helpers.isNullUndefinedOrEmptyString(f.date)) {
                            try {
                                result.modifyTime = Moment(f.date);
                            }
                            catch (e) {
                                // TODO: log
                            }
                        }

                        // file size
                        try {
                            let data: Buffer = f.asNodeBuffer();
                            if (data) {
                                result.size = data.length;
                            }
                        }
                        catch (e) {
                            // TODO: log
                        }

                        // filename
                        try {
                            result.name = Path.basename(relativePath);
                        }
                        catch (e) {
                            result.name = deploy_helpers.toStringSafe(f.name);
                        }

                        // path
                        try {
                            result.path = Path.dirname(relativePath);
                        }
                        catch (e) {
                            result.path = relativePath;
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
 * A basic object cache.
 * 
 * @template T Type of the objects.
 */
export abstract class ObjectCacheBase<T> implements deploy_contracts.ObjectCache<T> {
    /** @inheritdoc */
    public abstract get<TValue>(obj: T, name: string, defaultValue?: TValue): TValue;

    /** @inheritdoc */
    public has(obj: T, name: string): boolean {
        let notFound = Symbol('NOT_FOUND');

        return notFound !== this.get<any>(obj, name,
                                          notFound);
    }

    /**
     * Normalizes a value name.
     * 
     * @param string name The input value.
     * 
     * @return {string} The output value. 
     */
    public static normalizeName(name: string): string {
        return deploy_helpers.normalizeString(name);
    }

    /** @inheritdoc */
    public abstract set<TValue>(obj: T, name: string, value: TValue): this;
}

/**
 * A cache for targets.
 */
export class DeployTargetCache extends ObjectCacheBase<deploy_contracts.DeployTarget> {
    /**
     * The underlying storage.
     */
    protected _storage: any = {};

    /** @inheritdoc */
    public get<TValue>(target: deploy_contracts.DeployTarget, name: string, defaultValue?: TValue): TValue {
        let targetKey = this.getStorageKeyForTarget(target);
        name = DeployTargetCache.normalizeName(name);

        let targetItem = this._storage[targetKey];
        if (!deploy_helpers.isNullOrUndefined(targetItem)) {
            for (let p in targetItem) {
                if (p === name) {
                    return targetItem[p];
                }
            }
        }

        return defaultValue;
    }

    /**
     * Returns the storage key for a target.
     * 
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @returns {string} The key.
     */
    protected getStorageKeyForTarget(target: deploy_contracts.DeployTarget): string {
        let key: string;

        if (target) {
            key = deploy_helpers.toStringSafe(target.__id) + '::' + deploy_helpers.normalizeString(target.name);
        }

        return key;
    }

    /** @inheritdoc */
    public set<TValue>(target: deploy_contracts.DeployTarget, name: string, value: TValue): this {
        let targetKey = this.getStorageKeyForTarget(target);
        name = DeployTargetCache.normalizeName(name);

        let targetItem = this._storage[targetKey];
        if (deploy_helpers.isNullOrUndefined(targetItem)) {
            this._storage[targetKey] = targetItem = {};
        }

        targetItem[name] = value;

        return this;
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
