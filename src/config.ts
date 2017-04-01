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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as deploy_values from './values';
import * as FS from 'fs';
import * as i18 from './i18';
import * as Path from 'path';
const MergeDeep = require('merge-deep');
import * as OS from 'os';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * Returns a merged config object.
 * 
 * @param {deploy_contracts.DeployConfiguration} cfg The base object.
 * 
 * @returns {Promise<deploy_contracts.DeployConfiguration>} The promise.
 */
export function mergeConfig(cfg: deploy_contracts.DeployConfiguration): Promise<deploy_contracts.DeployConfiguration> {
    let values = deploy_values.getBuildInValues();
    values = values.concat(deploy_values.toValueObjects(cfg.values));

    let myName = deploy_helpers.normalizeString(OS.hostname());

    return new Promise<deploy_contracts.DeployConfiguration>((resolve, reject) => {
        let completed = (err: any, c?: deploy_contracts.DeployConfiguration) => {
            if (err) {
                reject(err);
            }
            else {
                let result = c || cfg;

                if (result) {
                    try {
                        delete result['imports'];
                    }
                    catch (e) {
                        deploy_helpers.log(i18.t('errors.withCategory',
                                                 'config.mergeConfig(1)', e));
                    }
                }

                try {
                    result = deploy_helpers.cloneObject(result);
                }
                catch (e) {
                    deploy_helpers.log(i18.t('errors.withCategory',
                                             'config.mergeConfig(2)', e));
                }

                resolve(result);
            }
        };

        try {
            if (cfg) {
                let wf = Workflows.create();

                // normalize list
                // by keeping sure to have
                // import entry objects
                let allImports = deploy_helpers.asArray(cfg.imports).filter(x => x).map(imp => {
                    if ('object' !== typeof imp) {
                        // convert to object
                        imp = {
                            from: deploy_helpers.toStringSafe(imp),
                        };
                    }

                    return imp;
                });

                // isFor
                allImports = allImports.filter(imp => {
                    let validHosts = deploy_helpers.asArray(imp.isFor)
                                                   .map(x => deploy_helpers.toStringSafe(x).toLowerCase().trim())
                                                   .filter(x => x);

                    if (validHosts.length < 1) {
                        return true;
                    }

                    return validHosts.indexOf(myName) > -1;
                });

                // platforms
                allImports = deploy_helpers.filterPlatformItems(allImports);

                // if
                allImports = deploy_helpers.filterConditionalItems(allImports, values);

                // sort
                allImports = allImports.sort((x, y) => {
                    return deploy_helpers.compareValues(deploy_helpers.getSortValue(x, () => myName),
                                                        deploy_helpers.getSortValue(y, () => myName));
                });

                // build workflow actions for each import entry
                allImports.filter(x => x).forEach(imp => {
                    wf.next((ctx) => {
                        let c: deploy_contracts.DeployConfiguration = ctx.value;
                        
                        return new Promise<any>((res, rej) => {
                            try {
                                // get file path
                                let src = deploy_helpers.toStringSafe(imp.from);
                                src = deploy_values.replaceWithValues(values, src);
                                if (!Path.isAbsolute(src)) {
                                    src = Path.join(vscode.workspace.rootPath, '.vscode', src);
                                }
                                src = Path.resolve(src);

                                let loadImportFile = () => {
                                    FS.readFile(src, (err, data) => {
                                        if (err) {
                                            rej(err);
                                        }
                                        else {
                                            try {
                                                if (data && data.length > 0) {
                                                    let childCfg: deploy_contracts.DeployConfiguration = JSON.parse(data.toString('utf8'));
                                                    if (childCfg) {
                                                        mergeConfig(childCfg).then((cc) => {
                                                            try {
                                                                if (cc) {
                                                                    let newCfg = cc;
                                                                    if (deploy_helpers.toBooleanSafe(imp.merge, true)) {
                                                                        newCfg = MergeDeep({}, c, cc);
                                                                    }

                                                                    cc = newCfg;
                                                                }

                                                                ctx.value = deploy_helpers.cloneObject(cc);
                                                                res();
                                                            }
                                                            catch (e) {
                                                                rej(e);  // update error
                                                            }
                                                        }).catch((err) => {
                                                            rej(err);
                                                        });
                                                    }
                                                    else {
                                                        res();  // empty => no update
                                                    }
                                                }
                                                else {
                                                    res();  // no data
                                                }
                                            }
                                            catch (e) {
                                                res(e);  // JSON error
                                            }
                                        }
                                    });
                                };

                                if ('' !== src.trim()) {
                                    // first check if file exists
                                    FS.exists(src, (exists) => {
                                        if (exists) {
                                            loadImportFile();
                                        }
                                        else {
                                            res();  // files does no exist
                                        }
                                    });
                                }
                                else {
                                    res();  // no file defined
                                }
                            }
                            catch (e) {
                                rej(e);
                            }
                        });
                    });
                });

                wf.on('action.after', (err, ctx) => {
                    if (!err) {
                        ctx.result = ctx.value;  // update result
                    }    
                });

                wf.start(cfg).then((newCfg) => {
                    completed(null, newCfg || cfg);
                }).catch((err) => {
                    completed(err);
                });
            }
            else {
                completed(null);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
