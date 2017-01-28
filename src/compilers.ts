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

import * as deploy_contracts from './contracts';
import * as deploy_globals from './globals';
import * as deploy_helpers from './helpers';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
let LESS: any;
import * as Path from 'path';
let TypeScript: any;
import * as vscode from 'vscode';

// try load Less module
try {
    LESS = require('less');
}
catch (e) {
    deploy_helpers.log(`Could not load LESS module: ${deploy_helpers.toStringSafe(e)}`);
}

// try load TypeScript module
try {
    TypeScript = require('typescript');
}
catch (e) {
    deploy_helpers.log(`Could not load TypeScript module: ${deploy_helpers.toStringSafe(e)}`);
}

/**
 * List of known compilers.
 */
export enum Compiler {
    /**
     * Less
     */
    Less = 0,
    /**
     * TypeScript
     */
    TypeScript = 1,
    /**
     * Script based compiler
     */
    Script = 2,
}

/**
 * A compiler error entry.
 */
export interface CompilerError {
    /**
     * The error.
     */
    error: any;
    /**
     * The file.
     */
    file: string;
}

/**
 * Compiler options.
 */
export interface CompilerOptions {
    /**
     * Files to exclude.
     */
    exclude?: string | string[];
    /**
     * Files to compile.
     */
    files?: string | string[];
}

/**
 * A compiler result.
 */
export interface CompilerResult {
    /**
     * The list of errors.
     */
    errors: CompilerError[];
    /**
     * The files for the compilation.
     */
    files: string[];
}

/**
 * A LESS compiler error entry.
 */
export interface LessCompilerError extends CompilerError {
}

/**
 * LESS compiler options.
 */
export interface LessCompilerOptions extends TextCompilerOptions {
    /**
     * Compress output or not.
     */
    compress?: boolean;
    /**
     * The custom file extension for the output files to use.
     */
    extension?: string;
    /**
     * Search paths for @import directives.
     */
    paths?: string | string[];
}

/**
 * A LESS compiler result.
 */
export interface LessCompilerResult extends CompilerResult {
    /** @inheritdoc */
    errors: LessCompilerError[];
}

/**
 * A compiler.
 * 
 * @param {ScriptCompilerArguments} args Arguments for the compilation.
 * 
 * @returns {Promise<ScriptCompilerResult>} The result.
 */
export type ScriptCompiler = (args: ScriptCompilerArguments) => Promise<ScriptCompilerResult>;

/**
 * Arguments for the compilation.
 */
export interface ScriptCompilerArguments extends deploy_contracts.ScriptArguments {
    /**
     * The list of files to compile.
     */
    files: string[];
    /**
     * The compiler options.
     */
    options: ScriptCompilerOptions;
    /**
     * A preconfigured result object.
     */
    result: ScriptCompilerResult;
}

/**
 * A script compiler error entry.
 */
export interface ScriptCompilerError extends CompilerError {
}

/**
 * A module to compile files.
 */
export interface ScriptCompilerModule {
    /**
     * Compiles files.
     */
    compile: ScriptCompiler;
}

/**
 * Script compiler options.
 */
export interface ScriptCompilerOptions extends TextCompilerOptions {
    /**
     * Additional data for the compilation.
     */
    data?: any;
    /**
     * Path to the script.
     */
    script?: string;
}

/**
 * A script compiler result.
 */
export interface ScriptCompilerResult extends CompilerResult {
    /** @inheritdoc */
    errors: ScriptCompilerError[];
}

/**
 * Options for text file based compilers.
 */
export interface TextCompilerOptions extends CompilerOptions {
    /**
     * The encoding to use.
     */
    encoding?: string;
}

/**
 * A TypeScript compiler error entry.
 */
export interface TypeScriptCompilerError extends CompilerError {
    /**
     * The underlying Diagnostic object from the compiler result.
     */
    diagnostic: any;
}

/**
 * TypeScript compiler options.
 */
export interface TypeScriptCompilerOptions extends TextCompilerOptions {
}

/**
 * A TypeScript compiler result.
 */
export interface TypeScriptCompilerResult extends CompilerResult {
    /** @inheritdoc */
    errors: TypeScriptCompilerError[];
}


/**
 * Collects files to compile.
 * 
 * @param {CompilerOptions} defaultOpts The default options.
 * @param {CompilerOptions} [opts] The options.
 * 
 * @returns Promise<string[]> The promise.
 */
