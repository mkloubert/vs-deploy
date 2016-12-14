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
import * as Net from 'net';
import * as ZLib from 'zlib';


interface DeployTargetRemote extends deploy_contracts.DeployTarget {
    hosts?: string | string[];
    transformer?: string;
    transformerOptions?: any;
}

interface RemoteFile {
    data?: string;
    isCompressed?: boolean;
    name: string;
}


class RemotePlugin extends deploy_objects.DeployPluginBase {
    public deployFile(file: string, target: DeployTargetRemote, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        let hosts = deploy_helpers.asArray(target.hosts)
                                  .map(x => deploy_helpers.toStringSafe(x))
                                  .filter(x => x);

        let allErrors: any[] = [];
        let completed = (err?: any) => {
            if (err) {
                allErrors.push(err);
            }

            if (allErrors.length > 1) {
                err = new Error(allErrors.map((x, i) => `ERROR #${i + 1}: ${deploy_helpers.toStringSafe(x)}`)
                                         .join('\n\n'));
            }
            else if (1 == allErrors.length) {
                err = allErrors[0];
            }

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

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

        try {
            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    file: file,
                    target: target,
                });
            }

            let relativePath = deploy_helpers.toRelativePath(file);
            if (false === relativePath) {
                completed(new Error(`Could not get relative path for '${file}' file!`));
                return;
            }

            while (0 == relativePath.indexOf('/')) {
                relativePath = relativePath.substr(1);
            }

            if (!relativePath) {
                completed(new Error(`Relative path for '${file}' file is empty!`));
                return;
            }

            FS.readFile(file, (err, data) => {
                if (err) {
                    completed(err);
                    return;
                }

                let remoteFile: RemoteFile = {
                    name: <string>relativePath,
                };

                transformer({
                    data: data,
                    mode: deploy_contracts.DataTransformerMode.Transform,
                    options: target.transformerOptions,
                }).then((transformedData) => {
                    ZLib.gzip(transformedData, (err, compressedData) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        remoteFile.isCompressed = compressedData.length < transformedData.length;
                        let dataToSend = remoteFile.isCompressed ? compressedData : transformedData;

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

                        let hostsTodo = hosts.map(x => x);
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
                                        dataLength.writeUInt32LE(json.length, 0);

                                        client.write(dataLength);
                                        client.write(json);

                                        try {
                                            client.destroy();
                                        }
                                        catch (e) {
                                            me.context.log(`[ERROR] RemotePlugin.deployFile().client.connect(): ${deploy_helpers.toStringSafe(e)}`);
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
                    });
                }).catch((err) => {
                    completed(err);
                });
            });
        }
        catch (e) {
            completed(e);
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: 'Deploys to a remote machine over a TCP connection',
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
    return new RemotePlugin(ctx);
}
