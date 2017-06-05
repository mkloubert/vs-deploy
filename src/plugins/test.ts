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
import * as i18 from '../i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as Workflows from 'node-workflows';


interface DeployTargetTest extends deploy_contracts.TransformableDeployTarget {
}

class TestPlugin extends deploy_objects.DeployPluginBase {
    public get canGetFileInfo(): boolean {
        return true;
    }
    
    public get canPull(): boolean {
        return true;
    }
    
    public deployFile(file: string, target: DeployTargetTest, opts?: deploy_contracts.DeployFileOptions): void {
        this.downloadFile(file, target, opts,
                          deploy_contracts.DataTransformerMode.Transform).then(() => {
            // already handled
        }).catch(() => {
            // already handled
        });
    }

    public downloadFile(file: string, target: DeployTargetTest, opts?: deploy_contracts.DeployFileOptions,
                        transformMode?: deploy_contracts.DataTransformerMode): Promise<Buffer> {
        if (!opts) {
            opts = {};
        }

        if (arguments.length < 4) {
            transformMode = deploy_contracts.DataTransformerMode.Restore;
        }
        
        let me = this;
        
        return new Promise<Buffer>((resolve, reject) => {
            let hasCancelled = false;
            let completed = (err: any, data?: Buffer) => {
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: hasCancelled,
                        error: err,
                        file: file,
                        target: target,
                    });
                }

                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            };

            me.onCancelling(() => hasCancelled = true, opts);

            try {
                let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory);
                if (false === relativePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: relativePath,
                        file: file,
                        target: target,
                    });
                }

                FS.readFile(file, (err, data) => {
                    if (hasCancelled) {
                        completed(null);  // cancellation requested
                        return;
                    }

                    if (err) {
                        completed(err);
                    }
                    else {
                        try {
                            let subCtx = {
                                file: file,
                                remoteFile: relativePath,
                            };

                            let tCtx = me.createDataTransformerContext(target, transformMode,
                                                                       subCtx);
                            tCtx.data = data;

                            let transformer = me.loadDataTransformer(target, transformMode);

                            let tResult = Promise.resolve(transformer(tCtx));
                            tResult.then(() => {
                                completed(null);
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public async getFileInfo(file: string, target: DeployTargetTest, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        let me = this;
        
        if (!opts) {
            opts = {};
        }

        let relativeTargetFilePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory);
        if (false === relativeTargetFilePath) {
            throw new Error(i18.t('relativePaths.couldNotResolve', file));
        }

        let targetFile = file;
        let targetDirectory = Path.dirname(targetFile);
        
        let wf = Workflows.create();

        // check if exist
        wf.next((ctx) => {
            let result: deploy_contracts.FileInfo = {
                exists: undefined,
                isRemote: true,
            };

            ctx.result = result;

            return new Promise<any>((resolve, reject) => {
                FS.exists(targetFile, (exists) => {
                    result.exists = exists

                    if (!result.exists) {
                        ctx.finish();  // no file, no info
                    }

                    resolve();
                });
            });
        });

        // get file info?
        wf.next((ctx) => {
            let result: deploy_contracts.FileInfo = ctx.result;

            return new Promise<any>((resolve, reject) => {
                FS.lstat(targetFile, (err, stat) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        try {
                            result.name = Path.basename(targetFile);
                            result.path = targetDirectory;
                            result.modifyTime = Moment(stat.ctime);
                            result.size = stat.size;

                            resolve();
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        });

        return wf.start();
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.test.description'),
        };
    }

    public pullFile(file: string, target: DeployTargetTest, opts?: deploy_contracts.DeployFileOptions): void {
        this.downloadFile(file, target, opts,
                          deploy_contracts.DataTransformerMode.Restore).then(() => {
            // already handled
        }).catch(() => {
            // already handled
        });
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
    return new TestPlugin(ctx);
}
