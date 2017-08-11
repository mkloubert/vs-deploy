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

import * as Moment from 'moment';
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
 * The default algorithm for crypting data by password.
 */
export const DEFAULT_PASSWORD_ALGORITHM = 'aes-256-ctr';
/**
 * Default TCP port of a host.
 */
export const DEFAULT_PORT = 23979;

/**
 * Name of the event to cancel a deployment.
 */
export const EVENT_CANCEL_DEPLOY = 'deploy.cancel';
/**
 * Name of the event to cancel a pull.
 */
export const EVENT_CANCEL_PULL = 'pull.cancel';
/**
 * Name of the event that is raised when
 * configuration has been reloaded.
 */
export const EVENT_CONFIG_RELOADED = 'deploy.config.reloaded';
/**
 * Name of the event that deploys files.
 */
export const EVENT_DEPLOYFILES = 'deploy.deployFiles';
/**
 * Name of the event for the 'complete' for the
 * event that deploys files.
 */
export const EVENT_DEPLOYFILES_COMPLETE = 'deploy.deployFiles.complete';
/**
 * Name of the event for the 'error' for the
 * event that deploys files.
 */
export const EVENT_DEPLOYFILES_ERROR = 'deploy.deployFiles.error';
/**
 * Name of the event for the 'success' for the
 * event that deploys files.
 */
export const EVENT_DEPLOYFILES_SUCCESS = 'deploy.deployFiles.success';
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
 * Name of the event that is raised when 'sync when open'
 * feature should be disabled.
 */
export const EVENT_SYNCWHENOPEN_DISABLE = 'deploy.syncWhenOpen.disable';
/**
 * Name of the event that is raised when 'sync when open'
 * feature should be enabled.
 */
export const EVENT_SYNCWHENOPEN_ENABLE = 'deploy.syncWhenOpen.enable';
/**
 * Name of the event that is raised when 'sync when open'
 * feature should be toggled.
 */
export const EVENT_SYNCWHENOPEN_TOGGLE = 'deploy.syncWhenOpen.toggle';

/**
 * An object that can handle access keys.
 */
export interface AccessKeyObject {
    /**
     * Prompt for an access key if not defined.
     */
    promptForKey?: boolean;
}

/**
 * An object that can handle access tokens.
 */
export interface AccessTokenObject {
    /**
     * Prompt for an access token if not defined.
     */
    promptForToken?: boolean;
}

/**
 * A deploy operation for compiling files that is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedCompileOperation extends AfterDeployedOperation, DeployCompileOperation {
}

/**
 * A deploy operation for doing a HTTP request that is invoked AFTER
 * ALL files have been deployed.
 */
