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
import * as deploy_objects from './objects';
import { DeployHost } from './host';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
import * as Moment from 'moment';
import * as OS from 'os';
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Deployer class.
 */
export class Deployer {
    /**
     * Information button that is shown after a deployment has been finished.
     */
    protected readonly _AFTER_DEPLOYMENT_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * Stores the packages that are currently deploy.
     */
    protected readonly _DEPLOY_WORKSPACE_IN_PROGRESS: any = {};
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
     * Stores if cancellation has been requested or not.
     */
    protected _isCancelling: boolean;
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
    protected _plugins: deploy_contracts.DeployPlugin[];
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
     * Cancels the current deployment operation(s).
     */
    public cancelDeployment() {
        if (this.isCancelling) {
            return;
        }

        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(i18.t('deploy.cancelling'));

        this._isCancelling = true;
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
            let completed = (err?: any, canceled?: boolean) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(canceled);
                }
            };

            try {
                me.hideAfterDeploymentStatusBarItem();

                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = me.plugins.filter(x => {
                    return !type ||
                        (x.__type == type && x.deployFile);
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

                        if (me.isCancelling) {
                            completed(null, true);
                            return;
                        }

                        let currentPlugin = matchIngPlugins.shift();
                        let statusBarItem: vscode.StatusBarItem;
                        try {
                            statusBarItem = vscode.window.createStatusBarItem(
                                vscode.StatusBarAlignment.Left,
                            );
                            statusBarItem.color = '#ffffff';
                            statusBarItem.command = "extension.deploy.cancel";
                            statusBarItem.text = i18.t('deploy.button.prepareText');
                            statusBarItem.tooltip = i18.t('deploy.button.tooltip');

                            let showResult = (err?: any, canceled?: boolean) => {
                                let afterDeployButtonMsg = 'Deployment finished.';
                                let afterDeployButtonColor: string;

                                canceled = deploy_helpers.toBooleanSafe(canceled);
                                try {
                                    me.resetIsCancelling();

                                    deploy_helpers.tryDispose(statusBarItem);

                                    let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                    let resultMsg;
                                    if (err) {
                                        if (canceled) {
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

                                        if (canceled) {
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

                                    completed(err, canceled);
                                }
                            };

                            try {
                                statusBarItem.show();

                                currentPlugin.deployFile(file, target, {
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

                                        showResult(e.error, e.canceled);
                                    }
                                });
                            }
                            catch (e) {
                                showResult(e);
                            }
                        }
                        catch (e) {
                            deploy_helpers.tryDispose(statusBarItem);

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
            let completed = (err?: any, canceled?: boolean) => {
                delete me._DEPLOY_WORKSPACE_IN_PROGRESS[nameOfTarget];

                if (err) {
                    reject(err);
                }
                else {
                    resolve(canceled);
                }
            };

            let startDeployment = () => {
                try {
                    me.hideAfterDeploymentStatusBarItem();

                    let type = deploy_helpers.parseTargetType(target.type);

                    let matchIngPlugins = me.plugins.filter(x => {
                        return !type ||
                            (x.__type == type && x.deployWorkspace);
                    });

                    if (matchIngPlugins.length > 0) {
                        let deployNextPlugin: () => void;
                        deployNextPlugin = () => {
                            if (matchIngPlugins.length < 1) {
                                completed();
                                return;
                            }

                            if (me.isCancelling) {
                                completed(null, true);
                                return;
                            }

                            let currentPlugin = matchIngPlugins.shift();
                            let statusBarItem: vscode.StatusBarItem;
                            try {
                                statusBarItem = vscode.window.createStatusBarItem(
                                    vscode.StatusBarAlignment.Left,
                                );
                                statusBarItem.color = '#ffffff';
                                statusBarItem.command = 'extension.deploy.cancel';
                                statusBarItem.text = i18.t('deploy.button.prepareText');
                                statusBarItem.tooltip = i18.t('deploy.button.tooltip');

                                let failed: string[] = [];
                                let succeeded: string[] = [];
                                let showResult = (err?: any, canceled?: boolean) => {
                                    let afterDeployButtonMsg = 'Deployment finished.';
                                    let afterDeployButtonColor: string;

                                    canceled = deploy_helpers.toBooleanSafe(canceled);
                                    try {
                                        me.resetIsCancelling();

                                        deploy_helpers.tryDispose(statusBarItem);

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
                                            if (canceled) {
                                                resultMsg = i18.t('deploy.canceledWithErrors');
                                            }
                                            else {
                                                resultMsg = i18.t('deploy.finishedWithErrors');
                                            }
                                        }
                                        else {
                                            if (canceled) {
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

                                        completed(err, canceled);
                                    }
                                };

                                statusBarItem.show();

                                currentPlugin.deployWorkspace(files, target, {
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
                                        showResult(e.error, e.canceled);
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
                                deploy_helpers.tryDispose(statusBarItem);
                
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
     * Gets if a cancellation is requested or not.
     */
    public get isCancelling(): boolean {
        return this._isCancelling;
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

        this.resetIsCancelling();

        this.setupFileSystemWatcher();
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

            let completed = (err?: any, canceled?: boolean) => {
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

                    if (me.isCancelling) {
                        completed(null, true);
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

                            if (me.isCancelling) {
                                completed(null, true);
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
     * Reloads configuration.
     */
    public reloadConfiguration() {
        let me = this;

        let next = () => {
            me.reloadPlugins();
            me.displayNetworkInfo();

            me.clearOutputOrNot();

            me.showExtensionInfoPopups();
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

        try {
            let loadedPlugins: deploy_contracts.DeployPlugin[] = [];

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
                    
                    // remove existing plugins from cache
                    moduleFiles.forEach(x => {
                        delete require.cache[x];
                    });

                    let nextPluginIndex = -1;
                    moduleFiles.forEach(x => {
                        try {
                            let pluginModule: deploy_contracts.DeployPluginModule = require(x);
                            if (pluginModule) {
                                if (pluginModule.createPlugin) {
                                    let ctx: deploy_contracts.DeployContext = {
                                        config: () => me.config,
                                        error: function(msg) {
                                            if (msg) {
                                                vscode.window.showErrorMessage('' + msg);
                                            }

                                            return this;
                                        },
                                        globals: () => me.getGlobals(),
                                        info: function(msg) {
                                            if (msg) {
                                                vscode.window.showInformationMessage('' + msg);
                                            }

                                            return this;
                                        },
                                        isCancelling: function() {
                                            return me.isCancelling;
                                        },
                                        log: function(msg) {
                                            me.log(msg);
                                            return this;
                                        },
                                        outputChannel: () => me.outputChannel,
                                        packageFile: () => me.packageFile,
                                        packages: () => me.getPackages(),
                                        plugins: null,
                                        require: function(id) {
                                            return require(id);
                                        },
                                        targets: () => me.getTargets(),
                                        warn: function(msg) {
                                            if (msg) {
                                                vscode.window.showWarningMessage('' + msg);
                                            }

                                            return this;
                                        },
                                        workspace: function() {
                                            return vscode.workspace.rootPath;
                                        },
                                        write: function(msg) {
                                            msg = deploy_helpers.toStringSafe(msg);
                                            this.outputChannel().append(msg);

                                            return this;
                                        },
                                        writeLine: function(msg) {
                                            msg = deploy_helpers.toStringSafe(msg);
                                            this.outputChannel().appendLine(msg);

                                            return this;
                                        },
                                    };

                                    let newPlugin = pluginModule.createPlugin(ctx);
                                    if (newPlugin) {
                                        let pluginIndex = ++nextPluginIndex;
                                        ctx.plugins = function() {
                                            return loadedPlugins.filter(x => x.__index != pluginIndex);
                                        };

                                        newPlugin.__file = deploy_helpers.parseTargetType(Path.basename(x));
                                        newPlugin.__filePath = x;
                                        newPlugin.__index = pluginIndex;
                                        newPlugin.__type = deploy_helpers.parseTargetType(Path.basename(x, '.js'));

                                        loadedPlugins.push(newPlugin);
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
                            me.outputChannel.append(`- ${x.__file}`);
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
    }

    /**
     * Resets the state if the 'isCancelling' property.
     * 
     * @param {boolean} newValue The custom value to set.
     */
    protected resetIsCancelling(newValue: boolean = false) {
        this._isCancelling = newValue;
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
     * Action to open the output after an deployment.
     */
    public openOutputAfterDeploment() {
        this.hideAfterDeploymentStatusBarItem();
        this.outputChannel.show();
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
