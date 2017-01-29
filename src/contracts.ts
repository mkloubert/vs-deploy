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
 * Name of the event to cancel a deployment.
 */
export const EVENT_CANCEL_DEPLOY = 'deploy.cancel';
/**
 * Name of the event that is raised when 'deploy on change'
 * feature should be disabled.
 */
export const EVENT_DEPLOYONCHANGE_DISABLE = 'deploy.deployOnChange.disable';
/**
 * Name of the event that is raised when 'deploy on change'
 * feature should be enabled.
 */
export const EVENT_DEPLOYONCHANGE_ENABLE = 'deploy.deployOnChange.enable';
/**
 * Name of the event that is raised when 'deploy on change'
 * feature should be toggled.
 */
export const EVENT_DEPLOYONCHANGE_TOGGLE = 'deploy.deployOnChange.toggle';
/**
 * Name of the event that is raised when 'deploy on save'
 * feature should be disabled.
 */
export const EVENT_DEPLOYONSAVE_DISABLE = 'deploy.deployOnSave.disable';
/**
 * Name of the event that is raised when 'deploy on save'
 * feature should be enabled.
 */
export const EVENT_DEPLOYONSAVE_ENABLE = 'deploy.deployOnSave.enable';
/**
 * Name of the event that is raised when 'deploy on save'
 * feature should be toggled.
 */
export const EVENT_DEPLOYONSAVE_TOGGLE = 'deploy.deployOnSave.toggle';

/**
 * A deploy operation for compiling files that is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedCompileOperation extends AfterDeployedOperation, DeployCompileOperation {
}

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
 * An operation that uses a script and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployScriptOperation extends AfterDeployedOperation, DeployScriptOperation {
}

/**
 * An operation that executes SQL and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeploySqlOperation extends AfterDeployedOperation, DeploySqlOperation {
}

/**
 * An operation that executes a Visual Studio Code command and is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedVSCommandOperation extends AfterDeployedOperation, DeployVSCommandOperation {
}

/**
 * An execution context for a Visual Studio Code command (after deployed).
 */