export interface AfterDeployedHttpOperation extends AfterDeployedOperation, DeployHttpOperation {
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
 * An object that can apply to (its) properties by using
 * generated values by placeholders.
 */
export interface Applyable {
    /**
     * A list of property names and their values
     * that should be applied to that object.
     */
    applyValuesTo?: { [prop: string]: any };
}

/**
 * Describes an event handler that is raised BEFORE a file starts to be deployed.
 * 
 * @param {any} sender The sending object.
 * @param {BeforeDeployFileEventArguments} e The arguments of the event.
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
 * Describes an event handler that is raised BEFORE loading the list of a directory.
 * 
 * @param {any} sender The sending object.
 * @param {BeforeListDirectoryEventArguments} e The arguments of the event.
 */
export type BeforeListDirectoryEventHandler = (sender: any, e: BeforeListDirectoryEventArguments) => void;

/**
 * Arguments for a "before list directory" event.
 */
export interface BeforeListDirectoryEventArguments extends DeployFileEventArguments {
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
 * A deploy operation for doing a HTTP request that is invoked BEFORE
 * files will be deployed.
 */
export interface BeforeDeployHttpOperation extends BeforeDeployOperation, DeployHttpOperation {
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
 * An object that can load (parts) of its data from a source.
 */
export interface CanLoadFrom {
    /**
     * The source from where to load the data from.
     */
    loadFrom?: string;
}

/**
 * A value with a name that is generated by code.
 */
export interface CodeValueWithName extends ValueWithName {
    /** @inheritdoc */
    type: "code";
    /**
     * Gets the code to execute.
     */
    code: string;
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
 * An item that uses JavaScript code if it is available or not.
 */
export interface ConditionalItem {
    /**
     * One or more (JavaScript) conditions that check if that item is available or not.
     */
    if?: string | string[];
}

/**
 * Filters "conditional" items.
 */
export interface ConditionalItemFilter {
    /**
     * Filters "conditional" items.
     * 
     * @param {T|T[]} items The items to filter.
     * 
     * @return {T[]} The filtered items.
     */
    filterConditionalItems<T extends ConditionalItem>(items: T | T[]): T[];
}

/**
 * Describes a function that transforms data into new format.
 * 
 * @param {DataTransformerContext} ctx The transformer context.
 * 
 * @return {DataTransformerResult} The result.
 */
export type DataTransformer = (ctx: DataTransformerContext) => DataTransformerResult;

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
    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    readonly replaceWithValues: (val: any) => string;
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
 * Possible results of a data transformer.
 */
export type DataTransformerResult = Promise<Buffer> | Buffer;

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
    /**
     * Use files that will be deployed / have been deployed as source or not.
     */
    useFilesOfDeployment?: boolean;
}

/**
 * Configuration settings.
 */
export interface DeployConfiguration extends vscode.WorkspaceConfiguration {
    /**
     * Indicates if package list is shown, even if there is only one entry.
     */
    alwaysShowPackageList?: boolean;
    /**
     * Indicates if target list is shown, even if there is only one entry.
     */
    alwaysShowTargetList?: boolean;
    /**
     * Always synchronize a local file with a newer one when using 'sync when open' in a package.
     */
    alwaysSyncIfNewer?: boolean;
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
     * Settings for the process's environment.
     */
    env?: {
        /**
         * Automatically import environment variables as placesholders / values.
         */
        importVarsAsPlaceholders?: boolean;
        /**
         * A list of variables that should NOT use placeholders / values.
         */
        noPlaceholdersForTheseVars?: string | string[] | boolean;
        /**
         * One or more variable for the process to define.
         */
        vars?: { [name: string]: any };
    };
    /**
     * One or more global events.
     */
    events?: Event | Event[];
    /**
     * Indicates if a "fast" file check should be
     * used for the list of ignored files (s. 'ignores').
     */
    fastCheckForIgnores?: boolean;
    /**
     * Default value that indicates if a "fast" file check
     * should be used for "deploy on change" feature or not.
     */
    fastCheckOnChange?: boolean;
    /**
     * Default value that indicates if a "fast" file check
     * should be used for "deploy on save" feature or not.
     */
    fastCheckOnSave?: boolean;
    /**
     * Default value that indicates if a "fast" file check
     * should be used for "sync when open" feature or not.
     */
    fastCheckOnSync?: boolean;
    /**
     * Defines an object that contains global values and objects, categorized by its properties.
     */
    globals?: GlobalVariables;
    /**
     * The time in seconds the result item in the status bar should disapear.
     */
    hideDeployResultInStatusBarAfter?: number;
    /**
     * Deploy host settings.
     */
    host?: {
        /**
         * Run on startup or not.
         */
        autoStart?: boolean;
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
         * An optional password to use.
         */
        password?: string;
        /**
         * The algorithm for the password to use.
         */
        passwordAlgorithm?: string;
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
    };
    /**
     * One or more pattern of files that should be ignored
     * even if a deployment is started for them. 
     */
    ignore?: string | string[];
    /**
     * A list of imports.
     */
    imports?: ImportType | ImportType[];
    /**
     * The ID of the language to use (e.g. 'en', 'de')
     */
    language?: string;
    /**
     * List of additional files of plugin modules to load.
     */
    modules?: string | string[];
    /**
     * A custom machine name.
     */
    name?: string;
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
     * Run build task on startup or define the wait time, in milliseconds, after
     * the build task should be run after startup.
     */
    runBuildTaskOnStartup?: boolean | number;
    /**
     * Run Git pull on startup or define the wait time, in milliseconds, after
     * Git pull should be run after startup.
     */
    runGitPullOnStartup?: boolean | number;
    /**
     * Show an item in the status bar after deployment or not.
     */
    showDeployResultInStatusBar?: boolean;
    /**
     * Indicates if an info popup / notification should be displayed after a successful deployment or not.
     */
    showPopupOnSuccess?: boolean;
    /**
     * Show a warning message if a (single) file has been ignored.
     */
    showWarningIfIgnored?: boolean;
    /**
     * Indicates if a warning popup / notification should be displayed if targets do not exist.
     */
    showWarningsForNonExistingTargets?: boolean;
    /**
     * Starts the REST API or not.
     * s. https://github.com/mkloubert/vs-rest-api
     */
    startApi?: boolean;
    /**
     * Starts the cron jobs or not.
     * s. https://github.com/mkloubert/vs-cron
     */
    startCronJobs?: boolean;
    /**
     * A list of one or more Visual Studio Code commands that should be run on startup.
     */
    startupCommands?: (string | StartupCommand)[] | StartupCommand | string;
    /**
     * Activates or deactivates "sync when open" feature.
     */
    syncWhenOpen?: boolean;
    /**
     * List of targets.
     */
    targets?: DeployTarget[];
    /**
     * A list of template sources.
     */
    templates?: {
        /**
         * Allow unparsed (HTML) documents or not.
         */
        allowUnparsedDocuments?: boolean;
        /**
         * Path or URL to a HTML footer that should be inserted at the beginning
         * inside the BODY tag of each (default) HTML document.
         */
        footer?: string;
        /**
         * Path or URL to a HTML header that should be inserted at the beginning
         * inside the BODY tag of each (default) HTML document.
         */
        header?: string;
        /**
         * Show default sources or not.
         */
        showDefaults?: boolean;
        /**
         * List of one or more sources.
         */
        sources?: string | string[] | TemplateSource | TemplateSource[];
    };
    /**
     * The time (in milliseconds) to wait before activating 'deploy on change' feature.
     */
    timeToWaitBeforeActivateDeployOnChange?: number;
    /**
     * Also check directory patterns, like in '.gitignore' files, in all packages by default or not.
     */
    useGitIgnoreStylePatterns?: boolean;
    /**
     * Use 'targets' property of a package instead, if its 'deployOnSave' property is
     * set to (true).
     */
    useTargetListForDeployOnSave?: boolean;
    /**
     * Use workspace start time for 'sync when open' for all packages by default or not.
     */
    useWorkspaceStartTimeForSyncWhenOpen?: boolean;
    /**
     * A list of one or more values that can be accessed
     * via placeholders in strings, e.g.
     */
    values?: ValueWithName | ValueWithName[];
}

/**
 * A deploy context.
 */
export interface DeployContext extends ConditionalItemFilter, vscode.Disposable, FileDeployer {
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
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    openHtml: (html: string, title?: string, id?: any) => Promise<any>;
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
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    replaceWithValues: (val: any) => string;
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
     * Returns the cache of the targets.
     * 
     * @return {ObjectCache<DeployTarget>} The cache.
     */
    targetCache: () => ObjectCache<DeployTarget>;
    /**
     * Returns the list of targets.
     * 
     * @return {DeployTarget[]} The targets.
     */
    targets: () => DeployTarget[];
    /**
     * Returns the list of values.
     */
    values: () => ObjectWithNameAndValue[];
}

/**
 * List of deploy directions.
 */
export enum DeployDirection {
    /**
     * Deploy (from workspace to target)
     */
    Deploy = 1,
    /**
     * Pull (From target to workspace)
     */
    Pull = 2,
    /**
     * Download from target
     */
    Download = 3,
    /**
     * Get information about a file.
     */
    FileInfo = 4,
    /**
     * List directory.
     */
    ListDirectory = 5,
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
     * DO NOT use mappings.
     */
    noMappings?: boolean;
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
 * Arguments for a 'deploy files' event result.
 */
export interface DeployFilesEventArguments {
    /**
     * The error (if occurred).
     */
    error?: any;
    /**
     * The files that have been (try to be) deployed.
     */
    files?: string[];
    /**
     * The targets.
     */
    targets?: DeployTarget[];
    /**
     * The symbol that indentifies the operation.
     */
    symbol?: symbol;
}

/**
 * An operation that does a HTTP request.
 */
export interface DeployHttpOperation extends DeployOperation {
    /**
     * The body or the path to a script that returns the body to send.
     */
    body?: string;
    /**
     * The request headers.
     */
    headers?: any;
    /**
     * Indicates if 'body' is Base64 encoded or not.
     */
    isBodyBase64?: boolean;
    /**
     * Indicates if 'body' contains the path to a script instead the content to send.
     */
    isBodyScript?: boolean;
    /**
     * The HTTP request method.
     */
    method?: string;
    /**
     * A list of headers that should NOT use placeholders / values.
     */
    noPlaceholdersForTheseHeaders?: string | string[] | boolean;
    /**
     * The options for the script that returns the body to send.
     */
    options?: any;
    /**
     * The password for basic auth.
     */
    password?: string;
    /**
     * The URL.
     */
    url?: string;
    /**
     * The username for basic auth.
     */
    username?: string;
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
export interface DeployOpenOperation extends DeployOperation, ProcessObject {
    /**
     * List of arguments to send to the target.
     */
    arguments?: string | string[];
    /**
     * Run in integrated terminal or not.
     */
    runInTerminal?: boolean;
    /**
     * The application / target to open.
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
     * The description for the operation.
     */
    description?: string;
    /**
     * The name of the operation.
     */
    name?: string;
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
export interface DeployPackage extends Applyable, CanLoadFrom, ConditionalItem, Hideable, Inheritable, MachineItem, PlatformItem, Sortable {
    /**
     * Always synchronize a local file with a newer one when using 'sync when open' in that package.
     */
    alwaysSyncIfNewer?: boolean;
    /**
     * Settings for a "package button".
     */
    button?: DeployPackageButton | boolean,
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
     * Additional information that should be shown in the GUI, e.g.
     */
    detail?: string;
    /**
     * Files to exclude.
     */
    exclude?: string[];
    /**
     * Indicates if a "fast" file check
     * should be used for "deploy on change" feature or not.
     */
    fastCheckOnChange?: boolean;
    /**
     * Indicates if a "fast" file check
     * should be used for "deploy on save" feature or not.
     */
    fastCheckOnSave?: boolean;
    /**
     * Indicates if a "fast" file check
     * should be used for "sync when open" feature or not.
     */
    fastCheckOnSync?: boolean;
    /**
     * Files to include.
     */
    files?: string[];
    /**
     * The name.
     */
    name?: string;
    /**
     * Exclude 'node_modules' directory by default or not.
     */
    noNodeModules?: boolean;
    /**
     * Show this package for deploying or not.
     */
    showForDeploy?: boolean;
    /**
     * Show this package for pulling or not.
     */
    showForPull?: boolean;
    /**
     * Synchronizes local files with remote ones when opening it.
     */
    syncWhenOpen?: boolean | string | SyncWhenOpenFileFilter;
    /**
     * One or more explicit targets to deploy to.
     */
    targets?: string | string[];
    /**
     * Use 'targets' property of this package instead,
     * if its 'deployOnSave' property is set to (true).
     */
    useTargetListForDeployOnSave?: boolean;
    /**
     * Use workspace start time for 'sync when open' for that package or not.
     */
    useWorkspaceStartTimeForSyncWhenOpen?: boolean;
}

/**
 * A button for a package.
 */
export interface DeployPackageButton {
    /**
     * The custom ID for the underlying command.
     */
    command?: string;
    /**
     * Enable button or not.
     */
    enabled?: boolean;
    /**
     * Put button on the right side or not.
     */
    isRight?: boolean;
    /**
     * The priority.
     */
    priority?: number;
    /**
     * One or more explicit targets to deploy to.
     */
    targets?: string | string[];
    /**
     * A custom text for the button.
     */
    text?: string;
    /**
     * A custom tooltip for the button.
     */
    tooltip?: string;
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
     * Indicates if plugin is able to get information about remote files or not.
     */
    canGetFileInfo?: boolean;
    /**
     * Indicates if plugin is able to list a directory.
     */
    canList?: boolean;
    /**
     * Indicates if plugin can pull files or not.
     */
    canPull?: boolean;
    /**
     * Compares a local file with a remote one.
     * 
     * @param {string} file The file to compare.
     * @param {DeployTarget} target The source from where to download the file from.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {PromiseLike<FileCompareResult>|FileCompareResult} The result.
     */
    compareFiles?: (file: string, target: DeployTarget, opts?: DeployFileOptions) => PromiseLike<FileCompareResult> | FileCompareResult;
    /**
     * Compares local files with a remote ones.
     * 
     * @param {string[]} files The files to compare.
     * @param {DeployTarget} target The source from where to download the file from.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {PromiseLike<FileCompareResult[]>|FileCompareResult[]} The result.
     */
    compareWorkspace?: (files: string[], target: DeployTarget, opts?: DeployFileOptions) => PromiseLike<FileCompareResult[]> | FileCompareResult[];
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
     * Downloads a file from target.
     * 
     * @param {string} file The file to download.
     * @param {DeployTarget} target The source from where to download the file from.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {Promise<Buffer>} The promise.
     */
    downloadFile?: (file: string, target: DeployTarget, opts?: DeployFileOptions) => Promise<Buffer> | Buffer;
    /**
     * Gets information about a file from target.
     * 
     * @param {string} file The file to download.
     * @param {DeployTarget} target The source from where to download the file from.
     * @param {DeployFileOptions} [opts] Additional options.
     * 
     * @return {PromiseLike<FileInfo>|FileInfo} The result.
     */
    getFileInfo?: (file: string, target: DeployTarget, opts?: DeployFileOptions) => PromiseLike<FileInfo> | FileInfo;
    /**
     * Return information of the plugin.
     * 
     * @return {DeployPluginInfo} The plugin info.
     */
    info?: () => DeployPluginInfo;
    /**
     * Lists the content of a directory.
     * 
     * @param {string} path The path of the directory to list.
     * @param {DeployTarget} target The target that contains the file to pull.
     * @param {ListDirectoryOptions} [opts] Additional options.
     * 
     * @return {ListDirectoryResult} The result.
     */
    list?: (path: string, target: DeployTarget, opts?: ListDirectoryOptions) => ListDirectoryResult;
    /**
     * Pulls a file.
     * 
     * @param {string} file The path of the local file.
     * @param {DeployTarget} target The target that contains the file to pull.
     * @param {DeployFileOptions} [opts] Additional options.
     */
    pullFile?: (file: string, target: DeployTarget, opts?: DeployFileOptions) => void;
    /**
     * Pulls files of to the workspace.
     * 
     * @param {string[]} files The files to pull.
     * @param {DeployTarget} target The target that contains the files to pull.
     * @param {DeployWorkspaceOptions} [opts] Additional options.
     */
    pullWorkspace?: (files: string[], target: DeployTarget, opts?: DeployWorkspaceOptions) => void;
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
export interface DeployScriptOperationArguments extends ScriptArguments, FileDeployer {
    /**
     * The files that should be deployed.
     */
    files: string[];
    /**
     * A state value for the ALL scripts that exists while the
     * current session.
     */
    globalState?: Object;
    /**
     * The kind of operation.
     */
    kind: DeployOperationKind;
    /**
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    openHtml: (html: string, title?: string, id?: any) => Promise<any>;
    /**
     * The addtional options.
     */
    options?: any;
    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    replaceWithValues: (val: any) => string;
    /**
     * A state value for the current script that exists while the
     * current session.
     */
    state?: any;
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
 * @return {void|Promise<any>} The result.
 */
export type DeployScriptOperationExecutor = (args: DeployScriptOperationArguments) => void | Promise<any>;

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
export interface DeploySqlOperation extends DeployOperation, PasswordObject {
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
export interface DeployTarget extends Applyable, CanLoadFrom, ConditionalItem, Hideable, Inheritable, MachineItem, PlatformItem, Sortable {
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the ID of that target.
     */
    __id?: any;
    
