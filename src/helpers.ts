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
const CompareVersion = require('compare-versions');
import * as deploy_contracts from './contracts';
import * as deploy_globals from './globals';
import * as deploy_values from './values';
import * as FileType from 'file-type';
import * as FS from 'fs';
const Glob = require('glob');
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as i18 from './i18';
const IsBinaryFile = require("isbinaryfile");
const MIME = require('mime');
import * as Minimatch from 'minimatch';
import * as Moment from 'moment';
import * as Net from 'net';
import * as Path from 'path';
import * as URL from 'url';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * A download result.
 */
export interface DownloadResult {
    /**
     * The downloaded data.
     */
    data: Buffer;
    /**
     * The MIME type (if available).
     */
    mime?: string;
    /**
     * The name (of the file if available).
     */
    name?: string;
}

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
 * Describes a simple 'completed' action.
 * 
 * @param {any} [err] The occurred error.
 * @param {TResult} [result] The result.
 */
export type SimpleCompletedAction<TResult> = (err?: any, result?: TResult) => void;


let nextHtmlDocId = -1;
const REGEX_HTTP_URL = new RegExp("^([\\s]*)(https?:\\/\\/)", 'i');

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
 * Clones an object / value deep.
 * 
 * @param {T} val The value / object to clone.
 * 
 * @return {T} The cloned value / object.
 */
export function cloneObject<T>(val: T): T {
    if (!val) {
        return val;
    }

    return JSON.parse(JSON.stringify(val));
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
 * Compares two versions.
 * 
 * @param {any} current The current value.
 * @param {any} other The other value.
 *  
 * @returns {number} The sort value. 
 */
export function compareVersions(current: any, other: any): number {
    if (!isNullOrUndefined(current)) {
        current = toStringSafe(current).trim();
    }

    if (!isNullOrUndefined(other)) {
        other = toStringSafe(other).trim();
    }

    return CompareVersion(current, other);
}

/**
 * Creates a quick pick for deploying a single file.
 * 
 * @param {string} file The file to deploy.
 * @param {deploy_contracts.DeployTarget} target The target to deploy to.
 * @param {number} index The zero based index.
 * @param {deploy_values.ValueBase[]} [values] Values / placeholders to use.
 * 
 * @returns {deploy_contracts.DeployFileQuickPickItem} The new item.
 */
export function createFileQuickPick(file: string, target: deploy_contracts.DeployTarget, index: number,
                                    values?: deploy_values.ValueBase[]): deploy_contracts.DeployFileQuickPickItem {
    let qp: any = createTargetQuickPick(target, index, values);
    qp['file'] = file;

    return qp;
}

/**
 * Creates a quick pick for a package.
 * 
 * @param {deploy_contracts.DeployPackage} pkg The package.
 * @param {number} index The zero based index.
 * @param {deploy_values.ValueBase[]} [values] Values / placeholders to use.
 * 
 * @returns {deploy_contracts.DeployPackageQuickPickItem} The new item.
 */
export function createPackageQuickPick(pkg: deploy_contracts.DeployPackage, index: number,
                                       values?: deploy_values.ValueBase[]): deploy_contracts.DeployPackageQuickPickItem {
    let name = toStringSafe(pkg.name).trim();
    if (!name) {
        name = i18.t('packages.defaultName', index + 1);
    }

    let description = toStringSafe(pkg.description).trim();

    let item: deploy_contracts.DeployPackageQuickPickItem = {
        description: description,
        label: name,
        package: pkg,
    };

    // item.detail
    Object.defineProperty(item, 'detail', {
        enumerable: true,

        get: () => {
            return deploy_values.replaceWithValues(values, pkg.detail);
        }
    });

    return item;
}

/**
 * Creates a simple 'completed' callback for a promise.
 * 
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 * 
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
export function createSimplePromiseCompletedAction<TResult>(resolve: Function, reject?: Function): SimpleCompletedAction<TResult> {
    return (err?, result?) => {
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}

/**
 * Creates a quick pick for a target.
 * 
 * @param {deploy_contracts.DeployTarget} target The target.
 * @param {number} index The zero based index.
 * @param {deploy_values.ValueBase[]} [values] Values / placeholders to use.
 * 
 * @returns {deploy_contracts.DeployTargetQuickPickItem} The new item.
 */
export function createTargetQuickPick(target: deploy_contracts.DeployTarget, index: number,
                                      values?: deploy_values.ValueBase[]): deploy_contracts.DeployTargetQuickPickItem {
    let name = toStringSafe(target.name).trim();
    if (!name) {
        name = i18.t('targets.defaultName', index + 1);
    }

    let description = toStringSafe(target.description).trim();

    let item: deploy_contracts.DeployTargetQuickPickItem = {
        description: description,
        label: name,
        target: target,
    };

    // item.detail
    Object.defineProperty(item, 'detail', {
        enumerable: true,

        get: () => {
            return deploy_values.replaceWithValues(values, target.detail);
        }
    });

    return item;
}

/**
 * Deploys files.
 * 
 * @param {string | string[]} files The files to deploy.
 * @param {deploy_contracts.DeployTargetList} targets The targets to deploy to.
 * @param {symbol} [sym] The custom symbol to use for the identification.
 * 
 * @return {Promise<deploy_contracts.DeployFilesEventArguments>} The promise.
 */
export function deployFiles(files: string | string[], targets: deploy_contracts.DeployTargetList,
                            sym?: symbol): Promise<deploy_contracts.DeployFilesEventArguments> {
    return new Promise<deploy_contracts.DeployFilesEventArguments>((resolve, reject) => {
        let completed = (err?: any, args?: deploy_contracts.DeployFilesEventArguments) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(args);
            }
        };

        try {
            let alreadyInvoked = false;

            let listener: Function;
            listener = function(args: deploy_contracts.DeployFilesEventArguments) {
                if (alreadyInvoked) {
                    return;
                }
                
                if (!isNullOrUndefined(sym) && (sym !== args.symbol)) {
                    return;
                }

                alreadyInvoked = true;
                try {
                    deploy_globals.EVENTS.removeListener(deploy_contracts.EVENT_DEPLOYFILES_COMPLETE, listener);
                }
                catch (e) {
                    log(i18.t('errors.withCategory',
                              'helpers.deployFiles()', e));
                }

                completed();
            };

            deploy_globals.EVENTS.on(deploy_contracts.EVENT_DEPLOYFILES_COMPLETE, listener);

            deploy_globals.EVENTS.emit(deploy_contracts.EVENT_DEPLOYFILES,
                                       files, targets, sym);
        }
        catch (e) {
            completed(e);
        }
    });
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
        log(i18.t('errors.withCategory',
                  'helpers.detectMimeByFilename()', e));
    }

    mime = normalizeString(mime);
    if ('' === mime) {
        mime = defValue;
    }

    return mime;
}

