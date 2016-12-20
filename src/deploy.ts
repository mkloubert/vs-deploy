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
import * as FS from 'fs';
const FSExtra = require('fs-extra');
const OPN = require('opn');
import * as Moment from 'moment';
import * as Net from 'net';
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
        this._QUICK_DEPLOY_STATUS_ITEM.tooltip = 'Start a quick deploy...';
        this._QUICK_DEPLOY_STATUS_ITEM.command = 'extension.deploy.quickDeploy';

        this.reloadConfiguration();
        this.reloadPlugins();

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
                                me.outputChannel.appendLine(`UNKNOWN TYPE: ${currentOperation.type}`);
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
                                me.outputChannel.appendLine(`UNKNOWN TYPE: ${currentOperation.type}`);
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
     * Deploy the current file.
     */
    public deployFile() {
        let me = this;

        let currentEditor = vscode.window.activeTextEditor;

        if (!currentEditor) {
            vscode.window.showWarningMessage("Please select a file to deploy!");
            return;
        }

        let currentDocument = currentEditor.document;
        if (!currentDocument) {
            vscode.window.showWarningMessage("Editor contains no document!");
            return;
        }

        let file = currentDocument.fileName;

        let targets = this.getTargets();
        if (targets.length < 1) {
            vscode.window.showWarningMessage("Please define a least one TARGET in your 'settings.json'!");
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
                        vscode.window.showErrorMessage(`Could not invoke 'before deploy' operations: ${deploy_helpers.toStringSafe(err)}`);
                    });
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`Could not deploy file '${file}': ` + e);
            }
        };

        if (quickPicks.length > 1) {
            vscode.window.showQuickPick(quickPicks, {
                placeHolder: 'Select the target to deploy to...'
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
                                    if (targetExpr) {
                                        targetExpr = ` to '${targetExpr}'`;
                                    }

                                    if (err) {
                                        vscode.window.showErrorMessage(`Could not deploy file '${relativePath}'${targetExpr}: ${err}`);

                                        if (canceled) {
                                            me.outputChannel.appendLine('Canceled with errors!');
                                        }
                                        else {
                                            me.outputChannel.appendLine('Finished with errors!');
                                        }
                                    }
                                    else {
                                        vscode.window.showInformationMessage(`File '${relativePath}' has been successfully deployed${targetExpr}.`);

                                        if (canceled) {
                                            me.outputChannel.appendLine('Canceled.');
                                        }
                                        else {
                                            me.outputChannel.appendLine('Finished.');

                                            me.afterDeployment([ file ], target).catch((err) => {
                                                vscode.window.showErrorMessage(`Could not invoke 'after deployed' operations: ${deploy_helpers.toStringSafe(err)}`);
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

                                        let deployMsg = `Deploying file '${relativePath}'`;
                                        if (destination) {
                                            deployMsg += ` to '${destination}'`;
                                        }
                                        if (targetName) {
                                            deployMsg += ` ('${targetName}')`;
                                        }
                                        deployMsg += '... ';

                                        me.outputChannel.append(deployMsg);

                                        if (deploy_helpers.toBooleanSafe(me.config.openOutputOnDeploy, true)) {
                                            me.outputChannel.show();
                                        }

                                        statusBarItem.color = '#ffffff';
                                        statusBarItem.command = "extension.deploy.cancel";
                                        statusBarItem.tooltip = `Click here to cancel deployment of '${relativePath}'...`;
                                        statusBarItem.text = `Deploying...`;
                                        statusBarItem.show();
                                    },

                                    onCompleted: (sender, e) => {
                                        if (e.error) {
                                            me.outputChannel.appendLine(`[FAILED: ${deploy_helpers.toStringSafe(e.error)}]`);
                                        }
                                        else {
                                            me.outputChannel.appendLine('[OK]');
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
                        vscode.window.showWarningMessage(`No matching plugin(s) found for '${type}'!`);
                    }
                    else {
                        vscode.window.showWarningMessage(`No machting plugin(s) found!`);
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
     * Deploys files of the workspace.
     */
    public deployWorkspace() {
        let me = this;

        let packages = this.getPackages();
        if (packages.length < 1) {
            vscode.window.showWarningMessage("Please define a least one PACKAGE in your 'settings.json'!");
            return;
        }

        let targets = this.getTargets();
        if (targets.length < 1) {
            vscode.window.showWarningMessage("Please define a least one TARGET in your 'settings.json'!");
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

                    let deployMsg = `Deploying package`;
                    if (packageName) {
                        deployMsg += ` '${packageName}'`;
                    }
                    if (targetName) {
                        deployMsg += ` to '${targetName}'`;
                    }
                    deployMsg += '...';

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
                            vscode.window.showWarningMessage(`There are no files to deploy!`);
                            return;
                        }
                        
                        me.deployWorkspaceTo(filesToDeploy, t).then(() => {
                            //TODO
                        }).catch((err) => {
                            vscode.window.showErrorMessage(`Could not deploy files (2): ${deploy_helpers.toStringSafe(err)}`);
                        });
                    }).catch((err) => {
                        vscode.window.showErrorMessage(`Could not invoke 'before deploy' operations: ${deploy_helpers.toStringSafe(err)}`);
                    });
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Could not deploy files (1): ${deploy_helpers.toStringSafe(e)}`);
                }
            };

            let targetsOfPackage = me.getTargetsFromPackage(pkg);
            if (targetsOfPackage.length < 1) {
                // no explicit targets

                let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i));

                if (fileQuickPicks.length > 1) {
                    vscode.window.showQuickPick(fileQuickPicks, {
                        placeHolder: 'Select the target to deploy to...'
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
                    // create a "batch" target
                    // for the targets

                    let virtualPkgName: string;
                    if (packageName) {
                        virtualPkgName = `Batch target for package '${packageName}'`;
                    }
                    else {
                        virtualPkgName = `Batch target for current package`;
                    }

                    let batchTarget: any = {
                        type: 'batch',
                        name: `Virtual batch target for package '${packageName}'`,
                        targets: targetsOfPackage.map(x => x.name),
                    };

                    deploy(batchTarget);
                }
            }
        };

        if (packageQuickPicks.length > 1) {
            vscode.window.showQuickPick(packageQuickPicks, {
                placeHolder: 'Select a package...',
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
                                    if (targetExpr) {
                                        targetExpr = ` to '${targetExpr}'`;
                                    }

                                    if (err) {
                                        vscode.window.showErrorMessage(`Deploying${targetExpr} failed: ${deploy_helpers.toStringSafe(err)}`);
                                    }
                                    else {
                                        if (failed.length > 0) {
                                            if (succeeded.length < 1) {
                                                vscode.window.showErrorMessage(`No file could be deployed${targetExpr}!`);
                                            }
                                            else {
                                                vscode.window.showWarningMessage(`${failed.length} of the ${succeeded.length + failed.length} file(s) could not be deployed${targetExpr}!`);
                                            }
                                        }
                                        else {
                                            if (succeeded.length > 0) {
                                                vscode.window.showInformationMessage(`All ${succeeded.length} file(s) were deployed successfully${targetExpr}.`);
                                            }
                                            else {
                                                vscode.window.showWarningMessage(`No file deployed${targetExpr}.`);
                                            }
                                        }
                                    }

                                    if (err || failed.length > 0) {
                                        if (canceled) {
                                            me.outputChannel.appendLine('Canceled with errors!');
                                        }
                                        else {
                                            me.outputChannel.appendLine('Finished with errors!');
                                        }
                                    }
                                    else {
                                        if (canceled) {
                                            me.outputChannel.appendLine('Canceled.');
                                        }
                                        else {
                                            me.outputChannel.appendLine('Finished.');

                                            me.afterDeployment(files, target).catch((err) => {
                                                vscode.window.showErrorMessage(`Could not invoke 'after deployed' operations: ${deploy_helpers.toStringSafe(err)}`);
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
                            statusBarItem.text = 'Deploying...';
                            statusBarItem.tooltip = 'Click here to cancel deployment...';
                            statusBarItem.show();

                            currentPlugin.deployWorkspace(files, target, {
                                onBeforeDeployFile: (sender, e) => {
                                    let relativePath = deploy_helpers.toRelativePath(e.file);
                                    if (false === relativePath) {
                                        relativePath = e.file;
                                    }

                                    let statusMsg = `Deploying '${relativePath}'`;

                                    let destination = deploy_helpers.toStringSafe(e.destination);
                                    if (destination) {
                                        statusMsg += ` to '${destination}'`;
                                    }

                                    statusBarItem.tooltip = statusMsg + ' (click here to cancel)';
                                    me.outputChannel.append(statusMsg + '... ');
                                },

                                onCompleted: (sender, e) => {
                                    showResult(e.error, e.canceled);
                                },

                                onFileCompleted: (sender, e) => {
                                    if (e.error) {
                                        me.outputChannel.appendLine(`[FAILED: ${deploy_helpers.toStringSafe(e.error)}]`);

                                        failed.push(e.file);
                                    }
                                    else {
                                        me.outputChannel.appendLine('[OK]');

                                        succeeded.push(e.file);
                                    }
                                }
                            });
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(`Could not deploy files: ${e}`);
                        }
                    };

                    deployNextPlugin();
                }
                else {
                    if (type) {
                        vscode.window.showWarningMessage(`No matching plugin(s) found for '${type}'!`);
                    }
                    else {
                        vscode.window.showWarningMessage(`No plugin(s) found!`);
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
     * Returns the list of packages.
     * 
     * @returns {DeployPackage[]} The packages.
     */
    public getPackages(): deploy_contracts.DeployPackage[] {
        let packages = this.config.packages;
        if (!packages) {
            packages = [];
        }

        return deploy_helpers.sortPackages(packages);
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

        return deploy_helpers.sortTargets(targets);
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
                vscode.window.showWarningMessage(`[vs-deploy] Could not find target '${tn}' in package!`);
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

                        me.outputChannel.append(`Opening '${operationTarget}'... `);

                        nextAction = null;
                        deploy_helpers.open(operationTarget, {
                            app: openArgs,
                            wait: waitForExit,
                        }).then(function() {
                            me.outputChannel.appendLine('[OK]');

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
                me.log(`[ERROR] Deployer.listen(): ${deploy_helpers.toStringSafe(e)}`);
            }

            statusItem = null;
        }
        me._serverStatusItem = null;

        let server = me._server;
        if (server) {
            server.close((err) => {
                if (err) {
                    let errMsg = `Could not stop deploy host: ${deploy_helpers.toStringSafe(err)}`;

                    vscode.window.showErrorMessage(errMsg);
                    me.outputChannel.appendLine(errMsg);
                    return;
                }

                me._server = null;

                let successMsg = `Deploy host has been stopped.`;

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
            vscode.window.showErrorMessage(`Could not start listening for files: ${deploy_helpers.toStringSafe(err)}`);
        };

        server = Net.createServer((socket) => {
            let remoteAddr = socket.remoteAddress;
            let remotePort = socket.remotePort;
            
            let closeSocket = () => {
                try {
                    socket.destroy();
                }
                catch (e) {
                    me.log(`[ERROR] Deployer.listen().createServer(1): ${deploy_helpers.toStringSafe(e)}`);
                }
            };

            try {
                deploy_helpers.readSocket(socket, 4).then((dlBuff) => {
                    if (4 != dlBuff.length) {  // must have the size of 4
                        me.log(`[WARN] Deployer.listen().createServer(): Invalid data buffer length ${dlBuff.length}`);

                        closeSocket();
                        return;
                    }

                    let dataLength = dlBuff.readUInt32LE(0);
                    if (dataLength > maxMsgSize) {  // out of range
                        me.log(`[WARN] Deployer.listen().createServer(): Invalid data length ${dataLength}`);

                        closeSocket();
                        return;
                    }

                    deploy_helpers.readSocket(socket, dataLength).then((msgBuff) => {
                        closeSocket();

                        if (msgBuff.length != dataLength) {  // non-exptected data length
                            me.log(`[WARN] Deployer.listen().createServer(): Invalid buffer length ${msgBuff.length}`);

                            return;
                        }
                        
                        let completed = (err?: any, file?: string) => {
                            if (err) {
                                me.outputChannel.append(`[FAILED: `);
                                if (file) {
                                    me.outputChannel.append(`'${deploy_helpers.toStringSafe(file)}'; `);
                                }
                                me.outputChannel.append(`${deploy_helpers.toStringSafe(err)}]`);
                                me.outputChannel.appendLine(`]`);
                            }
                            else {
                                me.outputChannel.append('[OK');
                                if (file) {
                                    me.outputChannel.append(`: '${deploy_helpers.toStringSafe(file)}'`);
                                }
                                me.outputChannel.appendLine(']');
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
                                    let receiveFileMsg = `Receiving file`;
                                    if (!deploy_helpers.isNullOrUndefined(file.nr)) {
                                        let fileNr = parseInt(deploy_helpers.toStringSafe(file.nr));
                                        if (!isNaN(fileNr)) {
                                            receiveFileMsg += ` (${fileNr}`;
                                            if (!deploy_helpers.isNullOrUndefined(file.totalCount)) {
                                                let totalCount = parseInt(deploy_helpers.toStringSafe(file.totalCount));
                                                if (!isNaN(totalCount)) {
                                                    receiveFileMsg += ` / ${totalCount}`;

                                                    if (0 != totalCount) {
                                                        let percentage = Math.floor(fileNr / totalCount * 10000.0) / 100.0;
                                                        
                                                        receiveFileMsg += `; ${percentage}%`;
                                                    }
                                                }
                                            }
                                            receiveFileMsg += ")";
                                        }
                                    }
                                    receiveFileMsg += ` from '${remoteAddr}:${remotePort}'... `;

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
                                                                    fileCompleted(new Error(`'${targetDir}' is not directory!`));
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
                                                                            fileCompleted(new Error(`'${targetFile}' is no file!`));
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
                                                        fileCompleted(new Error('No filename (2)!'));
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
                                        completed(new Error('No filename (1)!'));
                                    }
                                    // if (file.name) #1
                                }
                                else {
                                    completed(new Error('No data!'));
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
                        me.log(`[ERROR] Deployer.listen().createServer(3): ${deploy_helpers.toStringSafe(err)}`);

                        closeSocket();
                    });
                }).catch((err) => {
                    me.log(`[ERROR] Deployer.listen().createServer(4): ${deploy_helpers.toStringSafe(err)}`);

                    closeSocket();
                });
            }
            catch (e) {
                me.log(`[ERROR] Deployer.listen().createServer(5): ${deploy_helpers.toStringSafe(e)}`);

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

                    let successMsg = `Started deploy host on port ${port} in directory '${dir}'.`;

                    me.outputChannel.appendLine(successMsg);
                    vscode.window.showInformationMessage(successMsg);

                    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                    statusItem.tooltip = '';
                    statusItem.command = 'extension.deploy.listen';
                    statusItem.text = 'Waiting for files...';
                    statusItem.tooltip = 'Click here to close deploy host';
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
                    showError(new Error(`'${dir}' is no directory!`));
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
                    packagesToDeploy.forEach(x => {
                        if (true === x.deployOnSave) {
                            return;
                        }

                        let packageName = normalizeString(x.name);

                        let targetsOfPackage = deploy_helpers.asArray(x.deployOnSave)
                                                             .map(x => normalizeString(x))
                                                             .filter(x => x);
                        
                        targetsOfPackage.forEach(y => {
                            let foundTarget = false;
                            for (let i = 0; i < targets.length; i++) {
                                let targetName = normalizeString(targets[i].name);

                                if (targetName == y) {
                                    foundTarget = true;
                                    break;
                                }
                            }

                            if (!foundTarget) {
                                if (packageName) {
                                    vscode.window.showWarningMessage(`Deploy target ${deploy_helpers.toStringSafe(y)} defined in package ${deploy_helpers.toStringSafe(x.name)} does not exist.`);
                                }
                                else {
                                    vscode.window.showWarningMessage(`Deploy target ${deploy_helpers.toStringSafe(y)} defined in package does not exist.`);
                                }
                            }
                        });
                    });

                    // find matching targets
                    targets = targets.filter(x => {
                        let targetName = normalizeString(x.name);

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
                    targets.forEach(x => {
                        let targetName = deploy_helpers.toStringSafe(x.name).trim();

                        try {
                            me.deployFileTo(docFile, x);
                        }
                        catch (e) {
                            let errMsg = deploy_helpers.toStringSafe(e);

                            let targetExpr = 'target';
                            if (targetName) {
                                targetExpr = `'${targetName}'`;
                            }

                            vscode.window.showWarningMessage(`Could not deploy '${relativeDocFilePath}' to ${targetExpr} on save: ${errMsg}`);
                        }
                    });
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Could not deploy '${relativeDocFilePath}' on save (2): ${deploy_helpers.toStringSafe(e)}`);
                }
            });
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not deploy '${relativeDocFilePath}' on save (1): ${deploy_helpers.toStringSafe(e)}`);
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
                        vscode.window.showWarningMessage(`Package '${pn}' not found!`);
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
                    vscode.window.showErrorMessage(`Quick deploy failed: ${deploy_helpers.toStringSafe(err)}`);
                }
            };

            if (packagesToDeploy.length < 1) {
                vscode.window.showWarningMessage('No package found to deploy!');
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
            vscode.window.showErrorMessage(`Quick deploy failed: ${deploy_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        this._config = <deploy_contracts.DeployConfiguration>vscode.workspace.getConfiguration("deploy");

        this._QUICK_DEPLOY_STATUS_ITEM.hide();
        if (this._config.button) {
            let txt = deploy_helpers.toStringSafe(this._config.button.text).trim();
            if (!txt) {
                txt = 'Quick deploy!';
            }
            this._QUICK_DEPLOY_STATUS_ITEM.text = txt;

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
                            me.log(`[ERROR] Deployer.reloadPlugins(1): ${deploy_helpers.toStringSafe(e)}`);
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
                            me.log(`[ERROR] Deployer.reloadPlugins(2): ${deploy_helpers.toStringSafe(e)}`);
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
                        me.log(`[ERROR] Deployer.reloadPlugins(3): ${deploy_helpers.toStringSafe(e)}`);
                    }

                    me.outputChannel.appendLine('');
                });

                me.outputChannel.appendLine('');
                if (loadedPlugins.length != 1) {
                    this.outputChannel.appendLine(`${loadedPlugins.length} plugins loaded.`);
                }
                else {
                    this.outputChannel.appendLine(`1 plugin loaded.`);
                }
            }
            else {
                this.outputChannel.appendLine(`No plugin loaded.`);
            }

            this.outputChannel.appendLine('');
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not update deploy settings: ${e}`);
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
