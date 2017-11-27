'use strict';

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

import * as deploy_content from './content';
import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as deploy_plugins_switch from './plugins/switch';
import * as deploy_workspace from './workspace';
import * as FS from 'fs';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as vs_contracts from './contracts';
import * as deploy_globals from './globals';
import * as vs_deploy from './deploy';


type GetTargetsCallback = (err: any, targets?: vs_contracts.DeployTarget[]) => void;


let deployer: vs_deploy.Deployer;
let switchOptions: deploy_plugins_switch.SelectedSwitchOptions;

export function activate(context: vscode.ExtensionContext) {
    let now = Moment();

    // version
    let pkgFile: vs_contracts.PackageFile;
    try {
        pkgFile = JSON.parse(FS.readFileSync(Path.join(__dirname, '../../package.json'), 'utf8'));
    }
    catch (e) {
        deploy_helpers.log(`[ERROR] extension.activate().packageFile: ${deploy_helpers.toStringSafe(e)}`);
    }

    let outputChannel = vscode.window.createOutputChannel("Deploy");

    // show infos about the app
    {
        if (pkgFile) {
            outputChannel.appendLine(`${pkgFile.displayName} (${pkgFile.name}) - v${pkgFile.version}`);
        }

        outputChannel.appendLine(`Copyright (c) 2016-${now.format('YYYY')}  Marcel Joachim Kloubert <marcel.kloubert@gmx.net>`);
        outputChannel.appendLine('');
        outputChannel.appendLine(`GitHub : https://github.com/mkloubert/vs-deploy`);
        outputChannel.appendLine(`Twitter: https://twitter.com/mjkloubert`);
        outputChannel.appendLine(`Donate : [PayPal] https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2`);
        outputChannel.appendLine(`         [Flattr] https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-deploy`);

        outputChannel.appendLine('');
    }

    deployer = new vs_deploy.Deployer(context, outputChannel, pkgFile);

    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(deployer.onDidChangeWorkspaceFolders, deployer));
    deploy_workspace.resetSelectedWorkspaceFolder();

    // deploy workspace
    let deploy = vscode.commands.registerCommand('extension.deploy', async () => {
        let code: number;
        
        await deployer.showWarningIfNotActive(async () => {
            code = await deployer.deployWorkspace();
        });

        return code;
    });

    // compare local file with remote
    let compareFiles = vscode.commands.registerCommand('extension.deploy.compareFiles', async (u?) => {
        await deployer.showWarningIfNotActive(async () => {
            await deployer.compareFiles(u);
        });
    });

    // deploy open file or selected folder
    let deployFileOrFolder = vscode.commands.registerCommand('extension.deploy.file', async (u?) => {
        await deployer.showWarningIfNotActive(async () => {
            await deployer.deployFileOrFolder(u);
        });
    });

    // deploys files using global events
    let deployFilesTo = vscode.commands.registerCommand('extension.deploy.filesTo', (files: string | string[],
                                                                                     targets: vs_contracts.DeployTargetList) => {
        return new Promise<boolean>((resolve, reject) => {
            try {
                if (deployer.isActive) {
                    let sym = Symbol('extension.deploy.filesTo');
                    
                    resolve(deploy_globals.EVENTS.emit(vs_contracts.EVENT_DEPLOYFILES,
                                                       files, targets, sym));
                }
                else {
                    reject(new Error(`vs-deploy NOT ACTIVE!`));
                }
            }
            catch (e) {
                reject(e);
            }
        });
    });

    // returns deploy targets
    let getTargets = vscode.commands.registerCommand('extension.deploy.getTargets', (cb?: GetTargetsCallback) => {
        return new Promise<vs_contracts.DeployTarget[]>((resolve, reject) => {
            try {
                if (deployer.isActive) {
                    let targets = deployer.getTargets();
                    
                    if (cb) {
                        try {
                            cb(null, targets);
                        }
                        catch (e) {
                            cb(e);
                        }
                    }
    
                    resolve(targets);
                }
                else {
                    resolve(null);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    });

    // listen for files
    let listen = vscode.commands.registerCommand('extension.deploy.listen', async () => {
        await deployer.showWarningIfNotActive(() => {
            deployer.listen();
        });
    });

    // open HTML document
    let openHtmlDoc = vscode.commands.registerCommand('extension.deploy.openHtmlDoc', (doc: deploy_contracts.Document) => {
        return new Promise<boolean>((resolve, reject) => {
            let completed = (err: any, result?: boolean) => {
                deploy_helpers.removeDocuments(doc, deployer.htmlDocuments);

                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            };

            try {
                let url = vscode.Uri.parse(`vs-deploy-html://authority/?id=${encodeURIComponent(deploy_helpers.toStringSafe(doc.id))}` + 
                                           `&x=${encodeURIComponent(deploy_helpers.toStringSafe(new Date().getTime()))}`);

                let title = deploy_helpers.toStringSafe(doc.title).trim();
                if ('' === title) {
                    title = `[vs-deploy] HTML document #${deploy_helpers.toStringSafe(doc.id)}`;
                }

                vscode.commands.executeCommand('vscode.previewHtml', url, vscode.ViewColumn.One, title).then((success: boolean) => {
                    completed(null, success);
                }, (err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    });

    // open output window after deployment
    let openOutputAfterDeploment = vscode.commands.registerCommand('extension.deploy.openOutputAfterDeploment', () => {
        deployer.openOutputAfterDeploment();
    });

    // open template
    let openTemplate = vscode.commands.registerCommand('extension.deploy.openTemplate', async () => {
        await deployer.showWarningIfNotActive(() => {
            deployer.openTemplate();
        });
    });

    // quick deploy packages
    let quickDeploy = vscode.commands.registerCommand('extension.deploy.quickDeploy', async () => {
        await deployer.showWarningIfNotActive(() => {
            deployer.quickDeploy();
        });
    });

    // pull workspace
    let pull = vscode.commands.registerCommand('extension.deploy.pullWorkspace', async () => {
        await deployer.showWarningIfNotActive(() => {
            deployer.pullWorkspace();
        });
    });

    // pull open file or selected folder
    let pullFileOrFolder = vscode.commands.registerCommand('extension.deploy.pullFile', async (u?: any) => {
        await deployer.showWarningIfNotActive(() => {
            deployer.pullFileOrFolder(u);
        });
    });

    // select workspace
    let selectWorkspace = vscode.commands.registerCommand('extension.deploy.selectWorkspace', async () => {
        try {
            const FOLDER = await deploy_workspace.selectWorkspace();
            if (FOLDER) {
                await Promise.resolve(
                    deployer.onDidChangeConfiguration()
                );
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`[SELECT WORKSPACE ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    let changeSwitch = vscode.commands.registerCommand('extension.deploy.changeSwitch', async () => {
        try {
            await deployer.changeSwitch();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[CHANGE SWITCH ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    let htmlViewer = vscode.workspace.registerTextDocumentContentProvider('vs-deploy-html',
                                                                          new deploy_content.HtmlTextDocumentContentProvider(deployer));

    // notify when opening a text document
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(deployer.onDidOpenTextDocument, deployer));
    // notfiy setting changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(deployer.onDidChangeConfiguration, deployer));
    // notifiy on document has been saved
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(deployer.onDidSaveTextDocument, deployer));

    // notfiy active editor changed
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(deployer.onDidChangeActiveTextEditor,
                                                                         deployer));

    context.subscriptions.push(deployer,
                               changeSwitch,
                               compareFiles,
                               deploy, deployFileOrFolder, deployFilesTo, getTargets,
                               htmlViewer,
                               listen,
                               pull, pullFileOrFolder,
                               selectWorkspace,
                               openHtmlDoc, openOutputAfterDeploment, openTemplate, 
                               quickDeploy);

    // switches
    switchOptions = {};
    deploy_plugins_switch.setResetSwitchStatesAction(() => {
        switchOptions = {};
    });
    deploy_plugins_switch.setSelectedSwitchOptionsProvider(() => {
        return switchOptions;
    });

    // tell the "deployer" that anything has been activated
    deployer.onActivated();
}

export function deactivate() {
    if (deployer) {
        deployer.onDeactivate();
    }

    deploy_globals.EVENTS.removeAllListeners();
}