    /**
     * List of operations that should be invoked BEFORE
     * target is being deployed.
     */
    beforeDeploy?: BeforeDeployOpenOperation | BeforeDeployOpenOperation[];
    /**
     * Check for newer files before a deployment starts or not.
     */
    checkBeforeDeploy?: boolean;
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
     * Additional information that should be shown in the GUI, e.g.
     */
    detail?: string;
    /**
     * Start a diff before deploy file(s).
     */
    diffBeforeDeploy?: boolean;
    /**
     * A list of one or more package names that indicates
     * if that target is hidden from GUI if one of the package(s) has been selected.
     */
    hideIf?: string | string[];
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
 * A list of targets.
 */
export type DeployTargetList = string | string[] | DeployTarget | DeployTarget[];

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
     * Indicates if 'source' contains a regular expression
     * instead of a static string.
     */
    isRegEx?: boolean;
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
export interface DeployWebDeployOperation extends DeployOperation, ProcessObject {
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
     * Run in integrated terminal or not.
     */
    runInTerminal?: boolean;
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
 * Information about a directory.
 */
export interface DirectoryInfo extends FileSystemInfo {
}

/**
 * A document.
 */
export interface Document {
    /**
     * The body / content of the document.
     */
    body: Buffer;
    /**
     * The encoding.
     */
    encoding?: string;
    /**
     * The ID.
     */
    id?: any;
    /**
     * The MIME type.
     */
    mime?: string;
    /**
     * The title.
     */
    title?: string;
}

/**
 * A value with a name that accesses an environment variable with the same name.
 */
export interface EnvValueWithName extends ValueWithName {
    /**
     * The optional alias of the variable.
     */
    alias?: string;
    /** @inheritdoc */
    type: "env" | "environment";
}

/**
 * An event entry.
 */
export interface Event extends ConditionalItem, MachineItem, PlatformItem, Sortable {
    /**
     * A description for that event.
     */
    description?: string;
        /**
     * The name of the event.
     */
    name: string;
    /**
     * Execute once or not.
     */
    once?: boolean;
    /**
     * Options / data for the execution.
     */
    options?: any;
    /**
     * The path to the script.
     */
    script: string;
    /**
     * The initial value for the state.
     */
    state?: any;
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
 * An event module.
 */
export interface EventModule {
    /**
     * Raises the event.
     */
    raiseEvent: EventModuleExecutor;
}

/**
 * Describes a function for executing the logic of an event.
 * 
 * @param {EventModuleExecutorArguments} args The arguments for the execution.
 * 
 * @return {EventModuleExecutorResult} The result.
 */
export type EventModuleExecutor = (args: EventModuleExecutorArguments) => EventModuleExecutorResult; 

/**
 * A possible result of an event execution.
 */
export type EventModuleExecutorResult = Promise<number> | number | void; 

/**
 * Arguments for an event execution.
 */
export interface EventModuleExecutorArguments extends ScriptArguments {
    /**
     * The arguments of the underlying listener.
     */
    readonly arguments: IArguments;
    /**
     * Gets an object that can share data between all other events.
     */
    readonly globalState: Object;
    /**
     * Gets the name of the underlying event.
     */
    readonly name: string;
    /**
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    readonly openHtml: (html: string, title?: string, id?: any) => Promise<any>;
    /**
     * Data / options for the execution.
     */
    readonly options?: any;
    /**
     * Removes the underlying event.
     * 
     * @return {boolean} Event has been removed or not.
     */
    readonly remove: () => boolean;
    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    readonly replaceWithValues: (val: any) => string;
    /**
     * Gets or sets a state for that event.
     */
    state: any;
}

/**
 * Result of a file comparison.
 */
export interface FileCompareResult {
    /**
     * Information about the "left" file.
     */
    left: FileInfo;
    /**
     * Information about the "right" file.
     */
    right: FileInfo;
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
 * @param {FileDeployedCompletedEventArguments} e The arguments of the event.
 */
export type FileDeployCompletedEventHandler = (sender: any, e: FileDeployCompletedEventArguments) => void;

/**
 * An object that can deploy files.
 */
export interface FileDeployer {
    /**
     * Deploys files.
     * 
     * @param {string | string[]} files The files to deploy.
     * @param {DeployTargetList} targets The targets to deploy to.
     */
    deployFiles(files: string | string[], targets: DeployTargetList): Promise<DeployFilesEventArguments>;
}

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
    /**
     * Also check directory patterns, like in '.gitignore' files, in that filter or not.
     */
    useGitIgnoreStylePatterns?: boolean;
}

/**
 * Information about a file.
 */
export interface FileInfo extends FileSystemInfo {
    /**
     * The size.
     */
    size?: number;
}

/**
 * Information about an item on a file system.
 */
export interface FileSystemInfo {
    /**
     * Files exists or not.
     */
    exists: boolean;
    /**
     * Is remote file or not.
     */
    isRemote: boolean;
    /**
     * The time the file has been modified.
     */
    modifyTime?: Moment.Moment;
    /**
     * The "real" name.
     */
    name?: string;
    /**
     * The path.
     */
    path?: string;
    /**
     * The type.
     */
    type: FileSystemType;
}

/**
 * Type of a file system item.
 */
export enum FileSystemType {
    /**
     * File
     */
    File = 1,
    /**
     * Directory
     */
    Directory = 2,
}

/**
 * A value with a name that loads its value from file.
 */
export interface FileValueWithName extends ValueWithName {
    /**
     * Returns as binary / buffer or not.
     */
    asBinary?: boolean;
    /**
     * The text encoding to use.
     */
    encoding?: string;
    /**
     * The file to load.
     */
    file: string;
    /** @inheritdoc */
    type: "file";
    /**
     * Also use placeholders for the (string) content or not.
     */
    usePlaceholders?: boolean;
}

/**
 * Global variables.
 */
export type GlobalVariables = Object;

/**
 * Describes an object that can be hidden (in the GUI e.g.).
 */
export interface Hideable {
    /**
     * Is hidden or not.
     */
    isHidden?: boolean;
}

/**
 * An import entry.
 */
export interface Import extends ConditionalItem, MachineItem, PlatformItem, Sortable {
    /**
     * An optional description for the entry.
     */
    description?: string;
    /**
     * Gets the source.
     */
    from: string;
    /**
     * Merge with parent object or not.
     */
    merge?: boolean;
}

/**
 * Import types.
 */
export type ImportType = string | Import;

/**
 * An object with a name that can inherit from other objects.
 */
export interface Inheritable {
    /**
     * One or more names of objects from where to inherit from.
     */
    inheritFrom?: string | string[];
    /**
     * The name of the object.
     */
    name?: string;
}

/**
 * Arguments for a "list directory completed" event.
 */
export interface ListDirectoryCompletedEventArguments extends DeployEventArguments {
    /**
     * Gets if the operation has been canceled or not.
     */
    canceled?: boolean;
        /**
     * The directory.
     */
    directory: string;
    /**
     * The error (if occurred).
     */
    error?: any;
    /**
     * The target.
     */
    target: DeployTarget;
}

/**
 * Describes an event handler that is raised AFTER the list of a directory has been loaded.
 * 
 * @param {any} sender The sending object.
 * @param {FileDeployedCompletedEventArguments} e The arguments of the event.
 */
export type ListDirectoryCompletedEventHandler = (sender: any, e: ListDirectoryCompletedEventArguments) => void;

/**
 * Additional options for a 'ListDirectoryCallback'.
 */
export interface ListDirectoryOptions {
    /**
     * The custom root directory to use.
     */
    baseDirectory?: string;
    /**
     * The custom deploy context.
     */
    context?: DeployContext;
    /**
     * DO NOT use mappings.
     */
    noMappings?: boolean;
    /**
     * The "before list" callback.
     */
    onBeforeList?: BeforeListDirectoryEventHandler;
    /**
     * The "completed" callback.
     */
    onCompleted?: ListDirectoryCompletedEventHandler;
}

/**
 * Possible types for listening a directory on a file system.
 */
export type ListDirectoryResult = FileSystemInfo[] | PromiseLike<FileSystemInfo[]>;

/**
 * An item for a specific machine.
 */
export interface MachineItem {
    /**
     * A list of one or more (host)names that item is (visible) for.
     */
    isFor?: string | string[];
}

/**
 * A cache for objects.
 */
export interface ObjectCache<T> {
    /**
     * Returns a value from the cache.
     * 
     * @param {T} obj The underlying object.
     * @param {string} name The name of the value.
     * @param {TValue} [defaultValue] The default value.
     * 
     * @returns {TValue|TDefault} The value.
     */
    get<TValue = any, TDefault = TValue>(obj: T, name: string, defaultValue?: TDefault): TValue | TDefault;

