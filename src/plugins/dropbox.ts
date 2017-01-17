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
import * as HTTPs from 'https';
import * as i18 from '../i18';
import * as Path from 'path';


const PATH_SEP = '/';

interface DeployTargetDropbox extends deploy_contracts.DeployTarget {
    dir?: string;
    empty?: boolean;
    transformer?: string;
    transformerOptions?: any;
    token: string;
}

interface DropboxContext {
    dir: string;
    hasCancelled: boolean;
    transformer: deploy_contracts.DataTransformer;
    token: string;
}

interface DropboxListFolderEntry {
    path_display?: string;
}

interface DropboxListFolderResult {
    entries?: DropboxListFolderEntry[];
    cursor?: string;
    has_more: boolean;
}

interface TransformerContext {
    file: string;
    globals: deploy_contracts.GlobalVariables;
}


function getDirFromTarget(target: DeployTargetDropbox): string {
    let dir = deploy_helpers.toStringSafe(target.dir).trim();
    if (!dir) {
        dir = PATH_SEP;
    }

    return dir;
}

function toDropboxPath(path: string): string {
    let result = deploy_helpers.replaceAllStrings(path, Path.sep, PATH_SEP).trim();
    
    // remote leading path separators
    while (0 == result.indexOf(PATH_SEP)) {
        result = result.substr(1).trim();
    }

    // remote ending path separators
    while ((result.length) > 0 &&
           (result.lastIndexOf(PATH_SEP) == (result.length - 1))) {
        result = result.substr(0, result.length - 1).trim();
    }

    if (0 != result.indexOf(PATH_SEP)) {
        result = PATH_SEP + result;
    }

    if (PATH_SEP == result) {
        result = '';
    }

    return result;
}


