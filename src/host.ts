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

import { Deployer } from './deploy';
import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
import * as i18 from './i18';
import * as Net from 'net';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as ZLib from 'zlib';


/**
 * A file data transformer sub context.
 */
export interface FileDataTransformerContext extends TranformerContext {
    /**
     * The underlying file.
     */
    file: RemoteFile;
}

/**
 * A JSON message transformer sub context.
 */
export interface MessageTransformerContext extends TranformerContext {
}

/**
 * Data of a remote client.
 */
export interface RemoteClient {
    /**
     * The address of the client.
     */
    address: string;
    /**
     * The port of the client.
     */
    port: number;
}

/**
 * Describes a remote file (entry).
 */
export interface RemoteFile {
    /**
     * The data.
     */
    data?: Buffer;
    /**
     * Indicates if 'data' is compressed or not.
     */
    isCompressed?: boolean;
    /**
     * Indicates if entry is the first one or not.
     */
    isFirst?: boolean;
    /**
     * Indicates if entry is the last one or not.
     */
    isLast?: boolean;
    /**
     * The name / path of the file.
     */
    name?: string;
    /**
     * The index / number of the file (beginning at 1).
     */
    nr?: number;
    /**
     * The session ID.
     */
    session?: string;
    /**
     * An addtional value send by remote client.
     */
    tag?: any;
    /**
     * The total number of files that will be send.
     */
    totalCount?: number;
}

/**
 * A data transformer sub context.
 */
export interface TranformerContext {
    /**
     * Gets the list of global variables defined in settings.
     */
    globals: deploy_contracts.GlobalVariables;
    /**
     * Information about the remote client.
     */
    remote: RemoteClient;
    /**
     * The type of transformation.
     */
    type: TransformationType;
}

/**
 * Transformation type.
 */
export enum TransformationType {
    /**
     * File data
     */
    FileData = 0,
    /**
     * (JSON) message
     */
    Message = 1,
}

/**
 * A validator context.
 */
export interface ValidatorContext {
    /**
     * Gets the list of global variables defined in settings.
     */
    globals: deploy_contracts.GlobalVariables;
    /**
     * Information about the remote client.
     */
    remote: RemoteClient;
    /**
     * The (planned) path of the target.
     */
    target: string;
}

/**
 * A deploy host.
 */
export class DeployHost {
    /**
     * Stores the underlying deployer.
     */
    protected readonly _DEPLOYER: Deployer;
    /**
     * Stores the current server instance.
     */
    protected _server: Net.Server;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {Deployer} deploy The underlying deployer.
     */
    constructor(deployer: Deployer) {
        this._DEPLOYER = deployer;
    }

    /**
     * Gets the current config.
     */
    public get config(): deploy_contracts.DeployConfiguration {
        return this.deployer.config;
    }

    /**
     * Gets the underlying deployer.
     */
    public get deployer(): Deployer {
        return this._DEPLOYER;
    }

    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    public log(msg: any): DeployHost {
        this.deployer.log(msg);
        return this;
    }

    /**
     * Gets the output channel.
     */
    public get outputChannel(): vscode.OutputChannel {
        return this.deployer.outputChannel;
    }

