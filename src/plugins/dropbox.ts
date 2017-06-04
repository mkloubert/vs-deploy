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

import * as Crypto from 'crypto';
import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as FS from 'fs';
import * as HTTPs from 'https';
import * as i18 from '../i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';


const PATH_SEP = '/';

interface DeployTargetDropbox extends deploy_contracts.TransformableDeployTarget, deploy_contracts.AccessTokenObject {
    dir?: string;
    empty?: boolean;
    password?: string;
    passwordAlgorithm?: string;
    token: string;
}

interface DropboxContext {
    dir: string;
    hasCancelled: boolean;
    passwordTransformer: deploy_contracts.DataTransformer;
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
    while (0 === result.indexOf(PATH_SEP)) {
        result = result.substr(1).trim();
    }

    // remote ending path separators
    while ((result.length) > 0 &&
           (result.lastIndexOf(PATH_SEP) === (result.length - 1))) {
        result = result.substr(0, result.length - 1).trim();
    }

    if (0 !== result.indexOf(PATH_SEP)) {
        result = PATH_SEP + result;
    }

    if (PATH_SEP === result) {
        result = '';
    }

    return result;
}


class DropboxPlugin extends deploy_objects.DeployPluginWithContextBase<DropboxContext> {
    public get canGetFileInfo(): boolean {
        return true;
    }

    public get canPull(): boolean {
        return true;
    }

    protected createContext(target: DeployTargetDropbox,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions,
                            direction: deploy_contracts.DeployDirection): Promise<deploy_objects.DeployPluginContextWrapper<DropboxContext>> {
        let me = this;
        let dir = getDirFromTarget(target);

        target = deploy_helpers.cloneObject(target);

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
                    passwordTransformer: undefined,
                    token: deploy_helpers.toStringSafe(target.token),
                };

