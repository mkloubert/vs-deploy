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

import * as FS from 'fs';
let FSExtra = require('fs-extra');
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Target type for deploying to a local directory.
 */
export const TARGET_TYPE_LOCAL = "local";

/**
 * A target.
 */
export interface DeployTarget {
    /**
     * The description.
     */
    description?: string;
    /**
     * The name.
     */
    name?: string;
    /**
     * The type.
     */
    type?: string;
}

/**
 * A target to a local directory.
 */
export interface DeployTargetLocal extends DeployTarget {
    /**
     * The path of the target directory.
     */
    dir?: string;
}

/**
 * Configuration settings.
 */
export interface DeployConfiguration extends vscode.WorkspaceConfiguration {
    /**
     * List of targets.
     */
    targets?: DeployTarget[];
}

export interface DeployActionQuickPick extends DeployQuickPickItem {
    action?: (sender: any) => void;
}

/**
 * A quick pick item
 */
export interface DeployQuickPickItem extends vscode.QuickPickItem {
}

/**
 * A quick pick item for deploying a file.
 */
export interface DeployFileQuickPickItem extends DeployQuickPickItem {
    /**
     * The path of the source file to deploy.
     */
    file: string;
    /**
     * The target.
     */
    target: DeployTarget;
}

/**
 * Deployer class.
 */
export class Deployer {
    /**
     * Stores the current configuration.
     */
    protected _config: DeployConfiguration;
    /**
     * Stores the underlying extension context.
     */
    protected _CONTEXT: vscode.ExtensionContext;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} The underlying extension context.
     */
    constructor(context: vscode.ExtensionContext) {
        this._CONTEXT = context;

        this.reloadConfiguration();
    }

    /**
     * Gets the current configuration.
     */
    public get config(): DeployConfiguration {
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

        let createQuickPick = (target: DeployTarget, index: number): DeployFileQuickPickItem => {
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
    protected deployFileTo(item: DeployFileQuickPickItem) {
        switch (parseTargetType(item.target.type)) {
            case TARGET_TYPE_LOCAL:
                this.deployFileToLocal(item.file, <DeployTargetLocal>item.target);
                break;
        }
    }

    /**
     * Deploys a file to a local directory.
     * 
     * @param {string} file The path of the source file.
     */
    protected deployFileToLocal(file: string, target: DeployTargetLocal) {
        let me = this;

        let dir = target.dir;
        if (!dir) {
            dir = '';
        }
        dir = '' + dir;

        if (!dir) {
            dir = './';
        }

        if (!Path.isAbsolute(dir)) {
            dir = Path.join(vscode.workspace.rootPath);
        }

        let relativeFilePath = toRelativePath(file);
        if (false === relativeFilePath) {
            vscode.window.showWarningMessage(`Could not get relative path for '${file}'!`);
            return;
        }

        let targetFile = Path.join(dir, <string>relativeFilePath);
        let targetDirectory = Path.dirname(targetFile);

        let deployFile = () => {
            console.log('Deploying...');

            let showError = (err) => {
                vscode.window.showErrorMessage(`Could not deploy file '${file}' to local directory '${targetDirectory}': ` + err);
            };

            try {
                FSExtra.copy(file, targetFile, {
                    clobber: true,
                    preserveTimestamps: true,
                }, function (err) {
                    if (err) {
                        showError(err);
                        return;
                    }

                    vscode.window.showInformationMessage(`File '${relativeFilePath}' has been successfully deployed to local directory '${targetDirectory}'.`);
                });
            }
            catch (e) {
                showError(e);
            }
        };

        if (!FS.existsSync(targetDirectory)) {
            let quickPicks: DeployActionQuickPick[] = [
                {
                    label: 'Yes',
                    description: 'Creates the target directory',
                    action: () => {
                        FSExtra.mkdirsSync(targetDirectory);

                        deployFile();
                    }
                },
                {
                    label: 'No',
                    description: 'Does NOT create the target directory and cancels the operation.',
                    action: () => { 
                        vscode.window.showInformationMessage("Deploy operation cancelled.");
                    }
                }
            ];

            vscode.window.showQuickPick(quickPicks, {
                placeHolder: 'Create target directory?',
            }).then((item) => {
                        if (!item) {
                            item = quickPicks[1];  // no => default
                        }

                        try {
                            if (item.action) {
                                item.action(me);
                            }
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(`Could not create target directory '${targetDirectory}': ` + e);
                        }
                    });
        }
        else {
            deployFile();
        }
    }

    /**
     * Deploys file of the workspace.
     */
    public deployWorkspace() {
        
    }

    /**
     * Returns the list of targets.
     * 
     * @returns {DeployTarget[]} The targets.
     */
    public getTargets(): DeployTarget[] {
        let targets = this.config.targets;
        if (!targets) {
            targets = [];
        }

        return targets.filter(x => {
            if (x) {
                switch (parseTargetType(x.type)) {
                    case TARGET_TYPE_LOCAL:
                        // known type
                        return true;
                }
            }
            
            return false;
        });
    }

    /**
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
    }

    /**
     * Reloads configuration.
     */
    protected reloadConfiguration() {
        this._config = <DeployConfiguration>vscode.workspace.getConfiguration("deploy");
    }
}

function parseTargetType(str: string): string {
    if (!str) {
        str = '';
    }
    str = ('' + str).toLowerCase().trim();

    if (!str) {
        str = TARGET_TYPE_LOCAL;
    }

    return str;
}

function toRelativePath(path: string): string | false {
    let result: string | false = false;
    
    try {
        let normalizedPath = path;

        let wsRootPath = vscode.workspace.rootPath;
        if (wsRootPath) {
            if (FS.existsSync(wsRootPath)) {
                if (FS.lstatSync(wsRootPath).isDirectory()) {
                    if (0 == normalizedPath.indexOf(wsRootPath)) {
                        result = normalizedPath.substr(wsRootPath.length);
                        result = result.replace(Path.sep, '/');
                    }
                }
            }
        }
    }
    catch (e) { /* ignore */ }

    return result;
}
