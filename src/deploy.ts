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
import * as Path from 'path';
import * as vscode from 'vscode';


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
     * Loaded plugins.
     */
    protected _plugins: deploy_contracts.DeployPlugin[];
    /**
     * Stores the global output channel.
     */
    protected _OUTPUT_CHANNEL: vscode.OutputChannel;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} context The underlying extension context.
     * @param {vscode.OutputChannel} outputChannel The global output channel to use.
     */
    constructor(context: vscode.ExtensionContext,
                outputChannel: vscode.OutputChannel) {
        this._CONTEXT = context;
        this._OUTPUT_CHANNEL = outputChannel;

        this.reloadConfiguration();
        this.reloadPlugins();
    }

    /**
     * Invokes 'after deployed' operations for a target.
     * 
     * @param {deploy_contracts.DeployTarget} target The target.
     */
    protected afterDeployment(target: deploy_contracts.DeployTarget) {
        let me = this;

        try {
            if (target.deployed) {
                target.deployed.filter(x => x).forEach((x, i) => {
                    try {
                        me.outputChannel.append(`[AFTER DEPLOY #${i + 1}] `);

                        switch (deploy_helpers.toStringSafe(x.type).toLowerCase().trim()) {
                            case '':
                            case 'open':
                                let ot = deploy_helpers.toStringSafe((<deploy_contracts.AfterDeployedOpenOperation>x).target);

                                me.outputChannel.append(`Opening '${ot}'... `);
                                OPN(deploy_helpers.toStringSafe(ot));
                                me.outputChannel.appendLine('[OK]');
                                break;

                            default:
                                me.outputChannel.appendLine(`UNKNOWN TYPE: ${x.type}`);
                                break;
                        }
                    }
                    catch (e) {
                        me.outputChannel.appendLine(`[FAILED: ${deploy_helpers.toStringSafe(e)}]`);
                    }
                });
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not invoke 'after deployed' operations: ${deploy_helpers.toStringSafe(e)}`);
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
                    me.deployFileTo(file, item.target);
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
     */
    protected deployFileTo(file: string, target: deploy_contracts.DeployTarget) {
        let me = this;

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
            matchIngPlugins.forEach(x => {
                let statusBarItem = vscode.window.createStatusBarItem(
                    vscode.StatusBarAlignment.Left,
                );

                let showResult = (err?: any) => {
                    statusBarItem.dispose();

                    let targetExpr = deploy_helpers.toStringSafe(target.name).trim();
                    if (targetExpr) {
                        targetExpr = ` to '${targetExpr}'`;
                    }

                    if (err) {
                        vscode.window.showErrorMessage(`Could not deploy file '${relativePath}'${targetExpr}: ${err}`);

                        me.outputChannel.appendLine('Finished with errors!');
                    }
                    else {
                        vscode.window.showInformationMessage(`File '${relativePath}' has been successfully deployed${targetExpr}.`);

                        me.outputChannel.appendLine('Finished.');

                        me.afterDeployment(target);
                    }
                };

                try {
                    let targetName = deploy_helpers.toStringSafe(target.name);

                    me.outputChannel.show();
                    me.outputChannel.appendLine('');

                    let deployMsg = `Deploying file '${relativePath}'`;
                    if (targetName) {
                        deployMsg += ` to '${targetName}'`;
                    }
                    deployMsg += '... ';

                    me.outputChannel.append(deployMsg);

                    statusBarItem.color = '#ffffff';
                    statusBarItem.tooltip = `Deploying '${relativePath}'...`;
                    statusBarItem.text = `Deploying...`;
                    statusBarItem.show();

                    x.deployFile(file, target, {
                        onCompleted: (sender, e) => {
                            if (e.error) {
                                me.outputChannel.appendLine(`[FAILED: ${deploy_helpers.toStringSafe(e.error)}]`);
                            }
                            else {
                                me.outputChannel.appendLine('[OK]');
                            }

                            showResult(e.error);
                        }
                    });
                }
                catch (e) {
                    showResult(e);
                }
            });
        }
        else {
            if (type) {
                vscode.window.showWarningMessage(`No matching plugin(s) found for '${type}'!`);
            }
            else {
                vscode.window.showWarningMessage(`No machting plugin(s) found!`);
            }
        }
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

        let selectTarget = (item: deploy_contracts.DeployPackageQuickPickItem) => {
            if (!item) {
                return;
            }

            let packageName = deploy_helpers.toStringSafe(item.package.name);

            let filesToDeploy = deploy_helpers.getFilesOfPackage(item.package);
            if (filesToDeploy.length < 1) {
                vscode.window.showWarningMessage(`There are no files to deploy!`);
                return;
            }

            let fileQuickPicks = targets.map((x, i) => deploy_helpers.createTargetQuickPick(x, i));

            let deploy = (item: deploy_contracts.DeployTargetQuickPickItem) => {
                try {
                    if (!item) {
                        return;
                    }

                    let targetName = deploy_helpers.toStringSafe(item.target.name);

                    me.outputChannel.show();
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

                    me.deployWorkspaceTo(filesToDeploy, item.target);
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Could not deploy files: ` + e);
                }
            };

            if (fileQuickPicks.length > 1) {
                vscode.window.showQuickPick(fileQuickPicks, {
                    placeHolder: 'Select the target to deploy to...'
                }).then((item) => {
                    deploy(item);
                });
            }
            else {
                // auto select
                deploy(fileQuickPicks[0]);
            }
        };

        if (packageQuickPicks.length > 1) {
            vscode.window.showQuickPick(packageQuickPicks, {
                placeHolder: 'Select a package...',
            }).then((item) => {
                        selectTarget(item);
                    });
        }
        else {
            // auto select
            selectTarget(packageQuickPicks[0]);
        }
    }

    /**
     * Deploys files of the workspace to a target.
     * 
     * @param {string[]} files The files to deploy.
     * @param {deploy_contracts.DeployTarget} target The target.
     */
    protected deployWorkspaceTo(files: string[], target: deploy_contracts.DeployTarget) {
        let me = this;

        let type = deploy_helpers.parseTargetType(target.type);

        let matchIngPlugins = this.plugins.filter(x => {
            return !type ||
                   (x.__type == type && x.deployWorkspace);
        });

        if (matchIngPlugins.length > 0) {
            matchIngPlugins.forEach(x => {
                try {
                    let statusBarItem = vscode.window.createStatusBarItem(
                        vscode.StatusBarAlignment.Left,
                    );

                    let failed: string[] = [];
                    let succeeded: string[] = [];
                    let showResult = (err?: any) => {
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
                                if (failed.length == succeeded.length) {
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
                            me.outputChannel.appendLine('Finished with errors!');
                        }
                        else {
                            me.outputChannel.appendLine('Finished.');

                            me.afterDeployment(target);
                        }
                    };

                    statusBarItem.color = '#ffffff';
                    statusBarItem.text = 'Deploying...';
                    statusBarItem.tooltip = statusBarItem.text;
                    statusBarItem.show();

                    x.deployWorkspace(files, target, {
                        onBeforeDeployFile: (sender, e) => {
                            let relativePath = deploy_helpers.toRelativePath(e.file);
                            if (false === relativePath) {
                                relativePath = e.file;
                            }

                            statusBarItem.tooltip = `Deploying '${relativePath}'...`;

                            me.outputChannel.append(statusBarItem.tooltip + ' ');
                        },

                        onCompleted: (sender, e) => {
                            showResult(e.error);
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
            });
        }
        else {
            if (type) {
                vscode.window.showWarningMessage(`No matching plugin(s) found for '${type}'!`);
            }
            else {
                vscode.window.showWarningMessage(`No plugin(s) found!`);
            }
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

                    // find matching targets
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
     * Gets the list of plugins.
     */
    public get plugins(): deploy_contracts.DeployPlugin[] {
        return this._plugins;
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        this._config = <deploy_contracts.DeployConfiguration>vscode.workspace.getConfiguration("deploy");
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
                            me.log('[ERROR] reloadPlugins(1): ' + e);
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

                    moduleFiles = deploy_helpers.distinctArray(moduleFiles);

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
                                        log: function(msg) {
                                            me.log(msg);
                                            return this;
                                        },
                                        outputChannel: () => me.outputChannel,
                                        packages: () => me.getPackages(),
                                        plugins: null,
                                        targets: () => me.getTargets(),
                                        warn: function(msg) {
                                            if (msg) {
                                                vscode.window.showWarningMessage('' + msg);
                                            }

                                            return this;
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
                                        newPlugin.__index = pluginIndex;
                                        newPlugin.__type = deploy_helpers.parseTargetType(Path.basename(x, '.js'));

                                        loadedPlugins.push(newPlugin);
                                    }
                                }
                            }
                        }
                        catch (e) {
                            me.log('[ERROR] reloadPlugins(2): ' + e);
                        }
                    });
                }
            }

            this._plugins = loadedPlugins;

            if (loadedPlugins.length > 0) {
                if (loadedPlugins.length != 1) {
                    this.outputChannel.appendLine(`${loadedPlugins.length} plugins loaded:`);
                }
                else {
                    this.outputChannel.appendLine(`1 plugin loaded:`);
                }

                loadedPlugins.forEach(x => {
                    me.outputChannel.appendLine(`- ${x.__file}`);
                });
            }
            else {
                this.outputChannel.appendLine(`No plugin loaded`);
            }

            this.outputChannel.appendLine('');
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not update deploy settings: ${e}`);
        }
    }
}
