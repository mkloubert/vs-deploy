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
let Pug: any;
let TypeScript: any;
let UglifyJS: any;
import * as vscode from 'vscode';


// try load Less module
try {
    LESS = require('less');
}
catch (e) {
    deploy_helpers.log(`Could not load LESS module: ${deploy_helpers.toStringSafe(e)}`);
}

// try load Pug module
try {
    Pug = require('pug');
}
catch (e) {
    deploy_helpers.log(`Could not load Pug module: ${deploy_helpers.toStringSafe(e)}`);
}

// try load TypeScript module
try {
    TypeScript = require('typescript');
}
catch (e) {
    deploy_helpers.log(`Could not load TypeScript module: ${deploy_helpers.toStringSafe(e)}`);
}

// try load UglifyJS module
try {
    UglifyJS = require('uglify-js');
}
catch (e) {
    deploy_helpers.log(`Could not load UglifyJS module: ${deploy_helpers.toStringSafe(e)}`);
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
    /**
     * UglifyJS
     */
    UglifyJS = 3,
    /**
     * Pug
     */
    Pug = 4,
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
 * A Pug compiler error entry.
 */
export interface PugCompilerError extends CompilerError {
}

/**
 * Pug compiler options.
 */
export interface PugCompilerOptions extends TextCompilerOptions {
    /**
     * When (false) no debug instrumentation is compiled.
     */
    compileDebug?: boolean;
    /**
     * The extension to use for the output files.
     */
    extension?: string;
    /**
     * Add pretty-indentation whitespace to output.
     */
    pretty?: boolean;
}

/**
 * A Pug compiler result.
 */
export interface PugCompilerResult extends CompilerResult {
}

/**
 * A compiler.
 * 
 * @param {ScriptCompilerArguments} args Arguments for the compilation.
 * 
 * @returns {ScriptCompilerResult|Promise<ScriptCompilerResult>} The result.
 */
export type ScriptCompiler = (args: ScriptCompilerArguments) => void | ScriptCompilerResult | Promise<ScriptCompilerResult>;

/**
 * Arguments for the compilation.
 */
export interface ScriptCompilerArguments extends deploy_contracts.ScriptArguments, deploy_contracts.FileDeployer {
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
 * A UglifyJS compiler error entry.
 */
export interface UglifyJSCompilerError extends CompilerError {
}

/**
 * UglifyJS compiler options.
 */
export interface UglifyJSCompilerOptions extends TextCompilerOptions {
    /**
     * Delete the source file(s) on success or not.
     */
    deleteSources?: boolean;
    /**
     * The extension to use for the output files.
     */
    extension?: string;
}

/**
 * A UglifyJS compiler result.
 */
export interface UglifyJSCompilerResult extends CompilerResult {
    /** @inheritdoc */
    errors: UglifyJSCompilerError[];
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

            case Compiler.Pug:
                // Pug
                func = compliePug;
                break;

            case Compiler.Script:
                // script based compiler
                func = compileScript;
                break;

            case Compiler.TypeScript:
                // TypeScript
                func = compileTypeScript;
                break;

            case Compiler.UglifyJS:
                // UglifyJS
                func = compileUglifyJS;
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

    let enc = deploy_helpers.normalizeString(opts.encoding);
    if (!enc) {
        enc = 'utf8';
    }

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
 * Compiles Pug files.
 * 
 * @param {PugCompilerOptions} [opts] The options.
 * 
 * @returns Promise<PugCompilerResult> The promise.
 */
export function compliePug(opts?: PugCompilerOptions): Promise<PugCompilerResult> {
    if (!opts) {
        opts = {};
    }

    let enc = deploy_helpers.normalizeString(opts.encoding);
    if (!enc) {
        enc = 'utf8';
    }

    let outExt = deploy_helpers.toStringSafe(opts.extension);
    if (deploy_helpers.isEmptyString(opts.extension)) {
        outExt = 'html';
    }

    return new Promise<PugCompilerResult>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<PugCompilerResult>(resolve, reject);

        if (!Pug) {
            completed(new Error('No Pug compiler found!'));
            return;
        }

        try {
            collectCompilerFiles({
                files: "/**/*.pug",
            }, opts).then((filesToCompile) => {
                try {
                    let result: PugCompilerResult = {
                        errors: [],
                        files: filesToCompile.map(x => x),
                    };

                    let pugOpts = deploy_helpers.cloneObject(opts);
                    delete pugOpts['files'];
                    delete pugOpts['exclude'];
                    delete pugOpts['encoding'];
                    delete pugOpts['extension'];

                    let nextFile: () => void;

                    let addError = (err: any) => {
                        result.errors.push(err);

                        nextFile();
                    };

                    nextFile = () => {
                        if (filesToCompile.length < 1) {
                            completed(null, result);
                            return;
                        }

                        let f = filesToCompile.shift();

                        let dir = Path.dirname(f);
                        let ext = Path.extname(f);
                        let fn = Path.basename(f, ext);

                        let outFile = Path.join(dir, fn + '.' + outExt);

                        FS.readFile(f, (err, data) => {
                            if (err) {
                                addError(err);
                            }
                            else {
                                try {
                                    pugOpts['filename'] = f;

                                    let pugSrc = data.toString(enc);
                                    let html = Pug.render(pugSrc, pugOpts);

                                    FS.writeFile(outFile, new Buffer(html, enc), (err) => {
                                        if (err) {
                                            addError(err);
                                        }
                                        else {
                                            nextFile();
                                        }
                                    });
                                }
                                catch (e) {
                                    addError(e);
                                }
                            }
                        });
                    };

                    nextFile();
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
                        let sym = Symbol("deploy.compilers.compileScript");

                        let args: ScriptCompilerArguments = {
                            deployFiles: (files, targets) => {
                                return deploy_helpers.deployFiles(files, targets, sym);
                            },
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

                        Promise.resolve(<any>compilerModule.compile(args)).then((result: ScriptCompilerResult) => {
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

/**
 * Compiles JavaScript files with UglifyJS.
 * 
 * @param {UglifyJSCompilerOptions} [opts] The options.
 * 
 * @returns Promise<UglifyJSCompilerResult> The promise.
 */
export function compileUglifyJS(opts?: UglifyJSCompilerOptions): Promise<UglifyJSCompilerResult> {
    if (!opts) {
        opts = {};
    }

    let enc = deploy_helpers.normalizeString(opts.encoding);
    if (!enc) {
        enc = 'utf8';
    }

    let outExt = deploy_helpers.toStringSafe(opts.extension);
    if (deploy_helpers.isEmptyString(opts.extension)) {
        outExt = 'min.js';
    }

    let deleteOnSuccess = deploy_helpers.toBooleanSafe(opts.deleteSources);

    return new Promise<UglifyJSCompilerResult>((resolve, reject) => {
        let completed = deploy_helpers.createSimplePromiseCompletedAction<UglifyJSCompilerResult>(resolve, reject);

        if (!UglifyJS) {
            completed(new Error('No UglifyJS compiler found!'));
            return;
        }

        try {
            collectCompilerFiles({
                files: "/**/*.js",
            }, opts).then((filesToCompile) => {
                try {
                    let result: UglifyJSCompilerResult = {
                        errors: [],
                        files: filesToCompile.map(x => x),  // create copy
                    };

                    let uglifyOpts = deploy_helpers.cloneObject(opts);
                    delete uglifyOpts['deleteSources'];
                    delete uglifyOpts['files'];
                    delete uglifyOpts['exclude'];
                    delete uglifyOpts['encoding'];
                    delete uglifyOpts['extension'];
                    
                    let nextFile: () => void;

                    let addError = (err: any) => {
                        result.errors.push(err);

                        nextFile();
                    };

                    nextFile = () => {
                        if (filesToCompile.length < 1) {
                            completed(null, result);
                            return;
                        }

                        let f = filesToCompile.shift();

                        try {
                            let outDir = Path.dirname(f);
                            let ext = Path.extname(f);
                            let fileName = Path.basename(f, ext);

                            let outputFile = Path.join(outDir,
                                                       fileName + '.' + outExt);

                            let ur = UglifyJS.minify([ f ], uglifyOpts);
                            
                            let ugliCode = deploy_helpers.toStringSafe(ur.code);

                            let deleteSourceFile = () => {
                                if (deleteOnSuccess) {
                                    FS.unlink(f, (err) => {
                                        if (err) {
                                            addError(err);
                                        }
                                        else {
                                            nextFile();
                                        }
                                    });
                                }
                                else {
                                    nextFile();
                                }
                            };

                            FS.writeFile(outputFile, new Buffer(ugliCode, enc), (err) => {
                                if (err) {
                                    addError(err);
                                }
                                else {
                                    deleteSourceFile();
                                }
                            });
                        }
                        catch (e) {
                            addError(e);
                        }
                    };

                    nextFile();
                }
                catch (e) {
                    completed(e);
                }
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