/**
 * Checks if a file path does match by any pattern.
 * 
 * @param {string} file The path to check. 
 * @param {deploy_contracts.FileFilter} filter The filter to use.
 * 
 * @return {boolean} Does match or not. 
 */
export function doesFileMatchByFilter(file: string, filter: deploy_contracts.FileFilter): boolean {
    if (!filter) {
        return null;
    }

    file = toStringSafe(file);
    
    // files in include
    let allFilePatterns: string[] = [];
    if (filter.files) {
        allFilePatterns = asArray(filter.files).map(x => toStringSafe(x))
                                               .filter(x => '' !== x);

        allFilePatterns = distinctArray(allFilePatterns);
    }
    if (allFilePatterns.length < 1) {
        allFilePatterns.push('**');  // include all by default
    }

    // files to exclude
    let allExcludePatterns: string[] = [];
    if (filter.exclude) {
        allExcludePatterns = asArray(filter.exclude).map(x => toStringSafe(x))
                                                    .filter(x => '' !== x);
    }
    allExcludePatterns = distinctArray(allExcludePatterns);

    let doesPatternMatch = (pattern: string) => {
        return Minimatch(file, pattern, {
            dot: true,
            nonegate: true,
            nocomment: true,
        });
    };

    // first check if ignored
    while (allExcludePatterns.length > 0) {
        let ep = allExcludePatterns.shift();

        if (doesPatternMatch(ep)) {
            return false;  // ignored / excluded
        }
    }

    // now check if matches
    while (allFilePatterns.length > 0) {
        let fp = allFilePatterns.shift();

        if (doesPatternMatch(fp)) {
            return true;  // included / does match
        }
    }

    return false;
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
 * Filters "conditional" items.
 * 
 * @param {T|T[]} items The items to filter.
 * @param {deploy_values.ValueBase|deploy_values.ValueBase[]} [values] The values to use.
 * 
 * @return {T[]} The filtered items.
 */
export function filterConditionalItems<T extends deploy_contracts.ConditionalItem>(items: T | T[],
                                                                                   values?: deploy_values.ValueBase | deploy_values.ValueBase[]): T[] {
    let result = asArray(items).filter(x => x);

    result = result.filter((x, idx) => {
        try {
            let conditions = asArray(x.if).map(x => toStringSafe(x))
                                          .filter(x => '' !== x.trim());

            for (let i = 0; i < conditions.length; i++) {
                let cv = new deploy_values.CodeValue({
                    code: conditions[i],
                    name: `condition_${idx}_${i}`,
                    type: 'code',
                });

                cv.otherValueProvider = () => asArray(values).filter(x => x);

                if (!toBooleanSafe(cv.value)) {
                    return false;  // at least one condition does NOT match
                }
            }
        }
        catch (e) {
            log(i18.t('errors.withCategory',
                      'helpers.filterConditionalItems()', e));
            
            return false;
        }

        return true;
    });

    return result;    
}

/**
 * Filters items by platform.
 * 
 * @param {(T|T[])} items The items to filter.
 * @param {string} [platform] The custom name of the platform to use.
 * 
 * @returns {T[]} The new list of filtered items. 
 */
export function filterPlatformItems<T extends deploy_contracts.PlatformItem>(items: T | T[], platform?: string): T[] {
    platform = normalizeString(platform);
    if ('' === platform) {
        platform = normalizeString(process.platform);
    }
    
    return asArray<T>(items).filter(x => x)
                            .filter(x => {
                                        let platformNames = asArray(x.platforms).map(x => normalizeString(x))
                                                                                .filter(x => x);

                                        return platformNames.length < 1 ||
                                               platformNames.indexOf(platform) > -1;
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
                        if ('' !== resultValue) {
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
                        if ('' !== resultValue) {
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
 * Returns the list of files by a filter that should be deployed.
 * 
 * @param {deploy_contracts.FileFilter} filter The filter.
 * 
 * @return {string[]} The list of files.
 */
export function getFilesByFilter(filter: deploy_contracts.FileFilter): string[] {
    if (!filter) {
        return [];
    }

    // files in include
    let allFilePatterns: string[] = [];
    if (filter.files) {
        allFilePatterns = asArray(filter.files).map(x => toStringSafe(x))
                                               .filter(x => '' !== x);

        allFilePatterns = distinctArray(allFilePatterns);
    }
    if (allFilePatterns.length < 1) {
        allFilePatterns.push('**');  // include all by default
    }

    // files to exclude
    let allExcludePatterns: string[] = [];
    if (filter.exclude) {
        allExcludePatterns = asArray(filter.exclude).map(x => toStringSafe(x))
                                                    .filter(x => '' !== x);
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
 * Returns the list of files of a package that should be deployed.
 * 
 * @param {deploy_contracts.DeployPackage} pkg The package.
 * 
 * @return {string[]} The list of files.
 */
export function getFilesOfPackage(pkg: deploy_contracts.DeployPackage): string[] {
    pkg = cloneObject(pkg);
    if (pkg) {
        if (!pkg.exclude) {
            pkg.exclude = [];
        }

        if (toBooleanSafe(pkg.noNodeModules)) {
            pkg.exclude.push('node_modules/**');
        }
    }
    
    return getFilesByFilter(pkg);
}

/**
 * Loads the body from a HTTP response.
 * 
 * @param {HTTP.IncomingMessage} resp The response.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export function getHttpBody(resp: HTTP.IncomingMessage): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        let body: Buffer;
        let completed = (err?: any) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(body);
            }
        };

        if (!resp) {
            completed();
            return;
        }

        body = Buffer.alloc(0);

        try {
            let appendChunk = (chunk: Buffer): boolean => {
                try {
                    if (chunk) {
                        body = Buffer.concat([body, chunk]);
                    }

                    return true;
                }
                catch (e) {
                    completed(e);
                    return false;
                }
            };

            resp.on('data', (chunk: Buffer) => {
                if (!appendChunk(chunk)) {
                    return;
                }
            });

            resp.on('end', (chunk: Buffer) => {
                if (!appendChunk(chunk)) {
                    return;
                }

                let l = body.length;
                
                completed();
            });

            resp.on('error', (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Returns the sort value from a sortable.
 * 
 * @param {deploy_contracts.Sortable} s The sortable object.
 * @param {deploy_contracts.ValueProvider<string>} [nameProvider] The custom function that provides the name of the machine.
 * 
 * @return {any} The sort value.
 */
export function getSortValue(s: deploy_contracts.Sortable,
                             nameProvider?: deploy_contracts.ValueProvider<string>): any {
    let name: string;
    if (nameProvider) {
        name = normalizeString(nameProvider());
    }

    let sortValue: any = s.sortOrder;
    if (!sortValue) {
        sortValue = 0;
    }
    if ('number' !== typeof sortValue) {
        // handle as object and find a property
        // that has the same name as this machine

        let sortObj = sortValue;
        let valueAlreadySet = false;

        Object.getOwnPropertyNames(sortObj).forEach(p => {
            if (!valueAlreadySet && !normalizeString(p)) {
                sortValue = sortObj[p];  // custom default value defined
            }

            if (normalizeString(p) == name) {
                sortValue = sortObj[p];  // found
                valueAlreadySet = true;
            }
        });
    }

    // keep sure to have a number here
    sortValue = parseFloat(('' + sortValue).trim());
    if (isNaN(sortValue)) {
        sortValue = 0;
    }

    return sortValue;
}

/**
 * Returns the color for a status bar item based an operation result.
 * 
 * @param {any} err The error.
 * @param {number} succeedCount The number of successed operations.
 * @param {number} failedCount The number of failed operations.
 * 
 * @return {string} The color.
 */
export function getStatusBarItemColor(err: any,
                                      succeedCount: number, failedCount: number): string {
    let color: string;
    if (err || failedCount > 0) {
        if (succeedCount < 1) {
            color = '#ff0000';
        }
        else {
            color = '#ffff00';
        }
    }

    return color;
}

/**
 * Returns the value from a "parameter" object.
 * 
 * @param {Object} params The object.
 * @param {string} name The name of the parameter.
 * 
 * @return {string} The value of the parameter (if found).
 */
export function getUrlParam(params: Object, name: string): string {
    if (params) {
        name = normalizeString(name);

        for (let p in params) {
            if (normalizeString(p) === name) {
                return toStringSafe(params[p]);
            }
        }
    }
}

/**
 * Checks if data is binary or text content.
 * 
 * @param {Buffer} data The data to check.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export function isBinaryContent(data: Buffer): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction<boolean>(resolve, reject);
        if (!data) {
            completed(null);
            return;
        }

        try {
            IsBinaryFile(data, data.length, (err, result) => {
                if (err) {
                    completed(err);
                    return;
                }

                completed(null, toBooleanSafe(result));
            });
        }
        catch (e) {
            completed(e);
        }
    });
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
    return '' === toStringSafe(val).trim();
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
 * Checks if a value is (null), (undefined) or an empty string.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is (null)/(undefined)/empty string or not.
 */
export function isNullUndefinedOrEmptyString(val: any): boolean {
    return isNullOrUndefined(val) ||
           '' === toStringSafe(val);
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
    return loadModule<deploy_contracts.DataTransformModule>(file, useCache);
}

/**
 * Loads a module for a deploy operation.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {deploy_contracts.DeployScriptOperationModule} The loaded module.
 */
export function loadDeployScriptOperationModule(file: string, useCache: boolean = false): deploy_contracts.DeployScriptOperationModule {
    return loadModule<deploy_contracts.DeployScriptOperationModule>(file, useCache);
}

/**
 * Loads data from a source.
 * 
 * @param {string} src The path or URL to the source.
 * 
 * @return {Promise<DownloadResult>} The promise.
 */
export function loadFrom(src: string): Promise<DownloadResult> {
    return new Promise<DownloadResult>((resolve, reject) => {
        let completedInvoked = false;
        let completed = (err: any, result?: DownloadResult) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;
            
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        };

        try {
            src = toStringSafe(src);

            let wf = Workflows.create();

            if (REGEX_HTTP_URL.test(src)) {
                // web resource

                let url = URL.parse(src);

                let fileName = Path.basename(url.path);

                wf.next((ctx) => {
                    return new Promise<any>((resolve, reject) => {
                        try {
                            let requestOpts: HTTP.RequestOptions = {
                                headers: {
                                    'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
                                },
                                hostname: url.hostname,
                                path: url.path,
                                method: 'GET',
                            };
                            
                            let requestHandler = (resp: HTTP.IncomingMessage) => {
                                let mime: string;
                                if (resp.headers) {
                                    for (let h in resp.headers) {
                                        if ('content-type' === normalizeString(h)) {
                                            mime = normalizeString(resp.headers[h]);
                                            break;
                                        }
                                    }
                                }

                                readHttpBody(resp).then((data) => {
                                    resolve({
                                        data: data,
                                        fileName: fileName,
                                        mime: mime,
                                    });
                                }).catch((err) => {
                                    reject(err);
                                });
                            };

                            let requestFactory: (options: HTTP.RequestOptions,
                                                 callback?: (res: HTTP.IncomingMessage) => void) => HTTP.ClientRequest;

                            switch (normalizeString(url.protocol)) {
                                case 'https:':
                                    requestFactory = HTTPs.request;

                                    requestOpts.protocol = 'https:';
                                    requestOpts.port = 443;
                                    break;

                                default:
                                    // http
                                    requestFactory = HTTP.request;

                                    requestOpts.protocol = 'http:';
                                    requestOpts.port = 80;
                                    break;
                            }

                            if (!isNullUndefinedOrEmptyString(url.port)) {
                                requestOpts.port = parseInt(toStringSafe(url.port).trim());
                            }

                            if (requestFactory) {
                                let request = requestFactory(requestOpts, requestHandler);

                                request.once('error', (err) => {
                                    reject(err);
                                });

                                request.end();
                            }
                            else {
                                resolve(null);
                            }
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            }
            else {
                // local file

                let filePath = src;
                if (!Path.isAbsolute(filePath)) {
                    filePath = Path.join(vscode.workspace.rootPath, filePath);
                }
                filePath = Path.resolve(filePath);

                let fileName = Path.basename(filePath);

                wf.next((ctx) => {
                    return new Promise<any>((resolve, reject) => {
                        try {
                            FS.readFile(filePath, (err, data) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve({
                                        data: data,
                                        fileName: fileName,
                                    });
                                }
                            });
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            }

            // check if binary file
            wf.next((ctx) => {
                let data: Buffer = ctx.previousValue.data;
                if (!data) {
                    data = Buffer.alloc(0);
                }

                let fileName: string = ctx.previousValue.fileName;
                let mime: string = ctx.previousValue.mime;

                return new Promise<any>((resolve, reject) => {
                    isBinaryContent(data).then((isBinary) => {
                        resolve({
                            data: data,
                            fileName: fileName,
                            isBinary: isBinary,
                            mime: mime,
                        });
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });

            wf.next((ctx) => {
                let data: Buffer = ctx.previousValue.data;
                let fileName: string = ctx.previousValue.fileName;
                let isBinary: boolean = ctx.previousValue.isBinary;

                let getMimeSafe = (m: any): string => {
                    m = normalizeString(m);
                    if ('' === m) {
                        m = 'application/octet-stream';
                    }

                    return m;
                };

                // mime
                let mime = normalizeString(ctx.previousValue.mime);
                if ('' === mime) {
                    // try to detect...

                    if (isBinary) {
                        try {
                            let type = FileType(data);
                            if (type) {
                                mime = type.mime;
                            }
                        }
                        catch (e) { /* TODO: log */ }
                    }

                    mime = getMimeSafe(mime);
                    if ('application/octet-stream' === mime) {
                        if (!isNullUndefinedOrEmptyString(fileName)) {
                            try {
                                mime = detectMimeByFilename(fileName);
                            }
                            catch (e) { /* TODO: log */ }
                        }
                    }
                }

                if (mime.indexOf(';') > -1) {
                    mime = normalizeString(mime.split(';')[0]);
                }

                let result: DownloadResult = {
                    data: data,
                    mime: getMimeSafe(mime),
                    name: fileName,
                };

                ctx.result = result;
            });

            wf.start().then((result: DownloadResult) => {
                completed(null, result);
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
 * Loads a module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {TModule} The loaded module.
 */
export function loadModule<TModule>(file: string, useCache: boolean = false): TModule {
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
 * Loads a script based command module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {deploy_contracts.ScriptCommandModule} The loaded module.
 */
export function loadScriptCommandModule(file: string, useCache: boolean = false): deploy_contracts.ScriptCommandModule {
    return loadModule<deploy_contracts.ScriptCommandModule>(file, useCache);
}

/**
 * Loads a "validator" module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {deploy_contracts.ValidatorModule<T>} The loaded module.
 */
export function loadValidatorModule<T>(file: string, useCache: boolean = false): deploy_contracts.ValidatorModule<T> {
    return loadModule<deploy_contracts.ValidatorModule<T>>(file, useCache);
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
 * Normalizes a value as string so that is comparable.
 * 
 * @param {any} val The value to convert.
 * @param {(str: string) => string} [normalizer] The custom normalizer.
 * 
 * @return {string} The normalized value.
 */
export function normalizeString(val: any, normalizer?: (str: string) => string): string {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }

    return normalizer(toStringSafe(val));
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
 * Opens a HTML document in a new tab for a document storage.
 * 
 * @param {deploy_contracts.Document[]} storage The storage to open for.
 * @param {string} html The HTML document (source code).
 * @param {string} [title] The custom title for the tab.
 * @param {any} [id] The custom ID for the document in the storage.
 * 
 * @returns {Promise<any>} The promise.
 */
export function openHtmlDocument(storage: deploy_contracts.Document[],
                                 html: string, title?: string, id?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);

        try {
            let body: Buffer;
            let enc = 'utf8';
            if (html) {
                body = new Buffer(toStringSafe(html), enc);
            }

            if (isNullOrUndefined(id)) {
                id = 'vsdGlobalHtmlDocs::c6bda982-419e-4a28-8412-5822df5223d4::' + (++nextHtmlDocId);
            }

            let doc: deploy_contracts.Document = {
                body: body,
                encoding: enc,
                id: id,
                mime: 'text/html',
            };

            if (!isEmptyString(title)) {
                doc.title = toStringSafe(title).trim();
            }

            if (storage) {
                storage.push(doc);
            }

            vscode.commands.executeCommand('extension.deploy.openHtmlDoc', doc).then((result: any) => {
                completed(null, result);
            }, (err) => {
                completed(err);
            });
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
 * Reads the content of the HTTP request body.
 * 
 * @param {HTTP.IncomingMessag} msg The HTTP message with the body.
 * 
 * @returns {Promise<Buffer>} The promise.
 */
export function readHttpBody(msg: HTTP.IncomingMessage): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        let buff: Buffer;
        let completedInvoked = false;

        let dataListener: (chunk: Buffer | string) => void;

        let completed = (err: any) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;

            if (dataListener) {
                try {
                    msg.removeListener('data', dataListener);
                }
                catch (e) { 
                    log(i18.t('errors.withCategory',
                              'helpers.readHttpBody()', e));
                }
            }

            if (err) {
                reject(err);
            }
            else {
                resolve(buff);
            }
        };

        dataListener = (chunk: Buffer | string) => {
            try {
                if (chunk && chunk.length > 0) {
                    if ('string' === typeof chunk) {
                        chunk = new Buffer(chunk);
                    }

                    buff = Buffer.concat([ buff, chunk ]);
                }
            }
            catch (e) {
                completed(e);
            }
        };

        try {
            buff = Buffer.alloc(0);

            msg.once('error', (err) => {
                if (err) {
                    completed(err);
                }
            });

            msg.on('data', dataListener);

            msg.once('end', () => {
                resolve(buff);
            });
        }
        catch (e) {
            completed(e);
        }
    });
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
 * Removes documents from a storage.
 * 
 * @param {deploy_contracts.Document|sc_contracts.Document[]} docs The document(s) to remove.
 * @param {deploy_contracts.Document[]} storage The storage.
 * 
 * @return {deploy_contracts.Document[]} The removed documents.
 */
export function removeDocuments(docs: deploy_contracts.Document | deploy_contracts.Document[],
                                storage: deploy_contracts.Document[]): deploy_contracts.Document[] {
    let ids = asArray(docs).filter(x => x)
                           .map(x => x.id);

    let removed = [];

    if (storage) {
        for (let i = 0; i < storage.length; ) {
            let d = storage[i];
            if (ids.indexOf(d.id) > -1) {
                removed.push(d);
                storage.splice(i, 1);
            }
            else {
                ++i;
            }
        }
    }

    return removed;
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
 * @param {deploy_contracts.ValueProvider<string>} [nameProvider] The custom function that provides the name of the machine.
 * 
 * @return {deploy_contracts.DeployPackage[]} The sorted list.
 */
export function sortPackages(pkgs: deploy_contracts.DeployPackage[],
                             nameProvider?: deploy_contracts.ValueProvider<string>): deploy_contracts.DeployPackage[] {
    if (!pkgs) {
        pkgs = [];
    }

    return pkgs.filter(x => x)
               .map((x, i) => {
                        return {
                            index: i,
                            level0: getSortValue(x, nameProvider),  // first sort by "sortOrder"
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
 * @param {deploy_contracts.DeployTarget[]} targets The input list.
 * @param @param {deploy_contracts.ValueProvider<string>} [nameProvider] The custom function that provides the name of the machine.
 * 
 * @return {deploy_contracts.DeployTarget[]} The sorted list.
 */
export function sortTargets(targets: deploy_contracts.DeployTarget[],
                            nameProvider?: deploy_contracts.ValueProvider<string>): deploy_contracts.DeployTarget[] {
    if (!targets) {
        targets = [];
    }

    return targets.filter(x => x)
                  .map((x, i) => {
                           return {
                               index: i,
                               level0: getSortValue(x, nameProvider),  // first sort by "sortOrder"
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
 * Returns an array like object as new array.
 * 
 * @param {ArrayLike<T>} arr The input object. 
 * @param {boolean} [normalize] Returns an empty array, if input object is (null) / undefined.
 * 
 * @return {T[]} The input object as array. 
 */
export function toArray<T>(arr: ArrayLike<T>, normalize = true): T[] {
    if (isNullOrUndefined(arr)) {
        if (toBooleanSafe(normalize)) {
            return [];
        }
        
        return <any>arr;
    }

    let newArray: T[] = [];
    for (let i = 0; i < arr.length; i++) {
        newArray.push(arr[i]);
    }

    return newArray;
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
        log(i18.t('errors.withCategory',
                  'helpers.toRelativePath()', e));
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
    if (isNullOrUndefined(str)) {
        str = '';
    }
    str = '' + str;
    if (!str) {
        str = defValue;
    }

    return str;
}

/**
 * Keeps sure to return a "validator" that is NOT (null) or (undefined).
 * 
 * @param {deploy_contracts.Validator<T>} validator The input value.
 * 
 * @return {deploy_contracts.Validator<T>} The output value.
 */
export function toValidatorSafe<T>(validator: deploy_contracts.Validator<T>): deploy_contracts.Validator<T> {
    if (!validator) {
        // use "dummy" validator

        validator = (): Promise<boolean> => {
            return new Promise<boolean>((resolve) => {
                resolve(true);
            });
        };
    }
    
    return validator;
}

/**
 * Tries to dispose an object.
 * 
 * @param {vscode.Disposable} obj The object to dispose.
 * 
 * @return {boolean} Operation was successful or not.
 */
export function tryDispose(obj: vscode.Disposable): boolean {
    try {
        if (obj) {
            obj.dispose();
        }

        return true;
    }
    catch (e) {
        log(i18.t('errors.withCategory',
                  'helpers.tryDispose()', e));

        return false;
    }
}

/**
 * Extracts the query parameters of an URI to an object.
 * 
 * @param {vscode.Uri} uri The URI.
 * 
 * @return {Object} The parameters of the URI as object.
 */
export function uriParamsToObject(uri: vscode.Uri): Object {
    if (!uri) {
        return uri;
    }

    let params: any;
    if (!isEmptyString(uri.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = uri.query.replace(/(^\?)/,'')
                          .split("&")
                          .map(function(n) { return n = n.split("="), this[normalizeString(n[0])] =
                                                                           toStringSafe(decodeURIComponent(n[1])), this}
                          .bind({}))[0];
    }

    if (!params) {
        params = {};
    }

    return params;
}
