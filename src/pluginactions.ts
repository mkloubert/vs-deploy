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
import * as deploy_diff from './diff';
import * as deploy_helpers from './helpers';
import * as deploy_objects from './objects';
import * as deploy_plugins from './plugins';
import * as FS from 'fs';
const Glob = require('glob');
import * as i18 from './i18';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


let nextCancelDeployWorkspaceCommandId = Number.MAX_SAFE_INTEGER;
let nextCancelPullWorkspaceCommandId = Number.MAX_SAFE_INTEGER;
const WORKSPACE_IN_PROGRESS: any = {};

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
               (x.plugin.__type === TYPE && deploy_helpers.toBooleanSafe(x.plugin.canDownload) && x.plugin.download);
    });

    const CANCEL_TOKEN = new vscode.CancellationTokenSource();
    try {
        ME.onCancelling(() => {
            CANCEL_TOKEN.cancel();
        });

        while (PLUGINS.length > 0) {
            if (CANCEL_TOKEN.token.isCancellationRequested) {
                break;
            }

            const PI = PLUGINS.shift();
            const FILES_TO_COMPARE = files.map(f => f);

            const RESULTS = await PI.plugin.download({
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
                    if (CANCEL_TOKEN.token.isCancellationRequested) {
                        break;
                    }

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

/**
 * Deploys files of the workspace to a target.
 * 
 * @param {string[]} files The files to deploy.
 * @param {deploy_contracts.DeployTarget} target The target.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export async function deployFilesTo(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
    const ME: vs_deploy.Deployer = this;

    let result = false;

    if (files) {
        files = files.filter(f => !ME.isFileIgnored(f));
    }

    const NAME_OF_TARGET = deploy_helpers.normalizeString(target.name);

    let deleteWorkspaceInProgressEntry = false;
    const START_DEPLOYMENT = async () => {
        const TYPE = deploy_helpers.parseTargetType(target.type);
        
        const PLUGINS = ME.asyncPlugIns.filter(x => {
            return '' === TYPE ||
                   (x.plugin.__type === TYPE && deploy_helpers.toBooleanSafe(x.plugin.canUpload) && x.plugin.upload);
        });

        const CANCEL_TOKEN = new vscode.CancellationTokenSource();
        try {
            ME.onCancelling(() => {
                CANCEL_TOKEN.cancel();
            });

            const HAS_CANCELLED = () => {
                return CANCEL_TOKEN.token.isCancellationRequested;
            };

            while (PLUGINS.length > 0) {
                if (HAS_CANCELLED()) {
                    break;
                }

                const PI = PLUGINS.shift();
                const FILES_TO_UPLOAD = files.map(f => f);

                let cancelCommand: vscode.Disposable;
                let currentPluginWithContext = PI;
                let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                let currentPlugin = currentPluginWithContext.plugin;
                let statusBarItem: vscode.StatusBarItem;

                let alreadyCleanedUp = false;
                const CLEANUPS = (err?: any) => {
                    if (alreadyCleanedUp) {
                        return;
                    }
                    alreadyCleanedUp = true;

                    deploy_helpers.tryDispose(cancelCommand);
                    deploy_helpers.tryDispose(statusBarItem);
                    deploy_helpers.tryDispose(contextToUse);
                };

                try {
                    statusBarItem = vscode.window.createStatusBarItem(
                        vscode.StatusBarAlignment.Left,
                    );
                    statusBarItem.color = '#ffffff';
                    statusBarItem.text = i18.t('deploy.button.prepareText');
                    statusBarItem.tooltip = i18.t('deploy.button.tooltip');

                    let cancelCommandName = 'extension.deploy.cancelWorkspace' + (nextCancelDeployWorkspaceCommandId--);
                    cancelCommand = vscode.commands.registerCommand(cancelCommandName, () => {
                        if (HAS_CANCELLED()) {
                            return;
                        }

                        CANCEL_TOKEN.cancel();

                        try {
                            contextToUse.emit(deploy_contracts.EVENT_CANCEL_DEPLOY);
                        }
                        catch (e) {
                            ME.log(i18.t('errors.withCategory', 'Deployer.deployWorkspaceTo().cancel', e));
                        }

                        statusBarItem.text = i18.t('deploy.button.cancelling');
                        statusBarItem.tooltip = i18.t('deploy.button.cancelling');
                    });
                    statusBarItem.command = cancelCommandName;

                    let failed: string[] = [];
                    let succeeded: string[] = [];
                    const SHOW_RESULT = (err?: any) => {
                        let afterDeployButtonMsg = 'Deployment finished.';

                        try {
                            CLEANUPS();

                            let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                            if (err) {
                                if (targetExpr) {
                                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failedWithTarget', targetExpr, err));
                                }
                                else {
                                    vscode.window.showErrorMessage(i18.t('deploy.workspace.failed', err));
                                }
                            }
                            else {
                                if (failed.length > 0) {
                                    if (succeeded.length < 1) {
                                        if (targetExpr) {
                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.allFailedWithTarget', targetExpr, err));
                                        }
                                        else {
                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.allFailed', err));
                                        }
                                    }
                                    else {
                                        let allCount = succeeded.length + failed.length;
                                        if (targetExpr) {
                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.someFailedWithTarget', failed.length, allCount
                                                                                                                        , targetExpr));
                                        }
                                        else {
                                            vscode.window.showErrorMessage(i18.t('deploy.workspace.someFailed', failed.length, allCount));
                                        }
                                    }
                                }
                                else {
                                    let allCount = succeeded.length;
                                    if (allCount > 0) {
                                        if (deploy_helpers.toBooleanSafe(ME.config.showPopupOnSuccess, true)) {
                                            if (targetExpr) {
                                                vscode.window.showInformationMessage(i18.t('deploy.workspace.allSucceededWithTarget', allCount
                                                                                                                                    , targetExpr));
                                            }
                                            else {
                                                vscode.window.showInformationMessage(i18.t('deploy.workspace.allSucceeded', allCount));
                                            }
                                        }
                                    }
                                    else {
                                        if (targetExpr) {
                                            vscode.window.showWarningMessage(i18.t('deploy.workspace.nothingDeployedWithTarget', targetExpr));
                                        }
                                        else {
                                            vscode.window.showWarningMessage(i18.t('deploy.workspace.nothingDeployed'));
                                        }
                                    }
                                }
                            }

                            let resultMsg: string;
                            if (err || failed.length > 0) {
                                if (HAS_CANCELLED()) {
                                    resultMsg = i18.t('deploy.canceledWithErrors');
                                }
                                else {
                                    resultMsg = i18.t('deploy.finishedWithErrors');
                                }
                            }
                            else {
                                if (HAS_CANCELLED()) {
                                    resultMsg = i18.t('deploy.canceled');
                                }
                                else {
                                    resultMsg = i18.t('deploy.finished2');

                                    ME.afterDeployment(files, target).catch((err) => {
                                        vscode.window.showErrorMessage(i18.t('deploy.after.failed', err));
                                    });
                                }
                            }

                            if (resultMsg) {
                                afterDeployButtonMsg = resultMsg;

                                ME.outputChannel.appendLine(resultMsg);
                            }
                        }
                        finally {
                            ME.showStatusBarItemAfterDeployment(afterDeployButtonMsg,
                                                                files,
                                                                succeeded, failed);

                            CLEANUPS(err);
                        }
                    };

                    if (deploy_helpers.toBooleanSafe(target.checkBeforeDeploy)) {
                        const START_DEPLOY: boolean | null = await deploy_diff.checkForNewerFiles.apply(ME,
                                                                                                        [ files, target, currentPlugin ]);

                        if (!START_DEPLOY) {
                            continue;
                        }
                    }

                    statusBarItem.show();

                    let err: any;
                    try {
                        await PI.plugin.upload({
                            baseDirectory: null,
                            context: contextToUse,
                            cancellationToken: CANCEL_TOKEN.token,
                            files: files,
                            onBeforeUploadFile: (ctx) => {
                                let relativePath = deploy_helpers.toRelativePath(ctx.file);
                                if (false === relativePath) {
                                    relativePath = ctx.file;
                                }

                                let statusMsg: string;

                                let destination = deploy_helpers.toStringSafe(ctx.destination);
                                if (destination) {
                                    statusMsg = i18.t('deploy.workspace.statusWithDestination', relativePath, destination);
                                }
                                else {
                                    statusMsg = i18.t('deploy.workspace.status', relativePath);
                                }

                                statusBarItem.text = i18.t('deploy.button.text');
                                statusBarItem.tooltip = statusMsg + ` (${i18.t('deploy.workspace.clickToCancel')})`;
                            },
                            onFileUploaded: (ctx) => {
                                if (ctx.error) {
                                    ME.outputChannel.appendLine(i18.t('failed', ctx.error));

                                    failed.push(ctx.file);
                                }
                                else {
                                    ME.outputChannel.appendLine(i18.t('ok'));

                                    succeeded.push(ctx.file);
                                }
                            },
                            target: target,
                        });
                    }
                    catch (e) {
                        err = e;
                    }
                    finally {
                        SHOW_RESULT(err);
                    }
                }
                finally {
                    CLEANUPS();   
                }
            }
        }
        finally {
            deploy_helpers.tryDispose(CANCEL_TOKEN);
            
            if (deleteWorkspaceInProgressEntry) {
                delete WORKSPACE_IN_PROGRESS[NAME_OF_TARGET];
            }
        }
    };

    if (deploy_helpers.isNullOrUndefined(WORKSPACE_IN_PROGRESS[NAME_OF_TARGET])) {
        WORKSPACE_IN_PROGRESS[NAME_OF_TARGET] = {
            files: files,
            target: target,
            type: 'deploy',
        };

        deleteWorkspaceInProgressEntry = true;
        await START_DEPLOYMENT();
    }
    else {
        // there is currently something that is in progress for the target

        // [BUTTON] yes
        const YES_BTN: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
        YES_BTN.action = async () => {
            await START_DEPLOYMENT();
        };
        YES_BTN.title = i18.t('yes');

        const ITEM = await vscode.window
                                 .showWarningMessage(i18.t('pull.workspace.alreadyStarted', target.name),
                                                     YES_BTN);
        if (ITEM) {
            await Promise.resolve(
                ITEM.action()
            );
        }
        else {
            result = true;
        }
    }

    return result;
}

/**
 * Pulls files from a target.
 * 
 * @param {string[]} files The files to pull.
 * @param {deploy_contracts.DeployTarget} target The target from where to pull from.
 * 
 * @returns {Promise<boolean>} The promise.
 */
export async function pullFilesFrom(files: string[], target: deploy_contracts.DeployTarget): Promise<boolean> {
    const ME: vs_deploy.Deployer = this;

    if (files) {
        files = files.filter(f => !ME.isFileIgnored(f));
    }

    const NAME_OF_TARGET = deploy_helpers.normalizeString(target.name);

    let deleteWorkspaceInProgressEntry = false;
    const START_PULLING = async () => {
        const TYPE = deploy_helpers.parseTargetType(target.type);
        
        const PLUGINS = ME.asyncPlugIns.filter(x => {
            return '' === TYPE ||
                   (x.plugin.__type === TYPE && deploy_helpers.toBooleanSafe(x.plugin.canDownload) && x.plugin.download);
        });

        const CANCEL_TOKEN = new vscode.CancellationTokenSource();
        try {
            ME.onCancelling(() => {
                CANCEL_TOKEN.cancel();
            });

            const HAS_CANCELLED = () => {
                return CANCEL_TOKEN.token.isCancellationRequested;
            };

            while (PLUGINS.length > 0) {
                if (HAS_CANCELLED()) {
                    break;
                }

                const PI = PLUGINS.shift();
                const FILES_TO_DOWNLOAD = files.map(f => f);

                let cancelCommand: vscode.Disposable;
                let currentPluginWithContext = PI;
                let contextToUse = deploy_plugins.createPluginContext(currentPluginWithContext.context);
                let currentPlugin = currentPluginWithContext.plugin;
                let statusBarItem: vscode.StatusBarItem;

                let alreadyCleanedUp = false;
                const CLEANUPS = () => {
                    if (alreadyCleanedUp) {
                        return;
                    }
                    alreadyCleanedUp = true;

                    deploy_helpers.tryDispose(cancelCommand);
                    deploy_helpers.tryDispose(statusBarItem);
                    deploy_helpers.tryDispose(contextToUse);
                };

                try {
                    statusBarItem = vscode.window.createStatusBarItem(
                        vscode.StatusBarAlignment.Left,
                    );
                    statusBarItem.color = '#ffffff';
                    statusBarItem.text = i18.t('pull.button.prepareText');
                    statusBarItem.tooltip = i18.t('pull.button.tooltip');

                    const CANCEL_CMD_NAME = 'extension.deploy.cancelPullWorkspace' + (nextCancelPullWorkspaceCommandId--);
                    cancelCommand = vscode.commands.registerCommand(CANCEL_CMD_NAME, () => {
                        if (HAS_CANCELLED()) {
                            return;
                        }

                        CANCEL_TOKEN.cancel();

                        try {
                            contextToUse.emit(deploy_contracts.EVENT_CANCEL_PULL);
                        }
                        catch (e) {
                            ME.log(i18.t('errors.withCategory', 'Deployer.pullWorkspaceFrom().cancel', e));
                        }

                        statusBarItem.text = i18.t('pull.button.cancelling');
                        statusBarItem.tooltip = i18.t('pull.button.cancelling');
                    });
                    statusBarItem.command = CANCEL_CMD_NAME;

                    let failed: string[] = [];
                    let succeeded: string[] = [];
                    const SHOW_RESULT = (err?: any) => {
                        CLEANUPS();

                        let targetExpr = deploy_helpers.toStringSafe(target.name).trim();

                        if (err) {
                            if (targetExpr) {
                                vscode.window.showErrorMessage(i18.t('pull.workspace.failedWithTarget', targetExpr, err));
                            }
                            else {
                                vscode.window.showErrorMessage(i18.t('pull.workspace.failed', err));
                            }
                        }
                        else {
                            if (failed.length > 0) {
                                if (succeeded.length < 1) {
                                    if (targetExpr) {
                                        vscode.window.showErrorMessage(i18.t('pull.workspace.allFailedWithTarget', targetExpr, err));
                                    }
                                    else {
                                        vscode.window.showErrorMessage(i18.t('pull.workspace.allFailed', err));
                                    }
                                }
                                else {
                                    let allCount = succeeded.length + failed.length;
                                    if (targetExpr) {
                                        vscode.window.showErrorMessage(i18.t('pull.workspace.someFailedWithTarget', failed.length, allCount
                                                                                                                    , targetExpr));
                                    }
                                    else {
                                        vscode.window.showErrorMessage(i18.t('pull.workspace.someFailed', failed.length, allCount));
                                    }
                                }
                            }
                            else {
                                let allCount = succeeded.length;
                                if (allCount > 0) {
                                    if (deploy_helpers.toBooleanSafe(ME.config.showPopupOnSuccess, true)) {
                                        if (targetExpr) {
                                            vscode.window.showInformationMessage(i18.t('pull.workspace.allSucceededWithTarget', allCount
                                                                                                                                , targetExpr));
                                        }
                                        else {
                                            vscode.window.showInformationMessage(i18.t('pull.workspace.allSucceeded', allCount));
                                        }
                                    }
                                }
                                else {
                                    if (targetExpr) {
                                        vscode.window.showWarningMessage(i18.t('pull.workspace.nothingPulledWithTarget', targetExpr));
                                    }
                                    else {
                                        vscode.window.showWarningMessage(i18.t('pull.workspace.nothingPulled'));
                                    }
                                }
                            }
                        }

                        let resultMsg: string;
                        if (err || failed.length > 0) {
                            if (HAS_CANCELLED()) {
                                resultMsg = i18.t('pull.canceledWithErrors');
                            }
                            else {
                                resultMsg = i18.t('pull.finishedWithErrors');
                            }
                        }
                        else {
                            if (HAS_CANCELLED()) {
                                resultMsg = i18.t('pull.canceled');
                            }
                            else {
                                resultMsg = i18.t('pull.finished2');
                            }
                        }

                        if (resultMsg) {
                            ME.outputChannel.appendLine(resultMsg);
                        }
                    };

                    statusBarItem.show();

                    const DOWNLOADED_FILES = await PI.plugin.download({
                        cancellationToken: CANCEL_TOKEN.token,
                        context: contextToUse,
                        files: files,
                        onBeforeDownloadFile: (ctx) => {
                            let relativePath = deploy_helpers.toRelativePath(ctx.file);
                            if (false === relativePath) {
                                relativePath = ctx.file;
                            }

                            let statusMsg: string;

                            let destination = deploy_helpers.toStringSafe(ctx.destination);
                            if (destination) {
                                statusMsg = i18.t('pull.workspace.statusWithDestination', relativePath, destination);
                            }
                            else {
                                statusMsg = i18.t('pull.workspace.status', relativePath);
                            }

                            statusBarItem.text = i18.t('pull.button.text');
                            statusBarItem.tooltip = statusMsg + ` (${i18.t('pull.workspace.clickToCancel')})`;

                            ME.outputChannel.append(statusMsg);
                        },
                        onFileDownloadCompleted: (ctx) => {
                            if (ctx.error) {
                                ME.outputChannel.appendLine(i18.t('failed', ctx.error));

                                failed.push(ctx.file);
                            }
                            else {
                                ME.outputChannel.appendLine(i18.t('ok'));
                            }
                        },
                        target: target,
                    });

                    let err: any;
                    try {
                        // move download files to workspace
                        while (DOWNLOADED_FILES.length > 0) {
                            const DF = DOWNLOADED_FILES.shift();
                            try {
                                if (failed.indexOf(DF.file) > -1) {
                                    continue;  // failed
                                }

                                try {
                                    await writeFile(
                                        DF.file,
                                        await readFile(DF.path),
                                    );

                                    succeeded.push(DF.file);
                                }
                                catch (e) {
                                    failed.push(DF.file);
                                }
                            }
                            finally {
                                deploy_helpers.tryDispose(
                                    DF
                                );
                            }
                        }
                    }
                    catch (e) {
                        err = e;
                    }
                    finally {
                        while (DOWNLOADED_FILES.length > 0) {
                            deploy_helpers.tryDispose(
                                DOWNLOADED_FILES.shift()
                            );
                        }

                        SHOW_RESULT(err);
                    }
                }
                catch (e) {
                    vscode.window.showErrorMessage(i18.t('pull.workspace.failed', e));
                }
                finally {
                    CLEANUPS();
                }
            }
        }
        finally {
            deploy_helpers.tryDispose(CANCEL_TOKEN);

            if (deleteWorkspaceInProgressEntry) {
                delete WORKSPACE_IN_PROGRESS[NAME_OF_TARGET];
            }
        }
    };

    if (deploy_helpers.isNullOrUndefined(WORKSPACE_IN_PROGRESS[NAME_OF_TARGET])) {
        WORKSPACE_IN_PROGRESS[NAME_OF_TARGET] = {
            files: files,
            target: target,
            type: 'pull',
        };

        deleteWorkspaceInProgressEntry = true;
        await START_PULLING();
    }
    else {
        // there is currently something that is in progress for the target

        // [BUTTON] yes
        const YES_BTN: deploy_contracts.PopupButton = new deploy_objects.SimplePopupButton();
        YES_BTN.action = async () => {
            await START_PULLING();
        };
        YES_BTN.title = i18.t('yes');

        const ITEM = await vscode.window
                                 .showWarningMessage(i18.t('pull.workspace.alreadyStarted', target.name),
                                                     YES_BTN);
        if (!ITEM) {
            return true;
        }

        await Promise.resolve(
            ITEM.action()
        );
    }

    return false;
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

function readFile(path: string) {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            FS.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
}

function writeFile(path: string, data: any) {
    return new Promise<void>((resolve, reject) => {
        try {
            FS.writeFile(path, data, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
