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
import * as HtmlEntities from 'html-entities';
import * as i18 from './i18';
import * as Marked from 'marked';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * An extended compare result.
 */
export interface FileCompareResult extends deploy_contracts.FileCompareResult {
    /** @inheritdoc */
    left: FileInfo;
    /** @inheritdoc */
    right: FileInfo;
}

/**
 * An extended file info.
 */
export interface FileInfo extends deploy_contracts.FileInfo {
    error?: any;
}

/**
 * Checks files.
 * 
 * @param {string[]} files the files to check.
 * @param {deploy_contracts.DeployTarget} target The target. 
 * @param {deploy_contracts.DeployPlugin} plugin The plugin.
 * 
 * @returns {(Promise<false|null|FileCompareResult[]>)} The result.
 */
export async function checkFiles(files: string[], target: deploy_contracts.DeployTarget,
                                 plugin: deploy_contracts.DeployPlugin): Promise<false | null | FileCompareResult[]> {
    if (!plugin.canGetFileInfo || !plugin.compareFiles) {
        return false;
    }

    if (!plugin.canGetFileInfo) {
        return null;
    }

    let wf = Workflows.create();

    wf.next((ctx) => {
        ctx.result = [];
    });

    files.forEach(f => {
        wf.next(async (ctx) => {
            let results: FileCompareResult[] = ctx.result;

            let compareRes = await plugin.compareFiles(f, target);
            results.push(compareRes);

            return compareRes;
        });
    });

    return await wf.start();
}