                let pwd = deploy_helpers.toStringSafe(target.password);
                if ('' !== pwd) {
                    // use password

                    let pwdAlgo = deploy_helpers.normalizeString(target.passwordAlgorithm);
                    if ('' === pwdAlgo) {
                        pwdAlgo = deploy_contracts.DEFAULT_PASSWORD_ALGORITHM;
                    }

                    ctx.passwordTransformer = (ctx) => {
                        return new Promise<Buffer>((resolve, reject) => {
                            try {
                                let cipher: Crypto.Cipher | Crypto.Decipher;
                                if (ctx.mode === deploy_contracts.DataTransformerMode.Transform) {
                                    cipher = Crypto.createCipher(pwdAlgo, pwd);
                                }
                                else {
                                    cipher = Crypto.createDecipher(pwdAlgo, pwd);
                                }

                                let a = cipher.update(ctx.data);
                                let b = cipher.final();

                                // return crypted data
                                resolve(Buffer.concat([a, b]));
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    };
                }

                ctx.passwordTransformer = deploy_helpers.toDataTransformerSafe(ctx.passwordTransformer);

                me.onCancelling(() => ctx.hasCancelled = true, opts);

                let wrapper: deploy_objects.DeployPluginContextWrapper<DropboxContext> = {
                    context: ctx,
                };

                let prepareWrapper = () => {
                    let doEmpty = false;
                    switch (direction) {
                        case deploy_contracts.DeployDirection.Deploy:
                            doEmpty = empty;
                            break;
                    }

                    if (doEmpty) {
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
                };

                let askForTokenIfNeeded = () => {
                    let showTokenPrompt = false;
                    if (deploy_helpers.isEmptyString(ctx.token)) {
                        // user defined, but no password
                        showTokenPrompt = deploy_helpers.toBooleanSafe(target.promptForToken, true);
                    }

                    if (showTokenPrompt) {
                        vscode.window.showInputBox({
                            placeHolder: i18.t('prompts.inputAccessToken'),
                            password: true,
                        }).then((tokenFromUser) => {
                            if (deploy_helpers.isEmptyString(tokenFromUser)) {
                                ctx.hasCancelled = true;  // cancelled
                                
                                completed(null, wrapper);
                            }
                            else {
                                ctx.token = tokenFromUser.trim();

                                prepareWrapper();
                            }
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        prepareWrapper();
                    }
                };

                askForTokenIfNeeded();
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
                        let subCtx = {
                            file: file,
                            globals: me.context.globals(),
                            remoteFile: relativeFilePath,
                        };

                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform,
                                                                   subCtx);
                        tCtx.data = data;

                        // first transform data
                        let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                        Promise.resolve(tResult).then((transformedData) => {
                            try {
                                let pwdTCtx = me.createDataTransformerContext(null, deploy_contracts.DataTransformerMode.Transform,
                                                                              subCtx);
                                pwdTCtx.data = transformedData;

                                // then ENcrypt daza
                                Promise.resolve(ctx.passwordTransformer(pwdTCtx)).then((cryptedData) => {
                                    try {
                                        uploadFile(cryptedData);
                                    }
                                    catch (e) {
                                        completed(e);
                                    }
                                }).catch((err) => {
                                    completed(err);
                                });
                            }
                            catch (e) {
                                completed(e);
                            }
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

    protected downloadFileWithContext(ctx: DropboxContext,
                                      file: string, target: DeployTargetDropbox, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
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
                    let headersToSubmit = {
                        'Authorization': `Bearer ${ctx.token}`,
                        'Dropbox-API-Arg': JSON.stringify({
                            "path": targetFile
                        }),
                    };

                    // start the request
                    let req = HTTPs.request({
                        headers: headersToSubmit,
                        host: 'content.dropboxapi.com',
                        method: 'POST',
                        path: '/2/files/download',
                        port: 443,
                        protocol: 'https:',
                    }, (resp) => {
                        let err: Error;

                        let next = () => {
                            completed(err);
                        };

                        switch (resp.statusCode) {
                            case 200:
                                next = null;

                                deploy_helpers.readHttpBody(resp).then((data) => {
                                    try {
                                        let subCtx = {
                                            file: file,
                                            globals: me.context.globals(),
                                            remoteFile: relativeFilePath,
                                        };

                                        let pwdTCtx = me.createDataTransformerContext(null, deploy_contracts.DataTransformerMode.Restore,
                                                                                      subCtx);
                                        pwdTCtx.data = data;

                                        // first UNcrypt data
                                        Promise.resolve(ctx.passwordTransformer(pwdTCtx)).then((uncryptedData) => {
                                            try {
                                                let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Restore,
                                                                                           subCtx);
                                                tCtx.data = uncryptedData;

                                                // then UNtransform data
                                                let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Restore)(tCtx);
                                                Promise.resolve(tResult).then((untransformedData) => {
                                                    completed(null, untransformedData);
                                                }).catch((err) => {
                                                    completed(err);
                                                });
                                            }
                                            catch (e) {
                                                completed(e);
                                            }
                                        }).catch((err) => {
                                            completed(err);
                                        });
                                    }
                                    catch (e) {
                                        completed(e);
                                    }
                                }).catch((err) => {
                                    completed(err);
                                });
                                break;

                            case 404:
                                // not found
                                err = new Error(i18.t('plugins.dropbox.notFound'));
                                break;

                            default:
                                err = new Error(i18.t('plugins.dropbox.unknownResponse',
                                                      resp.statusCode, 2, resp.statusMessage));
                                break;
                        }

                        if (next) {
                            next();
                        }
                    });

                    req.once('error', (err) => {
                        if (err) {
                            completed(err);
                        }
                    });

                    req.end();
                }
                catch (e) {
                    completed(e);
                }
            }
        });
    }

    protected getFileInfoWithContext(ctx: DropboxContext,
                                      file: string, target: DeployTargetDropbox, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        let me = this;
        
        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = (err: any, info?: deploy_contracts.FileInfo) => {
                if (!info) {
                    info = {
                        exists: false,
                        isRemote: true,
                    }
                }

                resolve(info);
            };

            if (ctx.hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativeFilePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                let targetFile = toDropboxPath(Path.join(ctx.dir, relativeFilePath));
                let targetDirectory = toDropboxPath(Path.dirname(targetFile));

                try {
                    let headersToSubmit = {
                        'Authorization': `Bearer ${ctx.token}`,
                    };

                    // start the request
                    let req = HTTPs.request({
                        headers: headersToSubmit,
                        host: 'api.dropboxapi.com',
                        method: 'POST',
                        path: '/1/metadata/auto' + targetFile,
                        port: 443,
                        protocol: 'https:',
                    }, (resp) => {
                        let err: Error;

                        let info: deploy_contracts.FileInfo = {
                            exists: false,
                            isRemote: true,        
                        };

                        let next = () => {
                            completed(err);
                        };

                        switch (resp.statusCode) {
                            case 200:
                                next = null;

                                info.exists = true;

                                deploy_helpers.readHttpBody(resp).then((data) => {
                                    try {
                                        let json: any = JSON.parse(data.toString('utf8'));
                                        if (json) {
                                            info.size = json.bytes;
                                            info.name = Path.basename(json.path);
                                            info.path = Path.dirname(json.path);

                                            try {
                                                info.modifyTime = Moment(json.modified);
                                            }
                                            catch (e) {
                                            }
                                        }
                                    }
                                    catch (e) {
                                    }

                                    completed(null, info);
                                }).catch((err) => {
                                    completed(err, info);
                                });
                                break;

                            case 404:
                                // not found
                                err = new Error(i18.t('plugins.dropbox.notFound'));
                                break;

                            default:
                                err = new Error(i18.t('plugins.dropbox.unknownResponse',
                                                      resp.statusCode, 2, resp.statusMessage));
                                break;
                        }

                        if (next) {
                            next();
                        }
                    });

                    req.once('error', (err) => {
                        if (err) {
                            completed(err);
                        }
                    });

                    req.end();
                }
                catch (e) {
                    completed(e);
                }
            }
        });
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
