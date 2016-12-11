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
const Mailer = require('nodemailer');
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';
const Zip = require('node-zip');


interface DeployTargetMail extends deploy_contracts.DeployTarget {
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

class TestPlugin extends deploy_objects.DeployPluginBase {
    constructor(ctx: deploy_contracts.DeployContext) {
        super(ctx);
    }

    public deployFile(file: string, target: DeployTargetMail, opts?: deploy_contracts.DeployFileOptions): void {
        if (!opts) {
            opts = {};
        }

        let me = this;

        this.deployWorkspace([ file ], target, {
            onBeforeDeployFile: (sender, e) => {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(sender, {
                        file: e.file,
                        target: e.target,
                    });
                }
            },

            onFileCompleted: (sender, e) => {
                if (opts.onCompleted) {
                    opts.onCompleted(sender, {
                        error: e.error,
                        file: e.file,
                        target: e.target,
                    });
                }
            }
        });
    }

    public deployWorkspace(files: string[], target: DeployTargetMail, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let now = Moment();
        let me = this;

        let from = deploy_helpers.toStringSafe(target.from).trim();
        let to = deploy_helpers.toStringSafe(target.to).trim();

        let isSecure = target.secure;
        if (deploy_helpers.isNullOrUndefined(isSecure)) {
            isSecure = true;
        }
        isSecure = !!isSecure;

        let ignoreTLS = !!target.ignoreTLS;
        let requireTLS = !!target.requireTLS;

        let host = deploy_helpers.toStringSafe(target.host, 'localhost');
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

        let rejectUnauthorized = target.rejectUnauthorized;
        if (deploy_helpers.isNullOrUndefined(rejectUnauthorized)) {
            rejectUnauthorized = true;
        }
        rejectUnauthorized = !!rejectUnauthorized;

        let auth: any;
        let user = deploy_helpers.toStringSafe(target.user);
        if (user) {
            let password = deploy_helpers.toStringSafe(target.password);

            auth = {
                user: user,
                pass: password,
            };
        }

        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    error: err,
                });
            }
        };

        let deploy = () => {
            try {
                let zip = new Zip();

                let zipCompleted = () => {
                    try {
                        try {
                            let zippedData = new Buffer(zip.generate({
                                base64: false,
                                compression: 'DEFLATE',
                            }), 'binary');

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

                            let mailOpts = {
                                from: from,
                                to: to,
                                subject: 'Deployed files',
                                text: `- ${files.join('\n- ')}


Provided by 'Deploy' (vs-deploy) Visual Studio Code extension:
https://github.com/mkloubert/vs-deploy

Donate:
https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2`,
                                attachments: [
                                    {
                                        filename: `workspace_${now.format('YYYYMMDD')}_${now.format('HHmmss')}.zip`,
                                        content: zippedData,
                                    }
                                ]
                            };

                            transporter.sendMail(mailOpts, (err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                let filesTodo = files.map(x => x);
                let addNextFile: () => void;
                addNextFile = () => {
                    if (filesTodo.length < 1) {
                        zipCompleted();
                        return;
                    }

                    let f = filesTodo.pop();
                    if (!f) {
                        zipCompleted();
                        return;
                    }

                    let fileCompleted = (err?: any) => {
                        if (opts.onFileCompleted) {
                            opts.onFileCompleted(me, {
                                error: err,
                                file: f,
                                target: target,
                            });
                        }

                        addNextFile();
                    };
                    
                    try {
                        let relativePath = deploy_helpers.toRelativePath(f);
                        if (false === relativePath) {
                            relativePath = deploy_helpers.replaceAllStrings(f, Path.sep, '/');
                        }

                        if (opts.onBeforeDeployFile) {
                            opts.onBeforeDeployFile(me, {
                                file: f,
                                target: target,
                            });
                        }

                        FS.readFile(f, (err, data) => {
                            if (err) {
                                fileCompleted(err);
                                return;
                            }

                            try {
                                let zipEntry = (<string>relativePath).trim();
                                while (0 == zipEntry.indexOf('/')) {
                                    zipEntry = zipEntry.substr(1);
                                }

                                zip.file(zipEntry, data);

                                fileCompleted();
                            }
                            catch (e) {
                                fileCompleted(e);
                            }
                        });
                    }
                    catch (e) {
                        fileCompleted(e);
                    }
                };

                addNextFile();
            }
            catch (e) {
                completed(e);
            }
        };

        try {
            vscode.window.showInputBox({
                prompt: "Target eMail address(es)",
                ignoreFocusOut: true,
                placeHolder: 'One or more email address (separated by comma) to deploy to...',
                value: to,
            }).then((value) => {
                        to = deploy_helpers.toStringSafe(value);
                        if (to) {
                            deploy();
                        }
                        else {
                            completed();
                        }
                    }, (err) => {
                        completed(err);
                    });
        }
        catch (e) {
            completed(e);
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
    return new TestPlugin(ctx);
}