/**
 * Checks for newer files.
 * 
 * @param {string[]} files the files to check.
 * @param {deploy_contracts.DeployTarget} target The target. 
 * @param {deploy_contracts.DeployPlugin} plugin The plugin.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export async function checkForNewerFiles(files: string[], target: deploy_contracts.DeployTarget,
                                         plugin: deploy_contracts.DeployPlugin): Promise<boolean> {
    let me: vs_deploy.Deployer = this;
    
    let wf = Workflows.create();

    wf.next((ctx) => {
        ctx.result = true;
    });

    let differences = await checkFiles(files, target, plugin);

    if (Array.isArray(differences)) {
        wf.next(async () => {
            return (<FileCompareResult[]>differences).filter(d => {
                try {
                    if (!d.right.exists) {
                        return false;  // only if exist
                    }

                    if (!d.right.modifyTime) {
                        return false;  // cannot compare
                    }

                    if (!d.left.modifyTime) {
                        return true;
                    }

                    return d.right.modifyTime.utc()
                                             .isAfter(d.left.modifyTime.utc());
                }
                catch (e) {
                    d.right.error = e;
                    
                    return true;
                }
            });
        });

        // check data
        wf.next(async (ctx) => {
            let newerFiles: FileCompareResult[] = ctx.previousValue;

            for (let i = 0; i < newerFiles.length; ) {
                let nf = newerFiles[i];

                let remove = false;

                if (!nf.right.error) {
                    try {
                        if (plugin.canPull) {
                            let leftData = (await deploy_helpers.loadFrom(Path.join(nf.left.path, nf.left.name))).data;
                            let rightdata = await plugin.downloadFile(Path.join(nf.left.path, nf.left.name), target);
                            
                            let toComparableBuffer = async (b: Buffer): Promise<Buffer> => {
                                let isBinary = await deploy_helpers.isBinaryContent(b);
                                if (!isBinary) {
                                    let str = b.toString('ascii');
                                    str = deploy_helpers.replaceAllStrings(str, "\r", "");
                                    str = deploy_helpers.replaceAllStrings(str, "\t", "    ");

                                    b = new Buffer(str, 'ascii');
                                }

                                return b;
                            };

                            leftData = await toComparableBuffer(leftData);
                            rightdata = await toComparableBuffer(rightdata);

                            if (leftData.equals(rightdata)) {
                                remove = true;
                            }
                        }
                    }
                    catch (e) {
                        nf.right.error = e;
                    }
                }

                if (remove) {
                    newerFiles.splice(i, 1);
                }
                else {
                    i++;
                }
            }

            return newerFiles;
        });

        // show wanring if newer files were found
        wf.next((ctx) => {
            let newerFiles: FileCompareResult[] = ctx.previousValue;
            
            return new Promise<any>((resolve, reject) => {
                let localFiles = newerFiles.map(nf => {
                    return Path.join(nf.left.path, nf.left.name);
                }).map(lf => {
                    return Path.resolve(lf);
                });
                
                if (newerFiles.length > 0) {
                    ctx.result = false;

                    let msg = i18.t('deploy.newerFiles.message', newerFiles.length);

                    // [BUTTON] show
                    let showBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                    showBtn.action = () => {
                        ctx.result = false;

                        showFilesInBrowsers(me, newerFiles, target).then(() => {
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    };
                    showBtn.title = i18.t('deploy.newerFiles.show');

                    // [BUTTON] deploy
                    let deployBtn: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
                    deployBtn.action = () => {
                        ctx.result = true;

                        resolve();
                    };
                    deployBtn.title = i18.t('deploy.newerFiles.deploy');

                    let args = [ msg, showBtn, deployBtn ];

                    // show popup
                    vscode.window.showWarningMessage.apply(null, args).then((btn: deploy_contracts.PopupButton) => {
                        try {
                            if (btn) {
                                btn.action();
                            }
                            else {
                                ctx.result = null;

                                resolve();
                            }
                        }
                        catch (e) {
                            reject(e);
                        }
                    }, (err) => {
                        reject(err);
                    });
                }
                else {
                    resolve();
                }
            });
        });
    }

    return await wf.start();
}

async function showFilesInBrowsers(me: vs_deploy.Deployer,
                                   files: FileCompareResult[], target: deploy_contracts.DeployTarget): Promise<any> {
    let title: string;
    if (deploy_helpers.isNullUndefinedOrEmptyString(target.name)) {
        title = i18.t('deploy.newerFiles.titleNoTarget');
    }
    else {
        title = i18.t('deploy.newerFiles.title', target.name);
    }
    
    let htmlEncoder = new HtmlEntities.AllHtmlEntities();

    let markdown = `# ${htmlEncoder.encode(title)}\n`;

    markdown += `| ${htmlEncoder.encode(i18.t('deploy.newerFiles.localFile'))} | ${htmlEncoder.encode(i18.t('deploy.newerFiles.modifyTime'))} | ${htmlEncoder.encode(i18.t('deploy.newerFiles.size'))} | ${htmlEncoder.encode(i18.t('deploy.newerFiles.remoteFile'))} | ${htmlEncoder.encode(i18.t('deploy.newerFiles.modifyTime'))} | ${htmlEncoder.encode(i18.t('deploy.newerFiles.size'))}\n`;
    markdown += "| ---------- |:--:|:--:| ---------- |:--:|:--:|\n";

    files.map(f => {
        let localFile = Path.join(f.left.path, f.left.name);

        let relLocalPath = deploy_helpers.toRelativePath(localFile);
        if (false !== relLocalPath) {
            localFile = relLocalPath;
        }

        let remoteFile = f.right.name;
        if (!deploy_helpers.isNullUndefinedOrEmptyString(f.right.path)) {
            remoteFile = Path.join(f.right.path, f.right.name);
            remoteFile = deploy_helpers.replaceAllStrings(remoteFile, Path.sep, '/');

            let relRemotePath = deploy_helpers.toRelativeTargetPath(remoteFile, target);
            if (false !== relRemotePath) {
                remoteFile = relRemotePath;
            }
        }

        return {
            localFile: localFile,
            localModifyTime: f.left.modifyTime,
            localSize: f.left.size,
            remoteFile: remoteFile,
            remoteModifyTime: f.right.modifyTime,
            remoteSize: f.right.size,
        };
    }).sort((x, y) => {
        let comp0 = deploy_helpers.compareValuesBy(x, y,
                                                   t => deploy_helpers.normalizeString(t.localFile));
        if (0 !== comp0) {
            return comp0;
        }

        return deploy_helpers.compareValuesBy(x, y,
                                              t => deploy_helpers.normalizeString(t.remoteFile));
    }).forEach(x => {
        markdown += `| ${htmlEncoder.encode(x.localFile)}`;

        // local last change
        markdown += '| ';
        if (x.localModifyTime) {
            markdown += x.localModifyTime.format(i18.t('format.dateTime'));
        }
        else {
            markdown += '?';
        }
        markdown += ' ';

        // local size
        markdown += '| ';
        if (isNaN(x.localSize)) {
            markdown += '?';
        }
        else {
            markdown += x.localSize;
        }
        markdown += ' ';

        markdown += `| ${htmlEncoder.encode(x.remoteFile)}`;

        // remote last change
        markdown += '| ';
        if (x.remoteModifyTime) {
            markdown += x.remoteModifyTime.format(i18.t('format.dateTime'));
        }
        else {
            markdown += '?';
        }
        markdown += ' ';

        // remote size
        markdown += '| ';
        if (isNaN(x.remoteSize)) {
            markdown += '?';
        }
        else {
            markdown += x.remoteSize;
        }
        markdown += ' ';

        markdown += "|\n";
    });

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
        value: '',
    }));
    values.push(new deploy_values.StaticValue({
        name: 'vsDeploy-footer',
        value: '',
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

    await me.openHtml(html, '[vs-deploy] ' + title);
}

function stringToBase64(str: any): string {
    str = deploy_helpers.toStringSafe(str);
                                                                
    return (new Buffer(str, 'utf8')).toString('base64');
}
