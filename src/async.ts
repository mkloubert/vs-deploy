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
import * as deploy_plugins from './plugins';
import * as Enumerable from 'node-enumerable';
import * as FS from 'fs';
import * as Moment from 'moment';
import * as Path from 'path';
import * as TMP from 'tmp';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * An async deploy plugin.
 */
export interface AsyncDeployPlugin extends vscode.Disposable {
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the filename of the plugin.
     */
    __file?: string;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the full path of the plugin's file.
     */
    __filePath?: string;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the index of the plugin.
     */
    __index?: number;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the type of the plugin.
     */
    __type?: string;

    /**
     * Indicates if plugin is able to get information about remote files or not.
     */
    canGetFileInfo?: boolean;
    /**
     * Indicates if plugin can download files or not.
     */
    canDownload?: boolean;
    /**
     * Indicates if plugin can upload files or not.
     */
    canUpload?: boolean;
    /**
     * Compares files.
     * 
     * @param {AsyncDeployCompareContext} The context.
     * 
     * @return {PromiseLike<deploy_contracts.FileCompareResult[]>} The promise with the results.
     */
    compare?: (context: AsyncDeployCompareContext) => PromiseLike<deploy_contracts.FileCompareResult[]>;
    /**
     * Downloads files.
     * 
     * @param {AsyncDeployDownloadContext} The context.
     * 
     * @return {PromiseLike<AsyncDownloadedFile[]>} The promise with the results.
     */
    download?: (context: AsyncDeployDownloadContext) => PromiseLike<AsyncDownloadedFile[]>;
    /**
     * Receives information about files.
     * 
     * @param {AsyncDeployGetFileInfoContext} The context.
     * 
     * @return {PromiseLike<FileInfoWithFile[]>} The promise with the results.
     */
    getFileInfos?: (context: AsyncDeployGetFileInfoContext) => PromiseLike<FileInfoWithFile[]>;
    /**
     * Uploads files.
     * 
     * @param {AsyncDeployUploadContext} The context.
     */
    upload?: (context: AsyncDeployUploadContext) => PromiseLike<void>;
}

/**
 * A context for an async compare deploy operation.
 */
export interface AsyncDeployCompareContext extends AsyncDeployContext {
    /**
     * A callback that is invoked BEFORE a file comparison starts.
     * 
     * @param {BeforeCompareFileContext} context The context.
     * 
     * @return {any} The result.
     */
    onBeforeCompareFile?: (context: BeforeCompareFileContext) => any;

    /**
     * A callback that is invoked AFTER a file comparison has been completed.
     * 
     * @param {CompareFileCompletedContext} context The context.
     * 
     * @return {any} The result.
     */
    onCompareFileCompleted?: (context: CompareFileCompletedContext) => any;
}

/**
 * A async deploy context.
 */
export interface AsyncDeployContext {
    /**
     * Gets the custom base directory.
     */
    baseDirectory?: string;
    /**
     * Gets the cancellation token.
     */
    cancellationToken: vscode.CancellationToken;
    /**
     * Gets the custom deploy context.
     */
    context?: deploy_contracts.DeployContext;
    /**
     * Gets the list of files to deploy.
     */
    files: string[];
    /**
     * Gets the underlying target.
     */
    target: deploy_contracts.DeployTarget;
}

/**
 * An async context for downloading files.
 */
export interface AsyncDeployDownloadContext extends AsyncDeployContext {
    /**
     * The callback that is invoked BEFORE a file is going to be downloaded.
     * 
     * @param {BeforeDownloadFileContext} context The context.
     * 
     * @return {any} The result.
     */
    onBeforeDownloadFile?: (context: BeforeDownloadFileContext) => any;

    /**
     * The callback that is invoked AFTER a file has been downloaded.
     * 
     * @param {BeforeDownloadFileContext} context The context.
     * 
     * @return {any} The result.
     */
    onDownloadFileCompleted?: (context: DownloadFileCompletedContext) => any;
}

