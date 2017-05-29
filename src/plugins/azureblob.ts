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

import * as AzureStorage from 'azure-storage';
import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as FS from 'fs';
import * as i18 from '../i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as TMP from 'tmp';


interface DeployTargetAzureBlob extends deploy_contracts.TransformableDeployTarget {
    accessKey?: string;
    account?: string;
    container: string;
    dir?: string;
    host?: string;
    publicAccessLevel?: string;
    detectMime?: boolean;
    contentType?: string;
}

interface AzureBlobContext {
    container: string;
    dir: string;
    hasCancelled: boolean;
    service: AzureStorage.BlobService;
}

class AzureBlobPlugin extends deploy_objects.DeployPluginWithContextBase<AzureBlobContext> {
    public get canGetFileInfo(): boolean {
        return true;
    }
    
    public get canPull(): boolean {
        return true;
    }

    protected createContext(target: DeployTargetAzureBlob,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<AzureBlobContext>> {         
        let me = this;
        
        let containerName = deploy_helpers.toStringSafe(target.container)
                                          .trim();

        let dir = deploy_helpers.toStringSafe(target.dir).trim();
        while ((dir.length > 0) && (0 == dir.indexOf('/'))) {
            dir = dir.substr(1).trim();
        }
        while ((dir.length > 0) && ((dir.length - 1) == dir.lastIndexOf('/'))) {
            dir = dir.substr(0, dir.length - 1).trim();
        }
        dir += '/';
        
        return new Promise<deploy_objects.DeployPluginContextWrapper<any>>((resolve, reject) => {
            try {
                let service = AzureStorage.createBlobService(target.account, target.accessKey,
                                                             target.host);

                let wrapper: deploy_objects.DeployPluginContextWrapper<AzureBlobContext> = {
                    context: {
                        container: containerName,
                        dir: dir,
                        hasCancelled: false,
                        service: service,
                    },
                };

                me.onCancelling(() => wrapper.context.hasCancelled = true, opts);

                resolve(wrapper);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    protected deployFileWithContext(ctx: AzureBlobContext,
                                    file: string, target: DeployTargetAzureBlob, opts?: deploy_contracts.DeployFileOptions): void {
        let me = this;

        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: ctx.hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        if (ctx.hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            try {
                let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                // remove leading '/' chars
                let blob = relativePath;
                while (0 === blob.indexOf('/')) {
                    blob = blob.substr(1);
                }
                blob = ctx.dir + blob;
                while (0 === blob.indexOf('/')) {
                    blob = blob.substr(1);
                }

                let contentType = deploy_helpers.normalizeString(target.contentType);
                if ('' === contentType) {
                    // no explicit content type

                    if (deploy_helpers.toBooleanSafe(target.detectMime, true)) {  // detect?
                        contentType = deploy_helpers.detectMimeByFilename(file);
                    }
                }

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: blob,
                        file: file,
                        target: target,
                    });
                }

                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    if (ctx.hasCancelled) {
                        completed();
                        return;
                    }

                    try {
                        let accessLevel = deploy_helpers.toStringSafe(target.publicAccessLevel);
                        if (deploy_helpers.isEmptyString(accessLevel)) {
                            accessLevel = 'blob';
                        }

                        let opts: AzureStorage.BlobService.CreateContainerOptions = {
                            publicAccessLevel: accessLevel
                        };

                        let subCtx = {
                            file: file,
                            remoteFile: relativePath,
                        };

                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform,
                                                                   subCtx);
                        tCtx.data = data;

                        let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                        Promise.resolve(tResult).then((transformedData) => {
                            ctx.service.createContainerIfNotExists(ctx.container, opts, (err) => {
                                if (err) {
                                    completed(err);
                                    return;
                                }

                                if (ctx.hasCancelled) {
                                    completed();
                                    return;
                                }

                                ctx.service.createBlockBlobFromText(ctx.container, blob, transformedData, {
                                    contentSettings: {
                                        contentType: contentType,
                                    },
                                }, (err) => {
                                    completed(err);
                                });
                            });
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        }
    }

    protected downloadFileWithContext(ctx: AzureBlobContext,
                                      file: string, target: DeployTargetAzureBlob, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let completed = (err: any, data?: Buffer) => {
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: ctx.hasCancelled,
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

            if (ctx.hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                try {
                    let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                    if (false === relativePath) {
                        completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                        return;
                    }

                    // remove leading '/' chars
                    let blob = relativePath;
                    while (0 === blob.indexOf('/')) {
                        blob = blob.substr(1);
                    }
                    blob = ctx.dir + blob;
                    while (0 === blob.indexOf('/')) {
                        blob = blob.substr(1);
                    }

                    if (opts.onBeforeDeploy) {
                        opts.onBeforeDeploy(me, {
                            destination: blob,
                            file: file,
                            target: target,
                        });
                    }

                    TMP.tmpName({
                        keep: true,
                    }, (err, tmpPath) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            // delete temp file
                            let deleteTempFile = (e: any, data?: Buffer) => {
                                FS.exists(tmpPath, (exists) => {
                                    if (exists) {
                                        FS.unlink(tmpPath, () => {
                                            completed(e, data);
                                        });
                                    }
                                    else {
                                        completed(e, data);  // nothing to delete
                                    }
                                });
                            };

                            ctx.service.getBlobToLocalFile(ctx.container, blob, tmpPath, (e) => {
                                if (e) {
                                    deleteTempFile(e);  // could not download blob
                                }
                                else {
                                    FS.readFile(tmpPath, (e, data) => {
                                        try {
                                            let subCtx = {
                                                file: file,
                                                remoteFile: relativePath,
                                                tempFile: tmpPath,
                                            };

                                            let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Restore,
                                                                                       subCtx);
                                            tCtx.data = data;

                                            let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Restore)(tCtx);
                                            Promise.resolve(tResult).then((untransformedData) => {
                                                deleteTempFile(null, untransformedData);
                                            }).catch((err) => {
                                                deleteTempFile(err);
                                            });
                                        }
                                        catch (err) {
                                            deleteTempFile(err);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }

    protected getFileInfoWithContext(ctx: AzureBlobContext,
                                     file: string, target: deploy_contracts.DeployTarget, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        let me = this;

        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = (err: any, info?: deploy_contracts.FileInfo) => {
                if (!info) {
                    info = {
                        exists: false,
                        isRemote: true,
                    };
                }

                resolve(info);
            };

            if (ctx.hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                try {
                    let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                    if (false === relativePath) {
                        completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                        return;
                    }

                    // remove leading '/' chars
                    let blob = relativePath;
                    while (0 === blob.indexOf('/')) {
                        blob = blob.substr(1);
                    }
                    blob = ctx.dir + blob;
                    while (0 === blob.indexOf('/')) {
                        blob = blob.substr(1);
                    }

                    ctx.service.getBlobProperties(ctx.container, blob, (err, result) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            let info: deploy_contracts.FileInfo = {
                                exists: true,
                                isRemote: true,
                                name: Path.basename(<string>relativePath),
                                path: Path.dirname(<string>relativePath),
                            };

                            if (!deploy_helpers.isNullUndefinedOrEmptyString(result.lastModified)) {
                                try {
                                    info.modifyTime = Moment(result.lastModified);
                                }
                                catch (e) {
                                }
                            }

                            if (!deploy_helpers.isNullUndefinedOrEmptyString(result.contentLength)) {
                                try {
                                    info.size = parseInt(deploy_helpers.toStringSafe(result.contentLength).trim());
                                }
                                catch (e) {
                                }
                            }

                            completed(err, info);
                        }
                    });
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.azureblob.description'),
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
    return new AzureBlobPlugin(ctx);
}
