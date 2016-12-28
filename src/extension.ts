'use strict';

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

import * as deploy_helpers from './helpers';
import * as FS from 'fs';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as vs_contracts from './contracts';
import * as vs_deploy from './deploy';


export function activate(context: vscode.ExtensionContext) {
    let now = Moment();

    // version
    let pkgFile: vs_contracts.PackageFile;
    try {
        pkgFile = JSON.parse(FS.readFileSync(Path.join(__dirname, '../../package.json'), 'utf8'));
    }
    catch (e) {
        deploy_helpers.log(`[ERROR] extension.activate(): ${deploy_helpers.toStringSafe(e)}`);
    }

    let outputChannel = vscode.window.createOutputChannel("Deploy");

    // show infos about the app
    {
        if (pkgFile) {
            outputChannel.appendLine(`${pkgFile.displayName} (${pkgFile.name}) - v${pkgFile.version}`);
        }

        outputChannel.appendLine(`Copyright (c) ${now.format('YYYY')}  Marcel Joachim Kloubert <marcel.kloubert@gmx.net>`);
        outputChannel.appendLine('');
        outputChannel.appendLine(`GitHub : https://github.com/mkloubert/vs-deploy`);
        outputChannel.appendLine(`Twitter: https://twitter.com/mjkloubert`);
        outputChannel.appendLine(`Donate : [PayPal] https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2`);
        outputChannel.appendLine(`         [Flattr] https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-deploy`);

        outputChannel.appendLine('');
    }

    let deployer = new vs_deploy.Deployer(context, outputChannel, pkgFile);

    // deploy workspace
    let deploy = vscode.commands.registerCommand('extension.deploy', () => {
        try {
            deployer.deployWorkspace();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[DEPLOY WORKSPACE ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    // cancel current deployment operation(s)
    let cancelDeploy = vscode.commands.registerCommand('extension.deploy.cancel', () => {
        try {
            deployer.cancelDeployment();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[DEPLOY CANCEL ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    // deploy open file or selected folder
    let deployFileOrFolder = vscode.commands.registerCommand('extension.deploy.file', (u?: any) => {
        try {
            deployer.deployFileOrFolder(u);
        }
        catch (e) {
            vscode.window.showErrorMessage(`[DEPLOY FILE ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    // listen for files
    let listen = vscode.commands.registerCommand('extension.deploy.listen', () => {
        try {
            deployer.listen();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[DEPLOY LISTEN ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    // quick deploy packages
    let quickDeploy = vscode.commands.registerCommand('extension.deploy.quickDeploy', () => {
        try {
            deployer.quickDeploy();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[DEPLOY QUICK DEPLOY ERROR]: ${deploy_helpers.toStringSafe(e)}`);
        }
    });

    // notfiy setting changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(deployer.onDidChangeConfiguration, deployer));
    // notifiy on document has been saved
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(deployer.onDidSaveTextDocument, deployer));

    context.subscriptions.push(deploy, deployFileOrFolder,
                               listen,
                               cancelDeploy, quickDeploy);
}

export function deactivate() {
}
