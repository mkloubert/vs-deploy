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

import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as FS from 'fs';
const FSExtra = require('fs-extra');
import * as Moment from 'moment';
const OPN = require('opn');
import * as Path from 'path';
import * as vscode from 'vscode';
const Zip = require('node-zip');


interface DeployTargetZIP extends deploy_contracts.DeployTarget {
    target?: string;
}

class ZIPPlugin extends deploy_objects.DeployPluginBase {
    constructor(ctx: deploy_contracts.DeployContext) {
        super(ctx);
    }

    public deployFile(file: string, target: DeployTargetZIP, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        this.deployWorkspace([ file ], target, {
            onBeforeDeployFile: (sender, e) => {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(sender, {
                        file: e.file,
                        target: e.target,
                    });
                }
            },

            onFileCompleted: (sender, e) => {
                if (opts.onCompleted) {
                    opts.onCompleted(sender, {
                        error: e.error,
                        file: e.file,
                        target: e.target,
                    });
                }
            }
        });
    }

    public deployWorkspace(files: string[], target: DeployTargetZIP, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let now = Moment();
        let me = this;

        let targetDir = deploy_helpers.toStringSafe(target.target);
        if (!targetDir) {
            targetDir = './';
        }
        
        if (!Path.isAbsolute(targetDir)) {
            targetDir = Path.join(vscode.workspace.rootPath);
        }

        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };

        try {
            let deploy = (zipFile: string) => {
                try {
                    let zip = new Zip();

                    let zipCompleted = () => {
                        try {
                            let zippedData = new Buffer(zip.generate({
                                base64: false,
                                compression: 'DEFLATE',
                            }), 'binary');

                            FS.writeFile(zipFile, zippedData, (err) => {
                                if (err) {
                                    completed(err);
                                    return;
                                }

                                completed();

                                try {
                                    OPN(zipFile);
                                }
                                catch (e) {
                                    me.context.log(`[ERROR] ZIPPlugin.deployWorkspace(): ${deploy_helpers.toStringSafe(e)}`)
                                }
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    };

                    let filesTodo = files.map(x => x);
                    let addNextFile: () => void;
                    addNextFile = () => {
                        if (filesTodo.length < 1) {
                            zipCompleted();
                            return;
                        }

                        let f = filesTodo.pop();
                        if (!f) {
                            zipCompleted();
                            return;
                        }

                        let fileCompleted = (err?: any) => {
                            if (opts.onFileCompleted) {
                                opts.onFileCompleted(me, {
                                    error: err,
                                    file: f,
                                    target: target,
                                });
                            }

                            addNextFile();
                        };

                        try {
                            let relativePath = deploy_helpers.toRelativePath(f);
                            if (false === relativePath) {
                                relativePath = deploy_helpers.replaceAllStrings(f, Path.sep, '/');
                            }

                            if (opts.onBeforeDeployFile) {
                                opts.onBeforeDeployFile(me, {
                                    file: f,
                                    target: target,
                                });
                            }

                            FS.readFile(f, (err, data) => {
                                if (err) {
                                    fileCompleted(err);
                                    return;
                                }

                                try {
                                    let zipEntry = (<string>relativePath).trim();
                                    while (0 == zipEntry.indexOf('/')) {
                                        zipEntry = zipEntry.substr(1);
                                    }

                                    zip.file(zipEntry, data);

                                    fileCompleted();
                                }
                                catch (e) {
                                    fileCompleted(e);
                                }
                            });
                        }
                        catch (e) {
                            fileCompleted(e);
                        }
                    };

                    addNextFile();
                }
                catch (e) {
                    completed(e);
                }
            };

            let checkIfDirectory = () => {
                FS.lstat(targetDir, (err, stats) => {
                    try {
                        if (err) {
                            completed(err);
                            return;
                        }

                        if (stats.isDirectory()) {
                            let zipFileName = `workspace_${now.format('YYYYMMDD')}_${now.format('HHmmss')}.zip`;

                            let zipFile = Path.join(targetDir, zipFileName);

                            let zipRelativePath = deploy_helpers.toRelativePath(zipFile);
                            if (false === zipRelativePath) {
                                zipRelativePath = zipFile;
                            }

                            FS.exists(zipFile, (exists) => {
                                if (exists) {
                                    completed(new Error(`File '${zipRelativePath}' already exists! Try again...`));
                                    return;
                                }

                                deploy(zipFile);
                            });
                        }
                        else {
                            completed(new Error(`'${targetDir}' is no directory!`));
                        }
                    }
                    catch (e) {
                        completed(e);
                    }
                });
            };

            FS.exists(targetDir, (exists) => {
                if (exists) {
                    checkIfDirectory();
                }
                else {
                    FSExtra.mkdirs(targetDir, function (err) {
                        if (err) {
                            completed(err);
                            return;
                        }

                        checkIfDirectory();
                    });
                }
            });
        }
        catch (e) {
            completed(e);
        }
    }
}

/**
 * Creates a new Plugin.
 * 
 * @param {deploy_contracts.DeployContext} ctx The deploy context.
 * 
 * @returns {deploy_contracts.DeployPlugin} The new instance.
 */
export function createPlugin(ctx: deploy_contracts.DeployContext): deploy_contracts.DeployPlugin {
    return new ZIPPlugin(ctx);
}
