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

import * as vscode from 'vscode';


/**
 * A quick pick that is based on an action.
 */
export interface DeployActionQuickPick extends DeployQuickPickItem {
    /**
     * The action to invoke.
     * 
     * @param {any} The sending object.
     * 
     * @return {any} The result.
     */
    action?: (sender: any) => any;
}

/**
 * Configuration settings.
 */
export interface DeployConfiguration extends vscode.WorkspaceConfiguration {
    /**
     * List of packages.
     */
    packages?: DeployPackage[];

    /**
     * List of targets.
     */
    targets?: DeployTarget[];
}

/**
 * A deploy context.
 */
export interface DeployContext {
    /**
     * Returns the current config.
     * 
     * @param {DeployConfiguration} The current config.
     */
    config(): DeployConfiguration;

    /**
     * Shows an error message.
     * 
     * @param {any} [msg] The message to show.
     * 
     * @chainable.
     */
    error(msg?: any): DeployContext;

    /**
     * Shows an info message.
     * 
     * @param {any} [msg] The message to show.
     * 
     * @chainable.
     */
    info(msg?: any): DeployContext;

    /**
     * Logs a message.
     * 
     * @param {any} [msg] The message to log.
     * 
     * @chainable
     */
    log(msg?: any): DeployContext;

    /**
     * Gets the global output channel.
     */
    outputChannel(): vscode.OutputChannel;

    /**
     * Returns the list of packages.
     * 
     * @param {DeployPackage[]} The packages.
     */
    packages(): DeployPackage[];

    /**
     * Shows a warning message.
     * 
     * @param {any} [msg] The message to show.
     * 
     * @chainable.
     */
    warn(msg?: any): DeployContext;

    /**
     * Returns the list of targets.
     * 
     * @param {DeployTarget[]} The targets.
     */
    targets(): DeployTarget[];
}

/**
 * A quick pick item for deploying a file.
 */
export interface DeployFileQuickPickItem extends DeployTargetQuickPickItem {
    /**
     * The path of the source file to deploy.
     */
    file: string;
}

/**
 * A package.
 */
export interface DeployPackage {
    /**
     * The description.
     */
    description?: string;
    /**
     * Files to exclude.
     */
    exclude?: string[];
    /**
     * Files to include
     */
    files?: string[];
    /**
     * The name.
     */
    name?: string;
}

/**
 * A quick pick for a package.
 */
export interface DeployPackageQuickPickItem extends DeployQuickPickItem {
    /**
     * The package.
     */
    package: DeployPackage;
}

/**
 * A plugin.
 */
export interface DeployPlugin {
    /**
     * Deploys a file.
     * 
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     */
    deployFile?: (file: string, target: DeployTarget) => void;

    /**
     * Deploys files of a workspace.
     * 
     * @param {string[]} files The files to deploy.
     * @param {DeployTarget} target The target.
     */
    deployWorkspace?: (files: string[], target: DeployTarget) => void;
}

/**
 * A plugin module.
 */
export interface DeployPluginModule {
    /**
     * Creates a new instance.
     * 
     * @param {DeployContext} ctx The context.
     * 
     * @return {DeployPlugin} The new instance.
     */
    createPlugin?: (ctx: DeployContext) => DeployPlugin;
}

/**
 * A quick pick item.
 */
export interface DeployQuickPickItem extends vscode.QuickPickItem {
}

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
 * A quick pick item for selecting a target.
 */
export interface DeployTargetQuickPickItem extends DeployQuickPickItem {
    /**
     * The target.
     */
    target: DeployTarget;
}
