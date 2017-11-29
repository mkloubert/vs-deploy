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
const Glob = require('glob');
import * as i18 from './i18';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


/**
 * Compares a local file with a version from a target.
 * 
 * @param {any} [uri] The URI of the file.
 */
export async function compareFiles(uri?: any) {
    const ME: vs_deploy.Deployer = this;

    const TARGETS = ME.getTargets()
                      .filter(x => !deploy_helpers.toBooleanSafe(x.isHidden));
    if (TARGETS.length < 1) {
        vscode.window.showWarningMessage(i18.t('targets.noneDefined'));
        return;
    }

    let path: string;
    if (uri && uri.fsPath) {
        path = uri.fsPath;
    }
    else {
        const EDITOR = vscode.window.activeTextEditor;

        if (EDITOR) {
            const DOC = EDITOR.document;

            if (DOC) {
                path = DOC.fileName;
            }
        }
    }

    if (deploy_helpers.isEmptyString(path)) {
        return;
    }

    const STATS = await lstat(path);

    let files: string[];
    if (STATS.isFile()) {
        files = [ path ];
    }
    else if (STATS.isDirectory()) {
        files = await glob(path, 'compare.failed');
    }
    else {
        throw new Error(
            i18.t('isNo.file', path)
        );
    }

    const FILE_QUICK_PICKS = TARGETS.map((x, i) => deploy_helpers.createTargetQuickPick(x, i,
                                                                                        ME.getValues()));

    let target: deploy_contracts.DeployTarget;
    if (FILE_QUICK_PICKS.length > 1) {
        const SELECTED_ITEM = await vscode.window.showQuickPick(FILE_QUICK_PICKS, {
            placeHolder: i18.t('compare.selectSource'),
        });
        if (SELECTED_ITEM) {
            target = SELECTED_ITEM.target;
        }
    }
    else {
        // auto select
        target = FILE_QUICK_PICKS[0].target;
    }

    if (!target) {
        return;
    }

    const TYPE = deploy_helpers.parseTargetType(target.type);
    
    const PLUGINS = ME.asyncPlugIns.filter(x => {
        return '' === TYPE ||
               (x.__type === TYPE && deploy_helpers.toBooleanSafe(x.canDownload) && x.download);
    });

    const CANCEL_TOKEN = new vscode.CancellationTokenSource();
    try {
        ME.onCancelling(() => {
            CANCEL_TOKEN.cancel();
        });

        while (PLUGINS.length > 0) {
            const PI = PLUGINS.shift();
            const FILES_TO_COMPARE = files.map(f => f);

            const RESULTS = await PI.download({
                baseDirectory: null,
                context: null,
                cancellationToken: CANCEL_TOKEN.token,
                files: FILES_TO_COMPARE,
                target: target,
            });

            if (!RESULTS) {
                continue;
            }

            try {
                while (RESULTS.length > 0) {
                    const R = RESULTS.shift();

                    let realtivePath = deploy_helpers.toRelativePath(R.file);
                    if (false === realtivePath) {
                        realtivePath = R.file;
                    }

                    let titleSuffix = deploy_helpers.toStringSafe(target.name).trim();

                    let windowTitle = `[vs-deploy] Diff '${realtivePath}'`;
                    if ('' === titleSuffix) {
                        titleSuffix = deploy_helpers.parseTargetType(target.type);
                    }
                    if ('' !== titleSuffix) {
                        windowTitle += ` (${titleSuffix})`;
                    }

                    try {
                        await vscode.commands.executeCommand('vscode.diff',
                                                             vscode.Uri.file(R.path), vscode.Uri.file(R.file), windowTitle);
                    }
                    catch (e) {
                        // dispose before...
                        deploy_helpers.tryDispose(R);

                        // ...rethrow
                        throw e;
                    }
                }
            }
            catch (e) {
                // dispose before...
                while (RESULTS.length > 0) {
                    deploy_helpers.tryDispose(
                        RESULTS.shift()
                    );
                }

                // ...rethrow
                throw e;
            }
        }
    }
    finally {
        deploy_helpers.tryDispose(
            CANCEL_TOKEN
        );
    }
}


function glob(path: string, errId: string) {
    return new Promise<string[]>((resolve, reject) => {
        Glob('**', {
            absolute: true,
            cwd: path,
            dot: true,
            ignore: [],
            nodir: true,
            root: path,
        }, (e: any, files: string[]) => {
            if (e) {
                reject(
                    i18.t(errId, path, e)
                );
            }
            else {
                resolve(files);
            }
        });
    });
}

function lstat(path: string) {
    return new Promise<FS.Stats>((resolve, reject) => {
        try {
            FS.lstat(path, (err, stats) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
}