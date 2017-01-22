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

import * as deploy_compilers from './compilers';
import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as deploy_objects from './objects';
import * as deploy_plugins from './plugins';
import * as deploy_sql from './sql';
import { DeployHost } from './host';
import * as Events from 'events';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
import * as Moment from 'moment';
import * as OS from 'os';
import * as Path from 'path';
import * as vscode from 'vscode';


let nextCancelDeployFileCommandId = Number.MAX_SAFE_INTEGER;
let nextCancelDeployWorkspaceCommandId = Number.MAX_SAFE_INTEGER;

interface ScriptCommandWrapper {
    button?: vscode.StatusBarItem;
    command: vscode.Disposable,
}

/**
 * Deployer class.
 */
export class Deployer extends Events.EventEmitter implements vscode.Disposable {
    /**
     * Information button that is shown after a deployment has been finished.
     */
    protected readonly _AFTER_DEPLOYMENT_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * Stores the packages that are currently deploy.
     */
    protected readonly _DEPLOY_WORKSPACE_IN_PROGRESS: any = {};
    /**
     * List of custom commands.
     */
    protected readonly _COMMANDS: ScriptCommandWrapper[] = [];
    /**
     * Stores the current configuration.
     */
    protected _config: deploy_contracts.DeployConfiguration;
    /**
     * Stores the underlying extension context.
     */
    protected readonly _CONTEXT: vscode.ExtensionContext;
    /**
     * The global file system watcher.
     */
    protected _fileSystemWatcher: vscode.FileSystemWatcher;
    /**
     * Stores the current host.
     */
    protected _host: DeployHost;
    /**
     * Stores the global output channel.
     */
    protected readonly _OUTPUT_CHANNEL: vscode.OutputChannel;
    /**
     * Stores the package file of that extension.
     */
    protected _PACKAGE_FILE: deploy_contracts.PackageFile;
    /**
     * Loaded plugins.
     */
    protected _plugins: deploy_contracts.DeployPluginWithContext[];
    /**
     * The "quick deploy button".
     */
    protected readonly _QUICK_DEPLOY_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * The current status item of the running server.
     */
    protected _serverStatusItem: vscode.StatusBarItem;

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
            try {
                let afterDeployedOperations = deploy_helpers.asArray(target.deployed)
                                                            .filter(x => x);

                let i = -1;
                let canceled = false;
                let completed = (err?: any) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(canceled);
                    }
                };

                let invokeNext: () => void;
                invokeNext = () => {
                    if (afterDeployedOperations.length < 1) {
                        completed();
                        return;
                    }

                    let currentOperation = afterDeployedOperations.shift();
                    ++i;

                    try {
                        me.outputChannel.append(`[AFTER DEPLOY #${i + 1}] `);

                        me.handleCommonDeployOperation(currentOperation,
                                                       deploy_contracts.DeployOperationKind.After,
                                                       files,
                                                       target).then((handled) => {
                            if (!handled) {
                                me.outputChannel.appendLine(i18.t('deploy.operations.unknownType', currentOperation.type));
                            }

                            invokeNext();
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                invokeNext();
            }
            catch (e) {
                reject(e);
            }
        });
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
            try {
                let beforeDeployOperations = deploy_helpers.asArray(target.beforeDeploy)
                                                           .filter(x => x);

                let i = -1;
                let canceled = false;
                let completed = (err?: any) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(canceled);
                    }
                };

                let invokeNext: () => void;
                invokeNext = () => {
                    if (beforeDeployOperations.length < 1) {
                        completed();
                        return;
                    }

                    let currentOperation = beforeDeployOperations.shift();
                    ++i;

                    try {
                        me.outputChannel.append(`[BEFORE DEPLOY #${i + 1}] `);

                        me.handleCommonDeployOperation(currentOperation,
                                                       deploy_contracts.DeployOperationKind.Before,
                                                       files,
                                                       target).then((handled) => {
                            if (!handled) {
                                me.outputChannel.appendLine(i18.t('deploy.operations.unknownType', currentOperation.type));
                            }

                            invokeNext();
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                invokeNext();
            }
            catch (e) {
                reject(e);
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

        let targets = this.getTargets();
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        let quickPicks = targets.map((x, i) => deploy_helpers.createFileQuickPick(file, x, i));

        let deploy = (item: deploy_contracts.DeployFileQuickPickItem) => {
            try {
                if (item) {
                    me.beforeDeploy([file], item.target).then((canceled) => {
                        if (!canceled) {
                            me.deployFileTo(file, item.target);
                        }
                    }).catch((err) => {
                        vscode.window.showErrorMessage(i18.t('deploy.before.failed', err));
                    });
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(i18.t('deploy.file.failed', file, e));
            }
        };

        if (quickPicks.length > 1) {
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
     * @param {DeployFileQuickPickItem} item The quick pick with the information.
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

            me.onCancelling(() => hasCancelled = true);

            try {
                me.hideAfterDeploymentStatusBarItem();

                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                    return !type ||
                           (x.plugin.__type == type && x.plugin.deployFile);
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
                                let afterDeployButtonColor: string;

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
                                            resultMsg = i18.t('deploy.finished');

                                            me.afterDeployment([ file ], target).catch((err) => {
                                                vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                            });
                                        }
                                    }

                                    afterDeployButtonColor = deploy_helpers.getStatusBarItemColor(err,
                                                                                                0, err ? 1 : 0);

                                    if (resultMsg) {
                                        afterDeployButtonMsg = resultMsg;

                                        me.outputChannel.appendLine(resultMsg);
                                    }
                                }
                                finally {
                                    me.showStatusBarItemAfterDeployment(afterDeployButtonMsg,
                                                                        afterDeployButtonColor);

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

        let targets = this.getTargets();
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
        let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i));
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
     */
    public deployWorkspace() {
        let me = this;

        let packages = this.getPackages();
        if (packages.length < 1) {
            vscode.window.showWarningMessage(i18.t('packages.noneDefined'));
            return;
        }

        let packageQuickPicks = packages.map((x, i) => deploy_helpers.createPackageQuickPick(x, i));

        let selectTarget = (pkg: deploy_contracts.DeployPackage) => {
            if (!pkg) {
                return;
            }

            let targets = me.filterTargetsByPackage(pkg);
            if (targets.length < 1) {
                vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
                return;
            }

            let packageName = deploy_helpers.toStringSafe(pkg.name);

            let filesToDeploy = deploy_helpers.getFilesOfPackage(pkg);

            let deploy = (t: deploy_contracts.DeployTarget) => {
                try {
                    if (!t) {
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
                            return;
                        }

                        filesToDeploy = deploy_helpers.getFilesOfPackage(pkg);  // now update file list
                        if (filesToDeploy.length < 1) {
                            vscode.window.showWarningMessage(i18.t('deploy.noFiles'));
                            return;
                        }
                        
                        me.deployWorkspaceTo(filesToDeploy, t).then(() => {
                            //TODO
                        }).catch((err) => {
                            vscode.window.showErrorMessage(i18.t('deploy.workspace.failedWithCategory', 2, err));
                        });
                    }).catch((err) => {
                        vscode.window.showErrorMessage(i18.t('deploy.before.failed', err));
                    });
                }
                catch (e) {
                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failedWithCategory', 1, e));
                }
            };

            let targetsOfPackage = me.getTargetsFromPackage(pkg);
            if (targetsOfPackage.length < 1) {
                // no explicit targets

                let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i));

                if (fileQuickPicks.length > 1) {
                    vscode.window.showQuickPick(fileQuickPicks, {
                        placeHolder: i18.t('deploy.workspace.selectTarget'),
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
            else {
                // we have explicit defined targets here

                if (1 == targetsOfPackage.length) {
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

        if (packageQuickPicks.length > 1) {
            vscode.window.showQuickPick(packageQuickPicks, {
                placeHolder: i18.t('deploy.workspace.selectPackage'),
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
     * Deploys files of the workspace to a target.
     * 
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployTarget} target The target.
     * 
     * @returns {Promise<any>} The promise.
     */
    protected deployWorkspaceTo(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
        let me = this;
        let nameOfTarget = deploy_helpers.normalizeString(target.name);

        return new Promise<any>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err?: any) => {
                delete me._DEPLOY_WORKSPACE_IN_PROGRESS[nameOfTarget];

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

                    // kloubi
                    let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                        return !type ||
                               (x.plugin.__type == type && x.plugin.deployWorkspace);
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
                                    let afterDeployButtonColor: string;

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
                                        afterDeployButtonColor = deploy_helpers.getStatusBarItemColor(err,
                                                                                                    succeeded.length, failed.length);
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
                                                resultMsg = i18.t('deploy.finished');

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
                                        me.showStatusBarItemAfterDeployment(afterDeployButtonMsg, afterDeployButtonColor);

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

            if (deploy_helpers.isNullOrUndefined(me._DEPLOY_WORKSPACE_IN_PROGRESS[nameOfTarget])) {
                me._DEPLOY_WORKSPACE_IN_PROGRESS[nameOfTarget] = {
                    files: files,
                    target: target,
                };

                startDeployment();
            }
            else {
                // there is currently something to be deployed to the target

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
                        let addr = deploy_helpers.toStringSafe(x.address)
                                                    .toLowerCase().trim();
                        if ('IPv4' == x.family) {
                            return !/^(127\.[\d.]+|[0:]+1|localhost)$/.test(addr);
                        }

                        if ('IPv6' == x.family) {
                            return '::1' != addr;
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
                                                   .filter(x => x);
            for (let i = 0; i < excludeForPackages.length; i++) {
                if (excludeForPackages[i] == pkgName) {
                    return false;  // exclude
                }
            }

            let showForPackages = deploy_helpers.asArray(t.showIf)
                                                .map(x => deploy_helpers.normalizeString(x))
                                                .filter(x => x);
            if (showForPackages.length > 0) {
                takeTarget = false;  // exclude by default now

                for (let i = 0; i < showForPackages.length; i++) {
                    if (showForPackages[i] == pkgName) {
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
     * Returns the list of packages.
     * 
     * @returns {DeployPackage[]} The packages.
     */
    public getPackages(): deploy_contracts.DeployPackage[] {
        let me = this;

        let packages = this.config.packages;
        if (!packages) {
            packages = [];
        }

        let myName = this.name;
        packages = deploy_helpers.sortPackages(packages, () => myName);

        return packages.filter(p => {
            let validHosts = deploy_helpers.asArray(p.isFor)
                                           .map(x => deploy_helpers.toStringSafe(x).toLowerCase().trim())
                                           .filter(x => x);

            if (validHosts.length < 1) {
                return true;
            }

            return validHosts.indexOf(myName) > -1;
        });
    }

    /**
     * Returns the list of targets.
     * 
     * @returns {DeployTarget[]} The targets.
     */
    public getTargets(): deploy_contracts.DeployTarget[] {
        let me = this;

        let targets = this.config.targets;
        if (!targets) {
            targets = [];
        }

        let myName = this.name;
        targets = deploy_helpers.sortTargets(targets, () => myName);

        return targets.filter(t => {
            let validHosts = deploy_helpers.asArray(t.isFor)
                                           .map(x => deploy_helpers.toStringSafe(x).toLowerCase().trim())
                                           .filter(x => x);

            if (validHosts.length < 1) {
                return true;
            }

            return validHosts.indexOf(myName) > -1;
        });
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
                                        .filter(x => x);

        let knownTargets = this.getTargets();

        targetNames.forEach(tn => {
            let found = false;
            for (let i = 0; i < knownTargets.length; i++) {
                let kt = knownTargets[i];
                
                if (normalizeString(kt.name) == tn) {
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

            try {
                let nextAction = completed;

                switch (deploy_helpers.toStringSafe(operation.type).toLowerCase().trim()) {
                    case '':
                    case 'open':
                        let openOperation = <deploy_contracts.DeployOpenOperation>operation;
                        let operationTarget = deploy_helpers.toStringSafe(openOperation.target);
                        let waitForExit = deploy_helpers.toBooleanSafe(openOperation.wait, true);

                        let openArgs = [];
                        if (openOperation.arguments) {
                            openArgs = openArgs.concat(deploy_helpers.asArray(openOperation.arguments));
                        }
                        openArgs = openArgs.map(x => deploy_helpers.toStringSafe(x))
                                           .filter(x => x);

                        if (openArgs.length > 0) {
                            let app = operationTarget;

                            operationTarget = openArgs.pop();
                            openArgs = [ app ].concat(openArgs);
                        }

                        me.outputChannel.append(i18.t('deploy.operations.open', operationTarget));

                        nextAction = null;
                        deploy_helpers.open(operationTarget, {
                            app: openArgs,
                            wait: waitForExit,
                        }).then(function() {
                            me.outputChannel.appendLine(i18.t('ok'));

                            completed();
                        }).catch((err) => {
                            completed(err);
                        });
                        break;

                    case 'compile':
                        {
                            let compileOp = <deploy_contracts.DeployCompileOperation>operation;

                            let compilerName = deploy_helpers.toStringSafe(compileOp.compiler).toLowerCase().trim();

                            let compiler: deploy_compilers.Compiler;
                            let compilerArgs: any[];
                            switch (compilerName) {
                                case 'less':
                                    compiler = deploy_compilers.Compiler.Less;
                                    compilerArgs = [ compileOp.options ];
                                    break;

                                case 'script':
                                    compiler = deploy_compilers.Compiler.Script;
                                    compilerArgs = [ me.config, compileOp.options ];
                                    break;

                                case 'typescript':
                                    compiler = deploy_compilers.Compiler.TypeScript;
                                    compilerArgs = [ compileOp.options ];
                                    break;
                            }

                            if (deploy_helpers.isNullOrUndefined(compiler)) {
                                // unknown compiler
                                completed(new Error(i18.t('deploy.operations.unknownCompiler', compilerName)));
                            }
                            else {
                                nextAction = null;
                                deploy_compilers.compile(compiler, compilerArgs).then((result) => {
                                    let sourceFiles: string[] = [];
                                    if (result.files) {
                                        sourceFiles = result.files
                                                            .filter(x => !deploy_helpers.isEmptyString(x))
                                                            .map(x => Path.resolve(x));
                                    }
                                    sourceFiles = deploy_helpers.distinctArray(sourceFiles);

                                    let compilerErrors: deploy_compilers.CompilerError[] = [];
                                    if (result.errors) {
                                        compilerErrors = result.errors
                                                               .filter(x => x);
                                    }

                                    if (compilerErrors.length < 1) {
                                        return;
                                    }

                                    me.outputChannel.appendLine('');    
                                    result.errors.forEach(x => {
                                        me.outputChannel.appendLine(`[${x.file}] ${x.error}`);
                                    });

                                    let failedFiles = compilerErrors.map(x => x.file)
                                                                    .filter(x => !deploy_helpers.isEmptyString(x))
                                                                    .map(x => Path.resolve(x));
                                    failedFiles = deploy_helpers.distinctArray(failedFiles);

                                    let err: Error;
                                    if (failedFiles.length > 0) {
                                        let errMsg: string;
                                        if (failedFiles.length >= sourceFiles.length) {
                                            // all failed
                                            errMsg = i18.t("deploy.operations.noFileCompiled", sourceFiles.length);
                                        }
                                        else {
                                            // some failed
                                            errMsg = i18.t("deploy.operations.someFilesNotCompiled",
                                                           failedFiles.length, sourceFiles.length);
                                        }

                                        err = new Error(errMsg);
                                    }

                                    completed(err);
                                }).catch((err) => {
                                    completed(err);
                                });
                            }
                        }
                        break;

                    case 'script':
                        let scriptExecutor: deploy_contracts.DeployScriptOperationExecutor;

                        let scriptOpts = <deploy_contracts.DeployScriptOperation>operation;
                        if (!deploy_helpers.isEmptyString(scriptOpts.script)) {
                            let scriptModule = deploy_helpers.loadDeployScriptOperationModule(scriptOpts.script);
                            if (scriptModule) {
                                scriptExecutor = scriptModule.execute;
                            }
                        }

                        nextAction = null;
                        if (scriptExecutor) {
                            let scriptArgs: deploy_contracts.DeployScriptOperationArguments = {
                                files: files,
                                globals: me.getGlobals(),
                                kind: kind,
                                options: deploy_helpers.cloneObject(scriptOpts.options),
                                require: function(id) {
                                    return require(id);
                                },
                                target: target,
                            };

                            scriptExecutor(scriptArgs).then(() => {
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
                        {
                            let sqlOp = <deploy_contracts.DeploySqlOperation>operation;

                            let type: deploy_sql.SqlConnectionType;
                            let args: any[];

                            let engineName = deploy_helpers.normalizeString(sqlOp.engine);
                            switch (engineName) {
                                case '':
                                case 'mysql':
                                    // MySQL
                                    type = deploy_sql.SqlConnectionType.MySql;
                                    args = [
                                        sqlOp.options,
                                    ];
                                    break;

                                case 'sql':
                                    // Microsoft SQL
                                    type = deploy_sql.SqlConnectionType.MSSql;
                                    args = [
                                        sqlOp.options,
                                    ];
                                    break;
                            }

                            if (deploy_helpers.isNullOrUndefined(type)) {
                                // unknown SQL engine
                                
                                nextAction = () => {
                                    completed(new Error(i18.t('deploy.operations.unknownSqlEngine',
                                                              engineName)));
                                };
                            }
                            else {
                                nextAction = null;

                                let queries = deploy_helpers.asArray(sqlOp.queries)
                                                            .filter(x => x);

                                deploy_sql.createSqlConnection(type, args).then((conn) => {
                                    let queriesCompleted = (err?: any) => {
                                        conn.close().then(() => {
                                            completed(err);
                                        }).then((err2) => {
                                            //TODO: log

                                            completed(err);
                                        });
                                    };

                                    let invokeNextQuery: () => void;
                                    invokeNextQuery = () => {
                                        if (queries.length < 1) {
                                            queriesCompleted();
                                            return;
                                        }

                                        let q = queries.shift();
                                        conn.query(q).then(() => {
                                            invokeNextQuery();
                                        }).catch((err) => {
                                            queriesCompleted(err);
                                        });
                                    };

                                    invokeNextQuery();
                                }).catch((err) => {
                                    completed(err);
                                });
                            }
                        }
                        break;

                    case 'vscommand':
                        {
                            let vsCmdOp = <deploy_contracts.DeployVSCommandOperation>operation;

                            let commandId = deploy_helpers.toStringSafe(vsCmdOp.command).trim();
                            if (!deploy_helpers.isEmptyString(commandId)) {
                                let args = vsCmdOp.arguments;
                                if (!args) {
                                    args = [];
                                }

                                if (deploy_helpers.toBooleanSafe(vsCmdOp.submitContext)) {
                                    // submit DeployVSCommandOperationContext object
                                    // as first argument

                                    let cmdCtx: deploy_contracts.DeployVSCommandOperationContext = {
                                        command: commandId,
                                        globals: me.getGlobals(),
                                        files: files,
                                        kind: kind,
                                        operation: vsCmdOp,
                                        options: vsCmdOp.contextOptions,
                                        require: (id) => {
                                            return require(id);
                                        }
                                    };

                                    args = [ cmdCtx ].concat(args);
                                }

                                args = [ commandId ].concat(args);

                                nextAction = null;
                                vscode.commands.executeCommand.apply(null, args).then(() => {
                                    completed();
                                }, (err) => {
                                    completed(err);
                                });;
                            }
                        }
                        break;

                    case 'wait':
                        let waitTime = parseFloat(deploy_helpers.toStringSafe((<deploy_contracts.DeployWaitOperation>operation).time));
                        if (isNaN(waitTime)) {
                            waitTime = 1000;
                        }

                        nextAction = null;
                        setTimeout(() => {
                            completed();
                        }, waitTime);
                        break;

                    case 'webdeploy':
                        {
                            let webDeployOp = <deploy_contracts.DeployWebDeployOperation>operation;

                            let msDeploy = 'msdeploy.exe';
                            if (!deploy_helpers.isEmptyString(webDeployOp.exec)) {
                                msDeploy = deploy_helpers.toStringSafe(webDeployOp.exec);
                            }

                            let args = [
                                // -source
                                `-source:${deploy_helpers.toStringSafe(webDeployOp.source)}`,
                            ];

                            // -<param>:<value>
                            let paramsWithValues = [
                                'dest', 'declareParam', 'setParam', 'setParamFile', 'declareParamFile',
                                'removeParam', 'disableLink', 'enableLink', 'disableRule', 'enableRule',
                                'replace', 'skip', 'disableSkipDirective', 'enableSkipDirective',
                                'preSync', 'postSync',
                                'retryAttempts', 'retryInterval',
                                'appHostConfigDir', 'webServerDir', 'xpath',
                            ];
                            for (let i = 0; i < paramsWithValues.length; i++) {
                                let p = paramsWithValues[i];
                                
                                if (!deploy_helpers.isEmptyString(webDeployOp[p])) {
                                    args.push(`-${p}:${deploy_helpers.toStringSafe(webDeployOp[p])}`);
                                }
                            }

                            // -<param>
                            let boolParams = [
                                'whatif', 'disableAppStore', 'allowUntrusted',
                                'showSecure', 'xml', 'unicode', 'useCheckSum',
                                'verbose',
                            ];
                            for (let i = 0; i < boolParams.length; i++) {
                                let p = boolParams[i];
                                
                                if (deploy_helpers.toBooleanSafe(webDeployOp[p])) {
                                    args.push(`-${p}`);
                                }
                            }

                            let openOpts: deploy_helpers.OpenOptions = {
                                app: [ msDeploy ].concat(args)
                                                 .map(x => deploy_helpers.toStringSafe(x))
                                                 .filter(x => x),
                                cwd: webDeployOp.dir,
                                wait: deploy_helpers.toBooleanSafe(webDeployOp.wait, true),
                            };

                            let target = `-verb:${deploy_helpers.toStringSafe(webDeployOp.verb)}`;

                            nextAction = null;
                            deploy_helpers.open(target, openOpts).then(() => {
                                me.outputChannel.appendLine(i18.t('ok'));

                                completed();
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        break;

                    default:
                        handled = false;
                        break;
                }

                if (nextAction) {
                    nextAction();
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
        return deploy_helpers.toStringSafe(OS.hostname())
                             .toLowerCase().trim();
    }

    /**
     * The 'on activated' event.
     */
    public onActivated() {
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
            FS.exists(fileName, (exists) => {
                try {
                    let normalizeString = (str: string): string => {
                        return deploy_helpers.toStringSafe(str)
                                             .toLowerCase()
                                             .trim();
                    };

                    let getTargetNamesByPackage = (pkg: deploy_contracts.DeployPackage): deploy_contracts.DeployTarget[] => {
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

                        let targetSource: string[] = [];
                        if (pkg) {
                            if (useTargetLists) {
                                // use targets from the 'targets' property
                                // of package

                                if (true !== pkg.deployOnSave) {
                                    targetSource = targetSource.concat(deploy_helpers.asArray(pkg.deployOnSave));
                                }

                                targetSource = targetSource.concat(deploy_helpers.asArray(pkg.targets));
                            }
                            else {
                                // use targets from 'deployOnSave' property

                                if (true === pkg.deployOnSave) {
                                    targetSource = targetSource.concat(me.getTargets()
                                                                         .map(x => x.name));
                                }
                                else {
                                    targetSource = targetSource.concat(deploy_helpers.asArray(pkg.deployOnSave));
                                }
                            }
                        }

                        return deploy_helpers.asArray(targetSource)
                                             .map(x => normalizeString(x))
                                             .filter(x => x);
                    };

                    if (!packagesToDeploy) {
                        // find packages that would deploy the file

                        packagesToDeploy = me.getPackages();
                        packagesToDeploy = packagesToDeploy.filter(x => {
                            if (!x.deployOnSave) {
                                return false;  // do NOT deploy on save
                            }

                            let packageFiles = deploy_helpers.getFilesOfPackage(x);
                            return packageFiles.indexOf(docFile) > -1;
                        });
                    }
                    
                    // check for non existing target names
                    let targets = me.getTargets();
                    packagesToDeploy.forEach(pkg => {
                        let packageName = normalizeString(pkg.name);

                        let targetsOfPackage = getTargetNamesByPackage(pkg);
                        targetsOfPackage.forEach(tn => {
                            let foundTarget = false;
                            for (let i = 0; i < targets.length; i++) {
                                let targetName = normalizeString(targets[i].name);

                                if (targetName == tn) {
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

                    // find matching targets
                    targets = targets.filter(t => {
                        let targetName = normalizeString(t.name);

                        for (let i = 0; i < packagesToDeploy.length; i++) {
                            let pkg = packagesToDeploy[i];

                            // extract targets that are defined in the package
                            let targetsOfPackage = getTargetNamesByPackage(pkg);                            
                            if (targetsOfPackage.indexOf(targetName) > -1) {
                                return true;
                            }
                        }

                        return false;
                    });

                    // deploy file to targets
                    targets.forEach(t => {
                        let targetName = deploy_helpers.toStringSafe(t.name).trim();

                        let showError = (err: any) => {
                            let errMsg = deploy_helpers.toStringSafe(err);

                            let targetExpr = 'target';
                            if (targetName) {
                                targetExpr = `'${targetName}'`;
                            }

                            vscode.window.showWarningMessage(i18.t('deploy.onSave.failedTarget',
                                                                   relativeDocFilePath, targetExpr, errMsg));
                        };

                        me.deployFileTo(docFile, t).then(() => {
                            //TODO
                        }).catch((err) => {
                            showError(err);
                        });
                    });
                }
                catch (e) {
                    vscode.window.showErrorMessage(i18.t('deploy.onSave.failed', relativeDocFilePath, 2, e));
                }
            });
        }
        catch (e) {
            vscode.window.showErrorMessage(i18.t('deploy.onSave.failed', relativeDocFilePath, 1, e));
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

        if (deploy_helpers.toBooleanSafe(this.config.deployOnSave, true)) {
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
        if (!deploy_helpers.toBooleanSafe(this.config.deployOnChange, true)) {
            // deactivated
            return;
        }

        let me = this;

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

                        let matchingFiles: string[];

                        if (true === pkg.deployOnChange) {
                            matchingFiles = deploy_helpers.getFilesOfPackage(pkg);
                        }
                        else {
                            matchingFiles = deploy_helpers.getFilesByFilter(pkg.deployOnChange)
                                                          .filter(x => Path.resolve(x));
                        }

                        if (matchingFiles.map(x => normalizePath(x)).indexOf(normalizePath(filePath)) > 0) {
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
                let filters = deploy_helpers.asArray(cfg.open)
                                            .filter(x => {
                                                        return x &&
                                                               deploy_helpers.asArray(x.files)
                                                                             .map(y => deploy_helpers.toStringSafe(y))
                                                                             .filter(y => y)
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
     * Action to open the output after an deployment.
     */
    public openOutputAfterDeploment() {
        this.hideAfterDeploymentStatusBarItem();

        this.outputChannel.show();
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
                                                 .filter(x => x);

                let knownPackages = this.getPackages();

                packageNames.forEach(pn => {
                    let found = false;

                    for (let i = 0; i < knownPackages.length; i++) {
                        let kp = knownPackages[i];
                        if (normalizeString(kp.name) == pn) {
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
                        let files = deploy_helpers.getFilesOfPackage(currentPackage);

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
                                    files = deploy_helpers.getFilesOfPackage(currentPackage);

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
     * Reloads the defined commands from the config.
     */
    protected reloadCommands() {
        let me = this;

        try {
            let cfg = me.config;

            // remove old commands
            while (this._COMMANDS.length > 0) {
                let oldCmd = this._COMMANDS.shift();

                deploy_helpers.tryDispose(oldCmd.command);
                deploy_helpers.tryDispose(oldCmd.button);
            }

            if (cfg.commands) {
                let newCommands = deploy_helpers.asArray(cfg.commands)
                                                .filter(x => x);

                let globalState: any = {};

                newCommands.filter(x => !deploy_helpers.isEmptyString(x.command))
                           .forEach(x => {
                               let cmdName = deploy_helpers.toStringSafe(x.command).trim();

                               let btn: vscode.StatusBarItem;
                               let cmd: vscode.Disposable;
                               let commandState: any = {};
                               try {
                                   cmd = vscode.commands.registerCommand(cmdName, function() {
                                       let args: deploy_contracts.ScriptCommandExecutorArguments;
                                       let completed = (err?: any) => {
                                           if (err) {
                                               vscode.window.showErrorMessage(i18.t('commands.executionFailed',
                                                                                    cmdName, err));
                                           }

                                           if (args) {
                                               commandState = args.commandState;
                                               globalState = args.globalState;
                                           }
                                       };
                                       
                                       try {
                                            let cmdModule = deploy_helpers.loadScriptCommandModule(x.script);
                                            if (!cmdModule.execute) {
                                                completed();
                                                return;  // no execute() function found
                                            }

                                            args = {
                                                arguments: arguments,
                                                command: cmdName,
                                                commandState: commandState,
                                                globals: me.getGlobals(),
                                                options: deploy_helpers.cloneObject(x.options),
                                                require: function(id) {
                                                    return require(id);
                                                },
                                            };

                                            // args.globalState
                                            Object.defineProperty(args, 'globalState', {
                                                enumerable: true,
                                                get: () => { return globalState; }, 
                                            });

                                            // args.button
                                            Object.defineProperty(args, 'button', {
                                                configurable: true,
                                                enumerable: true,
                                                get: () => { return btn; }, 
                                            });

                                            cmdModule.execute(args).then(() => {
                                                completed();
                                            }).catch((err) => {
                                                completed(err);
                                            });
                                       }
                                       catch (e) {
                                           completed(e);
                                       }
                                   });

                                   if (x.button) {
                                       // status bar button

                                       // right alignment?
                                       let alignment = vscode.StatusBarAlignment.Left;
                                       if (deploy_helpers.toBooleanSafe(x.button.isRight)) {
                                           alignment = vscode.StatusBarAlignment.Right;
                                       }

                                       btn = vscode.window.createStatusBarItem(alignment);
                                       btn.command = cmdName;
                                        
                                       // caption
                                       if (deploy_helpers.isEmptyString(x.button.text)) {
                                           btn.text = cmdName;
                                       }
                                       else {
                                           btn.text = deploy_helpers.toStringSafe(x.button.text);
                                       }

                                       // tooltip
                                       if (deploy_helpers.isEmptyString(x.button.tooltip)) {
                                           btn.tooltip = cmdName;
                                       }
                                       else {
                                           btn.tooltip = deploy_helpers.toStringSafe(x.button.tooltip);
                                       }

                                       // color
                                       let color = deploy_helpers.toStringSafe(x.button.color).toLowerCase().trim();
                                       if (color) {
                                           btn.color = color;
                                       }

                                       if (!deploy_helpers.isNullOrUndefined(x.button.priority)) {
                                           btn.priority = parseFloat(deploy_helpers.toStringSafe(x.button.priority).trim());
                                       }

                                       if (deploy_helpers.toBooleanSafe(x.button.show, true)) {
                                           btn.show();
                                       }
                                   }

                                   me._COMMANDS.push({
                                       button: btn,
                                       command: cmd,
                                   });
                               }
                               catch (e) {
                                   deploy_helpers.tryDispose(btn);
                                   deploy_helpers.tryDispose(cmd);

                                   me.log(i18.t('errors.withCategory',
                                                'Deployer.reloadCommands(2)', e));
                               }
                           });
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory',
                         'Deployer.reloadCommands(1)', e));
        }
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        let me = this;

        let next = () => {
            me.reloadPlugins();
            me.displayNetworkInfo();

            me.clearOutputOrNot();

            me.openFiles();

            me.showExtensionInfoPopups();

            me.reloadCommands();
            me.executeStartupCommands();
        };

        this._config = <deploy_contracts.DeployConfiguration>vscode.workspace.getConfiguration("deploy");

        this._QUICK_DEPLOY_STATUS_ITEM.text = 'Quick deploy!';
        this._QUICK_DEPLOY_STATUS_ITEM.tooltip = 'Start a quick deploy...';
        i18.init(this._config.language).then(() => {
            if (me._config.button) {
                let txt = deploy_helpers.toStringSafe(me._config.button.text).trim();
                if (!txt) {
                    txt = i18.t('quickDeploy.caption');
                }
                me._QUICK_DEPLOY_STATUS_ITEM.text = txt;
            }

            me._QUICK_DEPLOY_STATUS_ITEM.tooltip = i18.t('quickDeploy.start');

            next();
        }).catch((err) => {
            me.log(`[ERROR :: vs-deploy] Deploy.reloadConfiguration(1): ${deploy_helpers.toStringSafe(err)}`);

            next();
        });

        this._QUICK_DEPLOY_STATUS_ITEM.hide();
        if (this._config.button) {
            if (deploy_helpers.toBooleanSafe(this._config.button.enabled)) {
                this._QUICK_DEPLOY_STATUS_ITEM.show();
            }
        }

        if (deploy_helpers.toBooleanSafe(this._config.openOutputOnStartup)) {
            this.outputChannel.show();
        }
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
                            if ('.' != x && '..' != x) {
                                let fullPath = Path.join(pluginDir, x);
                                if (FS.lstatSync(fullPath).isFile()) {
                                    if (fullPath.length >= 3) {
                                        return '.js' == fullPath.substring(fullPath.length - 3);
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
                        ctx.globals = () => me.getGlobals();
                        ctx.log = function(msg) {
                            me.log(msg);
                            return this;
                        };
                        ctx.outputChannel = () => me.outputChannel;
                        ctx.packageFile = () => me.packageFile;
                        ctx.packages = () => me.getPackages();
                        ctx.targets = () => me.getTargets();

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
                                            return loadedPlugins.filter(x => x.plugin.__index != pluginIndex)
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
                    if (loadedPlugins.length != 1) {
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
                                deploy_helpers.open('https://github.com/mkloubert/vs-deploy/blob/master/CHANGELOG.md');
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
     * @param {string} [color] The custom color to use.
     */
    protected showStatusBarItemAfterDeployment(text: string, color?: string) {
        if (deploy_helpers.isEmptyString(color)) {
            color = '#ffffff';
        }

        this._AFTER_DEPLOYMENT_STATUS_ITEM.color = color;
        this._AFTER_DEPLOYMENT_STATUS_ITEM.text = i18.t('deploy.after.button.text', text);
        this._AFTER_DEPLOYMENT_STATUS_ITEM.tooltip = i18.t('deploy.after.button.tooltip');

        let cfg = this.config;
        if (deploy_helpers.toBooleanSafe(cfg.showDeployResultInStatusBar)) {
            this._AFTER_DEPLOYMENT_STATUS_ITEM.show();
        }
        else {
            this.hideAfterDeploymentStatusBarItem();
        }
    }
}
