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

import * as ChildProcess from 'child_process';
import * as deploy_contracts from './contracts';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
const MIME = require('mime');
import * as Moment from 'moment';
import * as Net from 'net';
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Options for open function.
 */
export interface OpenOptions {
    /**
     * The app (or options) to open.
     */
    app?: string | string[];
    /**
     * The custom working directory.
     */
    cwd?: string;
    /**
     * Wait until exit or not.
     */
    wait?: boolean;
}

/**
 * Returns a value as array.
 * 
 * @param {T | T[]} val The value.
 * 
 * @return {T[]} The value as array.
 */
export function asArray<T>(val: T | T[]): T[] {
    if (!Array.isArray(val)) {
        return [ val ];
    }

    return val;
}

/**
 * Compares two values for a sort operation.
 * 
 * @param {T} x The left value.
 * @param {T} y The right value.
 * 
 * @return {number} The "sort value".
 */
export function compareValues<T>(x: T, y: T): number {
    if (x === y) {
        return 0;
    }

    if (x > y) {
        return 1;
    }

    if (x < y) {
        return -1;
    }

    return 0;
}

/**
 * Creates a quick pick for deploying a single file.
 * 
 * @param {string} file The file to deploy.
 * @param {deploy_contracts.DeployTarget} target The target to deploy to.
 * @param {number} index The zero based index.
 * 
 * @returns {deploy_contracts.DeployFileQuickPickItem} The new item.
 */
export function createFileQuickPick(file: string, target: deploy_contracts.DeployTarget, index: number): deploy_contracts.DeployFileQuickPickItem {
    let qp: any = createTargetQuickPick(target, index);
    qp['file'] = file;

    return qp;
}

/**
 * Creates a quick pick for a package.
 * 
 * @param {deploy_contracts.DeployPackage} pkg The package.
 * @param {number} index The zero based index.
 * 
 * @returns {deploy_contracts.DeployPackageQuickPickItem} The new item.
 */
export function createPackageQuickPick(pkg: deploy_contracts.DeployPackage, index: number): deploy_contracts.DeployPackageQuickPickItem {
    let name = toStringSafe(pkg.name).trim();
    if (!name) {
        name = i18.t('packages.defaultName', index + 1);
    }

    let description = toStringSafe(pkg.description).trim();

    return {
        description: description,
        label: name,
        package: pkg,
    };
}

/**
 * Creates a quick pick for a target.
 * 
 * @param {deploy_contracts.DeployTarget} target The target.
 * @param {number} index The zero based index.
 * 
 * @returns {deploy_contracts.DeployTargetQuickPickItem} The new item.
 */
export function createTargetQuickPick(target: deploy_contracts.DeployTarget, index: number): deploy_contracts.DeployTargetQuickPickItem {
    let name = toStringSafe(target.name).trim();
    if (!name) {
        name = i18.t('targets.defaultName', index + 1);
    }

    let description = toStringSafe(target.description).trim();

    return {
        description: description,
        label: name,
        target: target,
    };
}

/**
 * Tries to detect the MIME type of a file.
 * 
 * @param {string} file The Filename.
 * @param {any} defValue The default value.
 * 
 * @return {string} The MIME type.
 */
export function detectMimeByFilename(file: string, defValue: any = 'application/octet-stream'): string {
    let mime: string;
    try {
        mime = MIME.lookup(file);
    }
    catch (e) {
        log(`[ERROR] http.detectContentType(): ${toStringSafe(e)}`);
    }

    mime = toStringSafe(mime).toLowerCase().trim();
    if (!mime) {
        mime = defValue;
    }

    return mime;
}

/**
 * Removes duplicate entries from an array.
 * 
 * @param {T[]} arr The input array.
 * 
 * @return {T[]} The filtered array.
 */
export function distinctArray<T>(arr: T[]): T[] {
    if (!arr) {
        return arr;
    }

    return arr.filter((x, i) => {
        return arr.indexOf(x) == i;
    });
}

/**
 * Formats a string.
 * 
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 * 
 * @return {string} The formated string.
 */
export function format(formatStr: any, ...args: any[]): string {
    return formatArray(formatStr, args);
}

/**
 * Formats a string.
 * 
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 * 
 * @return {string} The formated string.
 */
