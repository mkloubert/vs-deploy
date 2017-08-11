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

import * as deploy_buttons from './buttons';
import * as deploy_commands from './commands';
import * as deploy_config from './config';
import * as deploy_contracts from './contracts';
import * as deploy_diff from './diff';
import * as deploy_helpers from './helpers';
import * as deploy_globals from './globals';
import * as deploy_objects from './objects';
import * as deploy_operations from './operations';
import * as deploy_packages from './packages';
import * as deploy_plugins from './plugins';
import * as deploy_sync from './sync';
import * as deploy_targets from './targets';
import * as deploy_templates from './templates';
import * as deploy_urls from './urls';
import * as deploy_values from './values';
import { DeployHost } from './host';
import * as Events from 'events';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
import * as Moment from 'moment';
import * as OS from 'os';
import * as Path from 'path';
import * as TMP from 'tmp';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


const AFTER_DEPLOYMENT_BUTTON_COLORS = {
    's': [
        'ffffff',
        'eeeeee',
        'dddddd',
    ],

    'w': [
        'ffff00',
        'eeee00',
        'dddd00',
    ],

    'e': [
        '000000',
        '111111',
        '222222',
    ],
};

let nextCancelDeployFileCommandId = Number.MAX_SAFE_INTEGER;
let nextCancelDeployWorkspaceCommandId = Number.MAX_SAFE_INTEGER;
let nextCancelPullFileCommandId = Number.MAX_SAFE_INTEGER;
let nextCancelPullWorkspaceCommandId = Number.MAX_SAFE_INTEGER;

interface EnvVarEntry {
    name: string;
    value: any;
}

interface EventEntry {
    event: deploy_contracts.Event;
    index: number;
    listener: Function;
    name: string;
}


/**
 * Deployer class.
 */
export class Deployer extends Events.EventEmitter implements vscode.Disposable {
    /**
     * Additional values.
     */
    protected _additionalValues: deploy_values.ValueBase[];
    /**
     * Information button that is shown after a deployment has been finished.
     */
    protected readonly _AFTER_DEPLOYMENT_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * Stores all known targets from config as copies.
     */
    protected _allTargets: deploy_contracts.DeployTarget[];
    /**
     * Stores the current configuration.
     */
    protected _config: deploy_contracts.DeployConfiguration;
    /**
     * Stores the underlying extension context.
     */
    protected readonly _CONTEXT: vscode.ExtensionContext;
    /**
     * The timeout for freezing 'deploy on change' feature.
     */
    protected _deployOnChangeFreezer: NodeJS.Timer;
    /**
     * Stores the current list of global events.
     */
    protected readonly _EVENTS: EventEntry[] = [];
    /**
     * The global file system watcher.
     */
    protected _fileSystemWatcher: vscode.FileSystemWatcher;
    /**
     * The global state value for deploy operation scripts.
     */
    protected _globalScriptOperationState: Object = {};
    /**
     * Stores the current host.
     */
    protected _host: DeployHost;
    /**
     * Stores the current list of HTML documents.
     */
    protected _htmlDocs: deploy_contracts.Document[];
    /**
     * Stores if 'deploy on change' feature is enabled or not.
     */
    protected _isDeployOnChangeEnabled = true;
    /**
     * Stores if 'deploy on change' feature is freezed or not.
     */
    protected _isDeployOnChangeFreezed = false;
    /**
     * Stores if 'deploy on save' feature is enabled or not.
     */
    protected _isDeployOnSaveEnabled = true;
    /**
     * Stores if 'sync when open' feature is enabled or not.
     */
    protected _isSyncWhenOpenEnabled = true;