export interface AfterDeployedVSCommandOperationContext extends DeployVSCommandOperationContext {
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
 * A deploy operation for compiling files that is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployCompileOperation extends BeforeDeployOperation, DeployCompileOperation {
}

/**
 * An operation that opens something like an URI and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployOpenOperation extends BeforeDeployOperation, DeployOpenOperation {
}

/**
 * An operation that uses a script and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployScriptOperation extends BeforeDeployOperation, DeployScriptOperation {
}

/**
 * An operation that executes SQL and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeploySqlOperation extends BeforeDeployOperation, DeploySqlOperation {
}

/**
 * An operation that executes a Visual Studio Code command and is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployVSCommandOperation extends BeforeDeployOperation, DeployVSCommandOperation {
}

/**
 * An execution context for a Visual Studio Code command (before deploy).
 */
export interface BeforeDeployVSCommandOperationContext extends DeployVSCommandOperationContext {
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
 * A command.
 */
export interface Command {
    /**
     * The ID of the command.
     */
    command: string;
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
export interface DataTransformerContext extends ScriptArguments {
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
 * A deploy operation for compiling files.
 */
export interface DeployCompileOperation extends DeployOperation {
    /**
     * The compiler to use.
     */
    compiler: string;
    /**
     * The options for the compiler.
     */
    options?: any;
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
     * A list of one or more script based commands to register.
     */
    commands?: ScriptCommand | ScriptCommand[];
    /**
     * Activates or deactivates "deploy on change" feature.
     */
    deployOnChange?: boolean;
    /**
     * Activates or deactivates "deploy on save" feature.
     */
    deployOnSave?: boolean;
    /**
     * Disables the display of popups that reports for a new version of that extension.
     */
    disableNewVersionPopups?: boolean;
    /**
     * Display loaded plugins in output window or not.
     */
    displayLoadedPlugins?: boolean;
    /**
     * Display network information in output window or not.
     */
    displayNetworkInfo?: boolean;
    /**
     * Defines an object that contains global values and objects, categorized by its properties.
     */
    globals?: GlobalVariables;
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
     * A list files to open on startup.
     */
    open?: OpenFileFilter | OpenFileFilter[];
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
     * Show an item in the status bar after deployment or not.
     */
    showDeployResultInStatusBar?: boolean;
    /**
     * Indicates if an info popup / notification should be displayed after a successful deployment or not.
     */
    showPopupOnSuccess?: boolean;
    /**
     * A list of one or more Visual Studio Code commands that should be run on startup.
     */
    startupCommands?: (string | StartupCommand)[] | StartupCommand | string;
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
export interface DeployContext extends vscode.Disposable {
    /**
     * Returns the current config.
     * 
     * @return {DeployConfiguration} The current config.
     */
    config: () => DeployConfiguration;
    /**
     * Emits an event of the context.
     * 
     * @param {string | symbol} event The event.
     * @param {any[]} args The arguments.
     */
    emit: (event: string | symbol, ...args: any[]) => boolean;
    /**
     * Emits a global event.
     * 
     * @param {string | symbol} event The event.
     * @param {any[]} args The arguments.
     */
    emitGlobal: (event: string | symbol, ...args: any[]) => boolean;
    /**
     * Shows an error message.
     * 
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    error: (msg: any) => DeployContext;
    /**
     * Gets the list of global vars.
     */
    globals: () => GlobalVariables;
    /**
     * Shows an info message.
     * 
     * @param {any} msg The message to show.
     * 
     * @chainable
     */
    info: (msg: any) => DeployContext;
    /**
     * Returns if cancellation has been requested or not.
     * 
     * @return {boolean} Cancellation has been requested or not.
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
     * Registers a callback for an event that is invoked once.
     * 
     * @param {string | symbol} event The event.
     * @param {() => void} callback The callback to register.
     * 
     * @chainable
     */
    once: (event: string | symbol,
           handler: EventHandler) => DeployContext;
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
     * The custom deploy context.
     */
    context?: DeployContext;
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
 * 'Deploy on change' file filter.
 */
export interface DeployOnChangeFileFilter extends FileFilter {
    /**
     * Use target lists or not.
     */
    useTargetList?: boolean;
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
 * List of deploy operation kinds.
 */
export enum DeployOperationKind {
    /**
     * Before deployment starts.
     */
    Before = 0,
    /**
     * After successful deployment.
     */
    After = 1,
}

/**
 * A package.
 */
export interface DeployPackage extends Sortable {
    /**
     * Deploys files on change.
     */
    deployOnChange?: true | DeployOnChangeFileFilter;
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
     * Files to include.
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
     * Disposes / cleanup the plugin.
     */
    dispose?: () => void;
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
 * Stores a deploy plugin with its deploy context.
 */
export interface DeployPluginWithContext {
    /**
     * The deploy context.
     */
    context: DeployContext;
    /**
     * The plugin.
     */
    plugin: DeployPlugin;
}

/**
 * A quick pick item.
 */
export interface DeployQuickPickItem extends vscode.QuickPickItem {
}

/**
 * A deploy operation that uses a script.
 */
export interface DeployScriptOperation extends DeployOperation {
    /**
     * Addtional data for the script.
     */
    options?: any;
    /**
     * The path to the script.
     */
    script: string;
}

/**
 * The arguments for a script of a deploy operation.
 */
export interface DeployScriptOperationArguments extends ScriptArguments {
    /**
     * The files that should be deployed.
     */
    files: string[];
    /**
     * The kind of operation.
     */
    kind: DeployOperationKind;
    /**
     * The addtional options.
     */
    options?: any;
    /**
     * The underlying target configuration.
     */
    target: DeployTarget;
}

/**
 * A function for a script based deploy operation.
 * 
 * @param {DeployScriptOperationArguments} args The arguments for the execution.
 * 
 * @return The promise.
 */
export type DeployScriptOperationExecutor = (args: DeployScriptOperationArguments) => Promise<any>;

/**
 * A module for a script operation.
 */
export interface DeployScriptOperationModule {
    /**
     * Executes the logic of the script.
     */
    execute?: DeployScriptOperationExecutor;
}

/**
 * An operation that executes SQL.
 */
export interface DeploySqlOperation extends DeployOperation {
    /**
     * The engine.
     */
    engine?: string;
    /**
     * The connection options.
     */
    options?: any;
    /**
     * The list of queries to execute.
     */
    queries: string | string[];
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
 * An operation that executes a Visual Studio Code command.
 */
export interface DeployVSCommandOperation extends DeployOperation {
    /**
     * The arguments for the command.
     */
    arguments?: any[];
    /**
     * The command to execute.
     */
    command: string;
    /**
     * Options for the operation context object (@see DeployVSCommandOperationContext).
     */
    contextOptions?: any;
    /**
     * Submit an operation context object (@see DeployVSCommandOperationContext) as first argument or not.
     */
    submitContext?: boolean;
}

/**
 * An execution context for a Visual Studio Code command.
 */
export interface DeployVSCommandOperationContext {
    /**
     * The ID of the command.
     */
    command: string;
    /**
     * The globals defined in the settings.
     */
    globals: GlobalVariables;
    /**
     * The files to deploy.
     */
    files: string[];
    /**
     * The kind of operation.
     */
    kind: DeployOperationKind;
    /**
     * The operation 
     */
    operation: DeployVSCommandOperation;
    /**
     * Options for the execution (@see DeployVSCommandOperation.contextOptions).
     */
    options?: any;
    /**
     * Loads a module from the script context.
     */
    require: (id: string) => any;
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
     * The custom deploy context.
     */
    context?: DeployContext;
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
 * Arguments for an event.
 */
export interface EventArguments {    
}

/**
 * An event handler.
 * 
 * @param {any} sender The sending object.
 * @param {EventArguments} e The arguments for the event.
 */
export type EventHandler = (sender: any, e: EventArguments) => void;

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
 * A file filter.
 */
export interface FileFilter {
    /**
     * Files to exclude.
     */
    exclude?: string | string[];
    /**
     * Files to include.
     */
    files?: string | string[];
}

/**
 * Global variables.
 */
export type GlobalVariables = Object;

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
 * Files to open at startup.
 */
export interface OpenFileFilter extends FileFilter {
    /**
     * Close other opened files or not.
     */
    closeOthers?: boolean;
    /**
     * A list of one or more (host)names that filter is for.
     */
    isFor?: string | string[];
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
 * Arguments that be used script or something like that.
 */
export interface ScriptArguments {
    /**
     * Emits a global event.
     * 
     * @param {string | symbol} event The event.
     * @param {any[]} args The arguments.
     */
    emitGlobal: (event: string | symbol, ...args: any[]) => boolean;
    /**
     * The global variables from the settings.
     */
    globals: GlobalVariables;
    /**
     * Loads a module from the script context.
     * 
     * @param {string} id The ID / path to the module.
     * 
     * @return {any} The loaded module.
     */
    require: (id: string) => any;
}

/**
 * A startup command.
 */
export interface ScriptCommand extends Command {
    /**
     * Settings for optional button in the status bar.
     */
    button?: {
        /**
         * The custom (text) color for the button.
         */
        color?: string;
        /**
         * Set button on the right side or not.
         */
        isRight?: boolean;
        /**
         * The custom priority.
         */
        priority?: number;
        /**
         * Show button on startup or not.
         */
        show?: boolean;
        /**
         * The caption for the button.
         */
        text?: string;
        /**
         * The tooltip for the button.
         */
        tooltip?: string;
    },
    /**
     * Optional data for the execution.
     */
    options?: any;
    /**
     * The path to the script that is run when command is executed.
     */
    script: string;
}

/**
 * Describes the function that execute a command.
 * 
 * @param {ScriptCommandExecutorArguments} args The arguments for the execution.
 * 
 * @returns {Promise<any>} The promise.
 */
export type ScriptCommandExecutor = (args: ScriptCommandExecutorArguments) => Promise<any>;

/**
 * Arguments for a command execution.
 */
export interface ScriptCommandExecutorArguments extends ScriptArguments {
    /**
     * Arguments from the callback.
     */
    arguments: IArguments;
    /**
     * The underlying button.
     */
    button?: vscode.StatusBarItem;
    /**
     * The ID of the underlying command.
     */
    command: string;
    /**
     * Defines data that should be keeped while the current session
     * and is available for ONLY for current command.
     */
    commandState?: any;
    /**
     * Defines data that should be keeped while the current session
     * and is available for ALL commands defined by that extension.
     */
    globalState?: any;
    /**
     * The options.
     */
    options?: any;
}

/**
 * A module of a script based command.
 */
export interface ScriptCommandModule {
    /**
     * Executes the command.
     */
    execute?: ScriptCommandExecutor;
}

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
 * A startup command.
 */
export interface StartupCommand extends Command {
    /**
     * Arguments for the execution.
     */
    arguments?: any[];
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
export interface ValidatorArguments<T> extends ScriptArguments {
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
