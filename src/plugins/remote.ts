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
import * as Net from 'net';
const UUID = require('node-uuid');
import * as ZLib from 'zlib';


interface DeployTargetRemote extends deploy_contracts.DeployTarget {
    hosts?: string | string[];
    messageTransformer?: string;
    messageTransformerOptions?: any;
    tag?: any;
    transformer?: string;
    transformerOptions?: any;
}

/**
 * A file to send (JSON message).
 */
export interface RemoteFile {
    /**
     * The data.
     */
    data?: string;
    /**
     * Indicates if 'data' is compressed or not.
     */
    isCompressed?: boolean;
    /**
     * Indicates if entry is the first one or not.
     */
    isFirst: boolean;
    /**
     * Indicates if entry is the last one or not.
     */
    isLast: boolean;
    /**
     * The name / path of the file.
     */
    name: string;
    /**
     * The index / number of the file (beginning at 1).
     */
    nr: number;
    /**
     * The session ID.
     */
    session: string;
    /**
     * An addtional value send by remote client.
     */
    tag?: any;
    /**
     * The total number of files that will be send.
     */
    totalCount: number;
}

interface RemoteContext {
    counter: number;
    hasCancelled: boolean;
    hosts: string[];
    session: string;
    totalCount: number;
}

/**
 * A file data transformer sub context.
 */
export interface FileDataTransformerContext extends TransformerContext {
    compress?: boolean;
}

/**
 * A message transformer sub context.
 */
export interface MessageTransformerContext extends TransformerContext {
}

/**
 * A transformer sub context.
 */
export interface TransformerContext {
    /**
     * The path of the local file.
     */
    file: string;
    /**
     * Gets the list of global variables defined in settings.
     */
    globals: deploy_contracts.GlobalVariables;
    /**
     * The file to send.
     */
    remoteFile: RemoteFile;
}

