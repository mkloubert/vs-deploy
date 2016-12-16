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
    data: Buffer;
    isCompressed: boolean;
    name: string;
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
     * Stores the package file of that extension.
     */
    protected _PACKAGE_FILE: deploy_contracts.PackageFile;
    /**
     * Loaded plugins.
     */
    protected _plugins: deploy_contracts.DeployPlugin[];
    /**
     * Stores the global output channel.
     */
    protected _OUTPUT_CHANNEL: vscode.OutputChannel;
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
                    x.deployFile(file, target, {
                        onBeforeDeploy: (sender, e) => {
                            let destination = deploy_helpers.toStringSafe(e.destination); 
                            let targetName = deploy_helpers.toStringSafe(e.target.name);

                            me.outputChannel.show();
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

                            statusBarItem.color = '#ffffff';
                            statusBarItem.tooltip = `Deploying '${relativePath}'...`;
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

                            let statusMsg = `Deploying '${relativePath}'`;

                            let destination = deploy_helpers.toStringSafe(e.destination);
                            if (destination) {
                                statusMsg += ` to '${destination}'`;
                            }

                            statusMsg += '...';

                            statusBarItem.tooltip = statusMsg;
                            me.outputChannel.append(statusMsg + ' ');
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
        let port = deploy_contracts.DEFAULT_PORT;
        let maxMsgSize = deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE;
        let transformer: deploy_contracts.DataTransformer;
        let transformerOpts: any;
        if (cfg.host) {
            port = parseInt(deploy_helpers.toStringSafe(cfg.host.port,
                                                        '' + deploy_contracts.DEFAULT_PORT));

            maxMsgSize = parseInt(deploy_helpers.toStringSafe(cfg.host.maxMessageSize,
                                                              '' + deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE));

            dir = cfg.host.dir;

            transformerOpts = cfg.host.transformerOptions;
            if (cfg.host.transformer) {
                let transformerModule = deploy_helpers.loadDataTransformerModule(cfg.host.transformer);
                if (transformerModule) {
                    transformer = transformerModule.restoreData ||
                                  transformerModule.transformData;
                }
            }
        }

        dir = deploy_helpers.toStringSafe(dir, deploy_contracts.DEFAULT_HOST_DIR);
        if (!Path.isAbsolute(dir)) {
            dir = Path.join(vscode.workspace.rootPath, dir);
        }

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

                    deploy_helpers.readSocket(socket, dataLength).then((buff) => {
                        closeSocket();

                        if (buff.length != dataLength) {  // non-exptected data length
                            me.log(`[WARN] Deployer.listen().createServer(): Invalid buffer length ${buff.length}`);

                            return;
                        }

                        me.outputChannel.append(`Receiving file from '${remoteAddr}:${remotePort}'... `);
                        
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

                        try {
                            let json = buff.toString('utf8');
                            
                            let file: RemoteFile;
                            if (json) {
                                file = JSON.parse(json);
                            }

                            if (file) {
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

                    me.outputChannel.show();
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
                                        log: function(msg) {
                                            me.log(msg);
                                            return this;
                                        },
                                        outputChannel: () => me.outputChannel,
                                        packageFile: () => me.packageFile,
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
}
