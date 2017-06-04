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
import * as i18 from '../i18';
const Mailer = require('nodemailer');
import * as Moment from 'moment';
import * as vscode from 'vscode';


interface DeployTargetMail extends deploy_contracts.TransformableDeployTarget, deploy_contracts.PasswordObject {
    from?: string;
    host?: string;
    ignoreTLS?: boolean;
    password?: string;
    port?: number;
    rejectUnauthorized?: boolean;
    requireTLS?: boolean;
    secure?: boolean;
    to?: string;
    user?: string;
}

const TARGET_CACHE_PASSWORD = 'password';

class MailPlugin extends deploy_objects.ZipFileDeployPluginBase {
    protected deployZipFile(zip: any, target: DeployTargetMail): Promise<any> {
        let me = this;

        let now = Moment();

        let from = deploy_helpers.toStringSafe(target.from).trim();
        let to = deploy_helpers.toStringSafe(target.to).trim();

        let isSecure = deploy_helpers.toBooleanSafe(target.secure, true);

        let ignoreTLS = deploy_helpers.toBooleanSafe(target.ignoreTLS);
        let requireTLS = deploy_helpers.toBooleanSafe(target.requireTLS);

        let rejectUnauthorized = deploy_helpers.toBooleanSafe(target.rejectUnauthorized);

        let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
        let port: string | number = deploy_helpers.toStringSafe(target.port).trim();
        if (!port) {
            if (isSecure) {
                port = requireTLS ? '587' : '465';
            }
            else {
                port = '25';
            }
        }
        port = parseInt(port);

        let auth: any;
        let user = deploy_helpers.toStringSafe(target.user);
        if ('' !== user) {
            let password = deploy_helpers.toStringSafe(target.password);
            if ('' === password) {
                password = undefined;
            }

            auth = {
                user: user,
                pass: password,
            };
        }

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
                let deploy = () => {
                    try {
                        let zippedData = new Buffer(zip.generate({
                            base64: false,
                            compression: 'DEFLATE',
                        }), 'binary');

                        let subCtx = {
                            zip: zip,
                        };

                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform,
                                                                   subCtx);
                        tCtx.data = zippedData;

                        let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                        Promise.resolve(tResult).then((transformedData) => {
                            let mailOpts = {
                                from: from,
                                to: to,
                                subject: 'Deployed files',
                                text: `Your deployed files (s. attachment).


Send by 'Deploy' (vs-deploy) Visual Studio Code extension:
https://github.com/mkloubert/vs-deploy`,
                                attachments: [
                                    {
                                        filename: `workspace_${now.format('YYYYMMDD')}_${now.format('HHmmss')}.zip`,
                                        content: transformedData,
                                    }
                                ]
                            };

                            let transporter = Mailer.createTransport({
                                host: host,
                                port: port,
                                auth: auth,
                                secure: isSecure,
                                ignoreTLS: ignoreTLS,
                                requireTLS: requireTLS,
                                tls: {
                                    rejectUnauthorized: rejectUnauthorized,
                                },
                            });

                            transporter.sendMail(mailOpts, (err) => {
                                zippedData = null;

                                completed(err);
                            });
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                let inputRecipients = () => {
                    vscode.window.showInputBox({
                        prompt: i18.t('plugins.mail.addressSelector.prompt'),
                        ignoreFocusOut: true,
                        placeHolder: i18.t('plugins.mail.addressSelector.placeholder'),
                        value: to,
                    }).then((value) => {
                                to = deploy_helpers.toStringSafe(value).trim();
                                if (to) {
                                    deploy();
                                }
                                else {
                                    completed();
                                }
                            }, (err) => {
                                completed(err);
                            });
                };

                let askForPasswordIfNeeded = () => {
                    let showPasswordPrompt = false;
                    if (!deploy_helpers.isEmptyString(auth.user) && deploy_helpers.isNullOrUndefined(auth.password)) {
                        let pwdFromCache = deploy_helpers.toStringSafe(me.context.targetCache().get(target, TARGET_CACHE_PASSWORD));
                        if ('' === pwdFromCache) {
                            // nothing in cache
                            showPasswordPrompt = deploy_helpers.toBooleanSafe(target.promptForPassword, true);
                        }
                        else {
                            auth.password = pwdFromCache;
                        }
                    }

                    if (showPasswordPrompt) {
                        vscode.window.showInputBox({
                            placeHolder: i18.t('prompts.inputPassword'),
                            password: true,
                        }).then((passwordFromUser) => {
                            if ('undefined' === typeof passwordFromUser) {
                                completed(null);  // cancelled
                            }
                            else {
                                auth.password = passwordFromUser;
                                me.context.targetCache().set(target,
                                                             TARGET_CACHE_PASSWORD, passwordFromUser);

                                inputRecipients();
                            }
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        inputRecipients();
                    }
                };

                askForPasswordIfNeeded();
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.mail.description'),
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
    return new MailPlugin(ctx);
}
