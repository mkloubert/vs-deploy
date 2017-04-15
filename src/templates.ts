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
import * as deploy_objects from './objects';
import * as deploy_res_css from './resources/css';
import * as deploy_res_html from './resources/html';
import * as deploy_res_javascript from './resources/javascript';
import * as deploy_urls from './urls';
import * as deploy_values from './values';
import * as FS from 'fs';
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as i18 from './i18';
import * as Marked from 'marked';
const MergeDeep = require('merge-deep');
import * as Path from 'path';
import * as URL from 'url';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


interface ActionQuickPickItem extends vscode.QuickPickItem {
    action: () => any;
    icon: string;
    itemOrder?: any;
    sortOrder: any;
}

type BrowserContentProvider = () => any;

interface TemplateItemWithName extends deploy_contracts.TemplateItem {
    name?: string;
}

interface TemplateStackItem {
    items: TemplateItemWithName[];
    parent?: TemplateItemWithName;
}

const REGEX_HTTP_URL = new RegExp("^([\\s]*)(https?:\\/\\/)", 'i');
const VERSION_PROPERTY = '$version$';


/**
 * Checks for new versions
 * of the official template repositories.
 */
export function checkOfficialRepositoryVersions() {
    let me: vs_deploy.Deployer = this;

    let lastUrl: string;
    let logError = (nr: number, err: any): void => {
        let errCat = `templates.checkOfficialRepositoryVersion(${nr})`;

        if (!deploy_helpers.isNullUndefinedOrEmptyString(lastUrl)) {
            errCat += `(${lastUrl})`;
        }

        deploy_helpers.log(i18.t('errors.withCategory',
                                 errCat, err));
    };

    let wf = Workflows.create();

    deploy_urls.OFFICIAL_TEMPLATE_REPOSITORIES.forEach(u => {
        wf.next((ctx) => {
            lastUrl = u;

            return loadFromSource(deploy_urls.OFFICIAL_TEMPLATE_REPOSITORIES[0]).then((data) => {
                try {
                    const KEY_LAST_KNOWN_VERSION = 'vsdLastKnownTemplateRepoVersion';

                    let downloadedList: deploy_contracts.TemplateItemList =
                        JSON.parse(data.toString('utf8'));

                    if (downloadedList) {
                        let version = deploy_helpers.normalizeString(downloadedList[VERSION_PROPERTY]);
                        if ('' !== version) {
                            let updateLastVersion = true;
                            try {
                                let lastVersion = deploy_helpers.normalizeString(me.context.globalState.get(KEY_LAST_KNOWN_VERSION, ''));
                                if ('' === lastVersion) {
                                    lastVersion = '0.0.0';
                                }

                                if (deploy_helpers.compareVersions(version, lastVersion) > 0) {
                                    ctx.finish();

                                    let msg = i18.t('templates.officialRepositories.newAvailable');

                                    // [BUTTON] open templates
                                    let openBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                                    openBtn.action = () => {
                                        vscode.commands.executeCommand('extension.deploy.openTemplate').then(() => {
                                        }, (err) => {
                                            logError(6, err);  // could not open list of templates
                                        });
                                    };
                                    openBtn.title = i18.t('templates.officialRepositories.openTemplates');

                                    vscode.window.showInformationMessage('[vs-deploy] ' + msg, openBtn).then((btn) => {
                                        try {
                                            if (btn) {
                                                btn.action();
                                            }
                                        }
                                        catch (e) {
                                            logError(5, e);  // button action failed
                                        }
                                    }, (err) => {
                                        logError(4, err);  // could not show popup
                                    });
                                }
                            }
                            finally {
                                if (updateLastVersion) {
                                    me.context.globalState.update(KEY_LAST_KNOWN_VERSION, version).then(() => {
                                    }, (err) => {
                                        logError(3, err);  // update error
                                    });
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    logError(2, e);  // could not load memento value
                }
            });
        });
    });

    wf.start().then(() => {
    }).catch((err) => {
        logError(1, err);  // "global" error
    });
}

function extractTemplateItems(list: deploy_contracts.TemplateItemList): TemplateItemWithName[] {
    let items: TemplateItemWithName[] = [];

    if (list) {
        for (let name in list) {
            if (VERSION_PROPERTY === name) {
                continue;  // ignore
            }

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


function getMarkdownContentProvider(markdown: string,
                                    additionalHtmlHeader: string, additionalHtmlFooter: string): BrowserContentProvider {
    markdown = deploy_helpers.toStringSafe(markdown);

    additionalHtmlFooter = deploy_helpers.toStringSafe(additionalHtmlFooter);
    additionalHtmlHeader = deploy_helpers.toStringSafe(additionalHtmlHeader);
    
    return () => {
        let header = deploy_res_html.getContentSync('header_markdown_template.html').toString('utf8');
        let footer = deploy_res_html.getContentSync('footer_markdown_template.html').toString('utf8');
        let jquery = deploy_res_javascript.getContentSync('jquery.min.js').toString('utf8');
        let script = deploy_res_javascript.getContentSync('script.js').toString('utf8');
        
        let highlightJS = deploy_res_javascript.getContentSync('highlight.pack.js').toString('utf8');

        let css_highlightJS_css = deploy_res_css.getContentSync('highlight.darkula.css').toString('utf8');
        let css_highlightJS_css_default = deploy_res_css.getContentSync('highlight.default.css').toString('utf8');
        let css = deploy_res_css.getContentSync('styles.css').toString('utf8');

        let html = header + footer;

        let values: deploy_values.ValueBase[] = [];
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-jQuery',
            value: JSON.stringify(stringToBase64(jquery)),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-CSS',
            value: css,
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
            value: JSON.stringify(stringToBase64(highlightJS)),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-content',
            value: JSON.stringify(stringToBase64(Marked(markdown, {
                breaks: true,
                gfm: true,
                tables: true,
            }))),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-header',
            value: deploy_helpers.toStringSafe(additionalHtmlHeader),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-footer',
            value: deploy_helpers.toStringSafe(additionalHtmlFooter),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-project-page',
            value: deploy_urls.PROJECT_PAGE,
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-script',
            value: JSON.stringify(stringToBase64(script)),
        }));

        html = deploy_values.replaceWithValues(values, html);

        return html;
    };
}

function getSourceCodeContentProvider(code: string, mime?: string,
                                      additionalHtmlHeader?: string, additionalHtmlFooter?: string): BrowserContentProvider {
    code = deploy_helpers.toStringSafe(code);
    
    mime = deploy_helpers.normalizeString(mime);
    if ('' === mime) {
        mime = 'text/plain';
    }
    
    additionalHtmlFooter = deploy_helpers.toStringSafe(additionalHtmlFooter);
    additionalHtmlHeader = deploy_helpers.toStringSafe(additionalHtmlHeader);
    
    return () => {
        let header = deploy_res_html.getContentSync('header_simple_template.html').toString('utf8');
        let footer = deploy_res_html.getContentSync('footer_simple_template.html').toString('utf8');
        let jquery = deploy_res_javascript.getContentSync('jquery.min.js').toString('utf8');
        let script = deploy_res_javascript.getContentSync('script.js').toString('utf8');
        
        let highlightJS = deploy_res_javascript.getContentSync('highlight.pack.js').toString('utf8');

        let css_highlightJS_css = deploy_res_css.getContentSync('highlight.darkula.css').toString('utf8');
        let css_highlightJS_css_default = deploy_res_css.getContentSync('highlight.default.css').toString('utf8');
        let css = deploy_res_css.getContentSync('styles.css').toString('utf8');

        let html = header + footer;

        let values: deploy_values.ValueBase[] = [];
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-jQuery',
            value: JSON.stringify(stringToBase64(jquery)),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-CSS',
            value: css,
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
            value: JSON.stringify(stringToBase64(highlightJS)),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-code',
            value: JSON.stringify(stringToBase64(code)),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-mime',
            value: JSON.stringify(mime),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-header',
            value: deploy_helpers.toStringSafe(additionalHtmlHeader),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-footer',
            value: deploy_helpers.toStringSafe(additionalHtmlFooter),
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-project-page',
            value: deploy_urls.PROJECT_PAGE,
        }));
        values.push(new deploy_values.StaticValue({
            name: 'vsDeploy-script',
            value: JSON.stringify(stringToBase64(script)),
        }));

        html = deploy_values.replaceWithValues(values, html);

        return html;
    };
}

function loadFromSource(src: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        deploy_helpers.loadFrom(src).then((result) => {
            resolve(result.data);
        }).catch((err) => {
            reject(err);
        });
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

        allowUnparsedDocuments = deploy_helpers.toBooleanSafe(allowUnparsedDocuments);
        showDefaults = deploy_helpers.toBooleanSafe(showDefaults, true);

        if (showDefaults) {
            deploy_urls.OFFICIAL_TEMPLATE_REPOSITORIES.forEach(u => {
                sources.unshift({
                    source: u,
                });
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

            let itemStack: TemplateStackItem[] = [];

            let showItems: (items: TemplateItemWithName[],
                            parent?: TemplateItemWithName) => void;
            showItems = (items, parent?) => {
                try {
                    items = deploy_helpers.cloneObject(items);
                    items = (items || []).filter(i => i);

                    let newStackItem: TemplateStackItem = {
                        items: items,
                        parent: parent,
                    };

                    let appendStackItem = () => {
                        itemStack.push(newStackItem);
                    };

                    let createQuickPick = (i: TemplateItemWithName) => {
                        let qp: ActionQuickPickItem;
                        let customIcon = deploy_helpers.toStringSafe(i.icon).trim();
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
                                detail = deploy_helpers.toStringSafe((<deploy_contracts.TemplateFile>i).source).trim();
                                qp = {
                                    icon: '' === customIcon ? 'file-code' : customIcon,
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
                                                    deploy_helpers.loadFrom(file.source).then((downloadResult) => {
                                                        try {
                                                            let mime = downloadResult.mime;

                                                            let fileName = deploy_helpers.toStringSafe(downloadResult.name).trim();
                                                            if ('' !== fileName) {
                                                                try {
                                                                    let ext = Path.extname(fileName);
                                                                    switch (ext) {
                                                                        case '.ts':
                                                                            mime = 'typescript';
                                                                            break;
                                                                    }
                                                                }
                                                                catch (e) {
                                                                    deploy_helpers.log(i18.t('errors.withCategory',
                                                                                             'templates.openTemplate.showItems(1)', e));
                                                                }
                                                            }

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

                                                            let getBrowserContent: BrowserContentProvider;

                                                            switch (mime) {
                                                                case 'text/x-markdown':
                                                                    // markdown
                                                                    getBrowserContent = getMarkdownContentProvider(downloadResult.data.toString('utf8'),
                                                                                                                   additionalHtmlHeader, additionalHtmlFooter);
                                                                    break;

                                                                case 'text/html':
                                                                    // HTML
                                                                    if (allowUnparsedDocuments) {
                                                                        if (deploy_helpers.toBooleanSafe(file.isDocument)) {
                                                                            // handle as unparsed HTML document
                                                                            getBrowserContent = () => {
                                                                                return downloadResult.data.toString('utf8');
                                                                            };
                                                                        }
                                                                    }
                                                                    break;
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

                                                            // generate content
                                                            // and open browser
                                                            openWorkflow.next((ctx) => {
                                                                additionalHtmlFooter = ctx.previousValue;

                                                                return new Promise<any>((res2, rej2) => {
                                                                    try {
                                                                        let bcp = getBrowserContent;
                                                                        if (!bcp) {
                                                                            bcp = getSourceCodeContentProvider(downloadResult.data.toString('utf8'),
                                                                                                               mime,
                                                                                                               additionalHtmlHeader, additionalHtmlFooter);
                                                                        }

                                                                        Promise.resolve(bcp()).then((h) => {
                                                                            let html = deploy_helpers.toStringSafe(h);

                                                                            deploy_helpers.openHtmlDocument(me.htmlDocuments,
                                                                                                            html,
                                                                                                            '[vs-deploy] ' + i18.t('templates.browserTitle', browserTitle))
                                                                                          .then(() => {
                                                                                                    res();
                                                                                                })
                                                                                          .catch((err) => {
                                                                                                     rej2(err);
                                                                                                 });
                                                                        }).catch((err) => {
                                                                            rej2(err);
                                                                        });
                                                                    }   
                                                                    catch (e) {
                                                                        rej2(e);
                                                                    }
                                                                });
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
                                qp = {
                                    icon: '' === customIcon ? 'file-directory' : customIcon,
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: '',
                                    action: () => {
                                        let cat = <deploy_contracts.TemplateCategory>i;

                                        appendStackItem();
                                        showItems(extractTemplateItems(cat.children), cat);
                                    },
                                    sortOrder: 0,
                                };
                                break;

                            case 'r':
                            case 'repo':
                            case 'repository':
                                detail = deploy_helpers.toStringSafe((<deploy_contracts.TemplateRepository>i).source).trim();
                                qp = {
                                    icon: '' === customIcon ? 'database' : customIcon,
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: deploy_helpers.toStringSafe((<deploy_contracts.TemplateRepository>i).description),
                                    action: () => {
                                        let repo = <deploy_contracts.TemplateRepository>i;

                                        return new Promise<any>((res, rej) => {
                                            try {
                                                loadFromSource(repo.source).then((data) => {
                                                    try {
                                                        let downloadedList: deploy_contracts.TemplateItemList =
                                                            JSON.parse(data.toString('utf8'));

                                                        let downloadedItems: TemplateItemWithName[];
                                                        if (downloadedList) {
                                                            downloadedItems = extractTemplateItems(downloadedList);
                                                        }

                                                        appendStackItem();
                                                        showItems(downloadedItems, repo);
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

                            case 'l':
                            case 'link':
                            case 'u':
                            case 'url':
                                detail = deploy_helpers.toStringSafe((<deploy_contracts.TemplateLink>i).source).trim();
                                qp = {
                                    icon: '' === customIcon ? 'link-external' : customIcon,
                                    label: deploy_helpers.toStringSafe(i.name),
                                    description: deploy_helpers.toStringSafe((<deploy_contracts.TemplateLink>i).description),
                                    action: () => {
                                        let link = <deploy_contracts.TemplateLink>i;

                                        return deploy_helpers.open(deploy_helpers.toStringSafe(link.source));
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

                            qp.itemOrder = i.sortOrder;
                        }

                        return qp;
                    };

                    let quickPicks = items.map(i => createQuickPick(i)).filter(qp => qp);

                    let compareBySortableValue = (x: any, y: any): any => {
                        x = deploy_helpers.isNullOrUndefined(x) ? 0 : x;
                        y = deploy_helpers.isNullOrUndefined(y) ? 0 : y;

                        return deploy_helpers.compareValues(x, y);
                    };

                    quickPicks = quickPicks.sort((x, y) => {
                        // first sort by 'sortOrder'
                        let comp0 = compareBySortableValue(x.sortOrder, y.sortOrder);
                        if (0 !== comp0) {
                            return comp0;
                        }

                        // then by item order
                        let comp1 = compareBySortableValue(x.itemOrder, y.itemOrder);
                        if (0 !== comp1) {
                            return comp1;
                        }

                        // last but not least: by label
                        return deploy_helpers.compareValues(deploy_helpers.normalizeString(x.label),
                                                            deploy_helpers.normalizeString(y.label));
                    });

                    // publish own template
                    quickPicks.push({
                        icon: 'cloud-upload',
                        itemOrder: Number.MAX_SAFE_INTEGER,
                        label: i18.t('templates.publishOrRequest.label'),
                        description: '',
                        detail: deploy_urls.PUBLISH_TEMPLATE,
                        sortOrder: Number.MAX_SAFE_INTEGER,
                        action: () => deploy_helpers.open(deploy_urls.PUBLISH_TEMPLATE),
                    });

                    if (itemStack.length > 0) {
                        quickPicks.unshift({
                            icon: undefined,
                            itemOrder: Number.MAX_SAFE_INTEGER,
                            label: '..',
                            description: '',
                            sortOrder: Number.MIN_SAFE_INTEGER,
                            action: () => {
                                let stackItem = itemStack.pop();

                                showItems(stackItem.items,
                                          stackItem.parent);
                            },
                        });
                    }

                    // apply icons
                    quickPicks.forEach(qp => {
                        if (!deploy_helpers.isNullUndefinedOrEmptyString(qp.icon)) {
                            qp.label = `$(${qp.icon}) ${qp.label}`;
                        }
                    });

                    let placeholder = i18.t('templates.placeholder');
                    
                    let itemsForPath = itemStack.map(x => x);
                    if (parent) {
                        itemsForPath.push(newStackItem);
                    }
                    if (itemsForPath.length > 0) {
                        let currentPath = itemsForPath.filter(x => x.parent)
                                                      .map(x => x.parent.name)
                                                      .join(' / ');

                        placeholder = i18.t('templates.currentPath',
                                            currentPath);
                    }

                    vscode.window.showQuickPick(quickPicks, {
                        placeHolder: placeholder,
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

function stringToBase64(str: any): string {
    str = deploy_helpers.toStringSafe(str);
                                                                
    return (new Buffer(str, 'utf8')).toString('base64');
}
