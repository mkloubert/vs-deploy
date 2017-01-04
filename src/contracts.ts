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
export interface AfterDeployedOperation extends DeployOperation {
}

/**
 * An operation that opens something like an URI and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedOpenOperation extends AfterDeployedOperation, DeployOpenOperation {
}

/**
 * An operation that waits a number of milliseconds and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedWaitOperation extends AfterDeployedOperation, DeployWaitOperation {
}

/**
 * An operation that starts Web Deploy (msdeploy)
 * and is invoked AFTER ALL files have been deployed.
 */
export interface AfterDeployedWebDeployOperation extends AfterDeployedOperation, DeployWebDeployOperation {
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
    /**
     * A string that represents the destination.
     */
    destination: string;
}

/**
 * An operation that is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployOperation extends DeployOperation {
}

/**
 * An operation that opens something like an URI and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployOpenOperation extends BeforeDeployOperation, DeployOpenOperation {
}

/**
 * An operation that waits a number of milliseconds and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployWaitOperation extends BeforeDeployOperation, DeployWaitOperation {
}

/**
 * An operation that starts Web Deploy (msdeploy)
 * and is invoked BEFORE files will be deployed.
 */
export interface BeforeDeployWebDeployOperation extends BeforeDeployOperation, DeployWebDeployOperation {
}

/**
 * Describes a function that transforms data into new format.
 * 
 * @param {DataTransformerContext} ctx The transformer context.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export type DataTransformer = (ctx: DataTransformerContext) => Promise<Buffer>;

/**
 * The context of data transformer.
 */
export interface DataTransformerContext {
    /**
     * An optional context / object value defined by the "sender".
     */
    context?: any;
    /**
     * The data to transform.
     */
    data: Buffer;
    /**
     * The mode.
     */
    mode: DataTransformerMode;
    /**
     * The optional options for transformation.
     */
    options?: any;
}

/**
 * The transformer mode.
 */
export enum DataTransformerMode {
    /**
     * Restore transformed data.
     */
    Restore,
    /**
     * Transform UNtransformed data.
     */
    Transform,
}

/**
 * Describes a "data transformer" module.
 */
export interface DataTransformModule {
    /**
     * Restores transformed / encoded / crypted data.
     */
    restoreData?: DataTransformer;

    /**
     * Transforms data into new format.
     */
    transformData?: DataTransformer;
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
     * Settings for a "quick deploy button".
     */
    button?: {
        /**
         * Inidciates if button is enabled / visible or not.
         */
        enabled?: boolean;
        /**
         * A list of one or more packages to deploy.
         */
        packages?: string | string[];
        /**
         * A custom text for the button.
         */
        text?: string;
    },
    /**
     * Clear output on startup or not.
     */
    clearOutputOnStartup?: boolean;
    /**
     * Disables the display of popups that reports for a new version of that extension.
     */
    disableNewVersionPopups?: boolean;
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
         * The path to a module that UNtransforms received message data.
         * 
         * s. 'TranformerModule' interface
         */
        messageTransformer?: string;
        /**
         * The optional options for the "message data" transformer script.
         */
        messageTransformerOptions?: any;
        /**
         * The TCP port on that the host should listen.
         */
        port?: number;
        /**
         * Show popup if host has been started or stopped successfully.
         */
        showPopupOnSuccess?: boolean;
        /**
         * The path to a module that UNtransforms received file data.
         * 
         * s. 'TranformerModule' interface
         */
        transformer?: string;
        /**
         * The optional options for the "file data" transformer script.
         */
        transformerOptions?: any;
        /**
         * The path to the script that validates received files.
         * 
         * s. 'ValidatorModule' interface
         */
        validator?: string;
        /**
         * The optional options for the "validator" script.
         */
        validatorOptions?: any;
    },
    /**
     * The ID of the language to use (e.g. 'en', 'de')
     */
    language?: string;
    /**
     * List of additional files of plugin modules to load.
     */
    modules?: string | string[];
    /**
     * Open the output window before deploying starts or not.
     */
    openOutputOnDeploy?: boolean;
    /**
     * Open the output window on startup or not.
     */
    openOutputOnStartup?: boolean;
    /**
     * List of packages.
     */
    packages?: DeployPackage[];
    /**
     * Indicates if an info popup / notification should be displayed after a successful deployment or not.
     */
    showPopupOnSuccess?: boolean;
    /**
     * List of targets.
     */
    targets?: DeployTarget[];
    /**
     * Use 'targets' property of a package instead, if its 'deployOnSave' property is
     * set to (true).
     */
    useTargetListForDeployOnSave?: boolean;
}

