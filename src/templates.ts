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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as FS from 'fs';
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as i18 from './i18';
const MergeDeep = require('merge-deep');
import * as Path from 'path';
import * as URL from 'url';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


interface ActionQuickPickItem extends vscode.QuickPickItem {
    action: () => any;
    sortOrder: any;
}

interface TemplateItemWithName extends deploy_contracts.TemplateItem {
    name?: string;
}

const PUBLISH_URL = 'https://github.com/mkloubert/vs-deploy/issues';
const REGEX_HTTP_URL = /([\s]*)(http)([s]?)(\:)(\/\/)/gi;


function extractTemplateItems(list: deploy_contracts.TemplateItemList): TemplateItemWithName[] {
    let items: TemplateItemWithName[] = [];

    if (list) {
        for (let name in list) {
            let i = list[name];
            let iwn: TemplateItemWithName = deploy_helpers.cloneObject(i);

            if (iwn) {
                iwn.name = deploy_helpers.toStringSafe(name).trim();

                items.push(iwn);
            }
        }
    }

    return items.filter(i => i);
}

function loadFromSource(src: string): Promise<Buffer> {
    src = deploy_helpers.toStringSafe(src);

    return new Promise<Buffer>((resolve, reject) => {
        let completed = (err: any, data?: Buffer) => {
            if (err) {
                reject(err);
            }
            else {
                if (!data) {
                    data = Buffer.alloc(0);
                }

                resolve(data);
            }
        };
        
        try {
            if (REGEX_HTTP_URL.test(src)) {
                // web source

                let url = URL.parse(src);

                let requestHandler = (resp: HTTP.IncomingMessage) => {
                    deploy_helpers.readHttpBody(resp).then((data) => {
                        completed(null, data);
                    }).catch((err) => {
                        completed(err);
                    });
                };

                let opts: HTTP.RequestOptions = {
                    protocol: 'http:',
                };

                let requestFactory: (options: HTTP.RequestOptions,
                                     callback?: (res: HTTP.IncomingMessage) => void) => HTTP.ClientRequest;

                switch (deploy_helpers.normalizeString(url.protocol)) {
                    case 'https:':
                        requestFactory = HTTPs.request;
                        
                        opts.protocol = 'https:';
                        break;

                    default:
                        // http
                        requestFactory = HTTP.request;

                        opts.protocol = 'http:';
                        break;
                }

                if (requestFactory) {
                    let request = requestFactory(opts, requestHandler);

                    request.end();
                }
                else {
                    completed(null, null);
                }
            }
            else {
                // (local) file

                let filePath = src;
                if (deploy_helpers.isEmptyString(filePath)) {
                    filePath = './templates.json';
                }
                if (!Path.isAbsolute(filePath)) {
                    filePath = Path.join(vscode.workspace.rootPath, filePath);
                }
                filePath = Path.resolve(filePath);

                FS.readFile(filePath, (err, data) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, data);
                    }
                });
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

export function openTemplate() {
    let me: vs_deploy.Deployer = this;

    try {
        let cfg = me.config;

        let showDefaults: boolean;
        let sources: deploy_contracts.TemplateSource[] = [];

        // normalize to object list
        if (cfg.templates) {
            sources = deploy_helpers.asArray<string | deploy_contracts.TemplateSource>(cfg.templates.sources).map(t => {
                let obj: deploy_contracts.TemplateSource;

                if ('object' !== typeof t) {
                    if (!deploy_helpers.isEmptyString(t)) {
                        obj = {
                            source: deploy_helpers.toStringSafe(t),
                        };
                    }
                }

                return obj;
            }).filter(t => t);

            showDefaults = cfg.templates.showDefaults;
        }
        else {
            sources = [];
        }
        
        if (deploy_helpers.toBooleanSafe(showDefaults, true)) {
            sources.push({
                source: 'https://mkloubert.github.io/templates/vs-deploy.json',
            });
        }

        if (sources.length > 0) {
            let wf = Workflows.create();

            wf.next((ctx) => {
                ctx.result = {};
            });

            sources.forEach(ts => {
                wf.next((ctx) => {
                    return new Promise<any>((resolve, reject) => {
                        let completedInvoked = false;
                        let completed = (err: any) => {
                            if (completedInvoked) {
                                return;
                            }

                            completedInvoked = true;

                            if (err) {
                                //TODO: show error message
                            }

                            resolve();
                        };

                        try {
                            let src = me.replaceWithValues(ts.source);

                            loadFromSource(src).then((data) => {
                                try {
                                    let downloadedList: deploy_contracts.TemplateItemList =
                                        JSON.parse(data.toString('utf8'));

                                    if (downloadedList) {
                                        ctx.result = MergeDeep(ctx.result, downloadedList);
                                    }

                                    completed(null);
                                }
                                catch (e) {
                                    completed(e);
                                }
                            }).catch((e) => {
                                completed(e);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                });
            });

            let allCompleted = (err: any) => {
                if (err) {
                    vscode.window.showErrorMessage(`[vs-deploy]: ${deploy_helpers.toStringSafe(err)}`);
                }
            };

            let showItems: (items: TemplateItemWithName[]) => void;
            showItems = (items) => {
                try {
                    items = deploy_helpers.cloneObject(items);
                    items = (items || []).filter(i => i);

                    let createQuickPick = (i: TemplateItemWithName) => {
                        let qp: ActionQuickPickItem;
                        let icon: string;
                        let detail: string;
                        let description: string;

                        switch (deploy_helpers.normalizeString(i.type)) {
                            case '':
                            case 'f':
                            case 'file':
                                icon = 'database';
                                detail = deploy_helpers.toStringSafe((<deploy_contracts.TemplateFile>i).source).trim();
                                qp = {
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: deploy_helpers.toStringSafe((<deploy_contracts.TemplateFile>i).description),
                                    action: () => {
                                        return new Promise<any>((res, rej) => {
                                            try {
                                                let file = <deploy_contracts.TemplateFile>i;
                                                if (deploy_helpers.isEmptyString(file.source)) {
                                                    res();
                                                }
                                                else {
                                                    loadFromSource(file.source).then((data) => {
                                                        try {
                                                            let txt = data.toString('utf8');

                                                            vscode.workspace.openTextDocument(null).then((doc) => {
                                                                vscode.window.showTextDocument(doc).then((editor) => {
                                                                    editor.edit((builder) => {
                                                                        try {
                                                                            builder.insert(new vscode.Position(0, 0), txt);
                                                                        }
                                                                        catch (e) {
                                                                            rej(e);
                                                                        }
                                                                    });
                                                                }, (err) => {
                                                                    rej(err);
                                                                });
                                                            }, (e) => {
                                                                rej(e);
                                                            });
                                                        }
                                                        catch (e) {
                                                            rej(e);
                                                        }
                                                    }).catch((err) => {
                                                        rej(err);
                                                    });
                                                }
                                            }
                                            catch (e) {
                                                rej(e);
                                            }
                                        });
                                    },
                                    sortOrder: 1,
                                };
                                break;

                            case 'c':
                            case 'cat':
                            case 'category':
                                icon = 'file-directory';
                                qp = {
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: '',
                                    action: () => {
                                        let cat = <deploy_contracts.TemplateCategory>i;

                                        showItems(extractTemplateItems(cat.children));
                                    },
                                    sortOrder: 0,
                                };
                                break;
                        }

                        if (qp) {
                            // label
                            if (deploy_helpers.isEmptyString(qp.label)) {
                                qp.label = '';
                            }
                            else {
                                qp.label = me.replaceWithValues(qp.label);
                            }

                            // description
                            if (deploy_helpers.isEmptyString(qp.description)) {
                                qp.description = '';
                            }
                            else {
                                qp.description = me.replaceWithValues(qp.description);
                            }

                            // detail
                            if (!deploy_helpers.isEmptyString(detail)) {
                                qp.detail = detail;
                            }

                            if (!deploy_helpers.isEmptyString(icon)) {
                                qp.label = `$(${icon}) ${qp.label}`;
                            }
                        }

                        return qp;
                    };

                    let quickPicks = items.map(i => createQuickPick(i)).filter(qp => qp);

                    quickPicks = quickPicks.sort((x, y) => {
                        // first sort by 'sortOrder'
                        let comp0 = deploy_helpers.compareValues(x.sortOrder, y.sortOrder);
                        if (0 !== comp0) {
                            return comp0;
                        }

                        // last but not least: by label
                        return deploy_helpers.compareValues(deploy_helpers.normalizeString(x.label),
                                                            deploy_helpers.normalizeString(y.label));
                    });

                    // publish own template
                    quickPicks.push({
                        label: '$(cloud-upload) ' + i18.t('templates.publish.label'),
                        description: '',
                        detail: PUBLISH_URL,
                        sortOrder: undefined,
                        action: () => deploy_helpers.open(PUBLISH_URL),
                    });

                    vscode.window.showQuickPick(quickPicks, {
                        placeHolder: i18.t('templates.placeholder'),
                    }).then((qp) => {
                        if (!qp) {
                            allCompleted(null);
                            return;
                        }

                        if (qp.action) {
                            try {
                                Promise.resolve(qp.action()).then(() => {
                                    allCompleted(null);
                                }, (err) => {
                                    allCompleted(err);
                                });
                            }
                            catch (e) {
                                allCompleted(e);
                            }
                        }
                    }, (err) => {
                        allCompleted(err);
                    });
                }
                catch (e) {
                    allCompleted(e);
                }
            };

            wf.start().then((list: deploy_contracts.TemplateItemList) => {
                showItems(extractTemplateItems(list));
            }).catch((err) => {
                vscode.window.showErrorMessage(`[vs-deploy]: ${deploy_helpers.toStringSafe(err)}`);
            });
        }
        else {
            //TODO: show warning message
        }
    }
    catch (e) {

    }
}