export function formatArray(formatStr: any, args: any[]): string {
    if (!args) {
        args = [];
    }

    formatStr = toStringSafe(formatStr);

    // apply arguments in
    // placeholders
    return formatStr.replace(/{(\d+)(\:)?([^}]*)}/g, (match, index, formatSeparator, formatExpr) => {
        index = parseInt(toStringSafe(index).trim());
        
        let resultValue = args[index];

        if (':' === formatSeparator) {
            // collect "format providers"
            let formatProviders = toStringSafe(formatExpr).split(',')
                                                          .map(x => x.toLowerCase().trim())
                                                          .filter(x => x);

            // transform argument by
            // format providers
            formatProviders.forEach(fp => {
                switch (fp) {
                    case 'leading_space':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = ' ' + resultValue;
                        }
                        break;

                    case 'lower':
                        resultValue = toStringSafe(resultValue).toLowerCase();
                        break;

                    case 'trim':
                        resultValue = toStringSafe(resultValue).trim();
                        break;

                    case 'upper':
                        resultValue = toStringSafe(resultValue).toUpperCase();
                        break;

                    case 'surround':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = "'" + toStringSafe(resultValue) + "'";
                        }
                        break;
                }
            });
        }

        if ('undefined' === typeof resultValue) {
            return match;
        }

        return toStringSafe(resultValue);        
    });
}

/**
 * Returns the list of a package that should be deployed.
 * 
 * @param {deploy_contracts.DeployPackage} pkg The package.
 * 
 * @return {string[]} The list of files.
 */
export function getFilesOfPackage(pkg: deploy_contracts.DeployPackage): string[] {
    if (!pkg) {
        return [];
    }

    // files in include
    let allFilePatterns: string[] = [];
    if (pkg.files) {
        allFilePatterns = pkg.files
                             .map(x => toStringSafe(x))
                             .filter(x => x);

        allFilePatterns = distinctArray(allFilePatterns);
    }
    if (allFilePatterns.length < 1) {
        allFilePatterns.push('**');  // include all by default
    }

    // files to exclude
    let allExcludePatterns: string[] = [];
    if (pkg.exclude) {
        allExcludePatterns = pkg.exclude
                                .map(x => toStringSafe(x))
                                .filter(x => x);
    }
    allExcludePatterns = distinctArray(allExcludePatterns);

    // collect files to deploy
    let filesToDeploy: string[] = [];
    allFilePatterns.forEach(x => {
        let matchingFiles: string[] = Glob.sync(x, {
            absolute: true,
            cwd: vscode.workspace.rootPath,
            dot: true,
            ignore: allExcludePatterns,
            nodir: true,
            root: vscode.workspace.rootPath,
        });

        matchingFiles.forEach(y => filesToDeploy.push(y));
    });

    return distinctArray(filesToDeploy);
}

/**
 * Checks if the string representation of a value is empty
 * or contains whitespaces only.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is empty or not.
 */
export function isEmptyString(val: any): boolean {
    return '' == toStringSafe(val).trim();
}

/**
 * Checks if a value is (null) or (undefined).
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is (null)/(undefined) or not.
 */
export function isNullOrUndefined(val: any): boolean {
    return null === val ||
           'undefined' === typeof val;
}

/**
 * Loads a "data transformer" module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {deploy_contracts.DataTransformModule} The loaded module.
 */
export function loadDataTransformerModule(file: string, useCache: boolean = false): deploy_contracts.DataTransformModule {
    if (!Path.isAbsolute(file)) {
        file = Path.join(vscode.workspace.rootPath, file);
    }
    file = Path.resolve(file);

    let stats = FS.lstatSync(file);
    if (!stats.isFile()) {
        throw new Error(i18.t('isNo.file', file));
    }

    if (!useCache) {
        delete require.cache[file];  // remove from cache
    }
    
    return require(file);
}

/**
 * Logs a message.
 * 
 * @param {any} msg The message to log.
 */
export function log(msg: any) {
    let now = Moment();

    msg = toStringSafe(msg);
    console.log(`[vs-deploy :: ${now.format('YYYY-MM-DD HH:mm:ss')}] => ${msg}`);
}

/**
 * Opens a target.
 * 
 * @param {string} target The target to open.
 * @param {OpenOptions} [opts] The custom options to set.
 * 
 * @param {Promise<ChildProcess.ChildProcess>} The promise.
 */