/**
 * An async context for getting infos of files.
 */
export interface AsyncDeployGetFileInfoContext extends AsyncDeployContext {
    /**
     * The callback that is invoked BEFORE a file is going to get file info.
     * 
     * @param {BeforeGetFileInfoContext} context The context.
     * 
     * @return {any} The result.
     */
    onBeforeGetFileInfo?: (context: BeforeGetFileInfoContext) => any;

    /**
     * The callback that is invoked AFTER file info has been received.
     * 
     * @param {GetFileInfoCompletedContext} context The context.
     * 
     * @return {any} The result.
     */
    onGetFileInfoCompleted?: (context: GetFileInfoCompletedContext) => any;
}

/**
 * An async context for uploading files.
 */
export interface AsyncDeployUploadContext extends AsyncDeployContext {
    /**
     * A callback that is invoked BEFORE a file is going to be uploaded.
     * 
     * @param {BeforeUploadFileContext} context The context.
     * 
     * @return {any} The result.
     */
    onBeforeUploadFile?: (context: BeforeUploadFileContext) => any;
    /**
     * A callback that is invoked AFTER a file has been uploaded.
     * 
     * @param {FileUploadedContext} context The context.
     * 
     * @return {any} The result.
     */
    onFileUploaded?: (context: FileUploadedContext) => any;
}

/**
 * An async downloaded file.
 */
export interface AsyncDownloadedFile extends vscode.Disposable {
    /**
     * The underlying file.
     */
    file: string;
    /**
     * Opens the file for reading.
     * 
     * @return {NodeJS.ReadableStream} The stream.
     */
    openRead: () => NodeJS.ReadableStream;
    /**
     * The path to the local file.
     */
    path: string;
    /**
     * Reads the whole content of the file.
     * 
     * @return {PromiseLike<Buffer>} The promise with the data.
     */
    read: () => PromiseLike<Buffer>;
}

/**
 * The context for a callback that is invoked BEFORE a file is going to be compared.
 */
export interface BeforeCompareFileContext extends BeforeDeployFileContext {
}

/**
 * The context for a callback that is invoked BEFORE a file is going to be deployed.
 */
export interface BeforeDeployFileContext {
    /**
     * The destination.
     */
    destination: string;
    /**
     * The underlying file.
     */
    file: string;
    /**
     * The underlying target.
     */
    target: deploy_contracts.DeployTarget;
}

/**
 * The context for a callback that is invoked BEFORE a file is going to be downloaded.
 */
export interface BeforeDownloadFileContext extends BeforeDeployFileContext {
}

/**
 * The context for a callback that is invoked BEFORE the information of a file is going to be received.
 */
export interface BeforeGetFileInfoContext extends BeforeDeployFileContext {
}

/**
 * The context for a callback that is invoked BEFORE a file is going to be uploaded.
 */
export interface BeforeUploadFileContext extends BeforeDeployFileContext {
}

/**
 * The context for a callback that is invoked AFTER a file has been compared.
 */
export interface CompareFileCompletedContext extends DeployFileCompletedContext {
}

/**
 * The context for a callback that is invoked AFTER a file has been deployed.
 */
export interface DeployFileCompletedContext {
    /**
     * Cancellation has been requested or not.
     */
    canceled: boolean;
    /**
     * The error (if occurred).
     */
    error?: any;
    /**
     * The underlying file.
     */
    file: string;
    /**
     * The underlying target.
     */
    target: deploy_contracts.DeployTarget;
}

/**
 * The context for a callback that is invoked AFTER a file has been downloaded.
 */
export interface DownloadFileCompletedContext extends DeployFileCompletedContext {
}

/**
 * Extended file information with an underlying (deployable) file.
 */
export interface FileInfoWithFile extends deploy_contracts.FileInfo {
    /**
     * Gets the underlying file.
     */
    file?: string;
}

/**
 * The context for a callback that is invoked AFTER a file has been uploaded.
 */
export interface FileUploadedContext extends DeployFileCompletedContext {
}

