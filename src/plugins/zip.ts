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
import * as i18 from '../i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';
const Zip = require('node-zip');


interface DeployTargetZIP extends deploy_contracts.DeployTarget {
    fileName?: string;
    open?: boolean;
    target?: string;
}

class ZIPPlugin extends deploy_objects.ZipFileDeployPluginBase {
    public get canPull(): boolean {
        return true;
    }

    protected createZipFile(target: DeployTargetZIP,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions | deploy_contracts.DeployWorkspaceOptions,
                            direction: deploy_contracts.DeployDirection): Promise<any> {
        let me = this;
        
        if (direction == deploy_contracts.DeployDirection.Deploy) {
            return super.createZipFile.apply(me, arguments);
        }
        
        return new Promise<any>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<any>(resolve, reject);

            try {
                let targetDir = deploy_helpers.toStringSafe(target.target);
                targetDir = me.context.replaceWithValues(targetDir);
                if (!targetDir) {
                    targetDir = './';
                }
                if (!Path.isAbsolute(targetDir)) {
                    targetDir = Path.join(vscode.workspace.rootPath, targetDir);
                }

                let notFound = () => {
                    completed(i18.t('plugins.zip.noFileFound'));
                };

                let loadZIP = (zipFileName: string) => {
                    if (deploy_helpers.isEmptyString(zipFileName)) {
                        notFound();
                    }
                    else {
                        zipFileName = Path.join(targetDir,
                                                deploy_helpers.toStringSafe(zipFileName));

                        FS.readFile(zipFileName, (err, data) => {
                            if (err) {
                                completed(err);
                            }
                            else {
                                try {
                                    let zip = Zip(data, { base64: false });

                                    completed(null, zip);
                                }
                                catch (e) {
                                    completed(e);
                                }
                            }
                        });
                    }
                };

                if (deploy_helpers.isEmptyString(target.fileName)) {
                    FS.readdir(targetDir, (err, files) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            const REGEX = /^(workspace_)(\d{8})(_)((\d{6}))(\.)(zip)$/i;

                            files = files.filter(x => REGEX.test(x)).sort((x, y) => {
                                return deploy_helpers.compareValues(deploy_helpers.normalizeString(y),
                                                                    deploy_helpers.normalizeString(x));
                            });

                            let zipFileName: string;
                            if (files.length > 0) {
                                zipFileName = files[0];
                            }

                            loadZIP(zipFileName);
                        }
                    });
                }
                else {
                    // custom filename
                    let zipFileName = deploy_helpers.toStringSafe(target.fileName);
                    zipFileName = me.context.replaceWithValues(zipFileName);

                    loadZIP(zipFileName);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    protected deployZipFile(zip: any, target: DeployTargetZIP): Promise<any> {
        let now = Moment();
        let me = this;

        let targetDir = deploy_helpers.toStringSafe(target.target);
        targetDir = me.context.replaceWithValues(targetDir);
        if (!targetDir) {
            targetDir = './';
        }
        if (!Path.isAbsolute(targetDir)) {
            targetDir = Path.join(vscode.workspace.rootPath, targetDir);
        }

        let openAfterCreated = deploy_helpers.toBooleanSafe(target.open, true);

        return new Promise<any>((resolve, reject) => {
            let completed = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(zip);
                }
            };

            try {
                // now deploy by saving to file
                let deploy = (zipFile: string) => {
                    try {
                        let zippedData = new Buffer(zip.generate({
                            base64: false,
                            compression: 'DEFLATE',
                        }), 'binary');

                        FS.writeFile(zipFile, zippedData, (err) => {
                            zippedData = null;

                            if (err) {
                                completed(err);
                                return;
                            }

                            completed();

                            if (openAfterCreated) {
                                deploy_helpers.open(zipFile).catch((err) => {
                                    me.context.log(i18.t('errors.withCategory',
                                                         'ZIPPlugin.deployWorkspace()', err));
                                });
                            }
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                let deleteFile = (zipFile: string) => {
                    FS.unlink(zipFile, (err) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            deploy(zipFile);
                        }
                    });
                };

                // check if target directory is
                // really a directory
                let checkIfDirectory = () => {
                    FS.lstat(targetDir, (err, stats) => {
                        try {
                            if (err) {
                                completed(err);
                                return;
                            }

                            if (stats.isDirectory()) {
                                let deleteIfExists = false;
                                let zipFileName: string;
                                if (deploy_helpers.isEmptyString(target.fileName)) {
                                    zipFileName = `workspace_${now.format('YYYYMMDD')}_${now.format('HHmmss')}.zip`;
                                }
                                else {
                                    // custom filename
                                    // that is deleted if it exists

                                    deleteIfExists = true;

                                    zipFileName = deploy_helpers.toStringSafe(target.fileName);
                                    zipFileName = me.context.replaceWithValues(zipFileName);
                                }

                                let zipFile = Path.join(targetDir, zipFileName);

                                let zipRelativePath = deploy_helpers.toRelativeTargetPath(zipFile, target);
                                if (false === zipRelativePath) {
                                    zipRelativePath = zipFile;
                                }

                                FS.exists(zipFile, (exists) => {
                                    if (exists) {
                                        if (deleteIfExists) {
                                            deleteFile(zipFile);
                                        }
                                        else {
                                            // we do not overwrite existing files
                                            // with auto generated names
                                            completed(new Error(i18.t('plugins.zip.fileAlreadyExists', zipRelativePath)));
                                        }
                                    }
                                    else {
                                        deploy(zipFile);
                                    }
                                });
                            }
                            else {
                                // no directory
                                completed(new Error(i18.t('isNo.directory', targetDir)));
                            }
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                };

                // first check if target directory exists
                FS.exists(targetDir, (exists) => {
                    if (exists) {
                        checkIfDirectory();
                    }
                    else {
                        // no => try to create

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
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.zip.description'),
        };
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
