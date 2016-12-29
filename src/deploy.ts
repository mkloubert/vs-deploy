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
import * as FS from 'fs';
const FSExtra = require('fs-extra');
const Glob = require('glob');
import * as i18 from './i18';
import * as Moment from 'moment';
import * as Net from 'net';
import * as OS from 'os';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as ZLib from 'zlib';


interface RemoteFile {
    data?: Buffer;
    isCompressed?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    name?: string;
    nr?: number;
    session?: string;
    tag?: any;
    totalCount?: number;
}

/**
 * Deployer class.
 */
export class Deployer {
    /**
     * Stores the current configuration.
     */
    protected _config: deploy_contracts.DeployConfiguration;
    /**
     * Stores the underlying extension context.
     */
    protected _CONTEXT: vscode.ExtensionContext;
    /**
     * Stores if cancellation has been requested or not.
     */
    protected _isCancelling: boolean;
    /**
     * Stores the global output channel.
     */
    protected _OUTPUT_CHANNEL: vscode.OutputChannel;
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
    protected _QUICK_DEPLOY_STATUS_ITEM: vscode.StatusBarItem;
    /**
     * Stores the current server instance.
     */
    protected _server: Net.Server;
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

        this.reloadConfiguration();

        this.resetIsCancelling();
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

                        me.handleCommonDeployOperation(currentOperation).then((handled) => {
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

                        me.handleCommonDeployOperation(currentOperation).then((handled) => {
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
                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = this.plugins.filter(x => {
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
                        try {
                            let statusBarItem = vscode.window.createStatusBarItem(
                                vscode.StatusBarAlignment.Left,
                            );

                            let showResult = (err?: any, canceled?: boolean) => {
                                canceled = deploy_helpers.toBooleanSafe(canceled);
                                try {
                                    me.resetIsCancelling();

                                    statusBarItem.dispose();

                                    let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                                    if (err) {
                                        if (canceled) {
                                            me.outputChannel.appendLine(i18.t('deploy.canceledWithErrors'));
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('deploy.finishedWithErrors'));
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
                                            me.outputChannel.appendLine(i18.t('deploy.canceled'));
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('deploy.finished'));

                                            me.afterDeployment([ file ], target).catch((err) => {
                                                vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                            });
                                        }
                                    }
                                }
                                finally {
                                    completed(err, canceled);
                                }
                            };

                            try {
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

                                        statusBarItem.color = '#ffffff';
                                        statusBarItem.command = "extension.deploy.cancel";
                                        statusBarItem.text = i18.t('deploy.button.text');
                                        statusBarItem.tooltip = i18.t('deploy.button.tooltip');
                                        statusBarItem.show();
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

        let targets = this.getTargets();
        if (targets.length < 1) {
            vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
            return;
        }

        let packageQuickPicks = packages.map((x, i) => deploy_helpers.createPackageQuickPick(x, i));

        let selectTarget = (pkg: deploy_contracts.DeployPackage) => {
            if (!pkg) {
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

        return new Promise<any>((resolve, reject) => {
            let completed = (err?: any, canceled?: boolean) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(canceled);
                }
            };

            try {
                let type = deploy_helpers.parseTargetType(target.type);

                let matchIngPlugins = this.plugins.filter(x => {
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
                        try {
                            let statusBarItem = vscode.window.createStatusBarItem(
                                vscode.StatusBarAlignment.Left,
                            );

                            let failed: string[] = [];
                            let succeeded: string[] = [];
                            let showResult = (err?: any, canceled?: boolean) => {
                                canceled = deploy_helpers.toBooleanSafe(canceled);
                                try {
                                    me.resetIsCancelling();

                                    statusBarItem.dispose();

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
                                                        vscode.window.showErrorMessage(i18.t('deploy.workspace.allSucceededWithTarget', allCount
                                                                                                                                      , targetExpr));
                                                    }
                                                    else {
                                                        vscode.window.showErrorMessage(i18.t('deploy.workspace.allSucceeded', allCount));
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

                                    if (err || failed.length > 0) {
                                        if (canceled) {
                                            me.outputChannel.appendLine(i18.t('deploy.canceledWithErrors'));
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('deploy.finishedWithErrors'));
                                        }
                                    }
                                    else {
                                        if (canceled) {
                                            me.outputChannel.appendLine(i18.t('deploy.canceled'));
                                        }
                                        else {
                                            me.outputChannel.appendLine(i18.t('deploy.finished'));

                                            me.afterDeployment(files, target).catch((err) => {
                                                vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                            });
                                        }
                                    }
                                }
                                finally {
                                    completed(err, canceled);
                                }
                            };

                            statusBarItem.color = '#ffffff';
                            statusBarItem.command = 'extension.deploy.cancel';
                            statusBarItem.text = i18.t('deploy.button.text');
                            statusBarItem.tooltip = i18.t('deploy.button.tooltip');
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

                                    statusBarItem.tooltip = statusMsg + ` (${i18.t('deploy.workspace.clickToCancel')})`;
                                    me.outputChannel.append(statusMsg + '... ');
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
        });
    }

    /**
     * Displays information about the network of this machine.
     */
    public displayNetworkInfo() {
        let me = this;

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
     * Returns the list of packages.
     * 
     * @returns {DeployPackage[]} The packages.
     */
    public getPackages(): deploy_contracts.DeployPackage[] {
        let packages = this.config.packages;
        if (!packages) {
            packages = [];
        }

        let myName = this.name;
        packages = deploy_helpers.sortPackages(packages);

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
        let targets = this.config.targets;
        if (!targets) {
            targets = [];
        }

        let myName = this.name;
        targets = deploy_helpers.sortPackages(targets);

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
     * 
     * @return Promise<boolean> The promise.
     */
    protected handleCommonDeployOperation(operation: deploy_contracts.DeployOperation): Promise<boolean> {
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

        let server = me._server;
        if (server) {
            server.close((err) => {
                if (err) {
                    let errMsg = i18.t('host.errors.couldNotStop', err);

                    vscode.window.showErrorMessage(errMsg);
                    me.outputChannel.appendLine(errMsg);
                    return;
                }

                me._server = null;

                let successMsg = i18.t('host.stopped');

                vscode.window.showInformationMessage(successMsg);
                me.outputChannel.appendLine(successMsg);
            });

            return;
        }

        let cfg = me.config;

        let dir: string;
        let jsonTransformer: deploy_contracts.DataTransformer;
        let jsonTransformerOpts: any;
        let maxMsgSize = deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE;
        let port = deploy_contracts.DEFAULT_PORT;
        let transformer: deploy_contracts.DataTransformer;
        let transformerOpts: any;
        if (cfg.host) {
            port = parseInt(deploy_helpers.toStringSafe(cfg.host.port,
                                                        '' + deploy_contracts.DEFAULT_PORT));

            maxMsgSize = parseInt(deploy_helpers.toStringSafe(cfg.host.maxMessageSize,
                                                              '' + deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE));

            dir = cfg.host.dir;

            // file data transformer
            transformerOpts = cfg.host.transformerOptions;
            if (cfg.host.transformer) {
                let transformerModule = deploy_helpers.loadDataTransformerModule(cfg.host.transformer);
                if (transformerModule) {
                    transformer = transformerModule.restoreData ||
                                  transformerModule.transformData;
                }
            }

            // JSON data transformer
            jsonTransformerOpts = cfg.host.messageTransformerOptions;
            if (cfg.host.messageTransformer) {
                let jsonTransformerModule = deploy_helpers.loadDataTransformerModule(cfg.host.messageTransformer);
                if (jsonTransformerModule) {
                    jsonTransformer = jsonTransformerModule.restoreData ||
                                      jsonTransformerModule.transformData;
                }
            }
        }

        dir = deploy_helpers.toStringSafe(dir, deploy_contracts.DEFAULT_HOST_DIR);
        if (!Path.isAbsolute(dir)) {
            dir = Path.join(vscode.workspace.rootPath, dir);
        }

        jsonTransformer = deploy_helpers.toDataTransformerSafe(jsonTransformer);
        transformer = deploy_helpers.toDataTransformerSafe(transformer);

        let showError = (err: any) => {
            vscode.window.showErrorMessage(i18.t('host.errors.cannotListen', err));
        };

        server = Net.createServer((socket) => {
            let remoteAddr = socket.remoteAddress;
            let remotePort = socket.remotePort;
            
            let closeSocket = () => {
                try {
                    socket.destroy();
                }
                catch (e) {
                    me.log(i18.t('errors.withCategory', 'Deployer.listen().createServer(1)', e));
                }
            };

            try {
                deploy_helpers.readSocket(socket, 4).then((dlBuff) => {
                    if (4 != dlBuff.length) {  // must have the size of 4
                        me.log(i18.t('warnings.withCategory', 'Deployer.listen().createServer()',
                                     `Invalid data buffer length ${dlBuff.length}`));

                        closeSocket();
                        return;
                    }

                    let dataLength = dlBuff.readUInt32LE(0);
                    if (dataLength > maxMsgSize) {  // out of range
                        me.log(i18.t('warnings.withCategory', 'Deployer.listen().createServer()',
                                     `Invalid data length ${dataLength}`));

                        closeSocket();
                        return;
                    }

                    deploy_helpers.readSocket(socket, dataLength).then((msgBuff) => {
                        closeSocket();

                        if (msgBuff.length != dataLength) {  // non-exptected data length
                            me.log(i18.t('warnings.withCategory', 'Deployer.listen().createServer()',
                                         `Invalid buffer length ${msgBuff.length}`));

                            return;
                        }
                        
                        let completed = (err?: any, file?: string) => {
                            if (err) {
                                let failMsg = '';
                                if (file) {
                                    failMsg += `'${deploy_helpers.toStringSafe(file)}'; `;
                                }
                                failMsg += deploy_helpers.toStringSafe(err);

                                me.outputChannel.appendLine(i18.t('host.receiveFile.failed', failMsg));
                            }
                            else {
                                let okMsg = '';
                                if (file) {
                                    okMsg = `: '${deploy_helpers.toStringSafe(file)}'`;
                                }

                                me.outputChannel.appendLine(i18.t('host.receiveFile.ok', okMsg));
                            }
                        };

                        // restore "transformered" JSON message
                        jsonTransformer({
                            data: msgBuff,
                            options: jsonTransformerOpts,
                            mode: deploy_contracts.DataTransformerMode.Restore,
                        }).then((untransformedMsgBuff) => {
                            try {
                                let json = untransformedMsgBuff.toString('utf8');
                                
                                let file: RemoteFile;
                                if (json) {
                                    file = JSON.parse(json);
                                }

                                if (file) {
                                    // output that we are receiving a file...

                                    let fileInfo = '';
                                    if (!deploy_helpers.isNullOrUndefined(file.nr)) {
                                        let fileNr = parseInt(deploy_helpers.toStringSafe(file.nr));
                                        if (!isNaN(fileNr)) {
                                            fileInfo += ` (${fileNr}`;
                                            if (!deploy_helpers.isNullOrUndefined(file.totalCount)) {
                                                let totalCount = parseInt(deploy_helpers.toStringSafe(file.totalCount));
                                                if (!isNaN(totalCount)) {
                                                    fileInfo += ` / ${totalCount}`;

                                                    if (0 != totalCount) {
                                                        let percentage = Math.floor(fileNr / totalCount * 10000.0) / 100.0;
                                                        
                                                        fileInfo += `; ${percentage}%`;
                                                    }
                                                }
                                            }
                                            fileInfo += ")";
                                        }
                                    }

                                    let receiveFileMsg = i18.t('host.receiveFile.receiving',
                                                               remoteAddr, remotePort, fileInfo);

                                    me.outputChannel.append(receiveFileMsg);

                                    file.name = deploy_helpers.toStringSafe(file.name);
                                    file.name = deploy_helpers.replaceAllStrings(file.name, Path.sep, '/');

                                    if (file.name) {
                                        let fileCompleted = (err?: any) => {
                                            completed(err, file.name);
                                        };

                                        try {
                                            let base64 = deploy_helpers.toStringSafe(file.data);

                                            let data: Buffer;
                                            if (base64) {
                                                data = new Buffer(base64, 'base64');
                                            }
                                            else {
                                                data = Buffer.alloc(0);
                                            }
                                            file.data = data;

                                            let handleData = function(data: Buffer) {
                                                try {
                                                    while (0 == file.name.indexOf('/')) {
                                                        file.name = file.name.substr(1);
                                                    }

                                                    if (file.name) {
                                                        let targetFile = Path.join(dir, file.name);
                                                        let targetDir = Path.dirname(targetFile);
                                                        
                                                        let copyFile = () => {
                                                            try {
                                                                FS.writeFile(targetFile, file.data, (err) => {
                                                                    if (err) {
                                                                        fileCompleted(err);
                                                                        return;
                                                                    }

                                                                    fileCompleted();
                                                                });
                                                            }
                                                            catch (e) {
                                                                fileCompleted(e);
                                                            }
                                                        };

                                                        // check if targetDir is a directory
                                                        let checkIfTargetDirIsDir = () => {
                                                            FS.lstat(targetDir, (err, stats) => {
                                                                if (err) {
                                                                    fileCompleted(err);
                                                                    return;
                                                                }

                                                                if (stats.isDirectory()) {
                                                                    copyFile();  // yes, continue...
                                                                }
                                                                else {
                                                                    // no => ERROR
                                                                    fileCompleted(new Error(i18.t('isNo.directory', targetDir)));
                                                                }
                                                            });
                                                        };

                                                        // check if targetDir exists
                                                        let checkIfTargetDirExists = () => {
                                                            FS.exists(targetDir, (exists) => {
                                                                if (exists) {
                                                                    // yes, continue...
                                                                    checkIfTargetDirIsDir();
                                                                }
                                                                else {
                                                                    // no, try to create
                                                                    FSExtra.mkdirs(targetDir, function (err) {
                                                                        if (err) {
                                                                            fileCompleted(err);
                                                                            return;
                                                                        }

                                                                        checkIfTargetDirIsDir();
                                                                    });
                                                                }
                                                            });
                                                        };
                                                        
                                                        FS.exists(targetFile, (exists) => {
                                                            if (exists) {
                                                                try {
                                                                    FS.lstat(targetFile, (err, stats) => {
                                                                        if (err) {
                                                                            fileCompleted(err);
                                                                            return;
                                                                        }

                                                                        if (stats.isFile()) {
                                                                            FS.unlink(targetFile, (err) => {
                                                                                if (err) {
                                                                                    fileCompleted(err);
                                                                                    return;
                                                                                }

                                                                                checkIfTargetDirExists();
                                                                            });
                                                                        }
                                                                        else {
                                                                            fileCompleted(new Error(i18.t('isNo.file', targetFile)));
                                                                        }
                                                                    });
                                                                }
                                                                catch (e) {
                                                                    fileCompleted(e);
                                                                }
                                                            }
                                                            else {
                                                                checkIfTargetDirExists();
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        fileCompleted(new Error(i18.t('host.errors.noFilename', 2)));
                                                    }
                                                    // if (file.name) #2
                                                }
                                                catch (e) {
                                                    fileCompleted(e);
                                                }
                                            };  // handleData()

                                            let untransformTheData = function(data?: Buffer) {
                                                if (arguments.length > 0) {
                                                    file.data = data;
                                                }

                                                try {
                                                    transformer({
                                                        data: file.data,
                                                        options: transformerOpts,
                                                        mode: deploy_contracts.DataTransformerMode.Restore,
                                                    }).then((untransformedData) => {
                                                        file.data = untransformedData;

                                                        handleData(untransformedData);
                                                    }).catch((err) => {
                                                        fileCompleted(err);
                                                    });
                                                }
                                                catch (e) {
                                                    fileCompleted(e);
                                                }
                                            };  // untransformTheData()

                                            if (file.isCompressed) {
                                                ZLib.gunzip(file.data, (err, uncompressedData) => {
                                                    if (err) {
                                                        fileCompleted(err);
                                                        return;
                                                    }

                                                    untransformTheData(uncompressedData);                                                
                                                });
                                            }
                                            else {
                                                untransformTheData();
                                            }
                                        }
                                        catch (e) {
                                            fileCompleted(e);
                                        }
                                    }
                                    else {
                                        completed(new Error(i18.t('host.errors.noFilename', 1)));
                                    }
                                    // if (file.name) #1
                                }
                                else {
                                    completed(new Error(i18.t('host.errors.noData')));
                                }
                                // if (file)
                            }
                            catch (e) {
                                completed(e);
                            }
                        }).catch((err) => {
                            completed(err);
                        });
                    }).catch((err) => {
                        me.log(i18.t('errors.withCategory', 'Deployer.listen().createServer(3)', err));

                        closeSocket();
                    });
                }).catch((err) => {
                    me.log(i18.t('errors.withCategory', 'Deployer.listen().createServer(4)', err));

                    closeSocket();
                });
            }
            catch (e) {
                me.log(i18.t('errors.withCategory', 'Deployer.listen().createServer(5)', e));

                closeSocket();
            }
        });

        server.on('listening', (err) => {
            if (err) {
                showError(err);
            }
            else {
                try {
                    me._server = server;

                    let successMsg = i18.t('host.started', port, dir);

                    me.outputChannel.appendLine(successMsg);
                    vscode.window.showInformationMessage(successMsg);

                    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                    statusItem.tooltip = '';
                    statusItem.command = 'extension.deploy.listen';
                    statusItem.text = i18.t('host.button.text');
                    statusItem.tooltip = i18.t('host.button.tooltip');
                    statusItem.show();

                    me._serverStatusItem = statusItem;
                }
                catch (e) {
                    showError(e);
                }
            }
        });

        server.on('error', (err) => {
            if (err) {
                showError(err);
            }
        });

        let startListening = () => {
            try {
                server.listen(port);
            }
            catch (e) {
                showError(e);
            }
        };

        let checkIfDirIsDirectory = () => {
            // now check if directory
            FS.lstat(dir, (err, stats) => {
                if (err) {
                    showError(err);
                    return;
                }

                if (stats.isDirectory()) {
                    startListening();  // all is fine => start listening
                }
                else {
                    showError(new Error(i18.t('isNo.directory', dir)));
                }
            });
        };

        // first check if target directory does exist
        FS.exists(dir, (exists) => {
            if (exists) {
                checkIfDirIsDirectory();
            }
            else {
                // directory does not exist => create

                FSExtra.mkdirs(dir, function (err) {
                    if (err) {
                        showError(err);
                        return;
                    }

                    checkIfDirIsDirectory();
                });
            }
        });
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
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
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

        let me = this;

        let docFile = deploy_helpers.replaceAllStrings(doc.fileName, Path.sep, '/');

        let relativeDocFilePath = deploy_helpers.toRelativePath(docFile);
        if (false === relativeDocFilePath) {
            relativeDocFilePath = docFile;
        }

        try {
            FS.exists(doc.fileName, (exists) => {
                try {
                    let normalizeString = (str: string): string => {
                        return deploy_helpers.toStringSafe(str)
                                             .toLowerCase()
                                             .trim();
                    };

                    // find packages that would deploy the file
                    let packagesToDeploy = me.getPackages();
                    packagesToDeploy = packagesToDeploy.filter(x => {
                        if (!x.deployOnSave) {
                            return false;  // do NOT deploy on save
                        }

                        let packageFiles = deploy_helpers.getFilesOfPackage(x);
                        return packageFiles.indexOf(docFile) > -1;
                    });

                    // check for non existing target names
                    let targets = me.getTargets();
                    packagesToDeploy.forEach(pkg => {
                        if (true === pkg.deployOnSave) {
                            return;
                        }

                        let packageName = normalizeString(pkg.name);

                        let targetsOfPackage = deploy_helpers.asArray(pkg.deployOnSave)
                                                             .map(x => normalizeString(x))
                                                             .filter(x => x);
                        
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
                            if (true === pkg.deployOnSave) {
                                return true;  // deploy to each target
                            }

                            // extract targets that are defined in the package
                            let targetsOfPackage = deploy_helpers.asArray(pkg.deployOnSave)
                                                                 .map(x => normalizeString(x))
                                                                 .filter(x => x);
                            
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
     */
    public reloadPlugins() {
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

                me.outputChannel.appendLine('');
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
}