class DropboxPlugin extends deploy_objects.DeployPluginWithContextBase<DropboxContext> {
    protected createContext(target: DeployTargetDropbox,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<DropboxContext>> {
        let me = this;
        let dir = getDirFromTarget(target);

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

        let empty = deploy_helpers.toBooleanSafe(target.empty);

        return new Promise<deploy_objects.DeployPluginContextWrapper<DropboxContext>>((resolve, reject) => {
            let completed = (err?: any, wrapper?: deploy_objects.DeployPluginContextWrapper<DropboxContext>) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(wrapper);
                }
            };
            
            try {
                let ctx: DropboxContext = {
                    dir: dir,
                    hasCancelled: false,
                    transformer: transformer,
                    token: deploy_helpers.toStringSafe(target.token),
                };

                me.onCancelling(() => ctx.hasCancelled = true, opts);

                let wrapper: deploy_objects.DeployPluginContextWrapper<DropboxContext> = {
                    context: ctx,
                };

                if (empty) {
                    let targetDirectory = toDropboxPath(dir);

                    let headersToSubmit = {
                        'Authorization': `Bearer ${ctx.token}`,
                        'Content-Type': 'application/json',
                    };

                    let cursor: string;
                    let deleteItem: (item: string) => Promise<any>;
                    let deleteNextFiles: () => void;
                    let hasMoreItemsToDelete = true;

                    // delete an item
                    deleteItem = (item: string): Promise<any> => {
                        return new Promise<any>((resolve, reject) => {
                            let deletionCompleted = (err?: any) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(err);
                                }
                            };

                            try {
                                let req = HTTPs.request({
                                    headers: headersToSubmit,
                                    host: 'api.dropboxapi.com',
                                    method: 'POST',
                                    path: '/2/files/delete',
                                    port: 443,
                                    protocol: 'https:',
                                }, (resp) => {
                                    let err: Error;

                                    switch (resp.statusCode) {
                                        case 200:
                                        case 409:  // not found
                                            // OK
                                            break;

                                        default:
                                            err = new Error(i18.t('plugins.dropbox.unknownResponse',
                                                                  resp.statusCode, 2, resp.statusMessage));
                                            break;
                                    }

                                    deletionCompleted(err);
                                });

                                req.once('error', (err) => {
                                    if (err) {
                                        deletionCompleted(err);
                                    }
                                });

                                let json = JSON.stringify({
                                    path: item,
                                });

                                req.write(json);

                                req.end();
                            }
                            catch (e) {
                                deletionCompleted(e);
                            }
                        });
                    };

                    // delete next files
                    deleteNextFiles = () => {
                        if (!hasMoreItemsToDelete) {
                            completed(null, wrapper);  // nothing more to delete
                            return;
                        }

                        let apiPath: string;
                        let dataToSend: any;
                        if (cursor) {
                            apiPath = '/2/files/list_folder/continue';

                            dataToSend = {
                                "cursor": cursor,
                            };
                        }
                        else {
                            apiPath = '/2/files/list_folder';

                            dataToSend = {
                                "path": targetDirectory,
                                "recursive": false,
                                "include_media_info": false,
                                "include_deleted": false,
                                "include_has_explicit_shared_members": false,
                            };
                        }
                        
                        try {
                            let req = HTTPs.request({
                                headers: headersToSubmit,
                                host: 'api.dropboxapi.com',
                                method: 'POST',
                                path: apiPath,
                                port: 443,
                                protocol: 'https:',
                            }, (resp) => {
                                hasMoreItemsToDelete = false;

                                deploy_helpers.getHttpBody(resp).then((body) => {
                                    try {
                                        let err: Error;

                                        switch (resp.statusCode) {
                                            case 200:
                                            case 409:  // not found
                                                let json = body.toString('utf8');
                                                if (json) {
                                                    let result: DropboxListFolderResult = JSON.parse(json);
                                                    if (result) {
                                                        hasMoreItemsToDelete = result.has_more;
                                                        cursor = result.cursor;

                                                        if (result.entries) {
                                                            let entriesToDo = result.entries.filter(x => x);

                                                            let deleteNextEntry: () => void;
                                                            deleteNextEntry = () => {
                                                                if (entriesToDo.length < 1) {
                                                                    deleteNextFiles();
                                                                    return;
                                                                }

                                                                let e = entriesToDo.shift();

                                                                deleteItem(e.path_display).then(() => {
                                                                    deleteNextEntry();
                                                                }).catch((err) => {
                                                                    completed(err);
                                                                });
                                                            };

                                                            deleteNextEntry();
                                                        }
                                                        else {
                                                            deleteNextFiles();
                                                        }
                                                    }
                                                }
                                                break;

                                            default:
                                                err = new Error(i18.t('plugins.dropbox.unknownResponse',
                                                                      resp.statusCode, 2, resp.statusMessage));
                                                break;
                                        }

                                        if (err) {
                                            completed(err);
                                        }
                                        else {
                                            completed(null, wrapper);
                                        }
                                    }
                                    catch (e) {
                                        completed(e);
                                    }
                                }).catch((err) => {
                                    completed(err);
                                });
                            });

                            req.once('error', (err) => {
                                if (err) {
                                    completed(err);
                                }
                            });

                            if (dataToSend) {
                                req.write(JSON.stringify(dataToSend));
                            }

                            req.end();
                        }
                        catch (e) {
                            completed(e);
                        }
                    };

                    deleteNextFiles();
                }
                else {
                    completed(null, wrapper);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    protected deployFileWithContext(ctx: DropboxContext,
                                    file: string, target: DeployTargetDropbox, opts?: deploy_contracts.DeployFileOptions): void {
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
            let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativeFilePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let targetFile = toDropboxPath(Path.join(ctx.dir, relativeFilePath));
            let targetDirectory = toDropboxPath(Path.dirname(targetFile));

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: targetDirectory,
                    file: file,
                    target: target,
                });
            }

            try {
                let uploadFile = (data: Buffer) => {
                    try {
                        let headersToSubmit = {
                            'Authorization': `Bearer ${ctx.token}`,
                            'Content-Type': 'application/octet-stream',
                            'Dropbox-API-Arg': JSON.stringify({
                                "path": targetFile,
                                "mode": "overwrite",
                                "autorename": false,
                                "mute": false,
                            }),
                        };

                        // start the request
                        let req = HTTPs.request({
                            headers: headersToSubmit,
                            host: 'content.dropboxapi.com',
                            method: 'POST',
                            path: '/2/files/upload',
                            port: 443,
                            protocol: 'https:',
                        }, (resp) => {
                            let err: Error;

                            switch (resp.statusCode) {
                                case 200:
                                    // OK
                                    break;

                                default:
                                    err = new Error(i18.t('plugins.dropbox.unknownResponse',
                                                        resp.statusCode, 2, resp.statusMessage));
                                    break;
                            }

                            completed(err);
                        });

                        req.once('error', (err) => {
                            if (err) {
                                completed(err);
                            }
                        });

                        // send file content
                        req.write(data);

                        req.end();
                    }
                    catch (e) {
                        completed(e);
                    }
                }

                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    try {
                        let transformerCtx: TransformerContext = {
                            file: file,
                            globals: me.context.globals(),
                        };

                        ctx.transformer({
                            context: transformerCtx,
                            data: data,
                            mode: deploy_contracts.DataTransformerMode.Transform,
                            options: target.transformerOptions,
                        }).then((transformedData) => {
                            uploadFile(transformedData);
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

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.dropbox.description'),
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
    return new DropboxPlugin(ctx);
}
