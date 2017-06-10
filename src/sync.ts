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
import * as deploy_helpers from './helpers';
import * as deploy_targets from './targets';
import * as FS from 'fs';
import * as i18 from './i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


interface PackageWithSyncFilter {
    filter: deploy_contracts.SyncWhenOpenFileFilter;
    package: deploy_contracts.DeployPackage;
}

function normalizeFilePath(file: string): string {
    return deploy_helpers.replaceAllStrings(file, Path.sep, '/');
}

/**
 * Synchronizes a document after it has been opened.
 * 
 * @param {vscode.TextDocument} doc The document.
 *  
 * @returns {Promise<any>} The promise. 
 */
export function syncWhenOpen(doc: vscode.TextDocument): Promise<any> {
    let me: vs_deploy.Deployer = this;
    let cfg = me.config;
    let lastConfigUpdate = me.lastConfigUpdate;

    return new Promise<any>((resolve, reject) => {
        try {
            if (!lastConfigUpdate) {
                resolve();
                return;
            }

            let file = doc.fileName;
            file = normalizeFilePath(file);

            let wf = Workflows.create();

            wf.next((ctx) => {
                ctx.result = [];
            });

            me.getPackages().forEach(pkg => {
                wf.next((ctx) => {
                    let packagesAndFilters: PackageWithSyncFilter[] = ctx.result;

                    return new Promise<any>((res, rej) => {
                        let completed = (err: any, filter?: deploy_contracts.SyncWhenOpenFileFilter) => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                if (filter) {
                                    packagesAndFilters.push({
                                        package: pkg,
                                        filter: filter,
                                    });
                                }

                                res();
                            }
                        };
                        
                        if (deploy_helpers.isNullOrUndefined(pkg.syncWhenOpen)) {
                            completed(null);
                        }
                        else {
                            try {
                                if (false !== pkg.syncWhenOpen) {
                                    let filter: deploy_contracts.SyncWhenOpenFileFilter;

                                    if (true === pkg.syncWhenOpen) {
                                        // files of package
                                        filter = deploy_helpers.cloneObject(pkg);

                                        filter.target = <any>pkg.targets;
                                    }
                                    else {
                                        if ('object' === typeof pkg.syncWhenOpen) {
                                            filter = pkg.syncWhenOpen;
                                        }
                                        else {
                                            // target name

                                            filter = {
                                                target: deploy_helpers.toStringSafe(pkg.syncWhenOpen),
                                            };
                                        }
                                    }

                                    let filesByFilter = deploy_helpers.getFilesByFilter(filter,
                                                                                        me.useGitIgnoreStylePatternsInFilter(filter));
                                    filesByFilter = filesByFilter.map(x => normalizeFilePath(x));

                                    completed(null,
                                              filesByFilter.indexOf(file) > -1 ? filter : null);
                                }
                                else {
                                    completed(null);
                                }
                            }
                            catch (e) {
                                completed(e);
                            }
                        }
                    });
                });
            });

            wf.start().then((packagesAndFilters: PackageWithSyncFilter[]) => {
                if (packagesAndFilters.length < 1) {
                    resolve();
                    return;
                }

                let targets = me.getTargets();

                let wfPackages = Workflows.create();

                wfPackages.next((ctxPkg) => {
                    return new Promise<any>((res, rej) => {
                        FS.lstat(file, (err, stats) => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                ctxPkg.value = stats;

                                res();
                            }
                        });
                    });
                });

                packagesAndFilters.forEach(pf => {
                    let targetNames: string[] = deploy_helpers.asArray(pf.filter.target);
                    targetNames = targetNames.map(x => deploy_helpers.normalizeString(x));
                    targetNames = targetNames.filter(x => '' !== x);

                    if (targetNames.length < 1) {
                        // from package
                        targetNames = deploy_helpers.asArray(pf.package.targets);
                    }

                    targetNames = deploy_helpers.asArray(targetNames);
                    targetNames = targetNames.map(x => deploy_helpers.normalizeString(x));
                    targetNames = targetNames.filter(x => '' !== x);
                    targetNames = deploy_helpers.distinctArray(targetNames);

                    if (targetNames.length > 0) {
                        let machtingTargets = targets.filter(t => {
                            return targetNames.indexOf( deploy_helpers.normalizeString(t.name) )
                                   > -1;
                        });

                        if (machtingTargets.length > 0) {
                            let allTargetsWithPlugins = deploy_targets.getPluginsForTarget(machtingTargets, me.plugins);

                            allTargetsWithPlugins.forEach(targetWithPlugin => {
                                let supportedPlugins = targetWithPlugin.plugins
                                                                       .filter(x => x.canPull && x.canGetFileInfo);

                                supportedPlugins.forEach(pi => {
                                    wfPackages.next((ctxPkg) => {
                                        let fileStats: FS.Stats = ctxPkg.value;

                                        return new Promise<any>((res, rej) => {
                                            try {
                                                // get info of remote file
                                                Promise.resolve( pi.getFileInfo(file, targetWithPlugin.target) ).then((fi) => {
                                                    if (fi.exists) {
                                                        try {
                                                            let remoteFileIsNewer = false;

                                                            if (fi.modifyTime) {
                                                                remoteFileIsNewer = fi.modifyTime.isAfter(fileStats.mtime);
                                                            }

                                                            if (remoteFileIsNewer) {
                                                                // sync local with remote file

                                                                let pullRemoteFile = () => {
                                                                    pi.pullFile(file, targetWithPlugin.target, {
                                                                        onCompleted: (sender, e) => {
                                                                            if (e.error) {
                                                                                rej(e.error);
                                                                            }
                                                                            else {
                                                                                res();
                                                                            }
                                                                        }
                                                                    });
                                                                };
                                                                
                                                                let showWarningOrNot = () => {
                                                                    if (lastConfigUpdate.isAfter(fileStats.mtime)) {
                                                                        pullRemoteFile();
                                                                    }
                                                                    else {
                                                                        // show warning
                                                                    }
                                                                };

                                                                showWarningOrNot();
                                                            }
                                                            else {
                                                                res();
                                                            }
                                                        }
                                                        catch (e) {
                                                            rej(e);
                                                        }
                                                    }
                                                    else {
                                                        res();
                                                    }
                                                }).catch((err) => {
                                                    rej(err);
                                                });
                                            }
                                            catch (e) {
                                                rej(e);
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    }
                });

                wfPackages.start().then(() => {
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