/**
 * A deploy context.
 */
export interface DeployContext {
    /**
     * Returns the current config.
     * 
     * @return {DeployConfiguration} The current config.
     */
    config: () => DeployConfiguration;
    /**
     * Shows an error message.
     * 
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    error: (msg: any) => DeployContext;
    /**
     * Shows an info message.
     * 
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    info: (msg: any) => DeployContext;
    /**
     * Returns if a cancellation is requested or not.
     */
    isCancelling: () => boolean;
    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    log: (msg: any) => DeployContext;
    /**
     * Gets the global output channel.
     */
    outputChannel: () => vscode.OutputChannel;
    /**
     * Returns the package file of that extension.
     * 
     * @return {PackageFile} The data of the package file.
     */
    packageFile: () => PackageFile;
    /**
     * Returns the list of packages.
     * 
     * @return {DeployPackage[]} The packages.
     */
    packages: () => DeployPackage[];
    /**
     * Returns the list of (other) plugins.
     * 
     * @return {DeployPlugin[]} The list of (other) plugins.
     */
    plugins: () => DeployPlugin[];
    /**
     * Loads a module from the extension context / directory.
     * 
     * @param {string} id The ID / path of the module.
     * 
     * @return {any} The module.
     */
    require: (id: string) => any;
    /**
     * Shows a warning message.
     * 
     * @param {any} [msg] The message to show.
     * 
     * @chainable
     */
    warn: (msg: any) => DeployContext;
    /**
     * Returns the root directory of the current workspace.
     * 
     * @return {string} The root directory of the current workspace.
     */
    workspace: () => string;
    /**
     * Writes a messages to the output channel.
     * 
     * @param {any} msg The message to write.
     * 
     * @chainable
     */
    write: (msg: any) => DeployContext;
    /**
     * Writes a messages to the output channel and adds a new line.
     * 
     * @param {any} msg The message to write.
     * 
     * @chainable
     */
    writeLine: (msg: any) => DeployContext;
    /**
     * Returns the list of targets.
     * 
     * @return {DeployTarget[]} The targets.
     */
    targets: () => DeployTarget[];
}

/**
 * Arguments for a deploy event.
 */
export interface DeployEventArguments {    
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
     * The custom root directory to use.
     */
    baseDirectory?: string;
    /**
     * The "before deploy" callback.
     */
    onBeforeDeploy?: BeforeDeployFileEventHandler;
    /**
     * The "completed" callback.
     */
    onCompleted?: FileDeployCompletedEventHandler;
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
 * An operation that opens something like an URI.
 */
export interface DeployOpenOperation extends DeployOperation {
    /**
     * List of arguments to send to the target.
     */
    arguments?: string | string[];
    /**
     * The type.
     */
    target?: string;
    /**
     * Wait until target has been executed or not.
     */
    wait?: boolean;
}

/**
 * A deploy operation.
 */
export interface DeployOperation {
    /**
     * The type.
     */
    type?: string;
}

/**
 * A package.
 */
export interface DeployPackage extends Sortable {
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
     * A list of one or more (host)names that package is visible for.
     */
    isFor?: string | string[];
    /**
     * The name.
     */
    name?: string;
    /**
     * One or more explicit targets to deploy to.
     */
    targets?: string | string[];
    /**
     * Use 'targets' property of this package instead,
     * if its 'deployOnSave' property is set to (true).
     */
    useTargetListForDeployOnSave?: boolean;
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
export interface DeployTarget extends Sortable {
    /**
     * List of operations that should be invoked BEFORE
     * target is being deployed.
     */
    beforeDeploy?: BeforeDeployOpenOperation | BeforeDeployOpenOperation[];
    /**
     * List of operations that should be invoked AFTER
     * ALL files have been deployed.
     */
    deployed?: AfterDeployedOperation | AfterDeployedOperation[];
    /**
     * The description.
     */
    description?: string;
    /**
     * A list of one or more package names that indicates
     * if that target is hidden from GUI if one of the package(s) has been selected.
     */
    hideIf?: string | string[];
    /**
     * A list of one or more (host)names that target is visible for.
     */
    isFor?: string | string[];
    /**
     * One or more folder mapping.
     */
    mappings?: DeployTargetMapping | DeployTargetMapping[];
    /**
     * The name.
     */
    name?: string;
    /**
     * A list of one or more package names that indicates
     * if that target is only shown in GUI if one of the package(s) has been selected.
     */
    showIf?: string | string[];
    /**
     * The type.
     */
    type?: string;
}

/**
 * A wrapper for a deploy target and matching plugins.
 */
export interface DeployTargetWithPlugins {
    /**
     * The list of matching plugings.
     */
    plugins: DeployPlugin[];
    /**
     * The underlying target.
     */
    target: DeployTarget;
}

/**
 * A folder mapping.
 */
export interface DeployTargetMapping {
    /**
     * The source directory.
     */
    source: string;
    /**
     * The target directory.
     */
    target: string;
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
 * An operation that waits a number of milliseconds.
 */
export interface DeployWaitOperation extends DeployOperation {
    /**
     * The time in milliseconds to wait.
     */
    time?: number;
}

/**
 * An operation that starts Web Deploy (msdeploy).
 */
export interface DeployWebDeployOperation extends DeployOperation {
    // s. https://technet.microsoft.com/en-us/library/d860fa74-738a-4f09-87f6-66c6705145f9
    allowUntrusted?: boolean;
    appHostConfigDir?: string;
    args?: string[];
    declareParam?: string;
    declareParamFile?: string;
    dest?: string;
    disableAppStore?: boolean;
    disableLink?: string;
    disableRule?: string;
    disableSkipDirective?: string;
    enableLink?: string;
    enableRule?: string;
    enableSkipDirective?: string;
    postSync?: string;
    preSync?: string;
    removeParam?: string;
    replace?: string;
    retryAttempts?: number;
    retryInterval?: number;
    setParam?: string;
    setParamFile?: string;
    showSecure?: boolean;
    skip?: string;
    source: string;
    unicode?: boolean;
    useCheckSum?: boolean;
    verb: string;
    verbose?: boolean;
    webServerDir?: string;
    whatif?: boolean;
    xml?: boolean;
    xpath?: string;
    