export function collectCompilerFiles(defaultOpts: CompilerOptions, opts?: CompilerOptions): Promise<string[]> {
    if (!defaultOpts) {
        defaultOpts = {
            files: '**',
        };
    }
    
    if (!opts) {
        opts = {};
    }

    let cleanupStringList = (list: string | string[]): string[] => {
        list = deploy_helpers.asArray(list)
                             .map(x => deploy_helpers.toStringSafe(x))
                             .filter(x => !deploy_helpers.isEmptyString(x));

        return deploy_helpers.distinctArray(list);
    };

    let filters = cleanupStringList(opts.files);
    if (filters.length < 1) {
        // use defaults
        filters = cleanupStringList(defaultOpts.files);
    }

    let filesToExclude = cleanupStringList(opts.exclude);
    if (filesToExclude.length < 1) {
        // use defaults
        filesToExclude = cleanupStringList(defaultOpts.exclude);
    }

    return new Promise<string[]>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<string[]>(resolve, reject);

        try {
            let filesToCompile: string[] = [];

            let nextFilter: () => void;
            nextFilter = () => {
                if (filters.length < 1) {
                    filesToCompile = filesToCompile.filter(x => !deploy_helpers.isEmptyString(x))
                                                   .map(x => Path.resolve(x));
                    filesToCompile = deploy_helpers.asArray(filesToCompile);

                    completed(null, filesToCompile);
                    return;
                }

                let f = filters.shift();

                try {
                    Glob(f, {
                        absolute: true,
                        cwd: vscode.workspace.rootPath,
                        dot: true,
                        ignore: filesToExclude,
                        nodir: true,
                        root: vscode.workspace.rootPath,
                    }, (err, files) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            filesToCompile = filesToCompile.concat(files);
                            nextFilter();
                        }
                    });
                }
                catch (e) {
                    completed(e);
                }
            };

            nextFilter();
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Compiles (files).
 * 
 * @param {Compiler} compiler The compiler to use.
 * @param {any[]} [args] One or more arguments for the compilation.
 * 
 * @returns {Promise<CompilerResult>} The promise.
 */
