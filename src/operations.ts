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

import * as deploy_compilers from './compilers';
import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as deploy_sql from './sql';
import * as i18 from './i18';
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * An operation context.
 */
export interface OperationContext<T extends deploy_contracts.DeployOperation> {
    /**
     * The app configuration.
     */
    readonly config: deploy_contracts.DeployConfiguration;
    /**
     * Can store the error that is raised while the execution. 
     */
    error?: any;
    /**
     * The files to deploy / the deployed files.
     */
    readonly files: string[];
    /**
     * The global data from the settings.
     */
    readonly globals: Object;
    /**
     * Operation has been handled or not.
     */
    handled?: boolean;
    /**
     * Kind of operation.
     */
    readonly kind: deploy_contracts.DeployOperationKind;
    /**
     * The operation settings.
     */
    readonly operation: T;
    /**
     * The output channel.
     */
    readonly outputChannel: vscode.OutputChannel;
}

/**
 * Describes something that executes on operation.
 * 
 * @param {OperationContext<T>} ctx The execution context.
 * 
 * @returns {Promise<boolean>|boolean|void} The result.
 */
export type OperationExecutor<T extends deploy_contracts.DeployOperation> = (ctx: OperationContext<T>) => Promise<boolean> | void | boolean;


/**
 * Compiles files.
 * 
 * @param {OperationContext<T>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function compile(ctx: OperationContext<deploy_contracts.DeployCompileOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = (err?: any) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        };

        try {
            let compileOp = deploy_helpers.cloneObject(ctx.operation);

            let updateFilesProperty = (property = "files") => {
                if (!deploy_helpers.toBooleanSafe(compileOp.useFilesOfDeployment)) {
                    return;  // do not use files of deployment
                }

                if (deploy_helpers.isNullOrUndefined(compileOp.options)) {
                    compileOp.options = {};  // initialize
                }

                if (deploy_helpers.isNullOrUndefined(compileOp.options[property])) {
                    // only if not explicit defined
                    compileOp.options[property] = ctx.files.map(x => x);  // create copy
                }
            };

            let compilerName = deploy_helpers.normalizeString(compileOp.compiler);

            let compiler: deploy_compilers.Compiler;
            let compilerArgs: any[];
            switch (compilerName) {
                case 'less':
                    updateFilesProperty();

                    compiler = deploy_compilers.Compiler.Less;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'pug':
                    updateFilesProperty();

                    compiler = deploy_compilers.Compiler.Pug;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'script':
                    updateFilesProperty();

                    compiler = deploy_compilers.Compiler.Script;
                    compilerArgs = [ ctx.config, compileOp.options ];
                    break;

                case 'typescript':
                    updateFilesProperty();

                    compiler = deploy_compilers.Compiler.TypeScript;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'uglifyjs':
                    updateFilesProperty();

                    compiler = deploy_compilers.Compiler.UglifyJS;
                    compilerArgs = [ compileOp.options ];
                    break;
            }

            if (deploy_helpers.isNullOrUndefined(compiler)) {
                // unknown compiler
                completed(new Error(i18.t('deploy.operations.unknownCompiler', compilerName)));
            }
            else {
                deploy_compilers.compile(compiler, compilerArgs).then((result) => {
                    let sourceFiles: string[] = [];
                    if (result.files) {
                        sourceFiles = result.files
                                            .filter(x => !deploy_helpers.isEmptyString(x))
                                            .map(x => Path.resolve(x));
                    }
                    sourceFiles = deploy_helpers.distinctArray(sourceFiles);

                    let compilerErrors: deploy_compilers.CompilerError[] = [];
                    if (result.errors) {
                        compilerErrors = result.errors
                                                .filter(x => x);
                    }

                    let err: Error;

                    if (compilerErrors.length > 0) {
                        ctx.outputChannel.appendLine('');    
                        result.errors.forEach(x => {
                            ctx.outputChannel.appendLine(`[${x.file}] ${x.error}`);
                        });

                        let failedFiles = compilerErrors.map(x => x.file)
                                                        .filter(x => !deploy_helpers.isEmptyString(x))
                                                        .map(x => Path.resolve(x));
                        failedFiles = deploy_helpers.distinctArray(failedFiles);

                        if (failedFiles.length > 0) {
                            let errMsg: string;
                            if (failedFiles.length >= sourceFiles.length) {
                                // all failed
                                errMsg = i18.t("deploy.operations.noFileCompiled",
                                               sourceFiles.length);
                            }
                            else {
                                // some failed
                                errMsg = i18.t("deploy.operations.someFilesNotCompiled",
                                               failedFiles.length, sourceFiles.length);
                            }

                            err = new Error(errMsg);
                        }
                    }

                    completed(err);
                }).catch((err) => {
                    completed(err);
                });
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Returns the (display) name of an operation.
 * 
 * @param {deploy_contracts.DeployOperation} operation The operation.
 * 
 * @return {string} The (display) name.
 */