class RemotePlugin extends deploy_objects.DeployPluginWithContextBase<RemoteContext> {
    protected createContext(target: DeployTargetRemote,
                            files: string[],
                            opts): Promise<deploy_objects.DeployPluginContextWrapper<RemoteContext>> {
        let me = this;

        return new Promise<deploy_objects.DeployPluginContextWrapper<RemoteContext>>((resolve, reject) => {
            try {
                let now = Moment().utc();

                let hosts = deploy_helpers.asArray(target.hosts)
                                          .map(x => deploy_helpers.toStringSafe(x))
                                          .filter(x => x);

                let id = deploy_helpers.toStringSafe(UUID.v4());
                id = deploy_helpers.replaceAllStrings(id, '-', '');

                let ctx: RemoteContext = {
                    counter: 0,
                    hasCancelled: false,
                    hosts: hosts,
                    session: `${now.format('YYYYMMDDHHmmss')}-${id}`,
                    totalCount: files.length,
                };

                me.onCancelling(() => ctx.hasCancelled = true, opts);
                
                let wrapper: deploy_objects.DeployPluginContextWrapper<RemoteContext> = {
                    context: ctx,
                };

                resolve(wrapper);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    protected deployFileWithContext(ctx: RemoteContext,
                                    file: string, target: DeployTargetRemote, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        ++ctx.counter;

        let allErrors: any[] = [];
        let completed = (err?: any) => {
            if (err) {
                allErrors.push(err);
            }

            if (allErrors.length > 1) {
                err = new Error(allErrors.map((x, i) => i18.t('errors.countable', i + 1, x))
                                         .join('\n\n'));
            }
            else if (1 == allErrors.length) {
                err = allErrors[0];
            }

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
            // data transformer
            let transformer: deploy_contracts.DataTransformer;
            if (target.transformer) {
                let transformerModule = deploy_helpers.loadDataTransformerModule(target.transformer);
                if (transformerModule) {
                    transformer = transformerModule.transformData ||
                                transformerModule.restoreData;
                }
            }
            transformer = deploy_helpers.toDataTransformerSafe(transformer);

            // data transformer
            // for the whole JSON message
            let jsonTransformer: deploy_contracts.DataTransformer;
            if (target.messageTransformer) {
                let jsonTransformerModule = deploy_helpers.loadDataTransformerModule(target.messageTransformer);
                if (jsonTransformerModule) {
                    jsonTransformer = jsonTransformerModule.transformData ||
                                    jsonTransformerModule.restoreData;
                }
            }
            jsonTransformer = deploy_helpers.toDataTransformerSafe(jsonTransformer);

            try {
                let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                while (0 == relativePath.indexOf('/')) {
                    relativePath = relativePath.substr(1);
                }

                if (!relativePath) {
                    completed(new Error(i18.t('relativePaths.isEmpty', file)));
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
                    if (err) {
                        completed(err);
                        return;
                    }

                    let remoteFile: RemoteFile = {
                        isFirst: 1 == ctx.counter,
                        isLast: ctx.counter == ctx.totalCount,
                        name: <string>relativePath,
                        nr: ctx.counter,
                        session: ctx.session,
                        tag: target.tag,
                        totalCount: ctx.totalCount,
                    };

                    let transformCtx: FileDataTransformerContext = {
                        file: file,
                        globals: me.context.globals(),
                        remoteFile: remoteFile,
                    };

                    transformer({
                        context: transformCtx,
                        data: data,
                        mode: deploy_contracts.DataTransformerMode.Transform,
                        options: target.transformerOptions,
                    }).then((transformedFileData) => {
                        ZLib.gzip(transformedFileData, (err, compressedData) => {
                            if (err) {
                                completed(err);
                                return;
                            }

                            if (deploy_helpers.isNullOrUndefined(transformCtx.compress)) {
                                // auto compression
                                remoteFile.isCompressed = compressedData.length < transformedFileData.length;
                            }
                            else {
                                remoteFile.isCompressed = deploy_helpers.toBooleanSafe(transformCtx.compress);
                            }

                            let dataToSend = remoteFile.isCompressed ? compressedData : transformedFileData;

                            try {
                                remoteFile.data = dataToSend.toString('base64');
                            }
                            catch (e) {
                                completed(e);
                                return;
                            }

                            let json: Buffer;
                            try {
                                json = new Buffer(JSON.stringify(remoteFile), 'utf8');
                            }
                            catch (e) {
                                completed(e);
                                return;
                            }

                            let jsonTransformerCtx: MessageTransformerContext = {
                                file: file,
                                globals: me.context.globals(),
                                remoteFile: remoteFile,
                            };

                            jsonTransformer({
                                context: jsonTransformerCtx,
                                data: json,
                                mode: deploy_contracts.DataTransformerMode.Transform,
                                options: target.messageTransformerOptions,
                            }).then((transformedJsonData) => {
                                let hostsTodo = ctx.hosts.map(x => x);
                                let deployNext: () => void;
                                deployNext = () => {
                                    if (hostsTodo.length < 1) {
                                        completed();
                                        return;
                                    }

                                    let h = hostsTodo.pop();
                                    if (!h) {
                                        completed();
                                        return;
                                    }

                                    let hostCompleted = (err?: any) => {
                                        if (err) {
                                            allErrors.push(err);
                                        }

                                        deployNext();
                                    };

                                    try {
                                        let addr = h;
                                        let port = deploy_contracts.DEFAULT_PORT;
                                        
                                        let separator = h.indexOf(':');
                                        if (separator > -1) {
                                            addr = deploy_helpers.toStringSafe(h.substr(0, separator).toLowerCase().trim(),
                                                                            deploy_contracts.DEFAULT_HOST);

                                            port = parseInt(deploy_helpers.toStringSafe(h.substr(separator + 1).trim(),
                                                                                        '' + deploy_contracts.DEFAULT_PORT));
                                        }

                                        let client = new Net.Socket();

                                        client.on('error', (err) => {
                                            hostCompleted(err);
                                        });

                                        client.connect(port, addr, (err) => {
                                            if (err) {
                                                hostCompleted(err);
                                                return;
                                            }

                                            try {
                                                let dataLength = Buffer.alloc(4);
                                                dataLength.writeUInt32LE(transformedJsonData.length, 0);

                                                client.write(dataLength);
                                                client.write(transformedJsonData);

                                                try {
                                                    client.destroy();
                                                }
                                                catch (e) {
                                                    me.context.log(i18.t('errors.withCategory',
                                                                        'RemotePlugin.deployFile().client.connect()', e));
                                                }

                                                hostCompleted();
                                            }
                                            catch (e) {
                                                hostCompleted(e);
                                            }
                                        });
                                    }
                                    catch (e) {
                                        hostCompleted(e);
                                    }
                                };

                                deployNext();
                            }).catch((err) => {
                                completed(err);  // JSON data transformation failed
                            });
                        });
                    }).catch((err) => {
                        completed(err);  // file data transformation failed
                    });
                });
            }
            catch (e) {
                completed(e);
            }
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.remote.description'),
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
    return new RemotePlugin(ctx);
}
