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

import * as FS from 'fs';
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Logs a message.
 * 
 * @param {any} message The message to log.
 */
export function log(msg) {
    if (msg) {
        console.log('[vs-deploy] ' + msg);
    }
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
 * Tries to convert a file path to a relative path.
 * 
 * @param {string} path The path to convert.
 * 
 * @return {string | false} The relative path or (false) if not possible.
 */
export function toRelativePath(path: string): string | false {
    let result: string | false = false;
    
    try {
        let normalizedPath = path;

        let wsRootPath = vscode.workspace.rootPath;
        if (wsRootPath) {
            if (FS.existsSync(wsRootPath)) {
                if (FS.lstatSync(wsRootPath).isDirectory()) {
                    if (0 == normalizedPath.indexOf(wsRootPath)) {
                        result = normalizedPath.substr(wsRootPath.length);
                        result = result.replace(Path.sep, '/');
                    }
                }
            }
        }
    }
    catch (e) { /* ignore */ }

    return result;
}