/**
 * The context for a callback that is invoked AFTER the information of a file has been received.
 */
export interface GetFileInfoCompletedContext extends DeployFileCompletedContext {
}

type SimpleCompletedAction<TResult> = (err: any, result?: TResult) => void;


/**
 * A basic async plugin.
 */
export abstract class AsyncDeployPluginBase implements AsyncDeployPlugin {
    /** @inheritdoc */
    public __file: string;
    /** @inheritdoc */
    public __filePath: string;
    /** @inheritdoc */
    public __index: number;
    /** @inheritdoc */
    public __type: string;

    /** @inheritdoc */
    public get canDownload() {
        return false;
    }

    /** @inheritdoc */
    public get canGetFileInfo() {
        return false;
    }

    /** @inheritdoc */
    public get canUpload() {
        return true;
    }

    /** @inheritdoc */
    public async compare(context: AsyncDeployCompareContext): Promise<deploy_contracts.FileCompareResult[]> {
        throw new Error("'compare' is not implemented!");
    }

    /** @inheritdoc */
    public dispose() {
    }

    /** @inheritdoc */
    public async download(context: AsyncDeployDownloadContext): Promise<AsyncDownloadedFile[]> {
        throw new Error("'download' is not implemented!");
    }

    /** @inheritdoc */
    public async getFileInfos(context: AsyncDeployGetFileInfoContext): Promise<deploy_contracts.FileInfo[]> {
        throw new Error("'getFileInfos' is not implemented!");
    }

    /** @inheritdoc */
    public async upload(context: AsyncDeployUploadContext): Promise<void> {
        throw new Error("'upload' is not implemented!");
    }
}

/**
 * An async wrapper for an old skool plugin.
 */
export class AsyncDeployPluginWrapper extends AsyncDeployPluginBase {
    private readonly _BASE_PLUGIN: deploy_contracts.DeployPlugin;
    private readonly _CONTEXT: deploy_contracts.DeployContext;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {deploy_contracts.DeployPlugin} basePlugin The plugin to wrap.
     * @param {deploy_contracts.DeployContext} [context] The context.
     */
    constructor(basePlugin: deploy_contracts.DeployPlugin, context?: deploy_contracts.DeployContext) {
        super();

        this._BASE_PLUGIN = basePlugin;

        this._CONTEXT = context;
        if (!this._CONTEXT) {
            this._CONTEXT = deploy_plugins.createPluginContext();
        }
    }

    /** @inheritdoc */
    public get __file() {
        return this.basePlugin.__file;
    }

    /** @inheritdoc */
    public get __filePath() {
        return this.basePlugin.__filePath;
    }

    /** @inheritdoc */
    public get __index() {
        return this.basePlugin.__index;
    }

    /** @inheritdoc */
    public get __type() {
        return this.basePlugin.__type;
    }

    /**
     * Gets the wrapped plugin.
     */
    public get basePlugin(): deploy_contracts.DeployPlugin {
        return this._BASE_PLUGIN;
    }

    /** @inheritdoc */
    public get canDownload() {
        return deploy_helpers.toBooleanSafe(this.basePlugin.canPull);
    }

    /** @inheritdoc */
    public get canGetFileInfo() {
        return deploy_helpers.toBooleanSafe(this.basePlugin.canGetFileInfo);
    }

