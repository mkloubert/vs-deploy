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
import * as deploy_res_css from './resources/css';
import * as deploy_res_html from './resources/html';
import * as deploy_res_javascript from './resources/javascript';
import * as deploy_values from './values';
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
const REGEX_HTTP_URL = new RegExp("^([\\s]*)(https?:\\/\\/)", 'i');


function detectCodeMime(code: string): string {
    code = deploy_helpers.toStringSafe(code);

    let mime: string;

    let mimeActions: (() => any)[] = [];

    // JSON
    mimeActions.push(() => {
        let json = JSON.parse(code);

        return 'application/json';
    });

    // HTML
    mimeActions.push(() => {
        let html = code.toLowerCase().trim();
        if (html.length >= 13) {
            if (html.substr(0, 6) === '<html>' && html.substring(html.length - 7) === '</html>') {
                return 'text/html';
            }
        }
    });

    try {
        while (mimeActions.length > 0) {
            let action = mimeActions.shift();

            try {
                let m = action();
                if (!deploy_helpers.isNullUndefinedOrEmptyString(m)) {
                    mime = m;
                    break;
                }
            }
            catch (e) {
                //TODO: log
            }
        }
    }
    catch (e) {
        //TODO: log
    }

    mime = deploy_helpers.normalizeString(mime);
    if ('' === mime) {
        mime = 'text/plain';
    }

    return mime;
}

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
        let completedInvoked = false;
        let completed = (err: any, data?: Buffer) => {
            if (completedInvoked) {
                return;
            }

            completedInvoked = true;
            
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
                    hostname: url.hostname,
                    path: url.path,
                    method: 'GET',
                };

                let requestFactory: (options: HTTP.RequestOptions,
                                     callback?: (res: HTTP.IncomingMessage) => void) => HTTP.ClientRequest;

                switch (deploy_helpers.normalizeString(url.protocol)) {
                    case 'https:':
                        requestFactory = HTTPs.request;

                        opts.protocol = 'https:';
                        opts.port = 443;
                        break;

                    default:
                        // http
                        requestFactory = HTTP.request;

                        opts.protocol = 'http:';
                        opts.port = 80;
                        break;
                }

                if (!deploy_helpers.isEmptyString(url.port)) {
                    opts.port = parseInt(deploy_helpers.toStringSafe(url.port).trim());
                }

                if (requestFactory) {
                    let request = requestFactory(opts, requestHandler);

                    request.once('error', (err) => {
                        completed(err);
                    });

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

/**
 * Opens a template.
 */
export function openTemplate() {
    let me: vs_deploy.Deployer = this;

    try {
        let cfg = me.config;

        let allowUnparsedDocuments: boolean;
        let footerFile: string;
        let headerFile: string;
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

            allowUnparsedDocuments = cfg.templates.allowUnparsedDocuments;
            showDefaults = cfg.templates.showDefaults;

            footerFile = me.replaceWithValues(cfg.templates.footer);
            headerFile = me.replaceWithValues(cfg.templates.header);
        }
        else {
            sources = [];
        }

        allowUnparsedDocuments = deploy_helpers.toBooleanSafe(allowUnparsedDocuments, true);
        showDefaults = deploy_helpers.toBooleanSafe(showDefaults, true);

        if (showDefaults) {
            sources.unshift({
                source: 'https://mkloubert.github.io/templates/vs-deploy.json',
            });
        }

        if (sources.length > 0) {
            let wf = Workflows.create();

            // create empty list
            wf.next((ctx) => {
                ctx.result = {};
            });

            // create a merged list
            // from each source
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
                                vscode.window.showErrorMessage(`[vs-deploy]: ${deploy_helpers.toStringSafe(err)}`);
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

                        let type = deploy_helpers.normalizeString(i.type);
                        if ('' === type) {
                            if (!deploy_helpers.isNullOrUndefined(i['children'])) {
                                type = 'c';  // category
                            }
                            else {
                                type = 'f';  // file
                            }
                        }

                        switch (type) {
                            case 'f':
                            case 'file':
                                icon = 'file-code';
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
                                                            let code = data.toString('utf8');

                                                            let mime = detectCodeMime(code);

                                                            let toBase64 = (str: any): string => {
                                                                str = deploy_helpers.toStringSafe(str);
                                                                
                                                                return (new Buffer(str, 'utf8')).toString('base64');
                                                            };

                                                            let browserTitle = deploy_helpers.toStringSafe(i.name).trim();
                                                            if ('' === browserTitle) {
                                                                browserTitle = deploy_helpers.toStringSafe(file.source).trim();
                                                            }

                                                            let additionalHtmlHeader: string;
                                                            let additionalHtmlFooter: string;

                                                            let openAction = (): string => {
                                                                let header = deploy_res_html.getContentSync('header_simple_template.html').toString('utf8');
                                                                let footer = deploy_res_html.getContentSync('footer_simple_template.html').toString('utf8');
                                                                let jquery = deploy_res_javascript.getContentSync('jquery.min.js').toString('utf8');
                                                                
                                                                let highlightJS = deploy_res_javascript.getContentSync('highlight.pack.js').toString('utf8');

                                                                let css_highlightJS_css = deploy_res_css.getContentSync('highlight.darkula.css').toString('utf8');
                                                                let css_highlightJS_css_default = deploy_res_css.getContentSync('highlight.default.css').toString('utf8');

                                                                let html = header + footer;

                                                                let values: deploy_values.ValueBase[] = [];
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-jQuery',
                                                                    value: JSON.stringify(toBase64(jquery)),
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-highlightjs-CSS',
                                                                    value: css_highlightJS_css,
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-highlightjs-CSS-default',
                                                                    value: css_highlightJS_css_default,
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-highlightjs',
                                                                    value: JSON.stringify(toBase64(highlightJS)),
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-code',
                                                                    value: JSON.stringify(toBase64(code)),
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-mime',
                                                                    value: JSON.stringify(detectCodeMime(code)),
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-header',
                                                                    value: deploy_helpers.toStringSafe(additionalHtmlHeader),
                                                                }));
                                                                values.push(new deploy_values.StaticValue({
                                                                    name: 'vsDeploy-footer',
                                                                    value: deploy_helpers.toStringSafe(additionalHtmlFooter),
                                                                }));

                                                                html = deploy_values.replaceWithValues(values, html);

                                                                return html;
                                                            };

                                                            if ('text/html' === mime) {
                                                                if (allowUnparsedDocuments) {
                                                                    if (deploy_helpers.toBooleanSafe(file.isDocument)) {
                                                                        // handle as unparsed HTML document
                                                                        openAction = () => code;
                                                                    }
                                                                }
                                                            }

                                                            let openWorkflow = Workflows.create();

                                                            // HTML header
                                                            openWorkflow.next((ctx) => {
                                                                return new Promise<any>((res2, rej2) => {
                                                                    if (deploy_helpers.isNullUndefinedOrEmptyString(headerFile)) {
                                                                        res2();
                                                                    }
                                                                    else {
                                                                        loadFromSource(headerFile).then((header) => {
                                                                            try {
                                                                                res2(header.toString('utf8'));
                                                                            }
                                                                            catch (e) {
                                                                                rej2(e);
                                                                            }
                                                                        }).catch((err) => {
                                                                            rej2(err);
                                                                        });
                                                                    }
                                                                });
                                                            });

                                                            // HTML footer
                                                            openWorkflow.next((ctx) => {
                                                                additionalHtmlHeader = ctx.previousValue;

                                                                return new Promise<any>((res2, rej2) => {
                                                                    if (deploy_helpers.isNullUndefinedOrEmptyString(footerFile)) {
                                                                        res2();
                                                                    }
                                                                    else {
                                                                        loadFromSource(footerFile).then((footer) => {
                                                                            try {
                                                                                res2(footer.toString('utf8'));
                                                                            }
                                                                            catch (e) {
                                                                                rej2(e);
                                                                            }
                                                                        }).catch((err) => {
                                                                            rej2(err);
                                                                        });
                                                                    }
                                                                });
                                                            });

                                                            // open browser
                                                            openWorkflow.next((ctx) => {
                                                                additionalHtmlFooter = ctx.previousValue;

                                                                let html = openAction();

                                                                return deploy_helpers.openHtmlDocument(me.htmlDocuments,
                                                                                                       html,
                                                                                                       '[vs-deploy] ' + i18.t('templates.browserTitle', browserTitle));
                                                            });

                                                            openWorkflow.start().then(() => {
                                                                res();
                                                            }).catch((err) => {
                                                                rej(err);
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

                            case 'r':
                            case 'repo':
                            case 'repository':
                                icon = 'book';
                                detail = deploy_helpers.toStringSafe((<deploy_contracts.TemplateFile>i).source).trim();
                                qp = {
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: deploy_helpers.toStringSafe((<deploy_contracts.TemplateFile>i).description),
                                    action: () => {
                                        let repo = <deploy_contracts.TemplateRepository>i;

                                        return new Promise<any>((res, rej) => {
                                            try {
                                                loadFromSource(repo.source).then((data) => {
                                                    try {
                                                        let downloadedList: deploy_contracts.TemplateItemList =
                                                            JSON.parse(data.toString('utf8'));

                                                        let items: TemplateItemWithName[];
                                                        if (downloadedList) {
                                                            items = extractTemplateItems(downloadedList);
                                                        }

                                                        showItems(items);
                                                    }
                                                    catch (e) {
                                                        rej(e);
                                                    }
                                                }).catch((err) => {
                                                    rej(err);
                                                });
                                            }
                                            catch (e) {
                                                rej(e);
                                            }
                                        });
                                    },
                                    sortOrder: 1,
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
                        if (qp) {
                            let action = qp.action;
                            if (!action) {
                                action = () => { };
                            }

                            try {
                                Promise.resolve(action()).then(() => {
                                    allCompleted(null);
                                }, (err) => {
                                    allCompleted(err);
                                });
                            }
                            catch (e) {
                                allCompleted(e);
                            }
                        }
                        else {
                            allCompleted(null);
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
            vscode.window.showWarningMessage(`[vs-deploy]: ${i18.t('templates.noneDefined')}`);
        }
    }
    catch (e) {
        me.log(i18.t('errors.withCategory',
                     'templates.openTemplate()', e));
    }
}