export function getOperationName(operation: deploy_contracts.DeployOperation): string {
    let operationName: string;

    if (operation) {
        operationName = deploy_helpers.toStringSafe(operation.name).trim();
        if (!operationName) {
            operationName = deploy_helpers.normalizeString(operation.type);
            if (!operationName) {
                operationName = 'open';
            }
        }
    }

    return operationName;
}

/**
 * Waits.
 * 
 * @param {OperationContext<deploy_contracts.DeployOpenOperation>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function open(ctx: OperationContext<deploy_contracts.DeployOpenOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

        try {
            let openOperation = ctx.operation;
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

            ctx.outputChannel.append(i18.t('deploy.operations.open', operationTarget));

            deploy_helpers.open(operationTarget, {
                app: openArgs,
                wait: waitForExit,
            }).then(function() {
                ctx.outputChannel.appendLine(i18.t('ok'));

                completed();
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Executes SQL statements.
 * 
 * @param {OperationContext<deploy_contracts.DeploySqlOperation>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function sql(ctx: OperationContext<deploy_contracts.DeploySqlOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

        try {
            let sqlOp = ctx.operation;

            let type: deploy_sql.SqlConnectionType;
            let args: any[];

            let engineName = deploy_helpers.normalizeString(sqlOp.engine);
            switch (engineName) {
                case '':
                case 'mysql':
                    // MySQL
                    type = deploy_sql.SqlConnectionType.MySql;
                    args = [
                        sqlOp.options,
                    ];
                    break;

                case 'sql':
                    // Microsoft SQL
                    type = deploy_sql.SqlConnectionType.MSSql;
                    args = [
                        sqlOp.options,
                    ];
                    break;
            }

            if (deploy_helpers.isNullOrUndefined(type)) {
                // unknown SQL engine
                
                completed(new Error(i18.t('deploy.operations.unknownSqlEngine',
                                          engineName)));
            }
            else {
                let queries = deploy_helpers.asArray(sqlOp.queries)
                                            .filter(x => x);

                deploy_sql.createSqlConnection(type, args).then((conn) => {
                    let queriesCompleted = (err?: any) => {
                        conn.close().then(() => {
                            completed(err);
                        }).then((err2) => {
                            //TODO: log

                            completed(err);
                        });
                    };

                    let invokeNextQuery: () => void;
                    invokeNextQuery = () => {
                        if (queries.length < 1) {
                            queriesCompleted();
                            return;
                        }

                        let q = queries.shift();
                        conn.query(q).then(() => {
                            invokeNextQuery();
                        }).catch((err) => {
                            queriesCompleted(err);
                        });
                    };

                    invokeNextQuery();
                }).catch((err) => {
                    completed(err);
                });
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Executes Visual Studio Code commands.
 * 
 * @param {OperationContext<deploy_contracts.DeployVSCommandOperation>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function vscommand(ctx: OperationContext<deploy_contracts.DeployVSCommandOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

        try {
            let vsCmdOp = ctx.operation;

            let commandId = deploy_helpers.toStringSafe(vsCmdOp.command).trim();
            if (!deploy_helpers.isEmptyString(commandId)) {
                let args = vsCmdOp.arguments;
                if (!args) {
                    args = [];
                }

                if (deploy_helpers.toBooleanSafe(vsCmdOp.submitContext)) {
                    // submit DeployVSCommandOperationContext object
                    // as first argument

                    let cmdCtx: deploy_contracts.DeployVSCommandOperationContext = {
                        command: commandId,
                        globals: ctx.globals,
                        files: ctx.files,
                        kind: ctx.kind,
                        operation: vsCmdOp,
                        options: vsCmdOp.contextOptions,
                        require: (id) => {
                            return require(id);
                        }
                    };

                    args = [ cmdCtx ].concat(args);
                }

                args = [ commandId ].concat(args);

                vscode.commands.executeCommand.apply(null, args).then(() => {
                    completed();
                }, (err) => {
                    completed(err);
                });
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Waits.
 * 
 * @param {OperationContext<deploy_contracts.DeployWaitOperation>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function wait(ctx: OperationContext<deploy_contracts.DeployWaitOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

        try {
            let waitTime = parseFloat(deploy_helpers.toStringSafe(ctx.operation.time).trim());
            if (isNaN(waitTime)) {
                waitTime = 1000;
            }

            setTimeout(() => {
                completed();
            }, waitTime);
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Runs Microsoft's WebDeploy.
 * 
 * @param {OperationContext<deploy_contracts.DeployWebDeployOperation>} ctx The execution context.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function webdeploy(ctx: OperationContext<deploy_contracts.DeployWebDeployOperation>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

        try {
            let webDeployOp = ctx.operation;

            let msDeploy = 'msdeploy.exe';
            if (!deploy_helpers.isEmptyString(webDeployOp.exec)) {
                msDeploy = deploy_helpers.toStringSafe(webDeployOp.exec);
            }

            let args = [
                // -source
                `-source:${deploy_helpers.toStringSafe(webDeployOp.source)}`,
            ];

            // -<param>:<value>
            let paramsWithValues = [
                'dest', 'declareParam', 'setParam', 'setParamFile', 'declareParamFile',
                'removeParam', 'disableLink', 'enableLink', 'disableRule', 'enableRule',
                'replace', 'skip', 'disableSkipDirective', 'enableSkipDirective',
                'preSync', 'postSync',
                'retryAttempts', 'retryInterval',
                'appHostConfigDir', 'webServerDir', 'xpath',
            ];
            for (let i = 0; i < paramsWithValues.length; i++) {
                let p = paramsWithValues[i];
                
                if (!deploy_helpers.isEmptyString(webDeployOp[p])) {
                    args.push(`-${p}:${deploy_helpers.toStringSafe(webDeployOp[p])}`);
                }
            }

            // -<param>
            let boolParams = [
                'whatif', 'disableAppStore', 'allowUntrusted',
                'showSecure', 'xml', 'unicode', 'useCheckSum',
                'verbose',
            ];
            for (let i = 0; i < boolParams.length; i++) {
                let p = boolParams[i];
                
                if (deploy_helpers.toBooleanSafe(webDeployOp[p])) {
                    args.push(`-${p}`);
                }
            }

            let openOpts: deploy_helpers.OpenOptions = {
                app: [ msDeploy ].concat(args)
                                    .map(x => deploy_helpers.toStringSafe(x))
                                    .filter(x => x),
                cwd: webDeployOp.dir,
                wait: deploy_helpers.toBooleanSafe(webDeployOp.wait, true),
            };

            let target = `-verb:${deploy_helpers.toStringSafe(webDeployOp.verb)}`;

            deploy_helpers.open(target, openOpts).then(() => {
                ctx.outputChannel.appendLine(i18.t('ok'));

                completed();
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