    //TODO: test
    /** @inheritdoc */
    public async compare(context: AsyncDeployCompareContext): Promise<deploy_contracts.FileCompareResult[]> {
        const ME = this;
        
        if (!ME.canGetFileInfo) {
            return await super.compare(context);
        }

        let canceled = false;
        context.cancellationToken.onCancellationRequested(() => {
            canceled = true;
        });

        return new Promise<deploy_contracts.FileCompareResult[]>(async (resolve, reject) => {
            const COMPLETED = createPromiseCallback(resolve, reject);

            try {
                const FILE_INFOS = await ME.getFileInfos({
                    baseDirectory: context.baseDirectory,
                    cancellationToken: context.cancellationToken,
                    context: context.context,
                    files: context.files,
                    onBeforeGetFileInfo: (ctx) => {
                        if (context.onBeforeCompareFile) {
                            context.onBeforeCompareFile({
                                destination: ctx.destination,
                                file: ctx.file,
                                target: ctx.target,
                            });
                        }
                    },
                    onGetFileInfoCompleted: (ctx) => {
                        if (context.onCompareFileCompleted) {
                            context.onCompareFileCompleted({
                                canceled: canceled,
                                error: ctx.error,
                                file: ctx.file,
                                target: ctx.target,
                            });
                        }
                    },
                    target: context.target,
                });

                const RESULT: deploy_contracts.FileCompareResult[] = [];
                await Enumerable.from( FILE_INFOS ).async((ctx) => {
                    const RIGHT = ctx.item;

                    try {
                        const LEFT: deploy_contracts.FileInfo = {
                            exists: undefined,
                            isRemote: false,  
                        };

                        FS.exists(RIGHT.file, (exists) => {
                            LEFT.exists = exists;

                            if (exists) {
                                FS.lstat(RIGHT.file, (err, stat) => {
                                    if (err) {
                                        ctx.reject(err);
                                    }
                                    else {
                                        LEFT.name = Path.basename(RIGHT.file);
                                        LEFT.path = Path.dirname(RIGHT.file);
                                        LEFT.modifyTime = Moment(stat.ctime);
                                        LEFT.size = stat.size;
            
                                        RESULT.push({
                                            left: LEFT,
                                            right: RIGHT,
                                        });

                                        ctx.resolve();
                                    }
                                });
                            }
                            else {
                                ctx.resolve();
                            }
                        });
                    }
                    catch (e) {
                        ctx.reject(e);
                    }
                });

                COMPLETED(null, RESULT);
            }
            catch (e) {
                COMPLETED(e);
            }
        });
    }

    /**
     * Gets the underlying context.
     */
    public get context(): deploy_contracts.DeployContext {
        return this.context;
    }

    /** @inheritdoc */
    public dispose() {
        if (this.basePlugin.dispose) {
            this.basePlugin.dispose();
        }
    }