    /**
     * Starts the host.
     * 
     * @returns {Promise<any>} The promise.
     */
    public start(): Promise<any> {
        let me = this;

        return new Promise<any>((resolve, reject) => {
            let startCompleted = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(me);
                }
            };

            if (me._server) {
                startCompleted();  // already started
                return;
            }

            let cfg = me.config;

            let dir: string;
            let jsonTransformer: deploy_contracts.DataTransformer;
            let jsonTransformerOpts: any;
            let maxMsgSize = deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE;
            let port = deploy_contracts.DEFAULT_PORT;
            let transformer: deploy_contracts.DataTransformer;
            let transformerOpts: any;
            let validator: deploy_contracts.Validator<RemoteFile>;
            let validatorOpts: any;
            if (cfg.host) {
                port = parseInt(deploy_helpers.toStringSafe(cfg.host.port,
                                                            '' + deploy_contracts.DEFAULT_PORT));

                maxMsgSize = parseInt(deploy_helpers.toStringSafe(cfg.host.maxMessageSize,
                                                                  '' + deploy_contracts.DEFAULT_MAX_MESSAGE_SIZE));

                dir = cfg.host.dir;

                // file data transformer
                transformerOpts = cfg.host.transformerOptions;
                if (cfg.host.transformer) {
                    let transformerModule = deploy_helpers.loadDataTransformerModule(cfg.host.transformer);
                    if (transformerModule) {
                        transformer = transformerModule.restoreData ||
                                      transformerModule.transformData;
                    }
                }

                // JSON data transformer
                jsonTransformerOpts = cfg.host.messageTransformerOptions;
                if (cfg.host.messageTransformer) {
                    let jsonTransformerModule = deploy_helpers.loadDataTransformerModule(cfg.host.messageTransformer);
                    if (jsonTransformerModule) {
                        jsonTransformer = jsonTransformerModule.restoreData ||
                                          jsonTransformerModule.transformData;
                    }
                }

                // file validator
                validatorOpts = cfg.host.validatorOptions;
                if (cfg.host.validator) {
                    let validatorModule = deploy_helpers.loadValidatorModule<RemoteFile>(cfg.host.validator);
                    if (validatorModule) {
                        validator = validatorModule.validate;
                    }
                }
            }

            dir = deploy_helpers.toStringSafe(dir, deploy_contracts.DEFAULT_HOST_DIR);
            if (!Path.isAbsolute(dir)) {
                dir = Path.join(vscode.workspace.rootPath, dir);
            }

            jsonTransformer = deploy_helpers.toDataTransformerSafe(jsonTransformer);
            transformer = deploy_helpers.toDataTransformerSafe(transformer);
            validator = deploy_helpers.toValidatorSafe(validator);

            let server = Net.createServer((socket) => {
                let remoteClient: RemoteClient = {
                    address: socket.remoteAddress,
                    port: socket.remotePort,
                };

                let showError = (err: any) => {
                    me.log(i18.t('errors.withCategory', 'DeployHost.start().createServer()', err));
                };
                
                let closeSocket = () => {
                    try {
                        socket.destroy();
                    }
                    catch (e) {
                        me.log(i18.t('errors.withCategory', 'DeployHost.start().createServer(1)', e));
                    }
                };

                let startReading = () => {
                    try {
                        deploy_helpers.readSocket(socket, 4).then((dlBuff) => {
                            if (4 != dlBuff.length) {  // must have the size of 4
                                me.log(i18.t('warnings.withCategory', 'DeployHost.start().createServer()',
                                             `Invalid data buffer length ${dlBuff.length}`));

                                closeSocket();
                                return;
                            }

                            let dataLength = dlBuff.readUInt32LE(0);
                            if (dataLength > maxMsgSize) {  // out of range
                                me.log(i18.t('warnings.withCategory', 'DeployHost.start().createServer()',
                                             `Invalid data length ${dataLength}`));

                                closeSocket();
                                return;
                            }

                            deploy_helpers.readSocket(socket, dataLength).then((msgBuff) => {
                                closeSocket();

                                if (msgBuff.length != dataLength) {  // non-exptected data length
                                    me.log(i18.t('warnings.withCategory', 'DeployHost.start().createServer()',
                                                 `Invalid buffer length ${msgBuff.length}`));

                                    return;
                                }
                                
                                let completed = (err?: any, file?: string) => {
                                    if (err) {
                                        let failMsg = '';
                                        if (file) {
                                            failMsg += `'${deploy_helpers.toStringSafe(file)}'; `;
                                        }
                                        failMsg += deploy_helpers.toStringSafe(err);

                                        me.outputChannel.appendLine(i18.t('host.receiveFile.failed', failMsg));
                                    }
                                    else {
                                        let okMsg = '';
                                        if (file) {
                                            okMsg = `: '${deploy_helpers.toStringSafe(file)}'`;
                                        }

                                        me.outputChannel.appendLine(i18.t('host.receiveFile.ok', okMsg));
                                    }
                                };

                                let jsonTransformerCtx: MessageTransformerContext = {
                                    globals: me.deployer.getGlobals(),
                                    remote: remoteClient,
                                    type: TransformationType.Message,
                                };

                                // restore "transformered" JSON message
                                jsonTransformer({
                                    context: jsonTransformerCtx,
                                    data: msgBuff,
                                    emitGlobal: function() {
                                        return me.deployer
                                                 .emit
                                                 .apply(me.deployer, arguments);
                                    },
                                    globals: me.deployer.getGlobals(),
                                    mode: deploy_contracts.DataTransformerMode.Restore,
                                    options: jsonTransformerOpts,
                                    require: function(id) {
                                        return require(id);
                                    },
                                }).then((untransformedMsgBuff) => {
                                    try {
                                        let json = untransformedMsgBuff.toString('utf8');
                                        
                                        let file: RemoteFile;
                                        if (json) {
                                            file = JSON.parse(json);
                                        }

                                        if (file) {
                                            // output that we are receiving a file...

                                            let fileInfo = '';
                                            if (!deploy_helpers.isNullOrUndefined(file.nr)) {
                                                let fileNr = parseInt(deploy_helpers.toStringSafe(file.nr));
                                                if (!isNaN(fileNr)) {
                                                    fileInfo += ` (${fileNr}`;
                                                    if (!deploy_helpers.isNullOrUndefined(file.totalCount)) {
                                                        let totalCount = parseInt(deploy_helpers.toStringSafe(file.totalCount));
                                                        if (!isNaN(totalCount)) {
                                                            fileInfo += ` / ${totalCount}`;

                                                            if (0 != totalCount) {
                                                                let percentage = Math.floor(fileNr / totalCount * 10000.0) / 100.0;
                                                                
                                                                fileInfo += `; ${percentage}%`;
                                                            }
                                                        }
                                                    }
                                                    fileInfo += ")";
                                                }
                                            }

                                            let receiveFileMsg = i18.t('host.receiveFile.receiving',
                                                                       remoteClient.address, remoteClient.port,
                                                                       fileInfo);

                                            me.outputChannel.append(receiveFileMsg);

                                            file.name = deploy_helpers.toStringSafe(file.name);
                                            file.name = deploy_helpers.replaceAllStrings(file.name, Path.sep, '/');

                                            if (file.name) {
                                                let fileCompleted = (err?: any) => {
                                                    completed(err, file.name);
                                                };

                                                try {
                                                    let base64 = deploy_helpers.toStringSafe(file.data);

                                                    let data: Buffer;
                                                    if (base64) {
                                                        data = new Buffer(base64, 'base64');
                                                    }
                                                    else {
                                                        data = Buffer.alloc(0);
                                                    }
                                                    file.data = data;

                                                    let targetFile = Path.join(dir, file.name);

                                                    let handleData = function(data: Buffer) {
                                                        try {
                                                            while (0 == file.name.indexOf('/')) {
                                                                file.name = file.name.substr(1);
                                                            }

                                                            if (file.name) {
                                                                let targetDir = Path.dirname(targetFile);
                                                                
                                                                let copyFile = () => {
                                                                    try {
                                                                        FS.writeFile(targetFile, file.data, (err) => {
                                                                            if (err) {
                                                                                fileCompleted(err);
                                                                                return;
                                                                            }

                                                                            fileCompleted();
                                                                        });
                                                                    }
                                                                    catch (e) {
                                                                        fileCompleted(e);
                                                                    }
                                                                };

                                                                // check if targetDir is a directory
                                                                let checkIfTargetDirIsDir = () => {
                                                                    FS.lstat(targetDir, (err, stats) => {
                                                                        if (err) {
                                                                            fileCompleted(err);
                                                                            return;
                                                                        }

                                                                        if (stats.isDirectory()) {
                                                                            copyFile();  // yes, continue...
                                                                        }
                                                                        else {
                                                                            // no => ERROR
                                                                            fileCompleted(new Error(i18.t('isNo.directory', targetDir)));
                                                                        }
                                                                    });
                                                                };

                                                                // check if targetDir exists
                                                                let checkIfTargetDirExists = () => {
                                                                    FS.exists(targetDir, (exists) => {
                                                                        if (exists) {
                                                                            // yes, continue...
                                                                            checkIfTargetDirIsDir();
                                                                        }
                                                                        else {
                                                                            // no, try to create
                                                                            FSExtra.mkdirs(targetDir, function (err) {
                                                                                if (err) {
                                                                                    fileCompleted(err);
                                                                                    return;
                                                                                }

                                                                                checkIfTargetDirIsDir();
                                                                            });
                                                                        }
                                                                    });
                                                                };
                                                                
                                                                FS.exists(targetFile, (exists) => {
                                                                    if (exists) {
                                                                        try {
                                                                            FS.lstat(targetFile, (err, stats) => {
                                                                                if (err) {
                                                                                    fileCompleted(err);
                                                                                    return;
                                                                                }

                                                                                if (stats.isFile()) {
                                                                                    FS.unlink(targetFile, (err) => {
                                                                                        if (err) {
                                                                                            fileCompleted(err);
                                                                                            return;
                                                                                        }

                                                                                        checkIfTargetDirExists();
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    fileCompleted(new Error(i18.t('isNo.file', targetFile)));
                                                                                }
                                                                            });
                                                                        }
                                                                        catch (e) {
                                                                            fileCompleted(e);
                                                                        }
                                                                    }
                                                                    else {
                                                                        checkIfTargetDirExists();
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                fileCompleted(new Error(i18.t('host.errors.noFilename', 2)));
                                                            }
                                                            // if (file.name) #2
                                                        }
                                                        catch (e) {
                                                            fileCompleted(e);
                                                        }
                                                    };  // handleData()

                                                    let validateFile = () => {
                                                        let validatorCtx: ValidatorContext = {
                                                            globals: me.deployer.getGlobals(),
                                                            remote: remoteClient,
                                                            target: targetFile,
                                                        };

                                                        let validatorArgs: deploy_contracts.ValidatorArguments<RemoteFile> = {
                                                            context: validatorCtx,
                                                            emitGlobal: function() {
                                                                return me.deployer
                                                                         .emit
                                                                         .apply(me.deployer, arguments);
                                                            },
                                                            globals: me.deployer.getGlobals(),
                                                            options: validatorOpts,
                                                            require: function(id) {
                                                                return require(id);
                                                            },
                                                            value: file,
                                                        };

                                                        try {
                                                            let updateTargetFile = (action: () => void) => {
                                                                let vc: ValidatorContext = validatorArgs.context;
                                                                if (vc) {
                                                                    if (!deploy_helpers.isEmptyString(vc.target)) {
                                                                        targetFile = vc.target;
                                                                    }
                                                                }

                                                                if (!Path.isAbsolute(targetFile)) {
                                                                    targetFile = Path.join(vscode.workspace.rootPath, targetFile);
                                                                }

                                                                action();
                                                            };  // updateTargetFile()

                                                            // check if file is valid
                                                            validator(validatorArgs).then((isValid) => {
                                                                if (isValid) {
                                                                    updateTargetFile(() => {
                                                                        handleData(file.data);
                                                                    });
                                                                }
                                                                else {
                                                                    // no => rejected

                                                                    updateTargetFile(() => {
                                                                        fileCompleted(new Error(i18.t('host.errors.fileRejected', file.name)));
                                                                    });
                                                                }
                                                            }).catch((err) => {
                                                                fileCompleted(err);
                                                            });
                                                        }
                                                        catch (e) {
                                                            fileCompleted(e);
                                                        }
                                                    };  // validateFile

                                                    let untransformTheData = function(data?: Buffer) {
                                                        if (arguments.length > 0) {
                                                            file.data = data;
                                                        }

                                                        try {
                                                            let transformerCtx: FileDataTransformerContext = {
                                                                file: file,
                                                                globals: me.deployer.getGlobals(),
                                                                remote: remoteClient,
                                                                type: TransformationType.FileData,
                                                            };

                                                            transformer({
                                                                context: transformerCtx,
                                                                data: file.data,
                                                                emitGlobal: function() {
                                                                    return me.deployer
                                                                             .emit
                                                                             .apply(me.deployer, arguments);
                                                                },
                                                                globals: me.deployer.getGlobals(),
                                                                require: function(id) {
                                                                    return require(id);
                                                                },
                                                                mode: deploy_contracts.DataTransformerMode.Restore,
                                                                options: transformerOpts,
                                                            }).then((untransformedData) => {
                                                                file.data = untransformedData;

                                                                validateFile();
                                                            }).catch((err) => {
                                                                fileCompleted(err);
                                                            });
                                                        }
                                                        catch (e) {
                                                            fileCompleted(e);
                                                        }
                                                    };  // untransformTheData()

                                                    if (file.isCompressed) {
                                                        ZLib.gunzip(file.data, (err, uncompressedData) => {
                                                            if (err) {
                                                                fileCompleted(err);
                                                                return;
                                                            }

                                                            untransformTheData(uncompressedData);                                                
                                                        });
                                                    }
                                                    else {
                                                        untransformTheData();
                                                    }
                                                }
                                                catch (e) {
                                                    fileCompleted(e);
                                                }
                                            }
                                            else {
                                                completed(new Error(i18.t('host.errors.noFilename', 1)));
                                            }
                                            // if (file.name) #1
                                        }
                                        else {
                                            completed(new Error(i18.t('host.errors.noData')));
                                        }
                                        // if (file)
                                    }
                                    catch (e) {
                                        completed(e);
                                    }
                                }).catch((err) => {
                                    completed(err);
                                });
                            }).catch((err) => {
                                me.log(i18.t('errors.withCategory', 'DeployHost.start().createServer(3)', err));

                                closeSocket();
                            });
                        }).catch((err) => {
                            me.log(i18.t('errors.withCategory', 'DeployHost.start().createServer(4)', err));

                            closeSocket();
                        });
                    }
                    catch (e) {
                        me.log(i18.t('errors.withCategory', 'DeployHost.start().createServer(5)', e));

                        closeSocket();
                    }
                };  // startReading()

                let checkIfDirIsDirectory = () => {
                    // now check if directory
                    FS.lstat(dir, (err, stats) => {
                        if (err) {
                            showError(err);
                            return;
                        }

                        if (stats.isDirectory()) {
                            startReading();  // all is fine => start reading
                        }
                        else {
                            showError(new Error(i18.t('isNo.directory', dir)));
                        }
                    });
                };  // checkIfDirIsDirectory()

                // first check if target directory does exist
                FS.exists(dir, (exists) => {
                    if (exists) {
                        checkIfDirIsDirectory();
                    }
                    else {
                        // directory does not exist => create

                        FSExtra.mkdirs(dir, function (err) {
                            if (err) {
                                showError(err);
                                return;
                            }

                            checkIfDirIsDirectory();
                        });
                    }
                });
            });

            server.on('listening', (err) => {
                if (err) {
                    startCompleted(err);
                }
                else {
                    try {
                        me._server = server;

                        startCompleted();
                    }
                    catch (e) {
                        startCompleted(e);
                    }
                }
            });

            server.on('error', (err) => {
                if (err) {
                    startCompleted(err);
                }
            });

            try {
                // start listening
                server.listen(port);
            }
            catch (e) {
                startCompleted(e);
            }
        });
    }

    /**
     * Stops the host.
     * 
     * @returns {Promise<any>} The promise.
     */
    public stop(): Promise<any> {
        let me = this;
        
        return new Promise<any>((resolve, reject) => {
            let stopCompleted = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(me);
                }
            };

            let srv = me._server;
            if (!srv) {
                stopCompleted();  // already stopped / not running
                return;
            }

            srv.close((err) => {
                if (!err) {
                    me._server = null;
                }

                stopCompleted(err);
            });
        });
    }
}
