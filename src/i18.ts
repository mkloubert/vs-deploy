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

import * as deploy_helpers from './helpers';
import * as FS from 'fs';
let i18next = require('i18next');
import * as Path from 'path';
import * as vscode from 'vscode';


export function t(id: string, ...args: any[]): string {
    //TODO
    return null;
}

export function init(lang?: string): Promise<any> {
    if (deploy_helpers.isEmptyString(lang)) {
        lang = vscode.env.language;
    }
    lang = deploy_helpers.toStringSafe(lang).toLowerCase().trim();
    if (!lang) {
        lang = 'en';
    }

    return new Promise<any>((resolve, reject) => {
        let completed = (err?: any, lf?: LanguageFile) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(null);
            }
        };

        try {
            let langDir = Path.join(__dirname, 'lang');

            let resources: any = {};

            let initLang = () => {

            };

            let loadFiles = () => {
                FS.readdir(langDir, (err, files) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    for (let i = 0; i < files.length; i++) {
                        try {
                            let fileName = files[i];
                            if (fileName.length < 3) {
                                continue;
                            }

                            if ('.js' != fileName.substr(fileName.length - 3)) {
                                continue;
                            }

                            let langName = fileName.substr(0, fileName.length - 3).toLowerCase().trim();
                            if (!langName) {
                                continue;
                            }

                            let fullPath = Path.join(langDir, fileName);
                            fullPath = Path.resolve(fullPath);

                            let stats = FS.lstatSync(fullPath);
                            if (!stats.isFile()) {
                                continue;
                            }

                            delete require.cache[fullPath];
                        }
                        catch (e) {

                        }
                    }
                })
            };

            let checkIfDirectory = () => {
                FS.lstat(langDir, (err, stats) => {
                    if (stats.isDirectory()) {
                        loadFiles();
                    }
                    else {
                        completed(new Error(`'${langDir}' is no directory!`));
                    }
                });
            };

            FS.exists(langDir, (exists) => {
                if (exists) {
                    checkIfDirectory();
                }
                else {
                    initLang();
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

export interface LanguageFile {

}
