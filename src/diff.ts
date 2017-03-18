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

import { Deployer } from './deploy';
import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as Diff from 'diff';
import * as FileType from 'file-type';
import * as FS from 'fs';
import * as i18 from './i18';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * An item of a compare result.
 */
export interface CompareResultItem {
    /**
     * The number of added chars.
     */
    added?: number;
        /**
     * The number of added JSON elements.
     */
    addedJSON?: number;
    /**
     * The number of added lines.
     */
    addedLines?: number;
    /**
     * Files are different or not.
     */
    areDifferent?: boolean;
    /**
     * Both files are JSON are not.
     */
    areJSON?: boolean;
    /**
     * The error (if occurred)
     */
    error?: any;
    /**
     * The path to the local file.
     */
    file: string;
    /**
     * The ID.
     */
    id: number;
    /**
     * Is local file binary or not.
     */
    isLocalBinary?: boolean;
    /**
     * Is remote file binary or not.
     */
    isRemoteBinary?: boolean;
    /**
     * MIME type of the local file.
     */
    mimeLocal?: string;
    /**
     * MIME type of the remote file.
     */
    mimeRemote?: string;
    /**
     * The underlying plugin.
     */
    plugin: deploy_contracts.DeployPlugin;
    /**
     * The number of removed chars.
     */
    removed?: number;
    /**
     * The number of removed JSON elements.
     */
    removedJSON?: number;
    /**
     * The number of removed lines.
     */
    removedLines?: number;
    /**
     * The target.
     */
    target: deploy_contracts.DeployTarget;
}


/**
 * Detects changes of files.
 * 
 * @param {string[]} files The files to check.
 * @param {deploy_contracts.DeployTarget} t The target.
 * 
 * @returns {Promise<CompareResultItem[]>} The promise.
 */
