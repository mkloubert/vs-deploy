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
    config: deploy_contracts.DeployConfiguration;
    /**
     * Can store the error that is raised while the execution. 
     */
    error?: any;
    /**
     * Operation has been handled or not.
     */
    handled?: boolean;
    /**
     * Kind of operation.
     */
    kind: deploy_contracts.DeployOperationKind;
    /**
     * The operation settings.
     */
    operation: T;
    /**
     * The output channel.
     */
    outputChannel: vscode.OutputChannel;
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
            let compileOp = ctx.operation;

            let compilerName = deploy_helpers.normalizeString(compileOp.compiler);

            let compiler: deploy_compilers.Compiler;
            let compilerArgs: any[];
            switch (compilerName) {
                case 'less':
                    compiler = deploy_compilers.Compiler.Less;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'pug':
                    compiler = deploy_compilers.Compiler.Pug;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'script':
                    compiler = deploy_compilers.Compiler.Script;
                    compilerArgs = [ ctx.config, compileOp.options ];
                    break;

                case 'typescript':
                    compiler = deploy_compilers.Compiler.TypeScript;
                    compilerArgs = [ compileOp.options ];
                    break;

                case 'uglifyjs':
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
