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

import * as deploy_contracts from './contracts';
import * as FS from 'fs';
const Glob = require('glob');
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';


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
        name = `(Package #${index + 1})`;
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
        name = `(Target #${index + 1})`;
    }

    let description = toStringSafe(target.description).trim();

    return {
        description: description,
        label: name,
        target: target,
    };
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

        matchingFiles.forEach(x => filesToDeploy.push(x));
    });

    return distinctArray(filesToDeploy);
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
 * Tries to convert a file path to a relative path.
 * 
 * @param {string} path The path to convert.
 * 
 * @return {string | false} The relative path or (false) if not possible.
 */
export function toRelativePath(path: string): string | false {
    let result: string | false = false;
    
    try {
        let normalizedPath = replaceAllStrings(path, Path.sep, '/');

        let wsRootPath = replaceAllStrings(vscode.workspace.rootPath, Path.sep, '/');
        if (wsRootPath) {
            if (FS.existsSync(wsRootPath)) {
                if (FS.lstatSync(wsRootPath).isDirectory()) {
                    if (0 == normalizedPath.indexOf(wsRootPath)) {
                        result = normalizedPath.substr(wsRootPath.length);
                        result = result.split(Path.sep).join('/');
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