export function compile(compiler: Compiler, args?: any[]): Promise<CompilerResult> {
    let me = this;

    if (!args) {
        args = [];
    }

    return new Promise<CompilerResult>((resolve, reject) => {
        let func: Function;

        switch (compiler) {
            case Compiler.Less:
                // LESS
                func = compileLess;
                break;

            case Compiler.Script:
                // script based compiler
                func = compileScript;
                break;

            case Compiler.TypeScript:
                // TypeScript
                func = compileTypeScript;
                break;
        }

        if (func) {
            try {
                func.apply(me, args).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
            catch (e) {
                reject(e);
            }
        }
        else {
            reject(new Error(`Compiler '${compiler}' is not supported!`));
        }
    });
}

/**
 * Compiles LESS files.
 * 
 * @param {LessCompilerOptions} [opts] The options.
 * 
 * @returns Promise<LessCompilerResult> The promise.
 */
export function compileLess(opts?: LessCompilerOptions): Promise<LessCompilerResult> {
    if (!opts) {
        opts = {};
    }

    let compressOutput = deploy_helpers.toBooleanSafe(opts.compress);

    let enc = deploy_helpers.toStringSafe(opts.encoding)
                            .toLowerCase().trim();

    let searchPaths = deploy_helpers.asArray(opts.paths)
                            .map(x => deploy_helpers.toStringSafe(x))
                            .filter(x => !deploy_helpers.isEmptyString(x));
    searchPaths = deploy_helpers.distinctArray(searchPaths);

    let outExt = deploy_helpers.toStringSafe(opts.extension);
    if (deploy_helpers.isEmptyString(outExt)) {
        outExt = 'css';
    }

    return new Promise<LessCompilerResult>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<LessCompilerResult>(resolve, reject);
        
        if (!LESS) {
            completed(new Error('No LESS compiler found!'));
            return;
        }

        try {
            collectCompilerFiles({
                files: "/**/*.less",
            }, opts).then((filesToCompile) => {
                let result: LessCompilerResult = {
                    errors: [],
                    files: filesToCompile.map(x => x),  // create copy
                };

                let compileNext: () => void;

                let compileCompleted = (file: string, err?: any) => {
                    if (err) {
                        result.errors.push({
                            error: err,
                            file: file,
                        });
                    }

                    compileNext();
                };

                compileNext = () => {
                    if (filesToCompile.length < 1) {
                        completed(null, result);
                        return;
                    }

                    let f = filesToCompile.shift();

                    FS.readFile(f, (err, data) => {
                        if (err) {
                            compileCompleted(f, err);
                            return;
                        }

                        try {
                            let lessCode = data.toString(enc);

                            let dir = Path.dirname(f);
                            let fileExt = Path.extname(f);
                            let fileName = Path.basename(f, fileExt);

                            let outputFile = Path.join(dir, fileName + '.' + outExt);

                            let compilerPaths: string[];
                            if (searchPaths.length > 0) {
                                compilerPaths = searchPaths.map(x => {
                                    if (!Path.isAbsolute(x)) {
                                        x = Path.join(dir, x);
                                    }

                                    return x;
                                });
                            }
                            
                            if (compilerPaths) {
                                compilerPaths = compilerPaths.filter(x => !deploy_helpers.isEmptyString(x))
                                                             .map(x => Path.resolve(x));
                                compilerPaths = deploy_helpers.distinctArray(compilerPaths);
                            }

                            // compile...
                            LESS.render(lessCode, {
                                compress: compressOutput,
                                paths: compilerPaths,
                            }, (err, output) => {
                                try {
                                    if (err) {
                                        compileCompleted(f, err);  // compile error
                                    }
                                    else {
                                        let outData = new Buffer(deploy_helpers.toStringSafe(output.css), enc);

                                        let writeToFile = () => {
                                            FS.writeFile(outputFile, outData, (err) => {
                                                outData = null;
                                                compileCompleted(f, err);
                                            });
                                        };

                                        // check if output file exists
                                        FS.exists(outputFile, (fileExists) => {
                                            if (fileExists) {
                                                // yes, no check if really a file
                                                FS.lstat(outputFile, (err, stats) => {
                                                    if (err) {
                                                        compileCompleted(f, err);
                                                    }
                                                    else {
                                                        if (stats.isFile()) {
                                                            // now delete existing file...
                                                            FS.unlink(outputFile, (err) => {
                                                                if (err) {
                                                                    compileCompleted(f, err);
                                                                }
                                                                else {
                                                                    writeToFile();  // write to file
                                                                }
                                                            });
                                                        }
                                                        else {
                                                            // no
                                                            compileCompleted(f, new Error(i18.t('isNo.file', outputFile)));
                                                        }
                                                    }
                                                });
                                            }
                                            else {
                                                writeToFile();  // no, write to file
                                            }
                                        });
                                    }
                                }
                                catch (e) {
                                    compileCompleted(f, e);
                                }
                            });
                        }
                        catch (e) {
                            compileCompleted(e);  // read file error
                        }
                    });
                };

                compileNext();  // start compiling
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
 * Compiles files via a script.
 * 
 * @param {ScriptCompilerOptions} [opts] The options.
 * 
 * @returns Promise<TypeScriptCompilerResult> The promise.
 */
export function compileScript(cfg: deploy_contracts.DeployConfiguration,
                              opts?: ScriptCompilerOptions): Promise<ScriptCompilerResult> {
    if (!opts) {
        opts = {
            script: './compile.js',
        };
    }

    return new Promise<ScriptCompilerResult>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<ScriptCompilerResult>(resolve, reject);

        try {
            let compilerModule = deploy_helpers.loadModule<ScriptCompilerModule>(opts.script);
            if (compilerModule) {
                if (compilerModule.compile) {
                    collectCompilerFiles({
                        files: '**',    
                    }, opts).then((filesToCompile) => {
                        let args: ScriptCompilerArguments = {
                            emitGlobal: function() {
                                return deploy_globals.EVENTS
                                                     .emit
                                                     .apply(deploy_globals.EVENTS, arguments);
                            },
                            files: filesToCompile,
                            globals: deploy_helpers.cloneObject(cfg.globals),
                            options: opts,
                            require: function(id) {
                                return require(id);
                            },
                            result: {
                                errors: [],
                                files: filesToCompile.map(x => x),
                            },
                        };

                        compilerModule.compile(args).then((result) => {
                            completed(null, result || args.result);
                        }).catch((err) => {
                            completed(err);
                        });
                    }).catch((err) => {
                        completed(err);
                    });
                }
                else {
                    completed(new Error('No compile() function found!'));
                }
            }
            else {
                completed(new Error('No compiler module found!'));
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Compiles TypeScript files.
 * 
 * @param {TypeScriptCompilerOptions} [opts] The options.
 * 
 * @returns Promise<TypeScriptCompilerResult> The promise.
 */
export function compileTypeScript(opts?: TypeScriptCompilerOptions): Promise<TypeScriptCompilerResult> {
    if (!opts) {
        opts = {};
    }

    return new Promise<TypeScriptCompilerResult>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<TypeScriptCompilerResult>(resolve, reject);
        
        if (!TypeScript) {
            completed(new Error('No TypeScript compiler found!'));
            return;
        }

        try {
            collectCompilerFiles({
                files: "/**/*.ts",
            }, opts).then((filesToCompile) => {
                try {
                    // create compiler
                    let program = TypeScript.createProgram(filesToCompile, opts);

                    // execute
                    let result = program.emit();
                    result.errors = [];
                    result.files = filesToCompile;

                    // collect errors
                    let allDiagnostics = TypeScript.getPreEmitDiagnostics(program).concat(result.diagnostics);
                    allDiagnostics.forEach(x => {
                        if (x.category != TypeScript.DiagnosticCategory.Error) {
                            return;
                        }

                        result.errors
                              .push({
                                  diagnostic: x,
                                  error: new Error(`[TS${x.code}] Offset ${x.start} :: ${x.messageText}`),
                                  file: x.file.fileName,
                              });
                    });

                    completed(null, result);
                }
                catch (e) {
                    completed(e);
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
};