export function detectChanges(files: string[], t: deploy_contracts.DeployTarget): Promise<CompareResultItem[]> {
    let me: Deployer = this;

    return new Promise<CompareResultItem[]>((resolve, reject) => {
        let result: CompareResultItem[] = [];
        let nextId = -1;
        let completed = (err: any) => {
            if (err) {
                reject(err);
            }
            else {
                result = result.sort((x, y) => {
                    return deploy_helpers.compareValues(deploy_helpers.normalizeString(x.file),
                                                        deploy_helpers.normalizeString(y.file));
                });

                resolve(result);
            }
        };

        try {
            let type = deploy_helpers.parseTargetType(t.type);

            let matchIngPlugins = me.pluginsWithContextes.filter(x => {
                return !type ||
                        (x.plugin.__type == type && deploy_helpers.toBooleanSafe(x.plugin.canPull) && x.plugin.downloadFile);
            });

            if (matchIngPlugins.length > 0) {
                let pluginWorkflow = Workflows.create();  // for each PLUGIN

                matchIngPlugins.map(pwc => pwc.plugin).forEach(p => {
                    pluginWorkflow.next((ctx) => {
                        let parent: Workflows.Workflow = ctx.value;

                        return new Promise<any>((resolve, reject) => {
                            try {
                                let filesWorkflow = Workflows.create();  // for each FILE

                                files.map(x => x).forEach(f => {
                                    filesWorkflow.next(() => {
                                        return new Promise<any>((resolve, reject) => {
                                            let cri: CompareResultItem = {
                                                file: f,
                                                id: ++nextId,
                                                plugin: p,
                                                target: t,
                                            };

                                            let compareCompleted = (err: any) => {
                                                cri.error = err;

                                                result.push(cri);

                                                resolve(cri);
                                            };

                                            try {
                                                let loadLocalFile = (remoteData?: Buffer) => {
                                                    if (!remoteData) {
                                                        remoteData = Buffer.alloc(0);
                                                    }

                                                    deploy_helpers.isBinaryContent(remoteData).then((isRemoteBinary) => {
                                                        cri.isRemoteBinary = isRemoteBinary;

                                                        FS.readFile(f, (err, localData) => {
                                                            try {
                                                                if (!err) {
                                                                    cri.areDifferent = !localData.equals(remoteData);
                                                                }

                                                                let detectInfoWorkflow = Workflows.create();

                                                                // isRemoteBinary?
                                                                detectInfoWorkflow.next(() => {
                                                                    return new Promise<any>((resolve) => {
                                                                        deploy_helpers.isBinaryContent(remoteData).then((isRemoteBinary) => {
                                                                            cri.isRemoteBinary = isRemoteBinary;
                                                                            
                                                                            resolve();
                                                                        }).catch(() => {
                                                                            //TODO log

                                                                            resolve();
                                                                        });
                                                                    });
                                                                });

                                                                // isLocalBinary?
                                                                detectInfoWorkflow.next(() => {
                                                                    return new Promise<any>((resolve) => {
                                                                        deploy_helpers.isBinaryContent(localData).then((isLocalBinary) => {
                                                                            cri.isLocalBinary = isRemoteBinary;
                                                                            
                                                                            resolve();
                                                                        }).catch(() => {
                                                                            //TODO log

                                                                            resolve();
                                                                        });
                                                                    });
                                                                });

                                                                // detect "real" mime type of LOCAL data
                                                                detectInfoWorkflow.next(() => {
                                                                    try {
                                                                        cri.mimeLocal = FileType(localData).mime;
                                                                    }
                                                                    catch (e) { /* TODO log */ }
                                                                });

                                                                // detect "real" mime type of REMOTE data
                                                                detectInfoWorkflow.next(() => {
                                                                    try {
                                                                        cri.mimeRemote = FileType(remoteData).mime;
                                                                    }
                                                                    catch (e) { /* TODO log */ }
                                                                });

                                                                // count changes (if text files)
                                                                detectInfoWorkflow.next(() => {
                                                                    try {
                                                                        let jsonLocal: any;
                                                                        let jsonRemote: any;
                                                                        if (false === cri.isLocalBinary && false === cri.isRemoteBinary) {
                                                                            cri.areJSON = false;

                                                                            try {
                                                                                jsonLocal = JSON.parse(localData.toString('utf8'));
                                                                                jsonRemote = JSON.parse(remoteData.toString('utf8'));

                                                                                cri.areJSON = true;
                                                                            }
                                                                            catch (e) { }
                                                                        }

                                                                        if (true === cri.areDifferent) {
                                                                            if (false === cri.isLocalBinary && false === cri.isRemoteBinary) {
                                                                                let strLocal = localData.toString('utf8');
                                                                                let strRemote = remoteData.toString('utf8');

                                                                                cri.added = 0;
                                                                                cri.addedLines = 0;
                                                                                cri.removed = 0;
                                                                                cri.removedLines = 0;

                                                                                // chars
                                                                                Diff.diffChars(strRemote, strLocal).forEach(dr => {
                                                                                    if (dr.added) {
                                                                                        ++cri.added;
                                                                                    }
                                                                                    if (dr.removed) {
                                                                                        ++cri.removed;
                                                                                    }
                                                                                });

                                                                                // lines
                                                                                Diff.diffLines(strRemote, strLocal).forEach(dr => {
                                                                                    if (dr.added) {
                                                                                        ++cri.addedLines;
                                                                                    }
                                                                                    if (dr.removed) {
                                                                                        ++cri.removedLines;
                                                                                    }
                                                                                });

                                                                                if (true === cri.areJSON) {
                                                                                    // detect JSON changes

                                                                                    cri.addedJSON = 0;
                                                                                    cri.removedJSON = 0;

                                                                                    Diff.diffJson(jsonRemote, jsonLocal).forEach(dr => {
                                                                                        if (dr.added) {
                                                                                            ++cri.addedJSON;
                                                                                        }
                                                                                        if (dr.removed) {
                                                                                            ++cri.removedJSON;
                                                                                        }
                                                                                    });
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                    catch (e) { /* TODO log */ }
                                                                });

                                                                detectInfoWorkflow.start().then(() => {
                                                                    compareCompleted(err);
                                                                }).catch(() => {
                                                                    compareCompleted(err);
                                                                });
                                                            }
                                                            catch (e) {
                                                                compareCompleted(e);
                                                            }
                                                        });
                                                    }).catch((err) => {
                                                        compareCompleted(err);
                                                    });
                                                };  // loadLocalFile()

                                                // download data
                                                let downloadResult = p.downloadFile(f, t);
                                                if (downloadResult) {
                                                    if (Buffer.isBuffer(downloadResult)) {
                                                        loadLocalFile(downloadResult);
                                                    }
                                                    else {
                                                        downloadResult.then((data) => {
                                                            loadLocalFile(data);
                                                        }, (err) => {
                                                            compareCompleted(err);
                                                        });
                                                    }
                                                }
                                                else {
                                                    loadLocalFile();
                                                }
                                            }
                                            catch (e) {
                                                compareCompleted(e);
                                            }
                                        });
                                    });
                                });

                                filesWorkflow.start(pluginWorkflow).then(() => {
                                    resolve();
                                }).catch((err) => {
                                    reject(err);
                                });
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    });
                });

                pluginWorkflow.start().then(() => {
                    completed(null);
                }).catch((err) => {
                    completed(err);
                });
            }
            else {
                if (type) {
                    vscode.window.showWarningMessage(i18.t('deploy.noPluginsForType', type));
                }
                else {
                    vscode.window.showWarningMessage(i18.t('deploy.noPlugins'));
                }

                completed(null);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
