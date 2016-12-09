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
let FSExtra = require('fs-extra');
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
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} The underlying extension context.
     */
    constructor(context: vscode.ExtensionContext) {
        this._CONTEXT = context;

        this.reloadConfiguration();
        this.reloadPlugins();
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

        let targets = this.getTargets();
        if (targets.length < 1) {
            vscode.window.showWarningMessage("Please define a least one target in your 'settings.json'!");
            return;
        }

        let createQuickPick = (target: deploy_contracts.DeployTarget, index: number): deploy_contracts.DeployFileQuickPickItem => {
            let name = target.name;
            if (!name) {
                name = '';
            }
            name = ('' + name).trim();

            if (!name) {
                name = `(Target #${index + 1})`;
            }

            let description = target.description;
            if (!description) {
                description = '';
            }
            description = ('' + description).trim();

            return {
                description: description,
                file: currentDocument.fileName,
                label: name,
                target: target,
            };
        };

        let quickPicks = targets.map((x, i) => createQuickPick(x, i));

        vscode.window.showQuickPick(quickPicks, {
                placeHolder: 'Select the target to deploy to...'
            }).then((item) => {
                        try {
                            if (item) {
                                me.deployFileTo(item);
                            }
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(`Could not deploy file '${currentDocument.fileName}': ` + e);
                        }
                    });
    }

    /**
     * Deploys a file to a target.
     * 
     * @param {DeployFileQuickPickItem} item The quick pick with the information.
     */
    protected deployFileTo(item: deploy_contracts.DeployFileQuickPickItem) {
        let type: string;
        if (item.target) {
            type = deploy_helpers.parseTargetType(type);
        }

        let matchIngPlugins = this.plugins.filter((x: any) => {
            return !type ||
                   (x.__type == type && x.deployFile);
        });

        if (matchIngPlugins.length > 0) {
            matchIngPlugins.forEach(x => {
                try {
                    x.deployFile(item.file, item.target);
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Could not deploy file '${item.file}': ${e}`);
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
     * Deploys files of the workspace.
     */
    public deployWorkspace() {
        let packages = this.getPackages();
        if (packages.length < 1) {
            vscode.window.showWarningMessage("Please define a least one package in your 'settings.json'!");
            return;
        }

        let createPackageQuickPick = (pkg: deploy_contracts.DeployPackage, index: number): deploy_contracts.DeployPackageQuickPick => {
            let name = pkg.name;
            if (!name) {
                name = '';
            }
            name = ('' + name).trim();

            if (!name) {
                name = `(Package #${index + 1})`;
            }

            let description = pkg.description;
            if (!description) {
                description = '';
            }
            description = ('' + description).trim();

            return {
                description: description,
                label: name,
                package: pkg,
            };
        };

        let packageQuickPicks = packages.map((x, i) => createPackageQuickPick(x, i));

        vscode.window.showQuickPick(packageQuickPicks, {
            placeHolder: 'Select a package...',
        }).then((item) => {
                    if (!item) {
                        return;
                    }

                    vscode.workspace.findFiles("*.*", null).then((files) => {
                        files.filter(x => {
                            return false;
                        });
                    });
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

        return packages.filter(x => x);
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

        return targets.filter(x => x);
    }

    /**
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
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

        let loadedPlugins: deploy_contracts.DeployPlugin[] = [];

        let pluginDir = Path.join(__dirname, './plugins');
        if (FS.existsSync(pluginDir)) {
            if (FS.lstatSync(pluginDir).isDirectory()) {
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
                    catch (e) { /* ignore */ }
                    
                    return false;
                }).filter(x => x)
                  .map(x => Path.join(pluginDir, x));

                moduleFiles.forEach(x => {
                    let pluginModule: deploy_contracts.DeployPluginModule = require(x);
                    if (pluginModule) {
                        if (pluginModule.createPlugin) {
                            let ctx: deploy_contracts.DeployContext = {
                                getConfig: () => me.config,
                                getPackages: () => me.getPackages(),
                                getTargets: () => me.getTargets(),
                            };

                            let newPlugin: any = pluginModule.createPlugin(ctx);
                            if (newPlugin) {
                                newPlugin.__type = deploy_helpers.parseTargetType(Path.basename(x));

                                loadedPlugins.push(newPlugin);
                            }
                        }
                    }
                });
            }
        }

        this._plugins = loadedPlugins;

        deploy_helpers.log(`${loadedPlugins.length} deploy plugins loaded`);
    }
}