    /**
     * Checks if the cache contains a value.
     * 
     * @param {T} obj The underlying object.
     * @param {string} name The name of the value.
     * 
     * @return {boolean} Contains value or not.
     */
    has(obj: T, name: string): boolean;

    /**
     * Sets a value for an object.
     * 
     * @param {T} obj The underlying object.
     * @param {string} name The name of the value.
     * @param {TValue} value The value to set.
     * 
     * @returns {this}
     */
    set<TValue>(obj: T, name: string, value: TValue): this;
}

/**
 * An object with a name (property).
 */
export interface ObjectWithName {
    /**
     * Gets the name.
     */
    name: string;
}

/**
 * An object with name and value (properties).
 */
export interface ObjectWithNameAndValue extends ObjectWithName, ObjectWithValue {
}

/**
 * An object with a value (property).
 */
export interface ObjectWithValue {
    /**
     * Gets the (current) value.
     */
    value: any;
}

/**
 * Files to open at startup.
 */
export interface OpenFileFilter extends ConditionalItem, FileFilter, MachineItem {
    /**
     * Close other opened files or not.
     */
    closeOthers?: boolean;
}

/**
 * An object that can handle passwords.
 */
export interface PasswordObject {
    /**
     * Prompt for a password if not defined.
     */
    promptForPassword?: boolean;
}

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
 * An item / object that can be filtered by platform.
 */
export interface PlatformItem {
    /**
     * One or more platform the item is for.
     */
    platforms?: string | string[];
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
 * An object that creates or handles a process
 * of an operating system.
 */
export interface ProcessObject {
    /**
     * A list of optional environment variables to use.
     */
    envVars?: { [name: string]: any };
    /**
     * A list of variables that should NOT use placeholders / values.
     */
    noPlaceholdersForTheseVars?: string | string[] | boolean;
    /**
     * Also use environment variables of the process of
     * current workspace or not.
     */
    useEnvVarsOfWorkspace?: boolean;
}

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
     * The initial value for 'commandState' property.
     * s. https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.scriptcommandexecutorarguments.html#commandstate
     */
    commandState?: any;
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
 * @returns {ScriptCommandExecutorResult} The result.
 */
export type ScriptCommandExecutor = (args: ScriptCommandExecutorArguments) => ScriptCommandExecutorResult;

/**
 * Possible results of a script command.
 */
export type ScriptCommandExecutorResult = any;

/**
 * Arguments for a command execution.
 */
export interface ScriptCommandExecutorArguments extends ScriptArguments, FileDeployer {
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
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    openHtml: (html: string, title?: string, id?: any) => Promise<any>;
    /**
     * The options.
     */
    options?: any;
    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    replaceWithValues: (val: any) => string;
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
 * A module of a script value.
 */
export interface ScriptValueModule {
    /**
     * Gets the value.
     */
    getValue: ScriptValueProvider;
}

/**
 * A function that provides a script value.
 * 
 * @param {ScriptValueProviderArguments} args The arguments for the underlying script.
 * 
 * @return {any} The value.
 */
export type ScriptValueProvider = (args: ScriptValueProviderArguments) => any;

/**
 * Arguments for the function of a script value.
 */
export interface ScriptValueProviderArguments extends ScriptArguments {
    /**
     * Gets the object that can share data between all values.
     */
    readonly globalState: Object;
    /**
     * Gets the name of that value.
     */
    readonly name: string;
    /**
     * Gets the data for the underlying script.
     */
    readonly options: any;
    /**
     * Gets the object that can access the other values.
     */
    readonly others: { [key: string]: any };
    /**
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    replaceWithValues: (val: any) => string;
    /**
     * Loads a module from the script context.
     * 
     * @param {string} id The ID / path to the module.
     * 
     * @return {any} The loaded module.
     */
    require: (id: string) => any;
    /**
     * Gets or sets a state for that script.
     */
    state: any;
}

/**
 * A (static) value with a name.
 */
export interface ScriptValueWithName extends ValueWithName {
    /**
     * Data for the underlying script.
     */
    options?: any;
    /**
     * The path to the script.
     */
    script: string;
    /** @inheritdoc */
    type: "script";
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
 * A (static) value with a name.
 */
export interface StaticValueWithName extends ValueWithName {
    /** @inheritdoc */
    type?: "" | "static";
    /**
     * Gets the value.
     */
    value: any;
}

/**
 * 'Sync when open' file filter.
 */
export interface SyncWhenOpenFileFilter extends FileFilter {
    /**
     * The target from where to sync.
     */
    target?: string;
}

/**
 * A template category.
 */
export interface TemplateCategory extends TemplateItem {
    /**
     * One or more child.
     */
    children?: TemplateItemList;
    /** @inheritdoc */
    type: "category" | "cat" | "c";
}

/**
 * A template file.
 */
export interface TemplateFile extends TemplateItem {
    /**
     * A description for the item.
     */
    description?: string;
    /**
     * Gets if the file in an (HTML) document or not.
     */
    isDocument?: boolean;
    /**
     * The source of the file.
     */
    source: string;
    /** @inheritdoc */
    type?: "" | "f" | "file"
}

/**
 * A template item.
 */
export interface TemplateItem {
    /**
     * The name of the custom icon.
     */
    icon?: string;
    /**
     * The minimum version of that extension
     * that is required to display the item.
     */
    requires?: string;
    /**
     * A custom sort order.
     */
    sortOrder?: number;
    /**
     * The type.
     */
    type?: string;
}

/**
 * An object with a list of template items.
 */
export type TemplateItemList = {
    /**
     * Gets an item by its name.
     */
    [name: string]: TemplateItem;
}

/**
 * A template repository.
 */
export interface TemplateRepository extends TemplateItem {
    /**
     * A description for the item.
     */
    description?: string;
    /**
     * The source of the repository.
     */
    source: string;
    /** @inheritdoc */
    type?: "r" | "repo" | "repository"
}

/**
 * A template link.
 */
export interface TemplateLink {
    /**
     * A description for the item.
     */
    description?: string;
    /**
     * The path or URL to the source.
     */
    source: string;
    /** @inheritdoc */
    type?: "l" | "link" | "u" | "url";
}

/**
 * A template source.
 */
export interface TemplateSource {
    /**
     * Options for the source.
     */
    options?: any;
    /**
     * The source.
     */
    source: string;
}

/**
 * An object that can transform (its) data.
 */
export interface Transformable {
    /**
     * The path to a (script) module that transforms data.
     * 
     * s. 'TranformerModule' interface
     */
    transformer?: string;
    /**
     * The optional options for the transformer script.
     */
    transformerOptions?: any;
}

/**
 * A target that supports data transformation.
 */
export interface TransformableDeployTarget extends DeployTarget, Transformable {
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
     * Handles a value as string and replaces placeholders.
     * 
     * @param {any} val The value to parse.
     * 
     * @return {string} The parsed value.
     */
    replaceWithValues: (val: any) => string;
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
 * A value with a name.
 */
export interface ValueWithName extends MachineItem, PlatformItem {
    /**
     * An optional description for the value.
     */
    description?: string;
    /**
     * The name of the value.
     */
    name: string;
    /**
     * The type of the value.
     */
    type?: string;
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