    //TODO: test
    /** @inheritdoc */
    public async download(context: AsyncDeployDownloadContext): Promise<AsyncDownloadedFile[]> {
        const ME = this;

        if (!ME.canDownload) {
            return await super.download(context);
        }

        let canceled = false;
        context.cancellationToken.onCancellationRequested(() => {
            canceled = true;
        });

        return new Promise<AsyncDownloadedFile[]>(async (resolve, reject) => {
            const COMPLETED = createPromiseCallback(resolve, reject);

            try {
                if (ME.basePlugin.downloadFile) {
                    const FILES = ME.normalizeFileList(context);

                    const WF = Workflows.create();

                    WF.next((wfCtx) => {
                        wfCtx.result = [];
                    });

                    FILES.forEach(f => {
                        WF.next((wfCtx) => {
                            const RESULT: AsyncDownloadedFile[] = wfCtx.result;

                            return new Promise<void>(async (res, rej) => {
                                const COMP = createPromiseCallback(res, rej);
                                if (canceled) {
                                    COMP(null);
                                    return;
                                }

                                try {
                                    if (ME.basePlugin.downloadFile) {
                                        let buff = await Promise.resolve(
                                            ME.basePlugin.downloadFile(f, context.target, {
                                                baseDirectory: context.baseDirectory,
                                                context: context.context,

                                                onBeforeDeploy: (sender, e) => {
                                                    if (context.onBeforeDownloadFile) {
                                                        context.onBeforeDownloadFile({
                                                            destination: e.destination,
                                                            file: e.file,
                                                            target: e.target,
                                                        });
                                                    }
                                                },

                                                onCompleted: (sender, e) => {
                                                    if (context.onDownloadFileCompleted) {
                                                        context.onDownloadFileCompleted({
                                                            canceled: canceled,
                                                            error: e.error,
                                                            file: e.file,
                                                            target: e.target,
                                                        });
                                                    }
                                                }
                                            })
                                        );

                                        TMP.tmpName({
                                            keep: true,
                                        }, (err, tmpFile) => {
                                            if (err) {
                                                COMP(err);
                                            }
                                            else {
                                                FS.writeFile(tmpFile, buff || Buffer.alloc(0), (err) => {
                                                    buff = null;

                                                    if (err) {
                                                        COMP(err);
                                                    }
                                                    else {
                                                        try {
                                                            const FILE: AsyncDownloadedFile = {
                                                                dispose: () => {
                                                                    if (FS.existsSync(tmpFile)) {
                                                                        FS.unlinkSync(tmpFile);
                                                                    }
                                                                },
                                                                file: f,
                                                                openRead: () => {
                                                                    return FS.createReadStream(tmpFile);
                                                                },
                                                                path: tmpFile,
                                                                read: () => {
                                                                    return new Promise<Buffer>((res2, rej2) => {
                                                                        try {
                                                                            FS.readFile(tmpFile, (err, data) => {
                                                                                if (err) {
                                                                                    rej2(err);
                                                                                }
                                                                                else {
                                                                                    res2(data);
                                                                                }
                                                                            });
                                                                        }
                                                                        catch (e) {
                                                                            rej2(e);
                                                                        }
                                                                    });
                                                                }
                                                            };

                                                            RESULT.push(FILE);
                                                            COMP(null);
                                                        }
                                                        catch (e) {
                                                            COMP(e);
                                                        }   
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else {
                                        COMP( new Error("'downloadFile' not implemented!") );
                                    }
                                }
                                catch (e) {
                                    COMP(e);
                                }
                            });
                        });
                    });

                    COMPLETED(null,
                              await WF.start());
                }
                else {
                    COMPLETED( new Error("'download' not implemented!") );
                }
            }
            catch (e) {
                COMPLETED(e);
            }
        });
    }

    //TODO: test
    /** @inheritdoc */
    public async getFileInfos(context: AsyncDeployGetFileInfoContext): Promise<FileInfoWithFile[]> {
        const ME = this;
        
        if (!ME.canGetFileInfo) {
            return await super.getFileInfos(context);
        }

        let canceled = false;
        context.cancellationToken.onCancellationRequested(() => {
            canceled = true;
        });

        return new Promise<FileInfoWithFile[]>(async (resolve, reject) => {
            const COMPLETED = createPromiseCallback(resolve, reject);

            try {
                if (ME.basePlugin.getFileInfo) {
                    const FILES = ME.normalizeFileList(context);

                    const WF = Workflows.create();

                    WF.next((wfCtx) => {
                        wfCtx.result = [];
                    });

                    FILES.forEach(f => {
                        WF.next((wfCtx) => {
                            const RESULT: FileInfoWithFile[] = wfCtx.result;

                            return new Promise<void>(async (res, rej) => {
                                const COMP = createPromiseCallback(res, rej);
                                if (canceled) {
                                    COMP(null);
                                    return;
                                }

                                try {
                                    if (ME.basePlugin.getFileInfo) {
                                        const FI = await Promise.resolve(
                                            ME.basePlugin.getFileInfo(f, context.target, {
                                                baseDirectory: context.baseDirectory,
                                                context: context.context || ME.context,

                                                onBeforeDeploy: (sender, e) => {
                                                    if (context.onBeforeGetFileInfo) {
                                                        context.onBeforeGetFileInfo({
                                                            destination: e.destination,
                                                            file: e.file,
                                                            target: e.target,
                                                        });
                                                    }
                                                },

                                                onCompleted: (sender, e) => {
                                                    if (context.onGetFileInfoCompleted) {
                                                        context.onGetFileInfoCompleted({
                                                            canceled: canceled,
                                                            error: e.error,
                                                            file: e.file,
                                                            target: context.target,
                                                        });
                                                    }
                                                }
                                            })
                                        );

                                        if (FI) {
                                            FI['file'] = f;

                                            RESULT.push(FI);
                                        }

                                        COMP(null);
                                    }
                                    else {
                                        COMP( new Error("'getFileInfo' not implemented!") );
                                    }
                                }
                                catch (e) {
                                    COMP(e);
                                }
                            });
                        });
                    });

                    COMPLETED(null,
                              await WF.start());
                }
                else {
                    COMPLETED( new Error("'getFileInfos' not implemented!") );
                }
            }
            catch (e) {
                COMPLETED(e);
            }
        });
    }

    /**
     * Normalizes the list of files.
     * 
     * @param {AsyncDeployContext} context The context.
     * 
     * @return {string[]} The normalized list.
     */
    protected normalizeFileList(context: AsyncDeployContext): string[] {
        return Enumerable.from( deploy_helpers.asArray(context.files) ).select(f => {
            return deploy_helpers.toStringSafe(f);
        }).where(f => '' !== f.trim())
          .toArray();
    }

    //TODO: test
    /** @inheritdoc */
    public async upload(context: AsyncDeployUploadContext): Promise<void> {
        const ME = this;
        
        if (!ME.canUpload) {
            return await super.upload(context);
        }

        let canceled = false;
        context.cancellationToken.onCancellationRequested(() => {
            canceled = true;
        });

        return new Promise<void>(async (resolve, reject) => {
            const COMPLETED = createPromiseCallback(resolve, reject);

            try {
                const FILES = ME.normalizeFileList(context);

                if (ME.basePlugin.deployWorkspace) {
                    ME.basePlugin.deployWorkspace(FILES, context.target, {
                        baseDirectory: context.baseDirectory,
                        context: context.context || ME.context,
                        
                        onBeforeDeployFile: (sender, e) => {
                            context.onBeforeUploadFile({
                                destination: e.destination,
                                file: e.file,
                                target: context.target,
                            });
                        },

                        onFileCompleted: (sender, e) => {
                            context.onFileUploaded({
                                canceled: canceled,
                                error: e.error,
                                file: e.file,
                                target: context.target,
                            });
                        },

                        onCompleted: (sender, e) => {
                            COMPLETED(e.error);
                        }
                    });
                }
                else if (ME.basePlugin.deployFile) {
                    const WF = Workflows.create();

                    FILES.forEach(f => {
                        WF.next((wfCtx) => {
                            return new Promise<void>((res, rej) => {
                                const COMP = createPromiseCallback(res, rej);
                                if (canceled) {
                                    COMP(null);
                                    return;
                                }

                                try {
                                    ME.basePlugin.deployFile(f, context.target, {
                                        baseDirectory: context.baseDirectory,
                                        context: context.context || ME.context,
                                        
                                        onBeforeDeploy: (sender, e) => {
                                            if (context.onBeforeUploadFile) {
                                                context.onBeforeUploadFile({
                                                    destination: e.destination,
                                                    file: e.file,
                                                    target: context.target,
                                                });
                                            }
                                        },

                                        onCompleted: (sender, e) => {
                                            if (context.onFileUploaded) {
                                                context.onFileUploaded({
                                                    canceled: canceled,
                                                    error: e.error,
                                                    file: e.file,
                                                    target: context.target,
                                                });
                                            }
                                        }
                                    });
                                }
                                catch (e) {
                                    COMP(e);
                                }
                            });
                        });
                    });

                    await WF.start();
                }
                else {
                    COMPLETED( new Error("'deployFile' and 'deployWorkspace' not implemented!") );
                }
            }
            catch (e) {
                COMPLETED(e);
            }
        });
    }
}


function createPromiseCallback<TResult>(resolve: (value?: TResult | PromiseLike<TResult>) => void,
                                        reject?: (reason: any) => void): SimpleCompletedAction<TResult> {
    let completedInvoked = false;
    
    return (err, result?) => {
        if (completedInvoked) {
            return;
        }
        completedInvoked = true;
        
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}
