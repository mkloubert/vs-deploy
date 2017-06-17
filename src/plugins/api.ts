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
import * as HTTP from 'http';
import * as HTTPs from 'http';
import * as i18 from '../i18';
import * as URL from 'url';
import * as vscode from 'vscode';


interface DeployTargeApi extends deploy_contracts.TransformableDeployTarget, deploy_contracts.PasswordObject {
    host?: string;
    isSecure?: boolean;
    port?: number;
    user?: string;
    password?: string;
}


const TARGET_CACHE_PASSWORD = 'password';

class ApiPlugin extends deploy_objects.DeployPluginBase {
    protected askForPasswordIfNeeded(target: DeployTargeApi): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = (err: any, cancelled?: boolean) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(cancelled);
                }
            };
            
            let showPasswordPrompt = false;
            if (!deploy_helpers.isEmptyString(target.user) && deploy_helpers.isNullOrUndefined(target.password)) {
                // user defined, but no password

                let pwdFromCache = deploy_helpers.toStringSafe(me.context.targetCache().get(target, TARGET_CACHE_PASSWORD));
                if ('' === pwdFromCache) {
                    // nothing in cache
                    showPasswordPrompt = deploy_helpers.toBooleanSafe(target.promptForPassword, true);
                }
                else {
                    target.password = pwdFromCache;
                }
            }

            if (showPasswordPrompt) {
                vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    placeHolder: i18.t('prompts.inputPassword'),
                    password: true,
                }).then((passwordFromUser) => {
                    if ('undefined' === typeof passwordFromUser) {
                        completed(null, true);  // cancelled
                    }
                    else {
                        target.password = passwordFromUser;
                        me.context.targetCache().set(target,
                                                     TARGET_CACHE_PASSWORD, passwordFromUser);

                        completed(null, false);
                    }
                }, (err) => {
                    completed(err);
                });
            }
            else {
                completed(null, false);
            }
        });
    }

    public get canPull(): boolean {
        return true;
    }

    /** @inheritdoc */
    public deployFile(file: string, target: DeployTargeApi, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;

        target = deploy_helpers.cloneObject(target);
        
        let hasCancelled = false;
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        me.onCancelling(() => {
            hasCancelled = true;
        });

        if (hasCancelled) {
            completed();
            return;
        }

        try {
            let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory, opts.noMappings);
            if (false === relativePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let host = deploy_helpers.normalizeString(target.host);
            if (!host) {
                host = '127.0.0.1';
            }

            let port = target.port;
            if (deploy_helpers.isEmptyString(port)) {
                port = 1781;
            }
            else {
                port = parseInt(deploy_helpers.toStringSafe(port).trim());
            }

            let isSecure = deploy_helpers.toBooleanSafe(target.isSecure);

            let headers: any = {
                'Content-type': deploy_helpers.detectMimeByFilename(file),
            };

            let user = deploy_helpers.normalizeString(target.user);
            if (user) {
                let pwd = deploy_helpers.toStringSafe(target.password);

                headers['Authorization'] = `Basic ${(new Buffer(user + ':' + pwd).toString('base64'))}`;
            }

            let destination = `http${isSecure ? 's' : ''}://${host}:${port}/api/workspace${relativePath}`;
            let url = URL.parse(destination);

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: destination,
                    file: file,
                    target: target,
                });
            }

            let startRequest = (data: Buffer) => {
                try {
                    let reqOpts: HTTP.RequestOptions = {
                        headers: headers,
                        host: host,
                        method: 'PUT',
                        path: url.pathname,
                        port: port,
                        protocol: url.protocol,
                    };

                    let responseListener = (res: HTTP.IncomingMessage) => {
                        let err: any;

                        if (res.statusCode >= 400 && res.statusCode < 500) {
                            switch (res.statusCode) {
                                case 401:
                                    err = new Error(i18.t('plugins.api.clientErrors.unauthorized'));
                                    break;

                                case 404:
                                    err = new Error(i18.t('plugins.api.clientErrors.noPermissions'));
                                    break;

                                default:
                                    err = new Error(i18.t('plugins.api.clientErrors.unknown',
                                                          res.statusCode, res.statusMessage));
                                    break;
                            }
                        }
                        else if (res.statusCode >= 500 && res.statusCode < 600) {
                            switch (res.statusCode) {
                                default:
                                    err = new Error(i18.t('plugins.api.serverErrors.unknown',
                                                          res.statusCode, res.statusMessage));
                                    break;
                            }
                        }

                        completed(err);
                    };

                    let req: HTTP.ClientRequest;
                    if (isSecure) {
                        req = HTTPs.request(reqOpts, responseListener);
                    }
                    else {
                        req = HTTP.request(reqOpts, responseListener);
                    }

                    req.once('error', (err) => {
                        completed(err);
                    });

                    let subCtx = {
                        file: file,
                        remoteFile: relativePath,
                    };

                    let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform,
                                                               subCtx);
                    tCtx.data = data;

                    let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                    Promise.resolve(tResult).then((transformedData) => {
                        try {
                            req.write(transformedData);

                            req.end();
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
            };

            me.askForPasswordIfNeeded(target).then((cancelled) => {
                hasCancelled = cancelled;

                if (hasCancelled) {
                    completed(null);
                }
                else {
                    FS.readFile(file, (err, data) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            startRequest(data);
                        }
                    });
                }
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    }

    
    /** @inheritdoc */
    public downloadFile(file: string, target: DeployTargeApi, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        if (!opts) {
            opts = {};
        }
        
        let me = this;

        target = deploy_helpers.cloneObject(target);
        
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

            me.onCancelling(() => {
                hasCancelled = true;
            });

            if (hasCancelled) {
                completed(null);
                return;
            }

            let startRequest = () => {
                try {
                    let relativePath = deploy_helpers.toRelativeTargetPathWithValues(file, target, me.context.values(), opts.baseDirectory, opts.noMappings);
                    if (false === relativePath) {
                        completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                        return;
                    }

                    let host = deploy_helpers.normalizeString(target.host);
                    if (!host) {
                        host = '127.0.0.1';
                    }

                    let port = target.port;
                    if (deploy_helpers.isEmptyString(port)) {
                        port = 1781;
                    }
                    else {
                        port = parseInt(deploy_helpers.toStringSafe(port).trim());
                    }

                    let isSecure = deploy_helpers.toBooleanSafe(target.isSecure);

                    let headers: any = {
                        'Content-type': deploy_helpers.detectMimeByFilename(file),
                    };

                    let user = deploy_helpers.normalizeString(target.user);
                    if (user) {
                        let pwd = deploy_helpers.toStringSafe(target.password);

                        headers['Authorization'] = `Basic ${(new Buffer(user + ':' + pwd).toString('base64'))}`;
                    }

                    let destination = `http${isSecure ? 's' : ''}://${host}:${port}/api/workspace${relativePath}`;
                    let url = URL.parse(destination);

                    if (opts.onBeforeDeploy) {
                        opts.onBeforeDeploy(me, {
                            destination: destination,
                            file: file,
                            target: target,
                        });
                    }

                    let reqOpts: HTTP.RequestOptions = {
                        headers: headers,
                        host: host,
                        method: 'GET',
                        path: url.pathname,
                        port: port,
                        protocol: url.protocol,
                    };

                    let responseListener = (res: HTTP.IncomingMessage) => {
                        let err: any;

                        if (res.statusCode >= 400 && res.statusCode < 500) {
                            switch (res.statusCode) {
                                case 401:
                                    err = new Error(i18.t('plugins.api.clientErrors.unauthorized'));
                                    break;

                                case 404:
                                    err = new Error(i18.t('plugins.api.clientErrors.notFound'));
                                    break;

                                default:
                                    err = new Error(i18.t('plugins.api.clientErrors.unknown',
                                                          res.statusCode, res.statusMessage));
                                    break;
                            }
                        }
                        else if (res.statusCode >= 500 && res.statusCode < 600) {
                            switch (res.statusCode) {
                                default:
                                    err = new Error(i18.t('plugins.api.serverErrors.unknown',
                                                          res.statusCode, res.statusMessage));
                                    break;
                            }
                        }

                        if (err) {
                            completed(err);
                        }
                        else {
                            let isFile = false;  // x-vscode-restapi-type
                            if (res.headers) {
                                for (let p in res.headers) {
                                    if ('x-vscode-restapi-type' === deploy_helpers.normalizeString(p)) {
                                        if ('file' === deploy_helpers.normalizeString(res.headers[p])) {
                                            isFile = true;
                                        }
                                    }
                                }
                            }

                            if (isFile) {
                                deploy_helpers.readHttpBody(res).then((data) => {
                                    try {
                                        let subCtx = {
                                            file: file,
                                            remoteFile: relativePath,
                                        };

                                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Restore,
                                                                                   subCtx);
                                        tCtx.data = data;

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
                            else {
                                completed(i18.t('isNo.file', relativePath));
                            }
                        }
                    };

                    let req: HTTP.ClientRequest;
                    if (isSecure) {
                        req = HTTPs.request(reqOpts, responseListener);
                    }
                    else {
                        req = HTTP.request(reqOpts, responseListener);
                    }

                    req.once('error', (err) => {
                        completed(err);
                    });

                    req.end();
                }
                catch (e) {
                    completed(e);
                }
            }

            me.askForPasswordIfNeeded(target).then((cancelled) => {
                hasCancelled = cancelled;

                if (hasCancelled) {
                    completed(null);
                }
                else {
                    startRequest();
                }
            }).catch((err) => {
                completed(err);
            });
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.api.description'),
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
    return new ApiPlugin(ctx);
}