    /**
     * The working directory.
     */
    dir?: string;
    /**
     * The optional path to the executable.
     */
    exec?: string;
    /**
     * Wait for execution finished or not.
     */
    wait?: boolean;
}

/**
 * Additional options for a 'deploy workspace' operation.
 */
export interface DeployWorkspaceOptions {
    /**
     * The custom root directory to use.
     */
    baseDirectory?: string;
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
    onFileCompleted?: FileDeployCompletedEventHandler;
}

/**
 * Arguments for a "file deployed completed" event.
 */
export interface FileDeployCompletedEventArguments extends DeployEventArguments {
    /**
     * Gets if the operation has been canceled or not.
     */
    canceled?: boolean;
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
 * Describes an event handler that is raised AFTER a file deployment has been completed.
 * 
 * @param {any} sender The sending object.
 * @param {FileDeployedCompletedEventArguments} e The Arguments of the event.
 */
export type FileDeployCompletedEventHandler = (sender: any, e: FileDeployCompletedEventArguments) => void;

/**
 * Describes the structure of the package file of that extenstion.
 */
export interface PackageFile {
    /**
     * The display name.
     */
    displayName: string;
    /**
     * The (internal) name.
     */
    name: string;
    /**
     * The version string.
     */
    version: string;
}


/**
 * Describes a button of a popup.
 */
export interface PopupButton extends vscode.MessageItem {
    /**
     * Gets the action of that button.
     */
    action?: PopupButtonAction;
    /**
     * Contains an additional object that should be linked with that instance.
     */
    tag?: any;
}

/**
 * A popup button action.
 */
export type PopupButtonAction = () => void;

/**
 * Describes an object that is sortable.
 */
export interface Sortable {
    /**
     * The sort order.
     */
    sortOrder?: number | Object;
}

/**
 * A function that validates a value.
 * 
 * @param {ValidatorArguments<T>} args The arguments.
 * 
 * @return {Promise<boolean>} The promise.
 */
export type Validator<T> = (args: ValidatorArguments<T>) => Promise<boolean>;

/**
 * Arguments for a "validator" function.
 */
export interface ValidatorArguments<T> {
    /**
     * Additional context data, defined by "caller".
     */
    context?: any;
    /**
     * The options for validation.
     */
    options?: any;
    /**
     * The value to check.
     */
    value: T;
}

/**
 * A validator module.
 */
export interface ValidatorModule<T> {
    /**
     * Validates a value.
     */
    validate?: Validator<T>;
}

/**
 * Describes a function that provides a value.
 * 
 * @return {TValue} The value.
 */
export type ValueProvider<TValue> = () => TValue;

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
     * Gets if the operation has been canceled or not.
     */
    canceled?: boolean;
    /**
     * The error (if occurred).
     */
    error?: any;
    /**
     * The target.
     */
    target: DeployTarget;
}