    private readonly _NEXT_AFTER_DEPLOYMENT_BUTTON_COLORS = {
        's': 0,
        'w': 0,
        'e': 0,
    };
    /**
     * The ID of the last timeout that autmatically disapears
     * the deploy result button in the status bar.
     */
    protected _lastAfterDeploymentButtonDisapearTimeout: NodeJS.Timer;
    /**
     * Stores the timestamp of the last config update.
     */
    protected _lastConfigUpdate: Moment.Moment;
    /**
     * Stores the last list of environment vars.
     */
    protected _oldEnvVars: EnvVarEntry[];
    /**
     * Stores the global output channel.
     */
    protected readonly _OUTPUT_CHANNEL: vscode.OutputChannel;
    /**
     * Stores the package file of that extension.
     */
    protected readonly _PACKAGE_FILE: deploy_contracts.PackageFile;
    /**
     * Loaded plugins.
     */
    protected _plugins: deploy_contracts.DeployPluginWithContext[];
    /**
     * The "quick deploy button".
     */
    protected readonly _QUICK_DEPLOY_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * The states values for deploy operation scripts.
     */
    protected _scriptOperationStates: Object = {};
    /**
     * The current status item of the running server.
     */
    protected _serverStatusItem: vscode.StatusBarItem;
    /**
     * Stores the extension's start time.
     */
    protected _startTime: Moment.Moment;
    /**
     * Cache for deploy targets.
     */
    protected _targetCache: deploy_objects.DeployTargetCache;
    /**
     * Stores the packages that are currently deploy.
     */
    protected readonly _WORKSPACE_IN_PROGRESS: any = {};

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} context The underlying extension context.
     * @param {vscode.OutputChannel} outputChannel The global output channel to use.
     * @param {deploy_contracts.PackageFile} pkgFile The package file of that extension.
     */
    constructor(context: vscode.ExtensionContext,
                outputChannel: vscode.OutputChannel,
                pkgFile: deploy_contracts.PackageFile) {
        super();

        this._CONTEXT = context;
        this._OUTPUT_CHANNEL = outputChannel;
        this._PACKAGE_FILE = pkgFile;

        this._QUICK_DEPLOY_STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);        
        this._QUICK_DEPLOY_STATUS_ITEM.command = 'extension.deploy.quickDeploy';

        this._AFTER_DEPLOYMENT_STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);        
        this._AFTER_DEPLOYMENT_STATUS_ITEM.command = 'extension.deploy.openOutputAfterDeploment';
        this._AFTER_DEPLOYMENT_STATUS_ITEM.tooltip = 'Click here to open output...';
    }

    /**
     * Invokes 'after deployed' operations for a target.
     * 
     * @param {string[]} files The files that have been deployed.
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @return {Promise<boolean>} The promise.
     */
    protected afterDeployment(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let afterDeployedOperations = deploy_helpers.asArray(target.deployed)
                                                        .filter(x => x);

            let hasCancelled = false;
            let completed = (err: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            me.onCancelling(() => hasCancelled = true);

            let workflow = Workflows.create();

            afterDeployedOperations.forEach((currentOperation, i) => {
                workflow.next((ctx) => {
                    return new Promise<any>((res, rej) => {
                        let operationName = deploy_operations.getOperationName(currentOperation);
                    
                        me.outputChannel.append(`[AFTER DEPLOY #${i + 1}] '${operationName}' `);

                        if (hasCancelled) {
                            ctx.finish();
                        }
                        else {
                            me.handleCommonDeployOperation(currentOperation,
                                                           deploy_contracts.DeployOperationKind.After,
                                                           files,
                                                           target).then((handled) => {
                                if (handled) {
                                    me.outputChannel.appendLine(i18.t('deploy.operations.finished'));
                                }
                                else {
                                    me.outputChannel.appendLine(i18.t('deploy.operations.unknownType', currentOperation.type));
                                }

                                res();
                            }).catch((err) => {
                                me.outputChannel.appendLine(i18.t('deploy.operations.failed', err));

                                rej(err);
                            });
                        }
                    });
                });
            });

            if (!hasCancelled) {
                workflow.start().then(() => {
                    completed(null);
                }).catch((e) => {
                    completed(e);
                });
            }
        });
    }

    /**
     * Returns all targets from config.
     */
    public get allTargetsFromConfig(): deploy_contracts.DeployTarget[] {
        return this._allTargets;
    }

    /**
     * Invokes 'before deploy' operations for a target.
     * 
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @return {Promise<boolean>} The promise.
     */
    protected beforeDeploy(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let beforeDeployOperations = deploy_helpers.asArray(target.beforeDeploy)
                                                       .filter(x => x);

            let hasCancelled = false;
            let completed = (err: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            me.onCancelling(() => hasCancelled = true);

            let workflow = Workflows.create();

            beforeDeployOperations.forEach((currentOperation, i) => {
                workflow.next((ctx) => {
                    return new Promise<any>((res, rej) => {
                        let operationName = deploy_operations.getOperationName(currentOperation);
                    
                        me.outputChannel.append(`[BEFORE DEPLOY #${i + 1}] '${operationName}' `);

                        if (hasCancelled) {
                            ctx.finish();
                        }
                        else {
                            me.handleCommonDeployOperation(currentOperation,
                                                           deploy_contracts.DeployOperationKind.Before,
                                                           files,
                                                           target).then((handled) => {
                                if (handled) {
                                    me.outputChannel.appendLine(i18.t('deploy.operations.finished'));
                                }
                                else {
                                    me.outputChannel.appendLine(i18.t('deploy.operations.unknownType', currentOperation.type));
                                }

                                res();
                            }).catch((err) => {
                                me.outputChannel.appendLine(i18.t('deploy.operations.failed', err));

                                rej(err);
                            });
                        }
                    });
                });
            });

            if (!hasCancelled) {
                workflow.start().then(() => {
                    completed(null);
                }).catch((e) => {
                    completed(e);
                });
            }
        });
    }

    /**
     * Clears the output on startup depending on the current configuration.
     */
    public clearOutputOrNot() {
        if (deploy_helpers.toBooleanSafe(this.config.clearOutputOnStartup)) {
            this.outputChannel.clear();
        }
    }

    /**
     * Compares a local file with a version from a target.
     * 
     * @param {any} [uri] The URI of the file.
     * 
     * @return {Promise<any>} The promise.
     */
    public compareFiles(uri?: any): Promise<any> {
        let me = this;
        
        return new Promise<any>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<any>(resolve, reject);

            let targets = this.getTargets()
                              .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
            if (targets.length < 1) {
                vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
                return;
            }

            let path: string;
            if (uri && uri.fsPath) {
                path = uri.fsPath;
            }
            else {
                let currentEditor = vscode.window.activeTextEditor;

                if (currentEditor) {
                    let currentDocument = currentEditor.document;
                    if (currentDocument) {
                        path = currentDocument.fileName;
                    }
                }
            }

            if (deploy_helpers.isEmptyString(path)) {
                completed();
                return;
            }

            let startDownlods = (t: deploy_contracts.DeployTarget, files: string[]) => {
                let type = deploy_helpers.parseTargetType(t.type);

                let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                    return !type ||
                           (x.plugin.__type === type && deploy_helpers.toBooleanSafe(x.plugin.canPull) && x.plugin.downloadFile);
                });

                if (matchIngPlugins.length > 0) {
                    let nextPlugin: () => void;

                    nextPlugin = () => {
                        if (matchIngPlugins.length < 1) {
                            completed();
                            return;  // we have finished
                        }

                        let filesTODO = files.map(x => x);

                        let mp = matchIngPlugins.shift();
                        let p = mp.plugin;

                        let nextFile = () => {
                            if (filesTODO.length < 1) {
                                nextPlugin();
                                return;
                            }

                            let f = filesTODO.shift();

                            let diffFinished = (err: any) => {
                                if (err) {
                                    completed(err);
                                }
                                else {
                                    nextFile();
                                }
                            };

                            try {
                                let doDiff = (downloadedData?: Buffer) => {  // run "diff app"
                                    if (!downloadedData) {
                                        downloadedData = Buffer.alloc(0);
                                    }

                                    try {
                                        // save downloaded data
                                        // to temp file
                                        TMP.tmpName({
                                            keep: true,
                                            prefix: 'vsd-',
                                            postfix: Path.extname(f),
                                        }, (err, tmpPath) => {
                                            if (err) {
                                                diffFinished(err);    
                                            }
                                            else {
                                                FS.writeFile(tmpPath, downloadedData, (err) => {
                                                    if (err) {
                                                        diffFinished(err);
                                                    }
                                                    else {
                                                        try {
                                                            let realtivePath = deploy_helpers.toRelativePath(f);
                                                            if (false === realtivePath) {
                                                                realtivePath = f;
                                                            }

                                                            let titleSuffix = deploy_helpers.toStringSafe(t.name).trim();

                                                            let windowTitle = `[vs-deploy] Diff '${realtivePath}'`;
                                                            if ('' === titleSuffix) {
                                                                titleSuffix = deploy_helpers.normalizeString(t.type);
                                                            }
                                                            if ('' !== titleSuffix) {
                                                                windowTitle += ` (${titleSuffix})`;
                                                            }

                                                            vscode.commands.executeCommand('vscode.diff',
                                                                                        vscode.Uri.file(tmpPath), vscode.Uri.file(f), windowTitle).then(() => {
                                                                diffFinished(null);
                                                            }, (err) => {
                                                                diffFinished(err);
                                                            });
                                                        }
                                                        catch (e) {
                                                            diffFinished(e);
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    catch (e) {
                                        diffFinished(e);
                                    }
                                };

                                // download data
                                let downloadResult = p.downloadFile(f, t);
                                if (downloadResult) {
                                    if (Buffer.isBuffer(downloadResult)) {
                                        doDiff(downloadResult);
                                    }
                                    else {
                                        downloadResult.then((data) => {
                                            doDiff(data);
                                        }, (err) => {
                                            diffFinished(err);
                                        });
                                    }
                                }
                                else {
                                    doDiff();
                                }
                            }
                            catch (e) {
                                diffFinished(e);
                            }
                        };
                        
                        nextFile();  // start with first file
                    }

                    nextPlugin();  // start with first plugin
                }
                else {
                    // no matching plugin found

                    if (type) {
                        vscode.window.showWarningMessage(i18.t('compare.noPluginsForType', type));
                    }
                    else {
                        vscode.window.showWarningMessage(i18.t('compare.noPlugins'));
                    }
                }
            }  // startDownlods()

            let selectTarget = (files: string[]) => {
                // select the target /
                // source from where to download from
                let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                                me.getValues()));
                if (fileQuickPicks.length > 1) {
                    vscode.window.showQuickPick(fileQuickPicks, {
                        placeHolder: i18.t('compare.selectSource'),
                    }).then((item) => {
                        if (item) {
                            startDownlods(item.target, files);
                        }
                    }, (err) => {
                        completed(err);
                    });
                }
                else {
                    // auto select
                    startDownlods(fileQuickPicks[0].target, files);
                }
            }  // selectTarget()

            // first check if file
            FS.lstat(path, (err, stats) => {
                if (err) {
                    completed(i18.t('compare.failed', path, err));
                }
                else {
                    if (stats.isFile()) {
                        selectTarget([ path ]);
                    }
                    else if (stats.isDirectory()) {
                        Glob('**', {
                            absolute: true,
                            cwd: path,
                            dot: true,
                            ignore: [],
                            nodir: true,
                            root: path,
                        }, (e: any, files: string[]) => {
                            if (e) {
                                completed(i18.t('compare.failed', path, e));
                            }
                            else {
                                selectTarget(files);
                            }
                        });
                    }
                    else {
                        // no file
                        completed(i18.t('isNo.file', path));
                    }
                }
            });
        });
    }

    /**
     * Gets the current configuration.
     */
    public get config(): deploy_contracts.DeployConfiguration {
        return this._config;
    }

    /**
     * Gets the extension context.
     */
    public get context(): vscode.ExtensionContext {
        return this._CONTEXT;
    }

    /**
     * Deploys a file.
     * 
     * @param {string} file The path of the file to deploy. 
     */
    protected deployFile(file: string) {
        let me = this;

        let targets = this.getTargets()
                          .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        let quickPicks = targets.map((x, i) => deploy_helpers.createFileQuickPick(file, x, i,
                                                                                  me.getValues()));

        let deploy = (item: deploy_contracts.DeployFileQuickPickItem) => {
            try {
                if (item) {
                    let showError = (err: any, type: string) => {
                        vscode.window.showErrorMessage(i18.t(`deploy.${type}.failed`, file, err));
                    };

                    me.beforeDeploy([ file ], item.target).then((canceled) => {
                        if (canceled) {
                            return;
                        }

                        me.deployFileTo(file, item.target).then((canceled) => {
                            if (canceled) {
                                return;
                            }

                            // DO NOT invoke me.afterDeployment()
                            // this is done by me.deployFileTo()!
                        }).catch((err) => {
                            showError(err, 'file');
                        });  // deploy
                    }).catch((err) => {
                        showError(err, 'before');
                    });  // beforeDeploy
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(i18.t('deploy.file.failed', file, e));
            }
        };

        if (quickPicks.length > 1 || deploy_helpers.toBooleanSafe(me.config.alwaysShowTargetList)) {
            vscode.window.showQuickPick(quickPicks, {
                placeHolder: i18.t('targets.select'),
            }).then((item) => {
                        deploy(item);
                    });
        }
        else {
            // auto select
            deploy(quickPicks[0]);
        }
    }

    /**
     * Deploys a file or folder.
     * 
     * @param {any} [uri] The URI of the file / folder to deploy. 
     */
    public deployFileOrFolder(uri?: any) {
        let me = this;

        let path: string;
        
        if (uri && uri.fsPath) {
            path = uri.fsPath;
        }
        else {
            let currentEditor = vscode.window.activeTextEditor;

            if (currentEditor) {
                let currentDocument = currentEditor.document;
                if (currentDocument) {
                    path = currentDocument.fileName;
                }
            }
        }

        if (deploy_helpers.isEmptyString(path)) {
            return;
        }

        let showError = (err: any) => {
            vscode.window.showErrorMessage(i18.t('deploy.fileOrFolder.failed', path, err));
        };

        // check if file or folder
        FS.lstat(path, (err, stats) => {
            if (err) {
                showError(err);
                return;
            }

            try {
                if (stats.isDirectory()) {
                    me.deployFolder(path);  // folder
                }
                else if (stats.isFile()) {
                    me.deployFile(path);  // file
                }
                else {
                    showError(new Error(i18.t('isNo.validItem', path)));
                }
            }
            catch (e) {
                showError(e);
            }
        });
    }

    /**
     * Deploys a file to a target.
     * 
     * @param {string} file The file to deploy.
     * @param {deploy_contracts.DeployTarget} target The target to deploy to.
     * 
     * @return {Promise<boolean>} The promise.
     */
    protected deployFileTo(file: string, target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            if (me.isFileIgnored(file)) {
                if (deploy_helpers.toBooleanSafe(me.config.showWarningIfIgnored, true)) {
                    // show warning
                    
                    vscode.window.showWarningMessage(i18.t('deploy.file.isIgnored',
                                                           file));
                }
                
                hasCancelled = true;
                completed(null);
                return;
            }

            me.onCancelling(() => hasCancelled = true);

            try {
                me.hideAfterDeploymentStatusBarItem();

                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                    return !type ||
                           (x.plugin.__type === type && x.plugin.deployFile);
                });

                let relativePath = deploy_helpers.toRelativePath(file);
                if (false === relativePath) {
                    relativePath = file;
                }

                if (matchIngPlugins.length > 0) {
                    let deployNextPlugin: () => void;

                    deployNextPlugin = () => {
                        if (matchIngPlugins.length < 1) {
                            completed();
                            return;
                        }

                        if (hasCancelled) {
                            completed();
                            return;
                        }

                        let cancelCommand: vscode.Disposable;
                        let currentPluginWithContext = matchIngPlugins.shift();
                        let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                        let currentPlugin = currentPluginWithContext.plugin;
                        let statusBarItem: vscode.StatusBarItem;

                        let cleanUps = () => {
                            deploy_helpers.tryDispose(cancelCommand);
                            deploy_helpers.tryDispose(statusBarItem);
                            deploy_helpers.tryDispose(contextToUse);
                        };

                        let deployPlugin = () => {
                            try {
                                statusBarItem = vscode.window.createStatusBarItem(
                                    vscode.StatusBarAlignment.Left,
                                );
                                statusBarItem.color = '#ffffff';
                                statusBarItem.text = i18.t('deploy.button.prepareText');
                                statusBarItem.tooltip = i18.t('deploy.button.tooltip');

                                let cancelCommandName = 'extension.deploy.cancelFile' + (nextCancelDeployFileCommandId--);
                                cancelCommand = vscode.commands.registerCommand(cancelCommandName, () => {
                                    if (hasCancelled) {
                                        return;
                                    }

                                    hasCancelled = true;

                                    try {
                                        contextToUse.emit(deploy_contracts.EVENT_CANCEL_DEPLOY);
                                    }
                                    catch (e) {
                                        me.log(i18.t('errors.withCategory', 'Deployer.deployFileTo().cancel', e));
                                    }

                                    statusBarItem.text = i18.t('deploy.button.cancelling');
                                    statusBarItem.tooltip = i18.t('deploy.button.cancelling');
                                });
                                statusBarItem.command = cancelCommandName;

                                let showResult = (err?: any) => {
                                    let afterDeployButtonMsg = 'Deployment finished.';

                                    try {
                                        cleanUps();

                                        let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                        let resultMsg;
                                        if (err) {
                                            if (hasCancelled) {
                                                resultMsg = i18.t('deploy.canceledWithErrors');
                                            }
                                            else {
                                                resultMsg = i18.t('deploy.finishedWithErrors');
                                            }
                                        }
                                        else {
                                            if (deploy_helpers.toBooleanSafe(me.config.showPopupOnSuccess, true)) {
                                                if (targetExpr) {
                                                    vscode.window.showInformationMessage(i18.t('deploy.file.succeededWithTarget', file, targetExpr));
                                                }
                                                else {
                                                    vscode.window.showInformationMessage(i18.t('deploy.file.succeeded', file));
                                                }
                                            }

                                            if (hasCancelled) {
                                                resultMsg = i18.t('deploy.canceled');
                                            }
                                            else {
                                                resultMsg = i18.t('deploy.finished2');

                                                me.afterDeployment([ file ], target).catch((err) => {
                                                    vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                                });
                                            }
                                        }

                                        if (resultMsg) {
                                            afterDeployButtonMsg = resultMsg;

                                            me.outputChannel.appendLine(resultMsg);
                                        }
                                    }
                                    finally {
                                        me.showStatusBarItemAfterDeployment(afterDeployButtonMsg,
                                                                            [ file ],
                                                                            err ? [] : [ file ],
                                                                            err ? [ file ] : []);

                                        completed(err);
                                    }
                                };

                                try {
                                    statusBarItem.show();

                                    currentPlugin.deployFile(file, target, {
                                        context: contextToUse,

                                        onBeforeDeploy: (sender, e) => {
                                            let destination = deploy_helpers.toStringSafe(e.destination); 
                                            let targetName = deploy_helpers.toStringSafe(e.target.name);

                                            me.outputChannel.appendLine('');

                                            let deployMsg: string;
                                            if (targetName) {
                                                targetName = ` ('${targetName}')`;
                                            }
                                            if (destination) {
                                                deployMsg = i18.t('deploy.file.deployingWithDestination', file, destination, targetName);
                                            }
                                            else {
                                                deployMsg = i18.t('deploy.file.deploying', file, targetName);
                                            }

                                            me.outputChannel.append(deployMsg);

                                            if (deploy_helpers.toBooleanSafe(me.config.openOutputOnDeploy, true)) {
                                                me.outputChannel.show();
                                            }

                                            statusBarItem.text = i18.t('deploy.button.text');
                                        },

                                        onCompleted: (sender, e) => {
                                            if (e.error) {
                                                me.outputChannel.appendLine(i18.t('failed', e.error));
                                            }
                                            else {
                                                me.outputChannel.appendLine(i18.t('ok'));
                                            }

                                            hasCancelled = hasCancelled || e.canceled;
                                            showResult(e.error);
                                        }
                                    });
                                }
                                catch (e) {
                                    showResult(e);
                                }
                            }
                            catch (e) {
                                cleanUps();

                                completed(e);
                            }
                        };

                        let checkForNewer = () => {
                            if (deploy_helpers.toBooleanSafe(target.checkBeforeDeploy)) {
                                deploy_diff.checkForNewerFiles.apply(me,
                                                                     [ [ file ], target, currentPlugin ]).then((startDeploy: boolean) => {
                                    if (startDeploy) {
                                        deployPlugin();
                                    }
                                    else {
                                        deployNextPlugin();
                                    }
                                }).catch((e) => {
                                    completed(e);
                                });
                            }
                            else {
                                deployPlugin();
                            }
                        };

                        if (deploy_helpers.toBooleanSafe(target.diffBeforeDeploy)) {
                            if (deploy_helpers.toBooleanSafe(currentPlugin.canPull) && currentPlugin.downloadFile) {
                                // make a diff and ask the
                                // if (s)he really wants to deploy

                                me.compareFiles(vscode.Uri.file(file)).then(() => {
                                    // [BUTTON] yes
                                    let yesBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                                    yesBtn.action = () => {
                                        deployPlugin();  // user wants to deploy
                                    };
                                    yesBtn.title = i18.t('yes');

                                    vscode.window
                                          .showWarningMessage(i18.t('deploy.startQuestion'),
                                                              yesBtn)
                                          .then((item) => {
                                                    if (!item || !item.action) {
                                                        return;
                                                    }

                                                    item.action();
                                                });
                                }).catch((err) => {
                                    completed(err);
                                });
                            }
                            else {
                                checkForNewer();
                            }
                        }
                        else {
                            checkForNewer();
                        }
                    };

                    deployNextPlugin();
                }
                else {
                    if (type) {
                        vscode.window.showWarningMessage(i18.t('deploy.noPluginsForType', type));
                    }
                    else {
                        vscode.window.showWarningMessage(i18.t('deploy.noPlugins'));
                    }

                    completed();
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Deploys a folder.
     * 
     * @param {string} dir The path of the folder to deploy.
     */
    protected deployFolder(dir: string) {
        let me = this;
        
        dir = Path.resolve(dir); 

        let filesToDeploy: string[] = Glob.sync('**', {
            absolute: true,
            cwd: dir,
            dot: true,
            ignore: [],
            nodir: true,
            root: dir,
        });

        let targets = this.getTargets()
                          .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        // start deploy the folder
        // by selected target
        let deploy = (t: deploy_contracts.DeployTarget) => {
            me.beforeDeploy(filesToDeploy, t).then((canceled) => {
                if (canceled) {
                    return;
                }

                if (filesToDeploy.length < 1) {
                    vscode.window.showWarningMessage(i18.t('deploy.noFiles'));
                    return;
                }
                
                me.deployWorkspaceTo(filesToDeploy, t).then(() => {
                    //TODO
                }).catch((err) => {
                    vscode.window.showErrorMessage(i18.t('deploy.folder.failed', dir, err));
                });
            }).catch((err) => {
                vscode.window.showErrorMessage(i18.t('deploy.before.failed', err));
            });
        };

        // select the target
        let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                        me.getValues()));
        if (fileQuickPicks.length > 1) {
            vscode.window.showQuickPick(fileQuickPicks, {
                placeHolder: i18.t('deploy.folder.selectTarget'),
            }).then((item) => {
                if (item) {
                    deploy(item.target);
                }
            });
        }
        else {
            // auto select
            deploy(fileQuickPicks[0].target);
        }
    }

    /**
     * Deploys files of the workspace.
     * 
     * @param {deploy_contracts.DeployPackage|deploy_contracts.DeployPackage[]} [packagesToDeploy] The package(s) to deploy.
     * @param {deploy_contracts.DeployTarget|deploy_contracts.DeployTarget[]} [targetsToDeployTo] The target(s) to deploy to.
     * 
     * @return {Promise<number>} The promise.
     */
    public deployWorkspace(packagesToDeploy?: deploy_contracts.DeployPackage | deploy_contracts.DeployPackage[],
                           targetsToDeployTo?: deploy_contracts.DeployTarget | deploy_contracts.DeployTarget[]): Promise<number> {
        let me = this;

        return new Promise<number>((resolve, reject) => {
            let completed = (err: any, code?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(code);
                }
            };

            let packages = deploy_helpers.asArray(packagesToDeploy).filter(x => x);
            if (packages.length < 1) {
                // no explicit packages found in method arguments
                // so read packages from config

                packages = me.getPackages()
                             .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden) &&
                                          deploy_helpers.toBooleanSafe(x.showForDeploy, true));
            }
            if (packages.length < 1) {
                vscode.window.showWarningMessage(i18.t('packages.noneDefined'));

                completed(null, 1);  // no packages found
                return;
            }

            let packageQuickPicks = packages.map((x, i) => deploy_helpers.createPackageQuickPick(x, i,
                                                                                                 me.getValues()));

            let selectTarget = (pkg: deploy_contracts.DeployPackage) => {
                if (!pkg) {
                    completed(null, 3);  // aborted
                    return;
                }

                let targets = deploy_helpers.asArray(targetsToDeployTo).filter(x => x);
                if (targets.length < 1) {
                    // no explicit targets found in method arguments
                    // so read targets from package

                    targets = me.filterTargetsByPackage(pkg)
                                .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
                }
                if (targets.length < 1) {
                    vscode.window.showWarningMessage(i18.t('targets.noneDefined'));

                    completed(null, 4);  // no target found
                    return;
                }

                let packageName = deploy_helpers.toStringSafe(pkg.name);

                let filesToDeploy = deploy_helpers.getFilesOfPackage(pkg,
                                                                     me.useGitIgnoreStylePatternsInFilter(pkg));

                let deploy = (t: deploy_contracts.DeployTarget) => {
                    try {
                        if (!t) {
                            completed(null, 6);  // aborted
                            return;
                        }

                        let targetName = deploy_helpers.toStringSafe(t.name);

                        me.outputChannel.appendLine('');

                        let deployMsg: string;
                        if (targetName) {
                            deployMsg = i18.t('deploy.workspace.deployingWithTarget', packageName, targetName);
                        }
                        else {
                            deployMsg = i18.t('deploy.workspace.deploying', packageName);
                        }

                        me.outputChannel.appendLine(deployMsg);

                        if (deploy_helpers.toBooleanSafe(me.config.openOutputOnDeploy, true)) {
                            me.outputChannel.show();
                        }

                        me.beforeDeploy(filesToDeploy, t).then((canceled) => {
                            if (canceled) {
                                completed(null, 7);  // canceled
                                return;
                            }

                            filesToDeploy = deploy_helpers.getFilesOfPackage(pkg,
                                                                             me.useGitIgnoreStylePatternsInFilter(pkg));  // now update file list
                            if (filesToDeploy.length < 1) {
                                vscode.window.showWarningMessage(i18.t('deploy.noFiles'));

                                completed(null, 8);  // no files
                                return;
                            }
                            
                            me.deployWorkspaceTo(filesToDeploy, t).then(() => {
                                completed(null, 0);  // anthing finished
                            }).catch((err) => {
                                completed(new Error(i18.t('deploy.workspace.failedWithCategory',
                                                        2, err)));
                            });
                        }).catch((err) => {
                            completed(new Error(i18.t('deploy.before.failed',
                                                        err)));
                        });
                    }
                    catch (e) {
                        completed(new Error(i18.t('deploy.workspace.failedWithCategory',
                                                  1, e)));
                    }
                };

                let targetsOfPackage = me.getTargetsFromPackage(pkg);
                if (targetsOfPackage.length < 1) {
                    // no explicit targets

                    let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                                    me.getValues()));

                    if (fileQuickPicks.length > 1 || deploy_helpers.toBooleanSafe(me.config.alwaysShowTargetList)) {
                        vscode.window.showQuickPick(fileQuickPicks, {
                            placeHolder: i18.t('deploy.workspace.selectTarget'),
                        }).then((item) => {
                            if (item) {
                                deploy(item.target);
                            }
                            else {
                                completed(null, 5);  // aborted
                            }
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        // auto select
                        deploy(fileQuickPicks[0].target);
                    }
                }
                else {
                    // we have explicit defined targets here

                    if (1 === targetsOfPackage.length) {
                        deploy(targetsOfPackage[0]);  // deploy the one and only
                    }
                    else {
                        // create a virtual "batch" target
                        // for the underlying "real" targets

                        let virtualPkgName: string;
                        if (packageName) {
                            virtualPkgName = i18.t('deploy.workspace.virtualTargetNameWithPackage', packageName);
                        }
                        else {
                            virtualPkgName = i18.t('deploy.workspace.virtualTargetName');
                        }

                        let batchTarget: any = {
                            type: 'batch',
                            name: virtualPkgName,
                            targets: targetsOfPackage.map(x => x.name),
                        };

                        deploy(batchTarget);
                    }
                }
            };

            if (packageQuickPicks.length > 1 || deploy_helpers.toBooleanSafe(me.config.alwaysShowPackageList)) {
                vscode.window.showQuickPick(packageQuickPicks, {
                    placeHolder: i18.t('deploy.workspace.selectPackage'),
                }).then((item) => {
                            if (item) {
                                selectTarget(item.package);
                            }
                            else {
                                completed(null, 2);  // aborted
                            }
                        }, (err) => {
                            completed(err);
                        });
            }
            else {
                // auto select
                selectTarget(packageQuickPicks[0].package);
            }
        });
    }

    /**
     * Deploys files of the workspace to a target.
     * 
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @returns {Promise<boolean>} The promise.
     */
    protected deployWorkspaceTo(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;
        let nameOfTarget = deploy_helpers.normalizeString(target.name);

        if (files) {
            files = files.filter(f => !me.isFileIgnored(f));
        }

        return new Promise<boolean>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err?: any) => {
                delete me._WORKSPACE_IN_PROGRESS[nameOfTarget];

                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            me.onCancelling(() => hasCancelled = true);

            let startDeployment = () => {
                try {
                    me.hideAfterDeploymentStatusBarItem();

                    let type = deploy_helpers.parseTargetType(target.type);

                    let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                        return !type ||
                               (x.plugin.__type === type && x.plugin.deployWorkspace);
                    });

                    if (matchIngPlugins.length > 0) {
                        let deployNextPlugin: () => void;
                        deployNextPlugin = () => {
                            if (matchIngPlugins.length < 1) {
                                completed();
                                return;
                            }

                            if (hasCancelled) {
                                completed();
                                return;
                            }

                            let cancelCommand: vscode.Disposable;
                            let currentPluginWithContext = matchIngPlugins.shift();
                            let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                            let currentPlugin = currentPluginWithContext.plugin;
                            let statusBarItem: vscode.StatusBarItem;

                            let cleanUps = () => {
                                deploy_helpers.tryDispose(cancelCommand);
                                deploy_helpers.tryDispose(statusBarItem);
                                deploy_helpers.tryDispose(contextToUse);
                            };

                            let deployPlugin = () => {
                                try {
                                    statusBarItem = vscode.window.createStatusBarItem(
                                        vscode.StatusBarAlignment.Left,
                                    );
                                    statusBarItem.color = '#ffffff';
                                    statusBarItem.text = i18.t('deploy.button.prepareText');
                                    statusBarItem.tooltip = i18.t('deploy.button.tooltip');

                                    let cancelCommandName = 'extension.deploy.cancelWorkspace' + (nextCancelDeployWorkspaceCommandId--);
                                    cancelCommand = vscode.commands.registerCommand(cancelCommandName, () => {
                                        if (hasCancelled) {
                                            return;
                                        }

                                        hasCancelled = true;

                                        try {
                                            contextToUse.emit(deploy_contracts.EVENT_CANCEL_DEPLOY);
                                        }
                                        catch (e) {
                                            me.log(i18.t('errors.withCategory', 'Deployer.deployWorkspaceTo().cancel', e));
                                        }

                                        statusBarItem.text = i18.t('deploy.button.cancelling');
                                        statusBarItem.tooltip = i18.t('deploy.button.cancelling');
                                    });
                                    statusBarItem.command = cancelCommandName;

                                    let failed: string[] = [];
                                    let succeeded: string[] = [];
                                    let showResult = (err?: any) => {
                                        let afterDeployButtonMsg = 'Deployment finished.';

                                        try {
                                            cleanUps();

                                            let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                            if (err) {
                                                if (targetExpr) {
                                                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failedWithTarget', targetExpr, err));
                                                }
                                                else {
                                                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failed', err));
                                                }
                                            }
                                            else {
                                                if (failed.length > 0) {
                                                    if (succeeded.length < 1) {
                                                        if (targetExpr) {
                                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.allFailedWithTarget', targetExpr, err));
                                                        }
                                                        else {
                                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.allFailed', err));
                                                        }
                                                    }
                                                    else {
                                                        let allCount = succeeded.length + failed.length;
                                                        if (targetExpr) {
                                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.someFailedWithTarget', failed.length, allCount
                                                                                                                                        , targetExpr));
                                                        }
                                                        else {
                                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.someFailed', failed.length, allCount));
                                                        }
                                                    }
                                                }
                                                else {
                                                    let allCount = succeeded.length;
                                                    if (allCount > 0) {
                                                        if (deploy_helpers.toBooleanSafe(me.config.showPopupOnSuccess, true)) {
                                                            if (targetExpr) {
                                                                vscode.window.showInformationMessage(i18.t('deploy.workspace.allSucceededWithTarget', allCount
                                                                                                                                                    , targetExpr));
                                                            }
                                                            else {
                                                                vscode.window.showInformationMessage(i18.t('deploy.workspace.allSucceeded', allCount));
                                                            }
                                                        }
                                                    }
                                                    else {
                                                        if (targetExpr) {
                                                            vscode.window.showWarningMessage(i18.t('deploy.workspace.nothingDeployedWithTarget', targetExpr));
                                                        }
                                                        else {
                                                            vscode.window.showWarningMessage(i18.t('deploy.workspace.nothingDeployed'));
                                                        }
                                                    }
                                                }
                                            }

                                            let resultMsg: string;
                                            if (err || failed.length > 0) {
                                                if (hasCancelled) {
                                                    resultMsg = i18.t('deploy.canceledWithErrors');
                                                }
                                                else {
                                                    resultMsg = i18.t('deploy.finishedWithErrors');
                                                }
                                            }
                                            else {
                                                if (hasCancelled) {
                                                    resultMsg = i18.t('deploy.canceled');
                                                }
                                                else {
                                                    resultMsg = i18.t('deploy.finished2');

                                                    me.afterDeployment(files, target).catch((err) => {
                                                        vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                                    });
                                                }
                                            }

                                            if (resultMsg) {
                                                afterDeployButtonMsg = resultMsg;

                                                me.outputChannel.appendLine(resultMsg);
                                            }
                                        }
                                        finally {
                                            me.showStatusBarItemAfterDeployment(afterDeployButtonMsg,
                                                                                files,
                                                                                succeeded, failed);

                                            completed(err);
                                        }
                                    };

                                    statusBarItem.show();

                                    currentPlugin.deployWorkspace(files, target, {
                                        context: contextToUse,

                                        onBeforeDeployFile: (sender, e) => {
                                            let relativePath = deploy_helpers.toRelativePath(e.file);
                                            if (false === relativePath) {
                                                relativePath = e.file;
                                            }

                                            let statusMsg: string;

                                            let destination = deploy_helpers.toStringSafe(e.destination);
                                            if (destination) {
                                                statusMsg = i18.t('deploy.workspace.statusWithDestination', relativePath, destination);
                                            }
                                            else {
                                                statusMsg = i18.t('deploy.workspace.status', relativePath);
                                            }

                                            statusBarItem.text = i18.t('deploy.button.text');
                                            statusBarItem.tooltip = statusMsg + ` (${i18.t('deploy.workspace.clickToCancel')})`;

                                            me.outputChannel.append(statusMsg);
                                        },

                                        onCompleted: (sender, e) => {
                                            hasCancelled = hasCancelled || e.canceled;
                                            showResult(e.error);
                                        },

                                        onFileCompleted: (sender, e) => {
                                            if (e.error) {
                                                me.outputChannel.appendLine(i18.t('failed', e.error));

                                                failed.push(e.file);
                                            }
                                            else {
                                                me.outputChannel.appendLine(i18.t('ok'));

                                                succeeded.push(e.file);
                                            }
                                        }
                                    });
                                }
                                catch (e) {
                                    cleanUps();
                    
                                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failed', e));
                                }
                            };

                            let checkForNewer = () => {
                                if (deploy_helpers.toBooleanSafe(target.checkBeforeDeploy)) {
                                    deploy_diff.checkForNewerFiles.apply(me,
                                                                        [ files, target, currentPlugin ]).then((startDeploy: boolean | null) => {
                                        if (startDeploy) {
                                            deployPlugin();
                                        }
                                        else {
                                            deployNextPlugin();
                                        }
                                    }).catch((e) => {
                                        completed(e);
                                    });
                                }
                                else {
                                    deployPlugin();
                                }
                            };

                            checkForNewer();
                        };

                        deployNextPlugin();
                    }
                    else {
                        if (type) {
                            vscode.window.showWarningMessage(i18.t('deploy.noPluginsForType', type));
                        }
                        else {
                            vscode.window.showWarningMessage(i18.t('deploy.noPlugins'));
                        }

                        completed();
                    }
                }
                catch (e) {
                    completed(e);
                }
            };

            if (deploy_helpers.isNullOrUndefined(me._WORKSPACE_IN_PROGRESS[nameOfTarget])) {
                me._WORKSPACE_IN_PROGRESS[nameOfTarget] = {
                    files: files,
                    target: target,
                    type: 'deploy',
                };

                startDeployment();
            }
            else {
                // there is currently something that is in progress for the target

                // [BUTTON] yes
                let yesBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                yesBtn.action = () => {
                    startDeployment();
                };
                yesBtn.title = i18.t('yes');

                vscode.window
                      .showWarningMessage(i18.t('deploy.workspace.alreadyStarted', target.name),
                                          yesBtn)
                      .then((item) => {
                                if (!item || !item.action) {
                                    return;
                                }

                                item.action();
                            });
            }
        });
    }

    /**
     * Displays information about the network of this machine.
     * 
     * @param {boolean} [force] Force displaying information or not.
     */
    public displayNetworkInfo(force = false) {
        let me = this;

        if (!force) {
            if (!deploy_helpers.toBooleanSafe(me.config.displayNetworkInfo, true)) {
                return;
            }
        }

        try {
            this.outputChannel.appendLine(i18.t('network.hostname', this.name));

            let networkInterfaces = OS.networkInterfaces();
            if (Object.keys(networkInterfaces).length > 0) {
                this.outputChannel.appendLine(i18.t('network.interfaces.list'));
                Object.keys(networkInterfaces).forEach((ifName) => {
                    let ifaces = networkInterfaces[ifName].filter(x => {
                        let addr = deploy_helpers.normalizeString(x.address);
                        
                        if ('IPv4' === x.family) {
                            return !/^(127\.[\d.]+|[0:]+1|localhost)$/.test(addr);
                        }

                        if ('IPv6' === x.family) {
                            return '::1' !== addr;
                        }

                        return true;
                    });

                    if (ifaces.length > 0) {
                        me.outputChannel.appendLine(`\t- '${ifName}':`);
                        ifaces.forEach(x => {
                                            me.outputChannel.appendLine(`\t\t[${x.family}] '${x.address}' / '${x.netmask}' ('${x.mac}')`);
                                        });

                        me.outputChannel.appendLine('');
                    }
                });
            }
            else {
                this.outputChannel.appendLine('');
            }
        }
        catch (e) {
            this.log(i18.t('network.interfaces.failed', e));
        }
    }

    /** @inheritdoc */
    public dispose() {
        try {
            this.removeAllListeners();
        }
        catch (e) {
            this.log(i18.t('errors.withCategory',
                           'Deployer.dispose(1)', e));
        }
    }

    /**
     * Emits a global event.
     * 
     * @param {string | symbol} event The event.
     * @param {any[]} args The arguments.
     */
    public emitGlobal(event: string | symbol, ...args: any[]): boolean {
        return deploy_globals.EVENTS
                             .emit
                             .apply(deploy_globals.EVENTS, arguments);
    }

    /**
     * Executes the startup commands, defined in the config.
     */
    protected executeStartupCommands() {
        let me = this;

        let cfg = me.config;

        try {
            if (cfg.startupCommands) {
                let cmds = deploy_helpers.asArray(<any[]>cfg.startupCommands)
                                         .map((x: string | deploy_contracts.StartupCommand) => {
                                                  if ('object' !== typeof x) {
                                                      x = {
                                                          command: deploy_helpers.toStringSafe(x).trim(),
                                                      };

                                                      if (deploy_helpers.isEmptyString(x.command)) {
                                                          x = <deploy_contracts.StartupCommand>null;
                                                      }
                                                  }

                                                  return x;
                                              })
                                        .filter(x => x);

                let nextCommand: () => void;
                nextCommand = () => {
                    if (cmds.length < 1) {
                        return;
                    }

                    let c = cmds.shift();

                    let args = c.arguments;
                    if (!args) {
                        args = [];
                    }
                    args = [ c.command ].concat(args);

                    vscode.commands.executeCommand.apply(null, args).then(() => {
                        nextCommand();
                    }, (err) => {
                        me.log(i18.t('errors.withCategory',
                                     'Deployer.executeStartupCommands(2)', err));

                        nextCommand();
                    });
                };

                nextCommand();
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.executeStartupCommands(1)', e));
        }
    }

    /**
     * Filters "conditional" items.
     * 
     * @param {T|T[]} items The items to filter.
     * 
     * @return {T[]} The filtered items.
     */
    public filterConditionalItems<T extends deploy_contracts.ConditionalItem>(items: T | T[]): T[] {
        return deploy_helpers.filterConditionalItems<T>(items,
                                                        this.getValues());    
    }

    /**
     * Filters the list of targets by a package.
     * 
     * @param {deploy_contracts.DeployPackage} pkg The package.
     * 
     * @return {deploy_contracts.DeployTarget[]} The filtered targets.
     */
    public filterTargetsByPackage(pkg: deploy_contracts.DeployPackage): deploy_contracts.DeployTarget[] {
        let pkgName = deploy_helpers.normalizeString(pkg.name);

        return this.getTargets().filter(t => {
            let takeTarget = true;

            let excludeForPackages = deploy_helpers.asArray(t.hideIf)
                                                   .map(x => deploy_helpers.normalizeString(x))
                                                   .filter(x => '' !== x);
            for (let i = 0; i < excludeForPackages.length; i++) {
                if (excludeForPackages[i] === pkgName) {
                    return false;  // exclude
                }
            }

            let showForPackages = deploy_helpers.asArray(t.showIf)
                                                .map(x => deploy_helpers.normalizeString(x))
                                                .filter(x => '' !== x);
            if (showForPackages.length > 0) {
                takeTarget = false;  // exclude by default now

                for (let i = 0; i < showForPackages.length; i++) {
                    if (showForPackages[i] === pkgName) {
                        takeTarget = true;  // include
                        break;
                    }
                }
            }

            return takeTarget;
        });
    }

    /**
     * Returns the global variables defined in settings.
     * 
     * @return {deploy_contracts.GlobalVariables} The globals.
     */
    public getGlobals(): deploy_contracts.GlobalVariables {
        let result: deploy_contracts.GlobalVariables = {};
        
        let cfgGlobals = this.config.globals;
        if (cfgGlobals) {
            result = deploy_helpers.cloneObject(cfgGlobals);
        }

        return result;
    }

    /**
     * Returns the next color for the deploy result in the status bar
     * by category.
     * 
     * @param {string} category The category.
     * 
     * @return {string} The color.
     */
    protected getNextAfterDeploymentButtonColor(category: string) {
        let index = this._NEXT_AFTER_DEPLOYMENT_BUTTON_COLORS[category]++;
        if (this._NEXT_AFTER_DEPLOYMENT_BUTTON_COLORS[category] > 2) {
            this._NEXT_AFTER_DEPLOYMENT_BUTTON_COLORS[category] = 0;
        }

        return '#' + AFTER_DEPLOYMENT_BUTTON_COLORS[category][index];
    }

    /**
     * Returns the list of packages.
     * 
     * @returns {DeployPackage[]} The packages.
     */
    public getPackages(): deploy_contracts.DeployPackage[] {
        return deploy_packages.getPackages
                              .apply(this);
    }

    /**
     * Returns the list of targets.
     * 
     * @returns {DeployTarget[]} The targets.
     */
    public getTargets(): deploy_contracts.DeployTarget[] {
        return deploy_targets.getTargets
                             .apply(this);
    }

    /**
     * Returns the targets from a package.
     * 
     * @param {deploy_contracts.DeployPackag} pkg The package.
     * 
     * @return {deploy_contracts.DeployTarget[]} The found targets.
     */
    protected getTargetsFromPackage(pkg: deploy_contracts.DeployPackage): deploy_contracts.DeployTarget[] {
        let pkgTargets: deploy_contracts.DeployTarget[] = [];

        let normalizeString = (val: any): string => {
            return deploy_helpers.toStringSafe(val)
                                 .toLowerCase().trim();
        };

        let targetNames = deploy_helpers.asArray(pkg.targets)
                                        .map(x => normalizeString(x))
                                        .filter(x => '' !== x);

        let knownTargets = this.getTargets();

        targetNames.forEach(tn => {
            let found = false;
            for (let i = 0; i < knownTargets.length; i++) {
                let kt = knownTargets[i];
                
                if (normalizeString(kt.name) === tn) {
                    found = true;
                    pkgTargets.push(kt);
                }
            }

            if (!found) {
                // we have an unknown target here
                vscode.window.showWarningMessage(i18.t('packages.couldNotFindTarget', tn, pkg.name));
            }
        });

        return pkgTargets;
    }

    /**
     * Gets the current list of values.
     * 
     * @return {ValueBase[]} The values.
     */
    public getValues(): deploy_values.ValueBase[] {
        return deploy_values.getValues
                            .apply(this, arguments);
    }

    /**
     * Handles a "common" deploy operation.
     * 
     * @param {deploy_contracts.DeployOperation} operation The operation.
     * @param {deploy_contracts.DeployOperationKind} kind The kind of operation.
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @return Promise<boolean> The promise.
     */
    protected handleCommonDeployOperation(operation: deploy_contracts.DeployOperation,
                                          kind: deploy_contracts.DeployOperationKind,
                                          files: string[],
                                          target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let handled = true;
            let completed = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(handled);
                }
            };

            let executor: deploy_operations.OperationExecutor<deploy_contracts.DeployOperation>;
            let executorThisArgs: any = me;

            try {
                let nextAction = completed;

                switch (deploy_helpers.toStringSafe(operation.type).toLowerCase().trim()) {
                    case '':
                    case 'open':
                        executor = deploy_operations.open;
                        break;

                    case 'compile':
                        executor = deploy_operations.compile;
                        break;

                    case 'http':
                        executor = deploy_operations.http;
                        break;

                    case 'script':
                        let scriptExecutor: deploy_contracts.DeployScriptOperationExecutor;

                        let scriptOpts = <deploy_contracts.DeployScriptOperation>operation;

                        let scriptFile = scriptOpts.script;
                        if (!deploy_helpers.isEmptyString(scriptOpts.script)) {
                            if (!Path.isAbsolute(scriptFile)) {
                                scriptFile = Path.join(vscode.workspace.rootPath, scriptFile);
                            }
                            scriptFile = Path.resolve(scriptFile);

                            let scriptModule = deploy_helpers.loadDeployScriptOperationModule(scriptOpts.script);
                            if (scriptModule) {
                                scriptExecutor = scriptModule.execute;
                            }
                        }

                        nextAction = null;
                        if (scriptExecutor) {
                            let sym = Symbol("deploy.deploy.Deployer.handleCommonDeployOperation");

                            let allStates = me._scriptOperationStates;

                            let scriptArgs: deploy_contracts.DeployScriptOperationArguments = {
                                deployFiles: (files, targets) => {
                                    return deploy_helpers.deployFiles(files, targets, sym);
                                },
                                emitGlobal: function() {
                                    return me.emitGlobal
                                             .apply(me, arguments);
                                },
                                files: files,
                                globals: me.getGlobals(),
                                kind: kind,
                                openHtml: function() {
                                    return me.openHtml
                                             .apply(me, arguments);
                                },
                                options: deploy_helpers.cloneObject(scriptOpts.options),
                                replaceWithValues: (v) => me.replaceWithValues(v),
                                require: function(id) {
                                    return require(id);
                                },
                                target: target,
                            };

                            // scriptArgs.globalState
                            Object.defineProperty(scriptArgs, 'globalState', {
                                enumerable: true,
                                get: () => {
                                    return me._globalScriptOperationState;
                                },
                            });

                            // scriptArgs.state
                            Object.defineProperty(scriptArgs, 'state', {
                                enumerable: true,
                                get: () => {
                                    return allStates[scriptFile];
                                },
                                set: (v) => {
                                    allStates[scriptFile] = v;
                                },
                            });

                            Promise.resolve(<any>scriptExecutor(scriptArgs)).then(() => {
                                completed();
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        else {
                            // execute() function not found in script!

                            nextAction = () => {
                                completed(new Error(i18.t('deploy.operations.noFunctionInScript',
                                                          'execute', scriptOpts.script)));
                            };
                        }
                        break;

                    case 'sql':
                        executor = deploy_operations.sql;
                        break;

                    case 'vscommand':
                        executor = deploy_operations.vscommand;
                        break;

                    case 'wait':
                        executor = deploy_operations.wait;
                        break;

                    case 'webdeploy':
                        executor = deploy_operations.webdeploy;
                        break;

                    default:
                        handled = false;
                        break;
                }

                if (executor) {
                    let ctx: deploy_operations.OperationContext<deploy_contracts.DeployOperation> = {
                        config: me.config,
                        files: files,
                        globals: me.getGlobals(),
                        handled: handled,
                        kind: kind,
                        operation: operation,
                        outputChannel: me.outputChannel,
                    };

                    let execRes = executor.apply(executorThisArgs,
                                                 [ ctx ]);
                    if ('object' === typeof execRes) {
                        execRes.then((hasHandled) => {
                            handled = deploy_helpers.toBooleanSafe(hasHandled,
                                                                   deploy_helpers.toBooleanSafe(ctx.handled, true));

                            completed();
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    else {
                        handled = deploy_helpers.toBooleanSafe(deploy_helpers.toBooleanSafe(execRes),
                                                               deploy_helpers.toBooleanSafe(ctx.handled, true));

                        completed(ctx.error);
                    }
                }
                else {
                    if (nextAction) {
                        nextAction();
                    }
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Hides the 'after deploy' status bar item.
     */
    public hideAfterDeploymentStatusBarItem() {
        this._AFTER_DEPLOYMENT_STATUS_ITEM.hide();
    }

    /**
     * Gets the list of HTML documents.
     */
    public get htmlDocuments(): deploy_contracts.Document[] {
        return this._htmlDocs;
    }

    /**
     * Gets the timestamp of the last config update.
     */
    public get lastConfigUpdate(): Moment.Moment {
        return this._lastConfigUpdate;
    }

    /**
     * Starts listening for files.
     */
    public listen() {
        let me = this;

        let cfg = me.config;

        let dir: string;
        let port = deploy_contracts.DEFAULT_PORT;
        let showPopup = true;
        if (cfg.host) {
            dir = cfg.host.dir;

            port = parseInt(deploy_helpers.toStringSafe(cfg.host.port,
                                                        '' + deploy_contracts.DEFAULT_PORT));

            showPopup = deploy_helpers.toBooleanSafe(cfg.host.showPopupOnSuccess, true);
        }

        dir = deploy_helpers.toStringSafe(dir, deploy_contracts.DEFAULT_HOST_DIR);
        if (!Path.isAbsolute(dir)) {
            dir = Path.join(vscode.workspace.rootPath, dir);
        }

        // destroy old status bar item
        let statusItem = me._serverStatusItem;
        if (statusItem) {
            try {
                statusItem.dispose();
            }
            catch (e) {
                me.log(i18.t('errors.withCategory', 'Deployer.listen()', e));
            }

            statusItem = null;
        }
        me._serverStatusItem = null;

        let host = me._host;
        if (host) {
            // stop

            host.stop().then(() => {
                me._host = null;

                let successMsg = i18.t('host.stopped');

                if (showPopup) {
                    vscode.window.showInformationMessage(successMsg);
                }

                me.outputChannel.appendLine(successMsg);
            }).catch((err) => {
                let errMsg = i18.t('host.errors.couldNotStop', err);

                vscode.window.showErrorMessage(errMsg);
                me.outputChannel.appendLine(errMsg);
            });
        }
        else {
            // start

            host = new DeployHost(me);

            host.start().then(() => {
                me._host = host;

                let successMsg = i18.t('host.started', port, dir);

                me.outputChannel.appendLine(successMsg);
                
                if (showPopup) {
                    vscode.window.showInformationMessage(successMsg);
                }

                statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusItem.tooltip = '';
                statusItem.command = 'extension.deploy.listen';
                statusItem.text = i18.t('host.button.text');
                statusItem.tooltip = i18.t('host.button.tooltip');
                statusItem.show();

                me._serverStatusItem = statusItem;
            }).catch((err) => {
                vscode.window.showErrorMessage(i18.t('host.errors.cannotListen', err));
            });
        }
    }

    /**
     * Checks if a file (or directory) path is ignored.
     * 
     * @param {string} fileOrDir The file / directory to check.
     * 
     * @return {boolean} Is ignored or not. 
     */
    public isFileIgnored(fileOrDir: string): boolean {
        return deploy_helpers.isFileIgnored(fileOrDir, this.config.ignore,
                                            this.config.useGitIgnoreStylePatterns,
                                            this.config.fastCheckForIgnores);
    }

    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    public log(msg: any): Deployer {
        let now = Moment();

        msg = deploy_helpers.toStringSafe(msg);
        this.outputChannel
            .appendLine(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ${msg}`);

        return this;
    }

    /**
     * Get the name that represents that machine.
     */
    public get name(): string {
        let cfg = this.config;

        let name: string;
        if (cfg) {
            name = cfg.name;  // use from config
        }

        if (deploy_helpers.isEmptyString(name)) {
            name = OS.hostname();  // default
        }

        return deploy_helpers.normalizeString(name);
    }

    /**
     * The 'on activated' event.
     */
    public onActivated() {
        this._startTime = Moment();

        this.registerGlobalEvents();

        this.reloadConfiguration();

        this.setupFileSystemWatcher();
    }

    /**
     * Registers for a callback for a 'cancel' event that is called once.
     * 
     * @param {deploy_contracts.EventHandler} callback The callback to register.
     */
    public onCancelling(callback: deploy_contracts.EventHandler) {
        try {
            this.once(deploy_contracts.EVENT_CANCEL_DEPLOY,
                      callback);
        }
        catch (e) {
            this.log(i18.t('errors.withCategory', 'Deployer.onCancelling()', e));
        }
    }

    /**
     * The 'on deactivate' event.
     */
    public onDeactivate() {
        if (deploy_helpers.tryDispose(this._fileSystemWatcher)) {
            this._fileSystemWatcher = null;
        }

        // destroy buttons
        deploy_helpers.tryDispose(this._QUICK_DEPLOY_STATUS_ITEM);

        deploy_buttons.unloadPackageButtons();
    }

    /**
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
    }

    /**
     * Event after a document has been saved.
     * 
     * @param {string} fileName The path of the file.
     * @param {deploy_contracts.DeployPackage[]} [packagesToDeploy] The custom package list.
     */
    public onDidSaveFile(fileName: string,
                         packagesToDeploy?: deploy_contracts.DeployPackage[]) {
        if (deploy_helpers.isEmptyString(fileName)) {
            return;
        }

        let me = this;

        let docFile = deploy_helpers.replaceAllStrings(fileName, Path.sep, '/');

        let relativeDocFilePath = deploy_helpers.toRelativePath(docFile);
        if (false === relativeDocFilePath) {
            relativeDocFilePath = docFile;
        }

        try {
            let getTargetNamesByPackage = (pkg: deploy_contracts.DeployPackage) => {
                let useTargetLists = deploy_helpers.toBooleanSafe(me.config.useTargetListForDeployOnSave);

                let checkForPackageSpecificTargetListSetting = true;
                if (packagesToDeploy) {
                    // we are in "deploy on change" context

                    if (pkg.deployOnChange) {
                        if (true !== pkg.deployOnChange) {
                            if (!deploy_helpers.isNullOrUndefined(pkg.deployOnChange.useTargetList)) {
                                // use "deploy on change" specific setting

                                useTargetLists = deploy_helpers.toBooleanSafe(pkg.deployOnChange.useTargetList);
                                checkForPackageSpecificTargetListSetting = false;
                            }
                        }
                    }
                }

                if (checkForPackageSpecificTargetListSetting) {
                    if (!deploy_helpers.isNullOrUndefined(pkg.useTargetListForDeployOnSave)) {
                        // use package specific setting
                        useTargetLists = deploy_helpers.toBooleanSafe(pkg.useTargetListForDeployOnSave);
                    }
                }

                let targetSource: string[];
                if (pkg) {
                    if (useTargetLists) {
                        // use targets from the 'targets' property
                        // of package

                        if (true !== pkg.deployOnSave) {
                            targetSource = deploy_helpers.asArray(pkg.deployOnSave);
                        }

                        targetSource = deploy_helpers.asArray(pkg.targets);
                    }
                    else {
                        // use targets from 'deployOnSave' property

                        if (true === pkg.deployOnSave) {
                            targetSource = me.getTargets()
                                             .map(x => x.name);
                        }
                        else {
                            targetSource = deploy_helpers.asArray(pkg.deployOnSave);
                        }
                    }
                }

                return (targetSource || []).map(x => deploy_helpers.normalizeString(x))
                                           .filter(x => '' !== x);
            };

            if (!packagesToDeploy) {
                // find packages that would deploy the file

                packagesToDeploy = me.getPackages().filter(x => {
                    if (!x.deployOnSave) {
                        return false;  // do NOT deploy on save
                    }

                    let fastFileCheck = x.fastCheckOnSave;
                    if (deploy_helpers.isNullOrUndefined(fastFileCheck)) {
                        // not defined in package => use global value
                        fastFileCheck = deploy_helpers.toBooleanSafe(me.config.fastCheckOnSave);
                    }

                    if (fastFileCheck) {
                        // use fast check by minimatch
                        return deploy_helpers.doesFileMatchByFilter(docFile, x);
                    }

                    return deploy_helpers.getFilesOfPackage(x,
                                                            me.useGitIgnoreStylePatternsInFilter(x))
                                         .indexOf(docFile) > -1;
                });
            }
            
            let targets = me.getTargets();

            if (deploy_helpers.toBooleanSafe(me.config.showWarningsForNonExistingTargets)) {
                // check for non existing target names
            
                packagesToDeploy.forEach(pkg => {
                    let packageName = deploy_helpers.normalizeString(pkg.name);

                    getTargetNamesByPackage(pkg).forEach(tn => {
                        let foundTarget = false;
                        for (let i = 0; i < targets.length; i++) {
                            if (deploy_helpers.normalizeString(targets[i].name) === tn) {
                                foundTarget = true;
                                break;
                            }
                        }

                        if (!foundTarget) {
                            vscode.window.showWarningMessage(i18.t('deploy.onSave.couldNotFindTarget',
                                                                   tn, packageName));
                        }
                    });
                });
            }

            // find matching targets
            targets = targets.filter(t => {
                let targetName = deploy_helpers.normalizeString(t.name);

                for (let i = 0; i < packagesToDeploy.length; i++) {
                    let pkg = packagesToDeploy[i];
                 
                    if (getTargetNamesByPackage(pkg).indexOf(targetName) > -1) {
                        // is part of the package
                        return true;
                    }
                }

                return false;
            });

            // deploy file to targets
            targets.forEach(t => {
                let showError = (err: any) => {
                    let targetName = deploy_helpers.toStringSafe(t.name).trim();

                    vscode.window.showWarningMessage(i18.t('deploy.onSave.failedTarget',
                                                           relativeDocFilePath,
                                                           targetName ? `'${targetName}'` : 'target',
                                                           err));
                };

                me.beforeDeploy([ docFile ], t).then((canceled) => {
                    if (canceled) {
                        return;
                    }

                    me.deployFileTo(docFile, t).then((canceled) => {
                        if (canceled) {
                            return;
                        }

                        // DO NOT invoke me.afterDeployment()
                        // this is done by me.deployFileTo()!
                    }).catch((err) => {
                        showError(err);
                    });  // deploy
                }).catch((err) => {
                    showError(err);
                });  // beforeDeploy
            });
        }
        catch (e) {
            vscode.window.showErrorMessage(i18.t('deploy.onSave.failed', relativeDocFilePath, 2, e));
        }
    }

    /**
     * Event after text document has been opened.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidOpenTextDocument(doc: vscode.TextDocument) {
        if (!doc) {
            return;
        }

        let me = this;

        if (!doc.isUntitled && !deploy_helpers.isEmptyString(doc.fileName)) {
            if (deploy_helpers.toBooleanSafe(this.config.syncWhenOpen, true) &&
                this._isSyncWhenOpenEnabled) {
                    
                // only if activated
                deploy_sync.syncDocumentWhenOpen.apply(me, [ doc ]).then(() => {
                    //TODO
                }).catch((err) => {
                    //TODO
                });
            }
        }
    }

    /**
     * Event after a document has been saved.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidSaveTextDocument(doc: vscode.TextDocument) {
        if (!doc) {
            return;
        }

        if (deploy_helpers.toBooleanSafe(this.config.deployOnSave, true) &&
            this._isDeployOnSaveEnabled) {
                
            // only if activated
            this.onDidSaveFile(doc.fileName);
        }
    }

    /**
     * Is invoked on a file / directory change.
     * 
     * @param {vscode.Uri} e The URI of the item.
     * @param {string} type The type of change.
     */
    protected onFileChange(e: vscode.Uri, type: string) {
        let me = this;

        if (deploy_helpers.toBooleanSafe(me._isDeployOnChangeFreezed)) {
            // freezed
            return;
        }

        if (!(deploy_helpers.toBooleanSafe(me.config.deployOnChange, true) &&
              me._isDeployOnChangeEnabled)) {
            // deactivated
            return;
        }

        try {
            let filePath = Path.resolve(e.fsPath);

            let normalizePath = (str: string) => {
                return str ? deploy_helpers.replaceAllStrings(str, Path.sep, '/')
                           : str;
            };

            FS.exists(filePath, (exists) => {
                if (!exists) {
                    return;
                }

                FS.lstat(filePath, (err, stats) => {
                    if (err || !stats.isFile()) {
                        return;
                    }

                    let packagesToDeploy: deploy_contracts.DeployPackage[] = [];

                    let allPackages = me.getPackages();
                    for (let i = 0; i < allPackages.length; i++) {
                        let pkg = allPackages[i];
                        if (deploy_helpers.isNullOrUndefined(pkg.deployOnChange)) {
                            continue;
                        }

                        let doesFileMatch = false;

                        let fastFileCheck = pkg.fastCheckOnChange;
                        if (deploy_helpers.isNullOrUndefined(fastFileCheck)) {
                            // not defined in package => use global value
                            fastFileCheck = deploy_helpers.toBooleanSafe(me.config.fastCheckOnChange);
                        }

                        if (fastFileCheck) {
                            // use minimatch

                            if (true === pkg.deployOnChange) {
                                doesFileMatch = deploy_helpers.doesFileMatchByFilter(filePath, pkg);
                            }
                            else {
                                doesFileMatch = deploy_helpers.doesFileMatchByFilter(filePath, pkg.deployOnChange);
                            }
                        }
                        else {
                            // use Glob

                            let matchingFiles: string[];
                            if (true === pkg.deployOnChange) {
                                matchingFiles = deploy_helpers.getFilesOfPackage(pkg,
                                                                                 me.useGitIgnoreStylePatternsInFilter(pkg));
                            }
                            else {
                                matchingFiles = deploy_helpers.getFilesByFilter(pkg.deployOnChange,
                                                                                me.useGitIgnoreStylePatternsInFilter(pkg.deployOnChange))
                                                              .filter(x => Path.resolve(x));
                            }

                            doesFileMatch = matchingFiles.map(x => normalizePath(x)).indexOf(normalizePath(filePath)) > -1;
                        }

                        if (doesFileMatch) {
                            packagesToDeploy.push(pkg);
                        }
                    }

                    if (packagesToDeploy.length > 0) {
                        me.onDidSaveFile(filePath, packagesToDeploy);
                    }
                });
            });
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.onFileChange()', e));
        }
    }

    /**
     * Opens the files that are defined in the config.
     */
    protected openFiles() {
        let me = this;

        try {
            let cfg = me.config;
            if (cfg.open) {
                // cleanup filter list
                let filters = me.filterConditionalItems(cfg.open)
                                .filter(x => {
                                            return deploy_helpers.asArray(x.files)
                                                                 .map(y => deploy_helpers.toStringSafe(y))
                                                                 .filter(y => '' !== y)
                                                                 .length > 0;
                                        });

                let closeOtherEditors = false;
                let filesToOpen: string[] = [];
                let completed = () => {
                    // cleanup list of files to open
                    filesToOpen = filesToOpen.map(x => Path.resolve(x));
                    filesToOpen = deploy_helpers.distinctArray(filesToOpen);

                    if (closeOtherEditors) {
                        // close other editors
                        vscode.window.visibleTextEditors.forEach(x => {
                            try {
                                x.hide();
                            }
                            catch (e) {
                                me.log(i18.t('errors.withCategory',
                                             'Deployer.openFiles(2)', e));
                            }
                        });
                    }

                    filesToOpen.forEach(x => {
                        // try open...
                        vscode.workspace.openTextDocument(x).then((doc) => {
                            // try show...
                            vscode.window.showTextDocument(doc).then(() => {
                                //TODO
                            }, (err) => {
                                // could not SHOW text document
                                me.log(i18.t('errors.withCategory',
                                             'Deployer.openFiles(4)', err));
                            });
                        }, (err) => {
                            // could not OPEN text document
                            me.log(i18.t('errors.withCategory',
                                         'Deployer.openFiles(3)', err));
                        });
                    });
                };

                let nextFilter: () => void;
                nextFilter = () => {
                    if (filters.length < 1) {
                        completed();
                        return;
                    }

                    let dir = vscode.workspace.rootPath;
                    let f = filters.shift();

                    // hostname / machine filter(s)
                    
                    let isFor = deploy_helpers.asArray(f.isFor)
                                              .map(x => deploy_helpers.normalizeString(x))
                                              .filter(x => x);

                    if (isFor.length > 0) {
                        let myName = deploy_helpers.normalizeString(me.name);

                        if (isFor.indexOf(myName) < 0) {
                            nextFilter();  // not for that machine
                            return;
                        }
                    }

                    closeOtherEditors = closeOtherEditors || 
                                        deploy_helpers.toBooleanSafe(f.closeOthers);

                    // patterns to search for
                    let filesToSearchFor = deploy_helpers.asArray(f.files)
                                                         .filter(x => x);
                    filesToSearchFor = deploy_helpers.distinctArray(filesToSearchFor);

                    if (filesToSearchFor.length > 0) {
                        // files to exclude
                        let filesToExclude = deploy_helpers.asArray(f.exclude)
                                                           .filter(x => x);
                        filesToExclude = deploy_helpers.distinctArray(filesToExclude);

                        filesToSearchFor.forEach(x => {
                            try {
                                let foundFiles: string[] = Glob.sync(x, {
                                    absolute: true,
                                    cwd: dir,
                                    dot: true,
                                    ignore: filesToExclude,
                                    nodir: true,
                                    root: dir,
                                });

                                filesToOpen = filesToOpen.concat(foundFiles);
                            }
                            catch (e) {
                                // error while collecting files to open
                                me.log(i18.t('errors.withCategory',
                                            'Deployer.openFiles(5)', e));
                            }
                        });
                    }

                    nextFilter();  // next
                };

                nextFilter();  // start
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.openFiles(1)', e));
        }
    }

    /**
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    public openHtml(html: string, title?: string, id?: any): Promise<any> {
        return deploy_helpers.openHtmlDocument(this.htmlDocuments,
                                               html, title, id);
    }

    /**
     * Action to open the output after an deployment.
     */
    public openOutputAfterDeploment() {
        this.hideAfterDeploymentStatusBarItem();

        this.outputChannel.show();
    }

    /**
     * Opens a template.
     */
    public openTemplate() {
        deploy_templates.openTemplate
                        .apply(this, arguments);
    }

    /**
     * Gets the global output channel.
     */
    public get outputChannel(): vscode.OutputChannel {
        return this._OUTPUT_CHANNEL;
    }

    /**
     * Gets the package file of that extension.
     */
    public get packageFile(): deploy_contracts.PackageFile {
        return this._PACKAGE_FILE;
    }

    /**
     * Gets the list of plugins.
     */
    public get plugins(): deploy_contracts.DeployPlugin[] {
        return this.pluginsWithContextes
                   .map(x => x.plugin);
    }

    /**
     * Gets the list of plugins withs its contextes.
     */
    public get pluginsWithContextes(): deploy_contracts.DeployPluginWithContext[] {
        return this._plugins;
    }

    /**
     * Pulls a file or folder.
     * 
     * @param {any} [uri] The URI of the file / folder to deploy. 
     */
    public pullFileOrFolder(uri?: any) {
        let me = this;

        let path: string;
        
        if (uri && uri.fsPath) {
            path = uri.fsPath;
        }
        else {
            let currentEditor = vscode.window.activeTextEditor;

            if (currentEditor) {
                let currentDocument = currentEditor.document;
                if (currentDocument) {
                    path = currentDocument.fileName;
                }
            }
        }

        if (deploy_helpers.isEmptyString(path)) {
            return;
        }

        let showError = (err: any) => {
            vscode.window.showErrorMessage(i18.t('pull.fileOrFolder.failed', path, err));
        };

        // check if file or folder
        FS.lstat(path, (err, stats) => {
            if (err) {
                showError(err);
                return;
            }

            try {
                if (stats.isDirectory()) {
                    me.pullFolder(path);  // folder
                }
                else if (stats.isFile()) {
                    me.pullFile(path);  // file
                }
                else {
                    showError(new Error(i18.t('isNo.validItem', path)));
                }
            }
            catch (e) {
                showError(e);
            }
        });
    }

    /**
     * Pulls a file.
     * 
     * @param {string} file The path of the file to deploy. 
     */
    protected pullFile(file: string) {
        let me = this;

        let targets = this.getTargets()
                          .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        let quickPicks = targets.map((x, i) => deploy_helpers.createFileQuickPick(file, x, i,
                                                                                  me.getValues()));

        let pull = (item: deploy_contracts.DeployFileQuickPickItem) => {
            let showError = (err: any) => {
                vscode.window.showErrorMessage(i18.t(`pull.file.failed`, file, err));
            };
            
            try {
                me.pullFileFrom(file, item.target).then((canceled) => {
                    if (canceled) {
                        return;
                    }

                    // currently nothing to do here
                }).catch((err) => {
                    showError(err);
                });  // pullFileFrom
            }
            catch (e) {
                showError(e);
            }
        };

        if (quickPicks.length > 1) {
            vscode.window.showQuickPick(quickPicks, {
                placeHolder: i18.t('targets.selectSource'),
            }).then((item) => {
                        pull(item);
                    });
        }
        else {
            // auto select
            pull(quickPicks[0]);
        }
    }

    /**
     * Pulls a file from a target.
     * 
     * @param {string} file The file to pull.
     * @param {deploy_contracts.DeployTarget} target The target from where to pull.
     * 
     * @return {Promise<boolean>} The promise.
     */
    protected pullFileFrom(file: string, target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            if (me.isFileIgnored(file)) {
                if (deploy_helpers.toBooleanSafe(me.config.showWarningIfIgnored, true)) {
                    // show warning
                    
                    vscode.window.showWarningMessage(i18.t('deploy.file.isIgnored',
                                                           file));
                }
                
                hasCancelled = true;
                completed(null);
                return;
            }

            me.onCancelling(() => hasCancelled = true);

            try {
                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                    return !type ||
                           (x.plugin.__type === type && deploy_helpers.toBooleanSafe(x.plugin.canPull) && x.plugin.pullFile);
                });

                let relativePath = deploy_helpers.toRelativePath(file);
                if (false === relativePath) {
                    relativePath = file;
                }

                if (matchIngPlugins.length > 0) {
                    let pullNextPlugin: () => void;
                    pullNextPlugin = () => {
                        if (matchIngPlugins.length < 1) {
                            completed();
                            return;
                        }

                        if (hasCancelled) {
                            completed();
                            return;
                        }

                        let cancelCommand: vscode.Disposable;
                        let currentPluginWithContext = matchIngPlugins.shift();
                        let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                        let currentPlugin = currentPluginWithContext.plugin;
                        let statusBarItem: vscode.StatusBarItem;

                        let cleanUps = () => {
                            deploy_helpers.tryDispose(cancelCommand);
                            deploy_helpers.tryDispose(statusBarItem);
                            deploy_helpers.tryDispose(contextToUse);
                        };

                        try {
                            statusBarItem = vscode.window.createStatusBarItem(
                                vscode.StatusBarAlignment.Left,
                            );
                            statusBarItem.color = '#ffffff';
                            statusBarItem.text = i18.t('pull.button.prepareText');
                            statusBarItem.tooltip = i18.t('pull.button.tooltip');

                            let cancelCommandName = 'extension.deploy.cancelPullFile' + (nextCancelPullFileCommandId--);
                            cancelCommand = vscode.commands.registerCommand(cancelCommandName, () => {
                                if (hasCancelled) {
                                    return;
                                }

                                hasCancelled = true;

                                try {
                                    contextToUse.emit(deploy_contracts.EVENT_CANCEL_PULL);
                                }
                                catch (e) {
                                    me.log(i18.t('errors.withCategory', 'Deployer.pullFileFrom().cancel', e));
                                }

                                statusBarItem.text = i18.t('pull.button.cancelling');
                                statusBarItem.tooltip = i18.t('pull.button.cancelling');
                            });
                            statusBarItem.command = cancelCommandName;

                            let showResult = (err?: any) => {
                                try {
                                    cleanUps();

                                    let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                    let resultMsg;
                                    if (err) {
                                        if (hasCancelled) {
                                            resultMsg = i18.t('pull.canceledWithErrors');
                                        }
                                        else {
                                            resultMsg = i18.t('pull.finishedWithErrors');
                                        }
                                    }
                                    else {
                                        if (deploy_helpers.toBooleanSafe(me.config.showPopupOnSuccess, true)) {
                                            if (targetExpr) {
                                                vscode.window.showInformationMessage(i18.t('pull.file.succeededWithTarget', file, targetExpr));
                                            }
                                            else {
                                                vscode.window.showInformationMessage(i18.t('pull.file.succeeded', file));
                                            }
                                        }

                                        if (hasCancelled) {
                                            resultMsg = i18.t('pull.canceled');
                                        }
                                        else {
                                            resultMsg = i18.t('pull.finished2');
                                        }
                                    }

                                    if (resultMsg) {
                                        me.outputChannel.appendLine(resultMsg);
                                    }
                                }
                                finally {
                                    completed(err);
                                }
                            };

                            try {
                                statusBarItem.show();

                                currentPlugin.pullFile(file, target, {
                                    context: contextToUse,

                                    onBeforeDeploy: (sender, e) => {
                                        let destination = deploy_helpers.toStringSafe(e.destination); 
                                        let targetName = deploy_helpers.toStringSafe(e.target.name);

                                        me.outputChannel.appendLine('');

                                        let pullMsg: string;
                                        if (targetName) {
                                            targetName = ` ('${targetName}')`;
                                        }
                                        if (destination) {
                                            pullMsg = i18.t('pull.file.pullingWithDestination', file, destination, targetName);
                                        }
                                        else {
                                            pullMsg = i18.t('pull.file.pulling', file, targetName);
                                        }

                                        me.outputChannel.append(pullMsg);

                                        statusBarItem.text = i18.t('pull.button.text');
                                    },

                                    onCompleted: (sender, e) => {
                                        if (e.error) {
                                            me.outputChannel.appendLine(i18.t('failed', e.error));
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('ok'));
                                        }

                                        hasCancelled = hasCancelled || e.canceled;
                                        showResult(e.error);
                                    }
                                });
                            }
                            catch (e) {
                                showResult(e);
                            }
                        }
                        catch (e) {
                            cleanUps();

                            completed(e);
                        }
                    };

                    pullNextPlugin();
                }
                else {
                    if (type) {
                        vscode.window.showWarningMessage(i18.t('pull.noPluginsForType', type));
                    }
                    else {
                        vscode.window.showWarningMessage(i18.t('pull.noPlugins'));
                    }

                    completed();
                }
            }
            catch (e) {
                completed(e);
            }
        });
    };

    /**
     * Pulls a folder.
     * 
     * @param {string} dir The path of the folder to pull.
     */
    protected pullFolder(dir: string) {
        let me = this;
        
        dir = Path.resolve(dir); 

        let filesToPull: string[] = Glob.sync('**', {
            absolute: true,
            cwd: dir,
            dot: true,
            ignore: [],
            nodir: true,
            root: dir,
        });

        let targets = this.getTargets()
                          .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        // start pull the folder
        // by selected target
        let pull = (t: deploy_contracts.DeployTarget) => {
            me.pullWorkspaceFrom(filesToPull, t).then(() => {
                //TODO
            }).catch((err) => {
                vscode.window.showErrorMessage(i18.t('deploy.folder.failed', dir, err));
            });
        };

        // select the target
        let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                        me.getValues()));
        if (fileQuickPicks.length > 1) {
            vscode.window.showQuickPick(fileQuickPicks, {
                placeHolder: i18.t('deploy.folder.selectTarget'),
            }).then((item) => {
                if (item) {
                    pull(item.target);
                }
            });
        }
        else {
            // auto select
            pull(fileQuickPicks[0].target);
        }
    }

    /**
     * Pulls files to the workspace.
     */
    public pullWorkspace() {
        let me = this;

        let packages = this.getPackages()
                           .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden) &&
                                        deploy_helpers.toBooleanSafe(x.showForPull, true));
        if (packages.length < 1) {
            vscode.window.showWarningMessage(i18.t('packages.noneDefined'));
            return;
        }

        let packageQuickPicks = packages.map((x, i) => deploy_helpers.createPackageQuickPick(x, i,
                                                                                             me.getValues()));

        let selectTarget = (pkg: deploy_contracts.DeployPackage) => {
            if (!pkg) {
                return;
            }

            let targets = me.filterTargetsByPackage(pkg)
                            .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
            if (targets.length < 1) {
                vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
                return;
            }

            let packageName = deploy_helpers.toStringSafe(pkg.name);

            let filesToPull = deploy_helpers.getFilesOfPackage(pkg,
                                                               me.useGitIgnoreStylePatternsInFilter(pkg));

            let pull = (t: deploy_contracts.DeployTarget) => {
                try {
                    if (!t) {
                        return;
                    }

                    let targetName = deploy_helpers.toStringSafe(t.name);

                    me.outputChannel.appendLine('');

                    let deployMsg: string;
                    if (targetName) {
                        deployMsg = i18.t('pull.workspace.pullingWithTarget', packageName, targetName);
                    }
                    else {
                        deployMsg = i18.t('pull.workspace.pulling', packageName);
                    }

                    me.outputChannel.appendLine(deployMsg);

                    if (deploy_helpers.toBooleanSafe(me.config.openOutputOnDeploy, true)) {
                        me.outputChannel.show();
                    }

                    me.pullWorkspaceFrom(filesToPull, t).then(() => {
                        //TODO
                    }).catch((err) => {
                        vscode.window.showErrorMessage(i18.t('pull.workspace.failedWithCategory', 2, err));
                    });
                }
                catch (e) {
                    vscode.window.showErrorMessage(i18.t('pull.workspace.failedWithCategory', 1, e));
                }
            };

            let targetsOfPackage = me.getTargetsFromPackage(pkg);
            if (targetsOfPackage.length < 1) {
                // no explicit targets

                let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                                me.getValues()));

                if (fileQuickPicks.length > 1) {
                    vscode.window.showQuickPick(fileQuickPicks, {
                        placeHolder: i18.t('pull.workspace.selectSource'),
                    }).then((item) => {
                        if (item) {
                            pull(item.target);
                        }
                    });
                }
                else {
                    // auto select
                    pull(fileQuickPicks[0].target);
                }
            }
            else {
                // we have explicit defined targets here

                if (1 === targetsOfPackage.length) {
                    pull(targetsOfPackage[0]);  // pull the one and only
                }
                else {
                    // create a virtual "batch" target
                    // for the underlying "real" targets

                    let virtualPkgName: string;
                    if (packageName) {
                        virtualPkgName = i18.t('pull.workspace.virtualTargetNameWithPackage', packageName);
                    }
                    else {
                        virtualPkgName = i18.t('pull.workspace.virtualTargetName');
                    }

                    let batchTarget: any = {
                        type: 'batch',
                        name: virtualPkgName,
                        targets: targetsOfPackage.map(x => x.name),
                    };

                    pull(batchTarget);
                }
            }
        };

        if (packageQuickPicks.length > 1) {
            vscode.window.showQuickPick(packageQuickPicks, {
                placeHolder: i18.t('pull.workspace.selectPackage'),
            }).then((item) => {
                        if (item) {
                            selectTarget(item.package);
                        }
                    });
        }
        else {
            // auto select
            selectTarget(packageQuickPicks[0].package);
        }
    }

    /**
     * Pulls files of the workspace from a target.
     * 
     * @param {string[]} files The files to pull.
     * @param {deploy_contracts.DeployTarget} target The target from where to pull from.
     * 
     * @returns {Promise<boolean>} The promise.
     */
    protected pullWorkspaceFrom(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;
        let nameOfTarget = deploy_helpers.normalizeString(target.name);

        if (files) {
            files = files.filter(f => !me.isFileIgnored(f));
        }

        return new Promise<boolean>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err?: any) => {
                delete me._WORKSPACE_IN_PROGRESS[nameOfTarget];

                if (err) {
                    reject(err);
                }
                else {
                    resolve(hasCancelled);
                }
            };

            me.onCancelling(() => hasCancelled = true);

            let startPulling = () => {
                try {
                    let type = deploy_helpers.parseTargetType(target.type);

                    let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                        return !type ||
                               (x.plugin.__type === type && deploy_helpers.toBooleanSafe(x.plugin.canPull) && x.plugin.pullWorkspace);
                    });

                    if (matchIngPlugins.length > 0) {
                        let pullNextPlugin: () => void;
                        pullNextPlugin = () => {
                            if (matchIngPlugins.length < 1) {
                                completed();
                                return;
                            }

                            if (hasCancelled) {
                                completed();
                                return;
                            }

                            let cancelCommand: vscode.Disposable;
                            let currentPluginWithContext = matchIngPlugins.shift();
                            let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                            let currentPlugin = currentPluginWithContext.plugin;
                            let statusBarItem: vscode.StatusBarItem;

                            let cleanUps = () => {
                                deploy_helpers.tryDispose(cancelCommand);
                                deploy_helpers.tryDispose(statusBarItem);
                                deploy_helpers.tryDispose(contextToUse);
                            };

                            try {
                                statusBarItem = vscode.window.createStatusBarItem(
                                    vscode.StatusBarAlignment.Left,
                                );
                                statusBarItem.color = '#ffffff';
                                statusBarItem.text = i18.t('pull.button.prepareText');
                                statusBarItem.tooltip = i18.t('pull.button.tooltip');

                                let cancelCommandName = 'extension.deploy.cancelPullWorkspace' + (nextCancelPullWorkspaceCommandId--);
                                cancelCommand = vscode.commands.registerCommand(cancelCommandName, () => {
                                    if (hasCancelled) {
                                        return;
                                    }

                                    hasCancelled = true;

                                    try {
                                        contextToUse.emit(deploy_contracts.EVENT_CANCEL_PULL);
                                    }
                                    catch (e) {
                                        me.log(i18.t('errors.withCategory', 'Deployer.pullWorkspaceFrom().cancel', e));
                                    }

                                    statusBarItem.text = i18.t('pull.button.cancelling');
                                    statusBarItem.tooltip = i18.t('pull.button.cancelling');
                                });
                                statusBarItem.command = cancelCommandName;

                                let failed: string[] = [];
                                let succeeded: string[] = [];
                                let showResult = (err?: any) => {
                                    try {
                                        cleanUps();

                                        let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                        if (err) {
                                            if (targetExpr) {
                                                vscode.window.showErrorMessage(i18.t('pull.workspace.failedWithTarget', targetExpr, err));
                                            }
                                            else {
                                                vscode.window.showErrorMessage(i18.t('pull.workspace.failed', err));
                                            }
                                        }
                                        else {
                                            if (failed.length > 0) {
                                                if (succeeded.length < 1) {
                                                    if (targetExpr) {
                                                        vscode.window.showErrorMessage(i18.t('pull.workspace.allFailedWithTarget', targetExpr, err));
                                                    }
                                                    else {
                                                        vscode.window.showErrorMessage(i18.t('pull.workspace.allFailed', err));
                                                    }
                                                }
                                                else {
                                                    let allCount = succeeded.length + failed.length;
                                                    if (targetExpr) {
                                                        vscode.window.showErrorMessage(i18.t('pull.workspace.someFailedWithTarget', failed.length, allCount
                                                                                                                                    , targetExpr));
                                                    }
                                                    else {
                                                        vscode.window.showErrorMessage(i18.t('pull.workspace.someFailed', failed.length, allCount));
                                                    }
                                                }
                                            }
                                            else {
                                                let allCount = succeeded.length;
                                                if (allCount > 0) {
                                                    if (deploy_helpers.toBooleanSafe(me.config.showPopupOnSuccess, true)) {
                                                        if (targetExpr) {
                                                            vscode.window.showInformationMessage(i18.t('pull.workspace.allSucceededWithTarget', allCount
                                                                                                                                                , targetExpr));
                                                        }
                                                        else {
                                                            vscode.window.showInformationMessage(i18.t('pull.workspace.allSucceeded', allCount));
                                                        }
                                                    }
                                                }
                                                else {
                                                    if (targetExpr) {
                                                        vscode.window.showWarningMessage(i18.t('pull.workspace.nothingPulledWithTarget', targetExpr));
                                                    }
                                                    else {
                                                        vscode.window.showWarningMessage(i18.t('pull.workspace.nothingPulled'));
                                                    }
                                                }
                                            }
                                        }

                                        let resultMsg: string;
                                        if (err || failed.length > 0) {
                                            if (hasCancelled) {
                                                resultMsg = i18.t('pull.canceledWithErrors');
                                            }
                                            else {
                                                resultMsg = i18.t('pull.finishedWithErrors');
                                            }
                                        }
                                        else {
                                            if (hasCancelled) {
                                                resultMsg = i18.t('pull.canceled');
                                            }
                                            else {
                                                resultMsg = i18.t('pull.finished2');
                                            }
                                        }

                                        if (resultMsg) {
                                            me.outputChannel.appendLine(resultMsg);
                                        }
                                    }
                                    finally {
                                        completed(err);
                                    }
                                };

                                statusBarItem.show();

                                currentPlugin.pullWorkspace(files, target, {
                                    context: contextToUse,

                                    onBeforeDeployFile: (sender, e) => {
                                        let relativePath = deploy_helpers.toRelativePath(e.file);
                                        if (false === relativePath) {
                                            relativePath = e.file;
                                        }

                                        let statusMsg: string;

                                        let destination = deploy_helpers.toStringSafe(e.destination);
                                        if (destination) {
                                            statusMsg = i18.t('pull.workspace.statusWithDestination', relativePath, destination);
                                        }
                                        else {
                                            statusMsg = i18.t('pull.workspace.status', relativePath);
                                        }

                                        statusBarItem.text = i18.t('pull.button.text');
                                        statusBarItem.tooltip = statusMsg + ` (${i18.t('pull.workspace.clickToCancel')})`;

                                        me.outputChannel.append(statusMsg);
                                    },

                                    onCompleted: (sender, e) => {
                                        hasCancelled = hasCancelled || e.canceled;
                                        showResult(e.error);
                                    },

                                    onFileCompleted: (sender, e) => {
                                        if (e.error) {
                                            me.outputChannel.appendLine(i18.t('failed', e.error));

                                            failed.push(e.file);
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('ok'));

                                            succeeded.push(e.file);
                                        }
                                    }
                                });
                            }
                            catch (e) {
                                cleanUps();
                
                                vscode.window.showErrorMessage(i18.t('pull.workspace.failed', e));
                            }
                        };

                        pullNextPlugin();
                    }
                    else {
                        if (type) {
                            vscode.window.showWarningMessage(i18.t('pull.noPluginsForType', type));
                        }
                        else {
                            vscode.window.showWarningMessage(i18.t('pull.noPlugins'));
                        }

                        completed();
                    }
                }
                catch (e) {
                    completed(e);
                }
            };

            if (deploy_helpers.isNullOrUndefined(me._WORKSPACE_IN_PROGRESS[nameOfTarget])) {
                me._WORKSPACE_IN_PROGRESS[nameOfTarget] = {
                    files: files,
                    target: target,
                    type: 'pull',
                };

                startPulling();
            }
            else {
                // there is currently something that is in progress for the target

                // [BUTTON] yes
                let yesBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                yesBtn.action = () => {
                    startPulling();
                };
                yesBtn.title = i18.t('yes');

                vscode.window
                      .showWarningMessage(i18.t('pull.workspace.alreadyStarted', target.name),
                                          yesBtn)
                      .then((item) => {
                                if (!item || !item.action) {
                                    return;
                                }

                                item.action();
                            });
            }
        });
    }

    /**
     * Does a "quick deploy".
     */
    public quickDeploy() {
        let me = this;

        try {
            let cfg = this.config;

            let packagesToDeploy: deploy_contracts.DeployPackage[] = [];

            if (cfg.button) {
                let normalizeString = (val: any): string => {
                    return deploy_helpers.toStringSafe(val)
                                         .toLowerCase().trim();
                };

                let packageNames = deploy_helpers.asArray(cfg.button.packages)
                                                 .map(x => normalizeString(x))
                                                 .filter(x => '' !== x);

                let knownPackages = this.getPackages();

                packageNames.forEach(pn => {
                    let found = false;

                    for (let i = 0; i < knownPackages.length; i++) {
                        let kp = knownPackages[i];
                        if (normalizeString(kp.name) === pn) {
                            found = true;
                            packagesToDeploy.push(kp);
                        }
                    }

                    if (!found) {
                        vscode.window.showWarningMessage(i18.t('packages.notFound', pn));
                    }
                });
            }

            let hasCancelled = false;
            let completed = (err?: any) => {
                let cfg = me.config;

                if (cfg.button) {
                    if (deploy_helpers.toBooleanSafe(cfg.button.enabled)) {
                        me._QUICK_DEPLOY_STATUS_ITEM.show();
                    }
                }

                if (err) {
                    vscode.window.showErrorMessage(i18.t('quickDeploy.failed', err));
                }
            };

            me.onCancelling(() => hasCancelled = true);

            if (packagesToDeploy.length < 1) {
                vscode.window.showWarningMessage(i18.t('packages.nothingToDeploy'));
            }
            else {
                me._QUICK_DEPLOY_STATUS_ITEM.hide();

                if (deploy_helpers.toBooleanSafe(me.config.openOutputOnDeploy, true)) {
                    me.outputChannel.show();
                }

                let deployNextPackage: () => void;
                deployNextPackage = () => {
                    if (packagesToDeploy.length < 1) {
                        completed();
                        return;
                    }

                    if (hasCancelled) {
                        completed();
                        return;
                    }

                    let currentPackage = packagesToDeploy.shift();
                    try {
                        let files = deploy_helpers.getFilesOfPackage(currentPackage,
                                                                     me.useGitIgnoreStylePatternsInFilter(currentPackage));

                        let targets = me.getTargetsFromPackage(currentPackage);
                        let deployNextTarget: () => void;
                        deployNextTarget = () => {
                            if (targets.length < 1) {
                                deployNextPackage();
                                return;
                            }

                            if (hasCancelled) {
                                completed();
                                return;
                            }

                            let currentTarget = targets.shift();
                            try {
                                me.beforeDeploy(files, currentTarget).then(() => {
                                    // update package files
                                    files = deploy_helpers.getFilesOfPackage(currentPackage,
                                                                             me.useGitIgnoreStylePatternsInFilter(currentPackage));

                                    me.deployWorkspaceTo(files, currentTarget).then(() => {
                                        deployNextTarget();
                                    }).catch((err) => {
                                        completed(err);
                                    });
                                }).catch((err) => {
                                    completed(err);
                                });
                                
                            }
                            catch (e) {
                                completed(e);
                            }
                        };

                        deployNextTarget();
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                deployNextPackage();
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(i18.t('quickDeploy.failed', e));
        }
    }

    /**
     * Registers the global events.
     */
    protected registerGlobalEvents() {
        let me = this;

        // deploy.deployOnChange.*
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONCHANGE_DISABLE, function() {
            me._isDeployOnChangeEnabled = false;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONCHANGE_ENABLE, function() {
            me._isDeployOnChangeEnabled = true;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONCHANGE_TOGGLE, function() {
            me._isDeployOnChangeEnabled = !me._isDeployOnChangeEnabled;
        });

        // deploy.deployOnSave.*
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONSAVE_DISABLE, function() {
            me._isDeployOnSaveEnabled = false;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONSAVE_ENABLE, function() {
            me._isDeployOnSaveEnabled = true;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYONSAVE_TOGGLE, function() {
            me._isDeployOnSaveEnabled = !me._isDeployOnSaveEnabled;
        });

        // deploy.syncWhenOpen.*
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_SYNCWHENOPEN_DISABLE, function() {
            me._isSyncWhenOpenEnabled = false;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_SYNCWHENOPEN_ENABLE, function() {
            me._isSyncWhenOpenEnabled = true;
        });
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_SYNCWHENOPEN_TOGGLE, function() {
            me._isSyncWhenOpenEnabled = !me._isSyncWhenOpenEnabled;
        });

        // deploy.deployFiles
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYFILES, function(files: string | string[],
                                                                              targets: deploy_contracts.DeployTargetList,
                                                                              sym?: symbol) {
            let filesToDeploy: string[];
            let targetObjects: deploy_contracts.DeployTarget[];
            let completed = (err?: any) => {
                try {
                    let args: deploy_contracts.DeployFilesEventArguments = {
                        error: err,
                        files: filesToDeploy,
                        targets: targetObjects,
                        symbol: sym,
                    };

                    if (args.error) {
                        deploy_globals.EVENTS.emit(deploy_contracts.EVENT_DEPLOYFILES_ERROR,
                                                   args);
                    }
                    else {
                        deploy_globals.EVENTS.emit(deploy_contracts.EVENT_DEPLOYFILES_SUCCESS,
                                                   args);
                    }

                    deploy_globals.EVENTS.emit(deploy_contracts.EVENT_DEPLOYFILES_COMPLETE,
                                               args);
                }
                catch (e) {
                    me.log(i18.t('errors.withCategory', 'Deployer.registerGlobalEvents()', e));
                }
            };
            
            try {
                let allKnownTargets = me.getTargets();

                // convert to 'DeployTarget' objects
                targetObjects = deploy_helpers.asArray<string | deploy_contracts.DeployTarget>(targets).map(x => {
                    let t: deploy_contracts.DeployTarget;
                    
                    if (x) {
                        if ('object' === typeof x) {
                            t = x;
                        }
                        else {
                            let targetName = deploy_helpers.normalizeString(x);
                            if (!deploy_helpers.isEmptyString(targetName)) {
                                t = {
                                    name: targetName,
                                };  // default "dummy"

                                // try find known target
                                for (let i = 0; i < allKnownTargets.length; i++) {
                                    let kt = allKnownTargets[i];
                                    if (deploy_helpers.normalizeString(kt.name) === targetName) {
                                        t = kt;  // found
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    return t;
                }).filter(x => x);

                // collect file list
                filesToDeploy = deploy_helpers.asArray(files).map(x => {
                    return deploy_helpers.toStringSafe(x);
                }).filter(x => !deploy_helpers.isEmptyString(x))
                  .map(x => {
                           if (!Path.isAbsolute(x)) {
                               x = Path.join(vscode.workspace.rootPath, x);
                           }

                           return Path.resolve(x);
                       });
                filesToDeploy = deploy_helpers.distinctArray(filesToDeploy);

                if (targetObjects.length > 0 && filesToDeploy.length > 0) {
                    let batchTarget: any = {
                        type: 'batch',
                        name: i18.t('deploy.workspace.virtualTargetName'),
                        targets: targetObjects.map(x => x.name),
                    };

                    me.deployWorkspaceTo(filesToDeploy, batchTarget).then(() => {
                        completed();
                    }).catch((err) => {
                        completed(err);
                    });
                }
                else {
                    completed();
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Reloads the defined commands from the config.
     */
    protected reloadCommands() {
        deploy_commands.reloadCommands
                       .apply(this, arguments);
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        let me = this;

        let loadedCfg = <deploy_contracts.DeployConfiguration>vscode.workspace.getConfiguration("deploy");

        let finished = (err: any, cfg: deploy_contracts.DeployConfiguration) => {
            let showDefaultTemplateRepos = true;
            if (cfg.templates) {
                showDefaultTemplateRepos = deploy_helpers.toBooleanSafe(cfg.templates.showDefaults, true);
            }

            me.displayNetworkInfo();
            me.showExtensionInfoPopups();
            me.clearOutputOrNot();

            // deploy.config.reloaded
            deploy_globals.EVENTS.emit(deploy_contracts.EVENT_CONFIG_RELOADED, cfg);

            me.executeStartupCommands();
            me.openFiles();

            deploy_buttons.reloadPackageButtons
                          .apply(me, []);

            if (cfg.host) {
                if (deploy_helpers.toBooleanSafe(cfg.host.autoStart)) {
                    // auto start host

                    let autoStartCompleted = (err: any) => {
                        if (err) {
                            vscode.window.showErrorMessage(`[vs-deploy]: ${deploy_helpers.toStringSafe(err)}`);
                        }
                    };

                    try {
                        let startListening = () => {
                            try {
                                me.listen();

                                autoStartCompleted(null);
                            }
                            catch (e) {
                                autoStartCompleted(e);
                            }
                        };

                        let host = me._host;
                        if (host) {
                            host.stop().then(() => {
                                me._host = null;

                                startListening();
                            }).catch((err) => {
                                autoStartCompleted(err);
                            });
                        }
                        else {
                            startListening();
                        }
                    }
                    catch (e) {
                        autoStartCompleted(e);
                    }
                }
            }

            let afterGitPull = (err: any) => {
                deploy_config.runBuildTask
                             .apply(me);

                if (showDefaultTemplateRepos) {
                    // check official repo version
                    deploy_templates.checkOfficialRepositoryVersions
                                    .apply(me, []);
                }
            };

            deploy_config.runGitPull.apply(me).then(() => {
                afterGitPull(null);
            }).catch((err) => {
                afterGitPull(err);
            });
        };

        let next = (cfg: deploy_contracts.DeployConfiguration) => {
            me._config = cfg;

            try {
                let timeToWaitBeforeActivateDeployOnChange = parseInt( deploy_helpers.toStringSafe(cfg.timeToWaitBeforeActivateDeployOnChange).trim() );
                if (!isNaN(timeToWaitBeforeActivateDeployOnChange)) {
                    // deactivate 'deploy on change'
                    // for a while

                    me._isDeployOnChangeFreezed = true;
                    me._deployOnChangeFreezer = setTimeout(() => {
                        me._isDeployOnChangeFreezed = false;
                    }, timeToWaitBeforeActivateDeployOnChange);
                }
            }
            catch (e) {
                me._isDeployOnChangeFreezed = false;
            }

            deploy_values.reloadAdditionalValues
                         .apply(me, []);

            me.reloadEnvironmentVars();

            me.reloadEvents();
            me.reloadPlugins();
            me.reloadCommands();

            deploy_operations.resetOperations();

            me.startExternalExtensions().then(() => {
                finished(null, cfg);
            }).catch((err) => {
                finished(err, cfg);
            });
        };

        let applyCfg = (cfg: deploy_contracts.DeployConfiguration) => {
            deploy_helpers.tryClearTimeout(me._deployOnChangeFreezer);

            me._lastConfigUpdate = Moment();

            me._allTargets = deploy_helpers.asArray(cfg.targets)
                                           .filter(x => x)
                                           .map((x, i) => {
                                                    let clonedTarget = deploy_helpers.cloneObject(x);
                                                    clonedTarget.__id = i;

                                                    return clonedTarget;         
                                                });
            me._globalScriptOperationState = {};
            me._htmlDocs = [];
            me._isDeployOnChangeFreezed = false;
            me._scriptOperationStates = {};
            me._targetCache = new deploy_objects.DeployTargetCache();

            deploy_values.resetScriptStates();

            me._QUICK_DEPLOY_STATUS_ITEM.text = 'Quick deploy!';
            me._QUICK_DEPLOY_STATUS_ITEM.tooltip = 'Start a quick deploy...';
            i18.init(cfg.language).then(() => {
                if (cfg.button) {
                    let txt = deploy_helpers.toStringSafe(cfg.button.text);
                    txt = me.replaceWithValues(txt).trim();
                    if ('' === txt) {
                        txt = i18.t('quickDeploy.caption');
                    }
                    me._QUICK_DEPLOY_STATUS_ITEM.text = txt;
                }

                me._QUICK_DEPLOY_STATUS_ITEM.tooltip = i18.t('quickDeploy.start');

                next(cfg);
            }).catch((err) => {
                me.log(`[ERROR :: vs-deploy] Deploy.reloadConfiguration(1): ${deploy_helpers.toStringSafe(err)}`);

                next(cfg);
            });

            me._QUICK_DEPLOY_STATUS_ITEM.hide();
            if (cfg.button) {
                if (deploy_helpers.toBooleanSafe(cfg.button.enabled)) {
                    me._QUICK_DEPLOY_STATUS_ITEM.show();
                }
            }

            if (deploy_helpers.toBooleanSafe(cfg.openOutputOnStartup)) {
                me.outputChannel.show();
            }
        }

        deploy_config.mergeConfig(loadedCfg).then((cfg) => {
            applyCfg(cfg);
        }).catch((err) => {
            me.log(`[ERROR :: vs-deploy] Deploy.reloadConfiguration(2): ${deploy_helpers.toStringSafe(err)}`);

            applyCfg(loadedCfg);
        });
    }

    /**
     * Reloads the list of variables for the current process.
     */
    protected reloadEnvironmentVars() {
        let me = this;

        try {
            let oev = this._oldEnvVars;

            // restore old values...
            if (oev) {
                oev.forEach(x => {
                    process[x.name] = x.value;
                });
            }

            oev = null;

            let cfg = this.config;
            
            if (cfg.env) {
                let noPlaceholdersForTheseVars = cfg.env.noPlaceholdersForTheseVars;
                if (false !== noPlaceholdersForTheseVars && true !== noPlaceholdersForTheseVars) {
                    noPlaceholdersForTheseVars = deploy_helpers.asArray(<string | string[]>cfg.env.noPlaceholdersForTheseVars)
                                                               .map(x => deploy_helpers.toStringSafe(x).trim())
                                                               .filter(x => '' !== x);
                }

                if (cfg.env.vars) {
                    // now set additional variables
                    // for this process
                    oev = [];

                    for (let p in cfg.env.vars) {
                        let name = deploy_helpers.toStringSafe(p).trim();

                        let oldValue: EnvVarEntry = {
                            name: name,
                            value: cfg.env.vars[p],
                        };

                        let value = deploy_helpers.toStringSafe(oldValue.value);
                        let usePlaceholders = true;

                        if (Array.isArray(noPlaceholdersForTheseVars)) {
                            usePlaceholders = noPlaceholdersForTheseVars.indexOf(name) < 0;
                        }
                        else {
                            usePlaceholders = !deploy_helpers.toBooleanSafe(noPlaceholdersForTheseVars);
                        }

                        if (usePlaceholders) {
                            value = me.replaceWithValues(value);  // use placeholders
                        }

                        if ('' === value) {
                            value = undefined;
                        }
                        
                        process.env[name] = value;
                        oev.push(oldValue);
                    }
                }
            }

            this._oldEnvVars = oev;
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         `Deployer.reloadEnvironmentVars()`, e));
        }
    }

    /**
     * Reloads the global events defined in the config file.
     */
    protected reloadEvents() {
        let me = this;
        let myName = me.name;

        // unregister old events
        while (me._EVENTS.length > 0) {
            let ev = me._EVENTS.shift();

            try {
                deploy_globals.EVENTS.removeListener(ev.name,
                                                     ev.listener);
            }
            catch (e) {
                me.log(i18.t('errors.withCategory',
                             `Deployer.reloadEvents()`, e));
            }
        }

        let allEvents = deploy_helpers.asArray(this.config.events).filter(x => x);

        // isFor
        allEvents = allEvents.filter(p => {
            let validHosts = deploy_helpers.asArray(p.isFor)
                                           .map(x => deploy_helpers.toStringSafe(x).toLowerCase().trim())
                                           .filter(x => x);

            if (validHosts.length < 1) {
                return true;
            }

            return validHosts.indexOf(myName) > -1;
        });

        // platforms
        allEvents = deploy_helpers.filterPlatformItems(allEvents);

        // if
        allEvents = deploy_helpers.filterConditionalItems(allEvents);

        // sort
        allEvents = allEvents.sort((x, y) => {
            return deploy_helpers.compareValuesBy(x, y,
                                                  t => deploy_helpers.getSortValue(t, () => myName));
        });

        let globalEventState = {};
        allEvents.forEach((e, idx) => {
            let eventState = deploy_helpers.cloneObject(e.state);

            let entry: EventEntry;
            entry = {
                event: e,
                index: undefined,
                name: deploy_helpers.toStringSafe(e.name),
                listener: function() {
                    let eventCompleted = (err: any, exitCode?: number) => {
                        if (err) {
                            me.log(i18.t('errors.withCategory',
                                         `Deployer.reloadEvents(${entry.name}#${idx}.2)`, err));
                        }
                        else {
                            exitCode = parseInt(deploy_helpers.toStringSafe(exitCode).trim());
                            if (isNaN(exitCode)) {
                                exitCode = 0;
                            }

                            if (0 !== exitCode) {
                                me.log(i18.t('errors.withCategory',
                                             `Deployer.reloadEvents(${entry.name}#${idx}.3)`,
                                             new Error(`Exit code: ${exitCode}`)));
                            }
                        }
                    };

                    try {
                        // path to script
                        let moduleScript = deploy_helpers.toStringSafe(e.script);
                        moduleScript = me.replaceWithValues(moduleScript);
                        if (!Path.isAbsolute(moduleScript)) {
                            moduleScript = Path.join(vscode.workspace.rootPath, moduleScript);
                        }
                        moduleScript = Path.resolve(moduleScript);

                        let scriptModule = deploy_helpers.loadModule<deploy_contracts.EventModule>(moduleScript);
                        if (scriptModule) {
                            if (scriptModule.raiseEvent) {
                                let args: deploy_contracts.EventModuleExecutorArguments = {
                                    arguments: arguments,
                                    emitGlobal: function() {
                                        return deploy_globals.EVENTS.emit
                                                                    .apply(null, arguments);
                                    },
                                    globals: me.getGlobals(),
                                    globalState: undefined,
                                    name: e.name,
                                    openHtml: function() {
                                        return me.openHtml
                                                 .apply(me, arguments);
                                    },
                                    options: deploy_helpers.cloneObject(e.options),
                                    remove: function() {
                                        if (isNaN(entry.index)) {
                                            return false;
                                        }

                                        deploy_globals.EVENTS.removeListener(entry.name,
                                                                             entry.listener);
                                        
                                        me._EVENTS.splice(entry.index, 1);
                                        entry.index = null;

                                        return true;
                                    },
                                    replaceWithValues: (val) => {
                                        return me.replaceWithValues(val);
                                    },
                                    require: (id) => {
                                        return require(deploy_helpers.toStringSafe(id));
                                    },
                                    state: undefined,
                                };

                                // args.globalState
                                Object.defineProperty(args, 'globalState', {
                                    enumerable: true,
                                    get: () => {
                                        return globalEventState;
                                    },
                                });

                                // args.state
                                Object.defineProperty(args, 'state', {
                                    enumerable: true,
                                    get: () => {
                                        return eventState;
                                    },
                                    set: (newValue) => {
                                        eventState = newValue;
                                    }
                                });

                                Promise.resolve(<any>scriptModule.raiseEvent(args)).then((ec) => {
                                    eventCompleted(null, ec);
                                }).catch((err) => {
                                    eventCompleted(err);
                                });
                            }
                        }
                    }
                    catch (e) {
                        eventCompleted(e);
                    }
                },
            };

            if (deploy_helpers.isEmptyString(entry.name)) {
                entry.name = 'vscdEvent' + idx;
            }

            let registrator: (event: string | Symbol, listener: Function) => Events.EventEmitter;
            let registratorThisArgs: any = deploy_globals.EVENTS;
            if (deploy_helpers.toBooleanSafe(e.once)) {
                registrator = deploy_globals.EVENTS.once;
            }
            else {
                registrator = deploy_globals.EVENTS.on;
            }

            try {
                if (registrator) {
                    registrator.apply(registratorThisArgs,
                                      [ entry.name, entry.listener ]);

                    entry.index = me._EVENTS.push(entry) - 1;
                }
            }
            catch (e) {
                me.log(i18.t('errors.withCategory',
                             `Deployer.reloadEvents(${entry.name}#${idx}.1)`, e));
            }
        });
    }

    /**
     * Reloads plugins.
     * 
     * @param {boolean} [forceDisplay] Force displaying loaded plugins or not.
     */
    public reloadPlugins(forceDisplay = false) {
        let me = this;

        let oldPlugins = me._plugins;
        try {
            let loadedPlugins: deploy_contracts.DeployPluginWithContext[] = [];

            let pluginDir = Path.join(__dirname, './plugins');
            if (FS.existsSync(pluginDir)) {
                if (FS.lstatSync(pluginDir).isDirectory()) {
                    // modules from plugin directory
                    let moduleFiles = FS.readdirSync(pluginDir).filter(x => {
                        try {
                            if ('.' !== x && '..' !== x) {
                                let fullPath = Path.join(pluginDir, x);
                                if (FS.lstatSync(fullPath).isFile()) {
                                    if (fullPath.length >= 3) {
                                        return '.js' === fullPath.substring(fullPath.length - 3);
                                    }
                                }
                            }
                        }
                        catch (e) { 
                            me.log(i18.t('errors.withCategory', 'Deployer.reloadPlugins(1)', e));
                        }
                        
                        return false;
                    }).filter(x => x)
                      .map(x => Path.join(pluginDir, x));

                    // additional modules defined?
                    if (me.config.modules) {
                        let additionalModuleFiles =
                            deploy_helpers.asArray(me.config.modules)
                                .map(x => deploy_helpers.toStringSafe(x))
                                .filter(x => x)
                                .map(x => {
                                        if (!Path.isAbsolute(x)) {
                                            x = Path.join(vscode.workspace.rootPath, x);
                                        }

                                        return x;
                                    });

                        moduleFiles = moduleFiles.concat(additionalModuleFiles);
                    }

                    moduleFiles = deploy_helpers.distinctArray(moduleFiles.map(x => Path.resolve(x)));
                    
                    // remove existing plugins
                    if (oldPlugins) {
                        oldPlugins.filter(x => x).forEach(x => {
                            if (x.plugin.dispose) {
                                deploy_helpers.tryDispose(<any>x.plugin);
                            }

                            deploy_helpers.tryDispose(x.context);
                        });
                    }
                    moduleFiles.forEach(x => {
                        delete require.cache[x];
                    });

                    let createPluginContext: () => deploy_contracts.DeployContext = () => {
                        let ctx = deploy_plugins.createPluginContext();

                        ctx.config = () => me.config;
                        ctx.deployFiles = (files, target) => {
                            let sym = Symbol("deploy.deploy.Deployer.reloadPlugins.createPluginContext");

                            return deploy_helpers.deployFiles(files, target, sym);
                        };
                        ctx.emitGlobal = function() {
                            return me.emitGlobal
                                     .apply(me, arguments);
                        };
                        ctx.filterConditionalItems = (items) => me.filterConditionalItems(items);
                        ctx.globals = () => me.getGlobals();
                        ctx.log = function(msg) {
                            me.log(msg);
                            return this;
                        };
                        ctx.openHtml = function() {
                            return me.openHtml
                                     .apply(me, arguments);
                        };
                        ctx.outputChannel = () => me.outputChannel;
                        ctx.packageFile = () => me.packageFile;
                        ctx.packages = () => me.getPackages();
                        ctx.replaceWithValues = (v) => me.replaceWithValues(v);
                        ctx.targetCache = () => me._targetCache;
                        ctx.targets = () => me.getTargets();
                        ctx.values = () => me.getValues();

                        return ctx;
                    };

                    let nextPluginIndex = -1;
                    moduleFiles.forEach(x => {
                        try {
                            let pluginModule: deploy_contracts.DeployPluginModule = require(x);
                            if (pluginModule) {
                                if (pluginModule.createPlugin) {
                                    let ctx = createPluginContext();

                                    let newPlugin = pluginModule.createPlugin(ctx);
                                    if (newPlugin) {
                                        let pluginIndex = ++nextPluginIndex;
                                        ctx.plugins = function() {
                                            return loadedPlugins.filter(x => x.plugin.__index !== pluginIndex)
                                                                .map(x => x.plugin);
                                        };

                                        newPlugin.__file = deploy_helpers.parseTargetType(Path.basename(x));
                                        newPlugin.__filePath = x;
                                        newPlugin.__index = pluginIndex;
                                        newPlugin.__type = deploy_helpers.parseTargetType(Path.basename(x, '.js'));

                                        loadedPlugins.push({
                                            context: ctx,
                                            plugin: newPlugin,
                                        });
                                    }
                                }
                            }
                        }
                        catch (e) {
                            me.log(i18.t('errors.withCategory', 'Deployer.reloadPlugins(2)', e));
                        }
                    });
                }
            }

            this._plugins = loadedPlugins;

            if (forceDisplay || deploy_helpers.toBooleanSafe(this.config.displayLoadedPlugins, true)) {
                // display loaded plugins

                if (loadedPlugins.length > 0) {
                    loadedPlugins.forEach(x => {
                        try {
                            me.outputChannel.append(`- ${x.plugin.__file}`);
                        }
                        catch (e) {
                            me.log(i18.t('errors.withCategory', 'Deployer.reloadPlugins(3)', e));
                        }

                        me.outputChannel.appendLine('');
                    });

                    this.outputChannel.appendLine('');
                    if (loadedPlugins.length !== 1) {
                        this.outputChannel.appendLine(i18.t('__plugins.reload.loaded.more', loadedPlugins.length));
                    }
                    else {
                        this.outputChannel.appendLine(i18.t('__plugins.reload.loaded.one'));
                    }
                }
                else {
                    this.outputChannel.appendLine(i18.t('__plugins.reload.loaded.none'));
                }

                this.outputChannel.appendLine('');
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(i18.t('__plugins.reload.failed', e));
        }
        finally {
            oldPlugins = null;
        }
    }

    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    public replaceWithValues(val: any): string {
        return deploy_values.replaceWithValues(this.getValues(), val);
    }

    /**
     * Set ups the file system watcher.
     */
    protected setupFileSystemWatcher() {
        let me = this;

        let createWatcher = () => {
            me._fileSystemWatcher = null;

            let newWatcher: vscode.FileSystemWatcher;
            try {
                newWatcher = vscode.workspace.createFileSystemWatcher('**',
                                                                      false, false, true);
                newWatcher.onDidChange((e) => {
                    me.onFileChange(e, 'change');
                }, newWatcher);
                newWatcher.onDidCreate((e) => {
                    me.onFileChange(e, 'create');
                }, newWatcher);

                me._fileSystemWatcher = newWatcher;
            }
            catch (e) {
                deploy_helpers.tryDispose(newWatcher);

                me.log(i18.t('errors.withCategory',
                             'Deployer.setupFileSystemWatcher(2)', e));
            }
        };

        try {
            if (deploy_helpers.tryDispose(me._fileSystemWatcher)) {
                createWatcher();
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.setupFileSystemWatcher(1)', e));
        }
    }

    /**
     * Shows info popups of / for this extension.
     */
    protected showExtensionInfoPopups() {
        this.showNewVersionPopup();
    }

    /**
     * Shows the popup of for new version.
     */
    protected showNewVersionPopup() {
        let me = this;

        const KEY_LAST_KNOWN_VERSION = 'vsdLastKnownVersion';

        if (this._PACKAGE_FILE) {
            let currentVersion = this._PACKAGE_FILE.version;

            if (currentVersion) {
                // update last known version
                let updateCurrentVersion = false;
                try {
                    let lastKnownVersion: any = this._CONTEXT.globalState.get(KEY_LAST_KNOWN_VERSION, false);
                    if (lastKnownVersion != currentVersion) {
                        if (!deploy_helpers.toBooleanSafe(this.config.disableNewVersionPopups)) {
                            // tell the user that it runs on a new version
                            updateCurrentVersion = true;

                            // [BUTTON] show change log
                            let changeLogBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                            changeLogBtn.action = () => {
                                deploy_helpers.open(deploy_urls.CHANGELOG);
                            };
                            changeLogBtn.title = i18.t('popups.newVersion.showChangeLog');

                            vscode.window
                                  .showInformationMessage(i18.t('popups.newVersion.message', currentVersion),
                                                          changeLogBtn)
                                  .then((item) => {
                                            if (!item || !item.action) {
                                                return;
                                            }

                                            try {
                                                item.action();
                                            }
                                            catch (e) { 
                                                me.log(i18.t('errors.withCategory', 'Deployer.showExtensionInfoPopups(3)', e));
                                            }
                                        });
                        }
                    }
                }
                catch (e) { 
                    me.log(i18.t('errors.withCategory', 'Deployer.showExtensionInfoPopups(2)', e));
                }

                if (updateCurrentVersion) {
                    // update last known version
                    try {
                        this._CONTEXT.globalState.update(KEY_LAST_KNOWN_VERSION, currentVersion);
                    }
                    catch (e) {
                        me.log(i18.t('errors.withCategory', 'Deployer.showExtensionInfoPopups(1)', e));
                    }
                }
            }
        }
    }

    /**
     * Shows the 'after deploy' status bar item based of the current settings.
     * 
     * @param {string} text The text for the item.
     * @param {string[]} files The list of all files.
     * @param {string[]} succeeded The list of succeeded files.
     * @param {string[]} failed The list of failed files.
     */
    protected showStatusBarItemAfterDeployment(text: string,
                                               files: string[],
                                               succeeded: string[], failed: string[]) {
        let me = this;
        
        try {
            let now = Moment().format('HH:mm:ss');
            let icon = '';
            let color = '#ffffff';
            let suffix = '';

            let fileCount = files.length;
            let failedCount = failed.length;
            let succeededCount = succeeded.length;

            if (succeededCount < 1) {
                if (failedCount < 1) {
                    failedCount = fileCount;
                }
            }

            if (files.length > 0) {
                if (1 === files.length) {
                    suffix = ` (${Path.basename(files[0])})`;
                }
                else {
                    if (failedCount > 0) {
                        suffix = ` (${failedCount} / {fileCount})`;
                    }
                    else {
                        suffix = ` (${fileCount})`;
                    }
                }
            }

            if (failedCount >= succeededCount) {
                // all failed
                icon = '$(flame) ';
                color = me.getNextAfterDeploymentButtonColor('e');
            }
            else {
                if (failedCount < 1) {
                    icon = '$(rocket) ';
                    color = me.getNextAfterDeploymentButtonColor('s');
                }
                else {
                    // at least one failed

                    icon = '$(alert) ';
                    color = me.getNextAfterDeploymentButtonColor('w');
                }
            }

            me._AFTER_DEPLOYMENT_STATUS_ITEM.color = color;
            me._AFTER_DEPLOYMENT_STATUS_ITEM.text = i18.t('deploy.after.button.text',
                                                          text, now, icon, suffix);
            me._AFTER_DEPLOYMENT_STATUS_ITEM.tooltip = i18.t('deploy.after.button.tooltip');

            let cfg = me.config;
            if (deploy_helpers.toBooleanSafe(cfg.showDeployResultInStatusBar)) {
                me._AFTER_DEPLOYMENT_STATUS_ITEM.show();

                let hideAfter = parseFloat(deploy_helpers.toStringSafe(cfg.hideDeployResultInStatusBarAfter).trim());
                if (!isNaN(hideAfter)) {
                    hideAfter = Math.round(hideAfter);
                    if (hideAfter >= 0) {
                        let thisTimer: NodeJS.Timer;

                        me._lastAfterDeploymentButtonDisapearTimeout = thisTimer = setTimeout(() => {
                            if (thisTimer === me._lastAfterDeploymentButtonDisapearTimeout) {
                                me._AFTER_DEPLOYMENT_STATUS_ITEM.hide();
                            }
                        }, hideAfter * 1000);
                    }
                }
            }
            else {
                me.hideAfterDeploymentStatusBarItem();
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.showStatusBarItemAfterDeployment()', e));
        }
    }

    /**
     * Starts external extensions.
     * 
     * @return {Promise<any>} The promise.
     */
    protected startExternalExtensions(): Promise<any> {
        let me = this;
        let cfg = me.config;

        let startApi = deploy_helpers.toBooleanSafe(cfg.startApi);
        let startCronJobs = deploy_helpers.toBooleanSafe(cfg.startCronJobs);

        return new Promise<any>((resolve, reject) => {
            let wf = Workflows.create();

            let showExtensionInstallWindow = function(extensionName: string) {
                let author = 'mkloubert';

                let itemName = author + '.' + extensionName;

                let installBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                installBtn.action = () => {
                    deploy_helpers.open(`https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(itemName)}`).then(() => {
                    }).catch((err) => {
                        me.log(i18.t('errors.withCategory',
                                     `Deployer.startExternalExtensions().showExtensionInstallWindow(${itemName}).1`, err));
                    });
                };
                installBtn.title = i18.t('install');

                vscode.window.showWarningMessage(i18.t('extensions.notInstalled', extensionName),
                                                 installBtn)
                             .then((item) => {
                                       if (item) {
                                           item.action();
                                       }
                                   }, (err) => {
                                          me.log(i18.t('errors.withCategory',
                                                       `Deployer.startExternalExtensions().showExtensionInstallWindow(${itemName}).2`, err));
                                      });
            };

            // prepare things
            wf.next((ctx) => {
                ctx.value = {};

                ctx.value.loadCommands = startApi ||
                                         startCronJobs;
            });

            // collect all required data
            // before we start
            wf.next((ctx) => {
                return new Promise<any>((res, rej) => {
                    try {
                        if (ctx.value.loadCommands) {
                            ctx.value.commands = [];    // list of available VSCode commands

                            vscode.commands.getCommands(false).then((commands) => {
                                if (commands) {
                                    commands.forEach(x => ctx.value.commands.push(x));
                                }
                                
                                res();
                            }, () => {
                                res();
                            });
                        }
                        else {
                            res();  // nothing to do here
                        }
                    }
                    catch (e) {
                        rej(e);
                    }
                });
            });

            // vs-rest-api
            if (startApi) {
                wf.next((ctx) => {
                    let commands: string[] = ctx.value.commands;

                    return new Promise<any>((res, rej) => {
                        try {
                            let cmdName = 'extension.restApi.startHost';

                            if (commands.indexOf(cmdName) > -1) {
                                vscode.commands.executeCommand(cmdName).then(() => {
                                    res();
                                }, (err) => {
                                    vscode.window.showErrorMessage('[vs-deploy.vs-rest-api] ' + deploy_helpers.toStringSafe(err));

                                    res();
                                });
                            }
                            else {
                                // extension NOT installed

                                showExtensionInstallWindow('vs-rest-api');
                                res();
                            }
                        }
                        catch (e) {
                            rej(e);
                        }
                    });
                });
            }

            // vs-cron
            if (startCronJobs) {
                wf.next((ctx) => {
                    let commands: string[] = ctx.value.commands;

                    return new Promise<any>((res, rej) => {
                        try {
                            let cmdName = 'extension.cronJons.restartRunningJobs';

                            if (commands.indexOf(cmdName) > -1) {
                                vscode.commands.executeCommand(cmdName).then(() => {
                                    res();
                                }, (err) => {
                                    vscode.window.showErrorMessage('[vs-deploy.vs-cron] ' + deploy_helpers.toStringSafe(err));

                                    res();
                                });
                            }
                            else {
                                // extension NOT installed

                                showExtensionInstallWindow('vs-cron');
                                res();
                            }
                        }
                        catch (e) {
                            rej(e);
                        }
                    });
                });
            }

            wf.start().then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Gets the start time of the extension.
     */
    public get startTime(): Moment.Moment {
        return this._startTime;
    }

    /**
     * Gets if a file filter should also use patterns for directories
     * like in .gitignore files or not.
     * 
     * @param {deploy_contracts.FileFilter} filter The filter to check.
     * @param {boolean} [defaultValue] The default value.
     * 
     * @return {boolean} Also use directory patterns or not.
     */
    public useGitIgnoreStylePatternsInFilter(filter: deploy_contracts.FileFilter,
                                             defaultValue = true): boolean {
        let cfg = this.config;

        // global setting
        let useGitIgnoreStylePatterns = deploy_helpers.toBooleanSafe(cfg.useGitIgnoreStylePatterns,
                                                                     deploy_helpers.toBooleanSafe(defaultValue));
        
        if (filter) {
            // now check filter

            useGitIgnoreStylePatterns = deploy_helpers.toBooleanSafe(filter.useGitIgnoreStylePatterns,
                                                                     useGitIgnoreStylePatterns);
        }

        return useGitIgnoreStylePatterns;
    }
}
