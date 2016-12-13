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
 * Default host address.
 */
export const DEFAULT_HOST = '127.0.0.1';
/**
 * The default directory where remote files should be stored.
 */
export const DEFAULT_HOST_DIR = './';
/**
 * Default maximum size of a remote JSON message.
 */
export const DEFAULT_MAX_MESSAGE_SIZE = 16777215;
/**
 * Default TCP port of a host.
 */
export const DEFAULT_PORT = 23979;

/**
 * An operation that is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedOperation {
    /**
     * The type.
     */
    type?: string;
}

/**
 * An operation that opens something like an URI and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedOpenOperation extends AfterDeployedOperation {
    /**
     * The thing should be opened. Can be a URL, file or executable.
     */
    target?: string;
}

/**
 * Describes an event handler that is raised BEFORE a file starts to be deployed.
 * 
 * @param {any} sender The sending object.
 * @param {BeforeDeployFileEventArguments} e The Arguments of the event.
 */
export type BeforeDeployFileEventHandler = (sender: any, e: BeforeDeployFileEventArguments) => void;

/**
 * Arguments for a "before deploy file" event.
 */
export interface BeforeDeployFileEventArguments extends DeployFileEventArguments {
}

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
     * Deploy host settings.
     */
    host?: {
        /**
         * The root directory where files should be stored.
         */
        dir?: string;
        /**
         * Maximum size of a JSON message.
         */
        maxMessageSize?: number;
        /**
         * The TCP port on that the host should listen.
         */
        port?: number;
    },
    /**
     * List of additional files of plugin modules to load.
     */
    modules?: string | string[];
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
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    error(msg: any): DeployContext;
    /**
     * Shows an info message.
     * 
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    info(msg: any): DeployContext;
    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    log(msg: any): DeployContext;
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
     * Returns the list of (other) plugins.
     * 
     * @param {DeployPlugin[]} The list of (other) plugins.
     */
    plugins(): DeployPlugin[];
    /**
     * Shows a warning message.
     * 
     * @param {any} [msg] The message to show.
     * 
     * @chainable
     */
    warn(msg: any): DeployContext;
    /**
     * Writes a messages to the output channel.
     * 
     * @param {any} msg The message to write.
     * 
     * @chainable
     */
    write(msg: any): DeployContext;
    /**
     * Writes a messages to the output channel and adds a new line.
     * 
     * @param {any} msg The message to write.
     * 
     * @chainable
     */
    writeLine(msg: any): DeployContext;
    /**
     * Returns the list of targets.
     * 
     * @param {DeployTarget[]} The targets.
     */
    targets(): DeployTarget[];
}

/**
 * Arguments for a deploy event.
 */
export interface DeployEventArguments {    
}

/**
 * Describes an event handler that is raised AFTER a file deployment has been completed.
 * 
 * @param {any} sender The sending object.
 * @param {FileDeployedCompletedEventArguments} e The Arguments of the event.
 */
export type FileDeployedCompletedEventHandler = (sender: any, e: FileDeployedCompletedEventArguments) => void;

/**
 * Arguments for a "file deployed completed" event.
 */
export interface FileDeployedCompletedEventArguments extends DeployEventArguments {
    /**
     * The error (if occurred).
     */
    error?: any;
    /**
     * The file.
     */
    file: string;
    /**
     * The target.
     */
    target: DeployTarget;
}

/**
 * Arguments for a "before deploy file" event.
 */
export interface DeployFileEventArguments extends DeployEventArguments {
    /**
     * File file.
     */
    file: string;
    /**
     * The file.
     */
    target: DeployTarget;
}

/**
 * Additional options for a 'DeployFileCallback'.
 */
export interface DeployFileOptions {
    /**
     * The "before deploy" callback.
     */
    onBeforeDeploy?: BeforeDeployFileEventHandler;
    /**
     * The "completed" callback.
     */
    onCompleted?: FileDeployedCompletedEventHandler;
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
     * Deploy files of the package on save or not.
     */
    deployOnSave?: true | string | string[];
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
    /**
     * The sort order.
     */
    sortOrder: number;
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
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the filename of the plugin.
     */
    __file?: string;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the full path of the plugin's file.
     */
    __filePath?: string;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the index of the plugin.
     */
    __index?: number;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the type of the plugin.
     */
    __type?: string;

    /**
     * Deploys a file.
     * 
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    deployFile?: (file: string, target: DeployTarget, opts?: DeployFileOptions) => void;
    /**
     * Deploys files of a workspace.
     * 
     * @param {string[]} files The files to deploy.
     * @param {DeployTarget} target The target.
     * @param {DeployWorkspaceOptions} [opts] Additional options.
     */
    deployWorkspace?: (files: string[], target: DeployTarget, opts?: DeployWorkspaceOptions) => void;

    /**
     * Return information of the plugin.
     * 
     * @return {DeployPluginInfo} The plugin info.
     */
    info?: () => DeployPluginInfo;
}

/**
 * Information about a plugin.
 */
export interface DeployPluginInfo {
    /**
     * The description of the plugin.
     */
    description?: string;
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
     * List of operations that should be invoked AFTER
     * ALL files have been deployed.
     */
    deployed?: AfterDeployedOperation[];
    /**
     * The description.
     */
    description?: string;
    /**
     * The name.
     */
    name?: string;
    /**
     * The sort order.
     */
    sortOrder: number;
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

/**
 * Additional options for a 'deploy workspace' operation.
 */
export interface DeployWorkspaceOptions {
    /**
     * The "before deploy" file callback.
     */
    onBeforeDeployFile?: BeforeDeployFileEventHandler;
    /**
     * The "completed" callback for the whole operation.
     */
    onCompleted?: WorkspaceDeployedEventHandler;
    /**
     * The "completed" callback for the a single file.
     */
    onFileCompleted?: FileDeployedCompletedEventHandler;
}

/**
 * Event handler for a completed "deploy workspace" operation.
 * 
 * @param {any} sender The sending object.
 * @param {WorkspaceDeployedEventArguments} e Arguments of the event.
 */
export type WorkspaceDeployedEventHandler = (sender: any, e: WorkspaceDeployedEventArguments) => void;

/**
 * Arguments for an a completed "deploy workspace" event.
 */
export interface WorkspaceDeployedEventArguments {
    /**
     * The error (if occurred).
     */
    error?: any;
}