export function open(target: string, opts?: OpenOptions): Promise<ChildProcess.ChildProcess> {
    let me = this;

    if (!opts) {
        opts = {};
    }

    opts.wait = toBooleanSafe(opts.wait, true);
    
    return new Promise((resolve, reject) => {
        let completed = (err?: any, cp?: ChildProcess.ChildProcess) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(cp);
            }
        };
        
        try {
            if (typeof target !== 'string') {
                throw new Error('Expected a `target`');
            }

            let cmd: string;
            let appArgs: string[] = [];
            let args: string[] = [];
            let cpOpts: ChildProcess.SpawnOptions = {
                cwd: opts.cwd || vscode.workspace.rootPath,
            };

            if (Array.isArray(opts.app)) {
                appArgs = opts.app.slice(1);
                opts.app = opts.app[0];
            }

            if (process.platform === 'darwin') {
                // Apple

                cmd = 'open';

                if (opts.wait) {
                    args.push('-W');
                }

                if (opts.app) {
                    args.push('-a', opts.app);
                }
            }
            else if (process.platform === 'win32') {
                // Microsoft

                cmd = 'cmd';
                args.push('/c', 'start', '""');
                target = target.replace(/&/g, '^&');

                if (opts.wait) {
                    args.push('/wait');
                }

                if (opts.app) {
                    args.push(opts.app);
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }
            }
            else {
                // Unix / Linux

                if (opts.app) {
                    cmd = opts.app;
                } else {
                    cmd = Path.join(__dirname, 'xdg-open');
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }

                if (!opts.wait) {
                    // xdg-open will block the process unless
                    // stdio is ignored even if it's unref'd
                    cpOpts.stdio = 'ignore';
                }
            }

            args.push(target);

            if (process.platform === 'darwin' && appArgs.length > 0) {
                args.push('--args');
                args = args.concat(appArgs);
            }

            let cp = ChildProcess.spawn(cmd, args, cpOpts);

            if (opts.wait) {
                cp.once('error', (err) => {
                    completed(err);
                });

                cp.once('close', function (code) {
                    if (code > 0) {
                        completed(new Error('Exited with code ' + code));
                        return;
                    }

                    completed(null, cp);
                });
            }
            else {
                cp.unref();

                completed(null, cp);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Parse a value to use as "target type" value.
 * 
 * @param {string} [str] The input value.
 * 
 * @returns {string} The output value.
 */
export function parseTargetType(str: string): string {
    if (!str) {
        str = '';
    }
    str = ('' + str).toLowerCase().trim();

    return str;
}

/**
 * Reads a number of bytes from a socket.
 * 
 * @param {Net.Socket} socket The socket.
 * @param {Number} numberOfBytes The amount of bytes to read.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export function readSocket(socket: Net.Socket, numberOfBytes: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            let buff: Buffer = socket.read(numberOfBytes);
            if (null === buff) {
                socket.once('readable', function() {
                    readSocket(socket, numberOfBytes).then((b) => {
                        resolve(b);
                    }, (err) => {
                        reject(err);
                    });
                });
            }
            else {
                resolve(buff);
            }
        }
        catch (e) {
            reject(e);
        }
    });
}

/**
 * Replaces all occurrences of a string.
 * 
 * @param {string} str The input string.
 * @param {string} searchValue The value to search for.
 * @param {string} replaceValue The value to replace 'searchValue' with.
 * 
 * @return {string} The output string.
 */
export function replaceAllStrings(str: string, searchValue: string, replaceValue: string) {
    str = toStringSafe(str);
    searchValue = toStringSafe(searchValue);
    replaceValue = toStringSafe(replaceValue);

    return str.split(searchValue)
              .join(replaceValue);
}

/**
 * Sorts a list of packages.
 * 
 * @param {deploy_contracts.DeployPackage[]} pkgs The input list.
 * 
 * @return {deploy_contracts.DeployPackage[]} The sorted list.
 */
export function sortPackages(pkgs: deploy_contracts.DeployPackage[]): deploy_contracts.DeployPackage[] {
    if (!pkgs) {
        pkgs = [];
    }

    return pkgs.filter(x => x)
               .map((x, i) => {
                        return {
                            index: i,
                            level0: x.sortOrder || 0,  // first sort by "sortOrder"
                            level1: toStringSafe(x.name).toLowerCase().trim(),  // then by "name"
                            value: x,
                        };
                    })
               .sort((x, y) => {
                   let comp0 = compareValues(x.level0, y.level0);
                   if (0 != comp0) {
                       return comp0;
                   }

                   let comp1 = compareValues(x.level1, y.level1);
                   if (0 != comp1) {
                       return comp1;
                   }

                   return compareValues(x.index, y.index);
               })
               .map(x => x.value);
}

/**
 * Sorts a list of targets.
 * 
 * @param {deploy_contracts.DeployTarget[]} pkgs The input list.
 * 
 * @return {deploy_contracts.DeployTarget[]} The sorted list.
 */
export function sortTargets(targets: deploy_contracts.DeployTarget[]): deploy_contracts.DeployTarget[] {
    if (!targets) {
        targets = [];
    }

    return targets.filter(x => x)
                  .map((x, i) => {
                           return {
                               index: i,
                               level0: x.sortOrder || 0,  // first sort by "sortOrder"
                               level1: toStringSafe(x.name).toLowerCase().trim(),  // then by "name"
                               value: x,
                           };
                       })
                  .sort((x, y) => {
                           let comp0 = compareValues(x.level0, y.level0);
                           if (0 != comp0) {
                               return comp0;
                           }

                           let comp1 = compareValues(x.level1, y.level1);
                           if (0 != comp1) {
                               return comp1;
                           }

                           return compareValues(x.index, y.index);
                       })
                  .map(x => x.value);
}

/**
 * Converts a value to a boolean.
 * 
 * @param {any} val The value to convert.
 * @param {any} defaultValue The value to return if 'val' is (null) or (undefined).
 * 
 * @return {boolean} The converted value.
 */
export function toBooleanSafe(val: any, defaultValue: any = false): boolean {
    if (isNullOrUndefined(val)) {
        return defaultValue;
    }

    return !!val;
}

/**
 * Keeps sure to return a "data transformer" that is NOT (null) or (undefined).
 * 
 * @param {deploy_contracts.DataTransformer} transformer The input value.
 * 
 * @return {deploy_contracts.DataTransformer} The output value.
 */
export function toDataTransformerSafe(transformer: deploy_contracts.DataTransformer): deploy_contracts.DataTransformer {
    if (!transformer) {
        // use "dummy" transformer

        transformer = (ctx) => {
            return new Promise<Buffer>((resolve, reject) => {
                resolve(ctx.data);
            });
        };
    }
    
    return transformer;
}

/**
 * Tries to convert a file path to a relative path.
 * 
 * @param {string} path The path to convert.
 * @param {string} [baseDir] The custom base / root directory to use.
 * 
 * @return {string | false} The relative path or (false) if not possible.
 */
export function toRelativePath(path: string, baseDir?: string): string | false {
    let result: string | false = false;

    if (isEmptyString(baseDir)) {
        baseDir = vscode.workspace.rootPath;
    }
    else {
        if (!Path.isAbsolute(baseDir)) {
            baseDir = Path.join(vscode.workspace.rootPath, baseDir);
        }

        baseDir = Path.resolve(baseDir);
    }
    
    try {
        let normalizedPath = replaceAllStrings(path, Path.sep, '/');

        let wsRootPath = replaceAllStrings(vscode.workspace.rootPath, Path.sep, '/');
        if (wsRootPath) {
            if (FS.existsSync(wsRootPath)) {
                if (FS.lstatSync(wsRootPath).isDirectory()) {
                    if (0 == normalizedPath.indexOf(wsRootPath)) {
                        result = normalizedPath.substr(wsRootPath.length);
                        result = replaceAllStrings(result, Path.sep, '/');
                    }
                }
            }
        }
    }
    catch (e) { 
        log('[ERROR] helpers.toRelativePath(): ' + e)
    }

    return result;
}

/**
 * Tries to convert a file path to a relative path
 * by using the mappings of a target.
 * 
 * @param {string} path The path to convert.
 * @param {deploy_contracts.DeployTarget} target The target.
 * @param {string} [baseDir] The custom base / root directory to use.
 * 
 * @return {string | false} The relative path or (false) if not possible.
 */
export function toRelativeTargetPath(path: string, target: deploy_contracts.DeployTarget, baseDir?: string): string | false {
    let relativePath = toRelativePath(path, baseDir);
    if (false === relativePath) {
        return relativePath;
    }

    let normalizeDirPath = (dir: string): string => {
        let normalizedDir = toStringSafe(dir).trim();
        normalizedDir = replaceAllStrings(normalizedDir, Path.sep, '/');

        if (normalizedDir.lastIndexOf('/') != (normalizedDir.length - 1)) {
            normalizedDir += '/';  // append ending "/" char
        }
        if (normalizedDir.indexOf('/') != 0) {
            normalizedDir = '/' + normalizedDir;  // append leading "/" char
        }

        return normalizedDir;
    };

    let allMappings = asArray(target.mappings).filter(x => x);
    for (let i = 0; i < allMappings.length; i++) {
        let mapping = allMappings[i];

        let source = normalizeDirPath(mapping.source);
        let target = normalizeDirPath(mapping.target);

        if (0 == relativePath.indexOf(source)) {
            // is matching => rebuild path

            relativePath = Path.join(target,
                                     relativePath.substr(source.length));  // remove the source prefix
            break;
        }
    }

    return replaceAllStrings(relativePath, Path.sep, '/');
}

/**
 * Converts a value to a string that is NOT (null) or (undefined).
 * 
 * @param {any} str The input value.
 * @param {any} defValue The default value.
 * 
 * @return {string} The output value.
 */
export function toStringSafe(str: any, defValue: any = ''): string {
    if (!str) {
        str = '';
    }
    str = '' + str;
    if (!str) {
        str = defValue;
    }

    return str;
}
