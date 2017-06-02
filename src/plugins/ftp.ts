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

import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as deploy_values from '../values';
import * as FS from 'fs';
import * as FTP from 'ftp';
import * as i18 from '../i18';
const jsFTP = require('jsftp');
import * as Moment from 'moment';
const ParseListening = require("parse-listing");
import * as Path from 'path';
import * as TMP from 'tmp';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


interface DeployTargetFTP extends deploy_contracts.TransformableDeployTarget {
    dir?: string;
    host?: string;
    port?: number;
    rejectUnauthorized?: boolean;
    user?: string;
    password?: string;
    secure?: boolean;
    connTimeout?: number;
    pasvTimeout?: number;
    keepalive?: number;
    engine?: string;
    beforeUpload?: FTPCommands;
    closing?: FTPCommands;
    connected?: FTPCommands;
    uploaded?: FTPCommands;
}

type FTPCommands = string | string[];

interface FTPContext {
    cachedRemoteDirectories: any;
    connection: FtpClientBase;
    hasCancelled: boolean;
    user: string;
}

const FTP_TIME_FORMAT = 'YYYYMMDDHHmmss';
const FTP_FULL_TIME_FORMAT = 'YYYYMMDDHHmmss.SSS';
const MODE_PAD = '000';

function appendTimeValues(values: deploy_values.ValueBase[],
                          name: string, timeValue: Date) {
    if (!timeValue) {
        return;
    }
                              
    values.push(new deploy_values.StaticValue({
        name: name,
        value: Moment(timeValue).format(FTP_TIME_FORMAT),
    }));
    values.push(new deploy_values.StaticValue({
        name: name + '_utc',
        value: Moment(timeValue).utc().format(FTP_TIME_FORMAT),
    }));
    values.push(new deploy_values.StaticValue({
        name: name + '_full',
        value: Moment(timeValue).format(FTP_FULL_TIME_FORMAT),
    }));
    values.push(new deploy_values.StaticValue({
        name: name + '_full_utc',
        value: Moment(timeValue).utc().format(FTP_FULL_TIME_FORMAT),
    }));
}

function getDirFromTarget(target: DeployTargetFTP): string {
    let dir = deploy_helpers.toStringSafe(target.dir);
    if ('' === dir) {
        dir = '/';
    }

    return dir;
}

function toFTPPath(path: string): string {
    return deploy_helpers.replaceAllStrings(path, Path.sep, '/');
}

abstract class FtpClientBase {
    protected _context: deploy_contracts.DeployContext;
    
    constructor(context: deploy_contracts.DeployContext) {
        this._context = context;
    }

    public abstract connect(target: DeployTargetFTP): Promise<boolean>;

    public get context(): deploy_contracts.DeployContext {
        return this._context;
    }

    public abstract cwd(dir: string): Promise<string>;

    public abstract end(): Promise<boolean>;

    public abstract execute(cmd: string): Promise<any>;

    public executeCommands(commands: FTPCommands,
                           values?: deploy_values.ValueBase | deploy_values.ValueBase[]): Promise<any> {
        let me = this;
        
        commands = deploy_helpers.asArray(commands)
                                 .map(c => {
                                          c = deploy_helpers.toStringSafe(c);
                                          c = me.context.replaceWithValues(c);
                                          c = deploy_values.replaceWithValues(values, c);

                                          return c;
                                      })
                                 .filter(c => '' !== c.trim());

        let wf = Workflows.create();

        commands.forEach(c => {
            wf.next(() => {
                return new Promise<any>((resolve, reject) => {
                    me.execute(c).then(() => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });
        });

        return new Promise<any>((resolve, reject) => {
            wf.start().then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }

    public abstract get(file: string): Promise<Buffer>;

    public abstract getFileInfo(file: string): Promise<deploy_contracts.FileInfo>;

    public abstract mkdir(dir: string): Promise<string>;

    public abstract put(file: string, data: Buffer): Promise<Buffer>;
}

class FtpClient extends FtpClientBase {
    protected _connection: FTP;

    public connect(target: DeployTargetFTP): Promise<boolean> {
        let me = this;

        let isSecure = deploy_helpers.toBooleanSafe(target.secure, false);

        let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
        let port = parseInt(deploy_helpers.toStringSafe(target.port, isSecure ? '990' : '21').trim());

        let user = deploy_helpers.toStringSafe(target.user, 'anonymous');
        //TODO: password prompt
        let pwd = deploy_helpers.toStringSafe(target.password);

        let rejectUnauthorized = target.rejectUnauthorized;
        if (deploy_helpers.isNullOrUndefined(rejectUnauthorized)) {
            rejectUnauthorized = true;
        }
        rejectUnauthorized = !!rejectUnauthorized;

        let connTimeout = parseInt(deploy_helpers.toStringSafe(target.connTimeout).trim());
        if (isNaN(connTimeout)) {
            connTimeout = undefined;
        }

        let pasvTimeout = parseInt(deploy_helpers.toStringSafe(target.pasvTimeout).trim());
        if (isNaN(pasvTimeout)) {
            pasvTimeout = undefined;
        }

        let keepalive = parseInt(deploy_helpers.toStringSafe(target.keepalive).trim());
        if (isNaN(keepalive)) {
            keepalive = undefined;
        }
        
        return new Promise<boolean>((resolve, reject) => {
            let conn: FTP;
            let completedInvoked = false;
            let completed = (err: any, connected?: boolean) => {
                if (completedInvoked) {
                    return;
                }
                
                completedInvoked = true;
                if (err) {
                    reject(err);
                }
                else {
                    me._connection = conn;

                    resolve(connected);
                }
            };

            try {
                if (me.connection) {
                    completed(null, false);
                    return;
                }

                conn = new FTP();
                conn.once('error', function(err) {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, true);
                    }
                });
                conn.once('ready', function() {
                    completed(null, true);
                });
                conn.connect({
                    host: host, port: port,
                    user: user, password: pwd,
                    secure: isSecure,
                    secureOptions: {
                        rejectUnauthorized: rejectUnauthorized,
                    },
                    connTimeout: connTimeout,
                    pasvTimeout: pasvTimeout,
                    keepalive: keepalive,
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public get connection(): FTP {
        return this._connection;
    }

    public cwd(dir: string): Promise<string> {
        let me = this;

        return new Promise<string>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<string>(resolve, reject);

            try {
                me.connection.cwd(dir, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, dir);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public end(): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

            try {
                let conn = this._connection;

                if (conn) {
                    conn.end();

                    me._connection = null;
                    completed(null, true);
                }
                else {
                    completed(null, false);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public execute(cmd: string): Promise<any> {
        let me = this;
        
        return new Promise<any>((resolve, reject) => {
            try {
                let sendFunc: Function = me.connection['_send'];

                let sendArgs = [
                    cmd,
                    (err, respTxt, respCode) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    }
                ];

                sendFunc.apply(me.connection,
                               sendArgs);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    public get(file: string): Promise<Buffer> {
        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<Buffer>(resolve, reject);

            try {
                me.connection.get(file, (err, stream) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        try {
                            TMP.tmpName({
                                keep: true,
                            }, (err, tmpFile) => {
                                let deleteTempFile = (err: any, data?: Buffer) => {
                                    // delete temp file ...
                                    FS.exists(tmpFile, (exists) => {
                                        if (exists) {
                                            // ... if exist

                                            FS.unlink(tmpFile, () => {
                                                completed(err, data);
                                            });
                                        }
                                        else {
                                            completed(err, data);
                                        }
                                    });
                                };

                                let downloadCompleted = (err: any) => {
                                    if (err) {
                                        deleteTempFile(err);
                                    }
                                    else {
                                        FS.readFile(tmpFile, (err, data) => {
                                            if (err) {
                                                deleteTempFile(err);
                                            }
                                            else {
                                                deleteTempFile(null, data);
                                            }
                                        });
                                    }
                                };

                                try {
                                    // copy to temp file
                                    stream.pipe(FS.createWriteStream(tmpFile));

                                    stream.once('end', () => {
                                        downloadCompleted(null);
                                    });
                                }
                                catch (e) {
                                    downloadCompleted(e);
                                }
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public getFileInfo(file: string): Promise<deploy_contracts.FileInfo> {
        let me = this;

        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = (err, info?: deploy_contracts.FileInfo) => {
                if (!info) {
                    info = {
                        exists: false,
                        isRemote: true,
                    };
                }

                resolve(info);
            };

            let dir = Path.dirname(file);
            
            me.connection.list(dir, (err, list) => {
                if (err) {
                    completed(err);
                }
                else {
                    let info: deploy_contracts.FileInfo = {
                        exists: false,
                        isRemote: true,
                    };

                    if (list) {
                        for (let i = 0; i < list.length; i++) {
                            let f = list[i];
                            if (f.name !== Path.basename(file)) {
                                continue;
                            }

                            info.exists = true;

                            info.size = parseInt(deploy_helpers.toStringSafe(f.size).trim());
                            info.name = f.name;
                            info.path = dir;

                            if (f.date) {
                                info.modifyTime = Moment(f.date);
                            }

                            break;
                        }
                    }

                    completed(null, info);
                }
            });
        });
    }

    public mkdir(dir: string): Promise<string> {
        let me = this;

        return new Promise<string>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<string>(resolve, reject);

            try {
                me.connection.mkdir(dir, true, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, dir);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public put(file: string, data: Buffer): Promise<Buffer> {
        let me = this;

        if (!data) {
            data = Buffer.alloc(0);
        }

        return new Promise<Buffer>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<Buffer>(resolve, reject);

            try {
                me.connection.put(data, file, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, data);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
}

class JsFTPClient extends FtpClientBase {
    protected _connection: any;

    public connect(target: DeployTargetFTP): Promise<boolean> {
        let me = this;

        let isSecure = deploy_helpers.toBooleanSafe(target.secure, false);

        let host = deploy_helpers.toStringSafe(target.host, deploy_contracts.DEFAULT_HOST);
        let port = parseInt(deploy_helpers.toStringSafe(target.port, isSecure ? '990' : '21').trim());

        let user = deploy_helpers.toStringSafe(target.user, 'anonymous');
        //TODO: password prompt
        let pwd = deploy_helpers.toStringSafe(target.password);
        
        return new Promise<boolean>((resolve, reject) => {
            let conn: any;
            let completedInvoked = false;
            let completed = (err: any, connected?: boolean) => {
                if (completedInvoked) {
                    return;
                }
                
                completedInvoked = true;
                if (err) {
                    reject(err);
                }
                else {
                    me._connection = conn;

                    resolve(connected);
                }
            };

            try {
                if (me.connection) {
                    completed(null, false);
                    return;
                }

                conn = new jsFTP({
                    host: host,
                    port: port,
                    user: user, 
                    pass: pwd,
                });
                
                me._connection = conn;

                completed(null, true);
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public get connection(): any {
        return this._connection;
    }

    public cwd(dir: string): Promise<string> {
        let me = this;

        return new Promise<string>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<string>(resolve, reject);

            try {
                me.connection.list(dir, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, dir);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public end(): Promise<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

            try {
                let conn = this._connection;

                if (conn) {
                    conn.destroy();

                    me._connection = null;
                    completed(null, true);
                }
                else {
                    completed(null, false);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public execute(cmd: string): Promise<any> {
        let me = this;
        
        return new Promise<any>((resolve, reject) => {
            try {
                let parts = deploy_helpers.toStringSafe(cmd)
                                          .split(' ')
                                          .filter(x => '' !== x.trim());

                let c: string;
                if (parts.length > 0) {
                    c = parts[0];
                }

                let args = parts.filter((a, i) => i > 0);

                me.connection.raw(c, args, (err, data) => {
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

    public get(file: string): Promise<Buffer> {
        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<Buffer>(resolve, reject);

            try {
                me.connection.get(file, (err, socket) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        try {
                            let result: Buffer = Buffer.alloc(0);

                            socket.on("data", function(data: Buffer) {
                                try {
                                    if (data) {
                                        result = Buffer.concat([result, data]);
                                    }
                                }
                                catch (e) {
                                    completed(e);
                                }
                            });

                            socket.once("close", function(hadErr) {
                                if (hadErr) {
                                    completed(hadErr);
                                }
                                else {
                                    completed(null, result);
                                }
                            });

                            socket.resume();
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public getFileInfo(file: string): Promise<deploy_contracts.FileInfo> {
        let me = this;
        
        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = (err, info?: deploy_contracts.FileInfo) => {
                if (!info) {
                    info = {
                        exists: false,
                        isRemote: true,
                    };
                }

                resolve(info);
            };

            try {
                let dir = Path.dirname(file);
                
                me.connection.list(file, (err, result) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        ParseListening.parseEntries(result, function(err, list) {
                            if (err) {
                                completed(err);
                            }
                            else {
                                let info: deploy_contracts.FileInfo = {
                                    exists: false,
                                    isRemote: true,
                                };

                                if (list) {
                                    for (let i = 0; i < list.length; i++) {
                                        let f = list[i];
                                        if (f.name !== Path.basename(file)) {
                                            continue;
                                        }

                                        info.exists = true;

                                        info.size = parseInt(deploy_helpers.toStringSafe(f.size).trim());
                                        info.name = f.name;
                                        info.path = dir;

                                        if (!deploy_helpers.isNullUndefinedOrEmptyString(f.time)) {
                                            info.modifyTime = Moment(f.time);
                                        }

                                        break;
                                    }
                                }

                                completed(null, info);
                            }
                        });
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public mkdir(dir: string): Promise<string> {
        let me = this;

        return new Promise<string>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<string>(resolve, reject);

            try {
                me.connection.raw.mkd(dir, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, dir);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public put(file: string, data: Buffer): Promise<Buffer> {
        let me = this;

        if (!data) {
            data = Buffer.alloc(0);
        }

        return new Promise<Buffer>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<Buffer>(resolve, reject);

            try {
                me.connection.put(data, file, (err) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, data);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
}

class FtpPlugin extends deploy_objects.DeployPluginWithContextBase<FTPContext> {
    public get canGetFileInfo(): boolean {
        return true;
    }
    
    public get canPull(): boolean {
        return true;
    }

    protected createContext(target: DeployTargetFTP,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<FTPContext>> {
        let me = this;

        return new Promise<deploy_objects.DeployPluginContextWrapper<FTPContext>>((resolve, reject) => {
            let connectionValues: deploy_values.ValueBase[] = [];
     

            let completed = (err: any, conn?: FtpClientBase) => {
                if (err) {
                    reject(err);
                }
                else {
                    let ctx: FTPContext = {
                        cachedRemoteDirectories: {},
                        connection: conn,
                        hasCancelled: false,
                        user: deploy_helpers.toStringSafe(target.user, 'anonymous'),
                    };

                    // user
                    connectionValues.push(new deploy_values.StaticValue({
                        name: 'user',
                        value: ctx.user,
                    }));

                    me.onCancelling(() => {
                        ctx.hasCancelled = true;

                        conn.end().catch((e) => {
                            me.context.log(i18.t(`errors.withCategory`, 'FtpPlugin.createContext().onCancelling()', e));
                        });
                    }, opts);

                    let wrapper: deploy_objects.DeployPluginContextWrapper<any> = {
                        context: ctx,
                        destroy: function(): Promise<any> {
                            return new Promise<any>((resolve2, reject2) => {
                                delete ctx.cachedRemoteDirectories;

                                appendTimeValues(connectionValues,
                                                 'close_time', new Date());

                                // execute commands BEFORE close connection
                                conn.executeCommands(target.closing, connectionValues).then(() => {
                                    conn.end().then(() => {
                                        resolve2(conn);
                                    }).catch((e) => {
                                        reject2(e);
                                    });
                                }).catch((err) => {
                                    reject2(err);
                                });
                            });
                        },
                    };

                    resolve(wrapper);
                }
            };

            let client: FtpClientBase;
            let engine = deploy_helpers.normalizeString(target.engine);
            switch (engine) {
                case '':
                case 'ftp':
                    client = new FtpClient(me.context);
                    break;

                case 'jsftp':
                    client = new JsFTPClient(me.context);
                    break;
            }

            if (client) {
                client.connect(target).then(() => {
                    appendTimeValues(connectionValues,
                                     'connected_time', new Date());

                    // execute commands AFTER
                    // connection has been established
                    client.executeCommands(target.connected, connectionValues).then(() => {
                        completed(null, client);
                    }).catch((err) => {
                        completed(err);
                    });
                }).catch((err) => {
                    completed(err);
                });
            }
            else {
                completed(new Error(`Unknown engine: '${engine}'`));  //TODO: translate
            }
        });
    }

    protected deployFileWithContext(ctx: FTPContext,
                                    file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions) {
        let me = this;
        
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: ctx.hasCancelled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        if (ctx.hasCancelled) {
            completed();  // cancellation requested
        }
        else {
            let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativeFilePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let dir = getDirFromTarget(target);

            let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
            let targetDirectory = toFTPPath(Path.dirname(targetFile));

            let uploadFile = (stats: FS.Stats, initDirCache: boolean) => {
                if (ctx.hasCancelled) {
                    completed();  // cancellation requested
                    return;
                }

                if (deploy_helpers.toBooleanSafe(initDirCache)) {
                    ctx.cachedRemoteDirectories[targetDirectory] = [];
                }

                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        if (ctx.hasCancelled) {
                            completed();  // cancellation requested
                            return;
                        }

                        try {
                            let subCtx = {
                                file: file,
                                remoteFile: relativeFilePath,
                            };

                            let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Transform,
                                                                       subCtx);
                            tCtx.data = data;

                            let putValues: deploy_values.ValueBase[] = [];

                            let timeProperties = [ 'ctime', 'atime', 'mtime', 'birthtime' ];
                            timeProperties.forEach(tp => {
                                appendTimeValues(putValues,
                                                 tp, stats[tp]);
                            });

                            // directory and file
                            putValues.push(new deploy_values.StaticValue({
                                name: 'remote_dir',
                                value: targetDirectory,
                            }));
                            putValues.push(new deploy_values.StaticValue({
                                name: 'remote_file',
                                value: targetFile,
                            }));
                            putValues.push(new deploy_values.StaticValue({
                                name: 'remote_name',
                                value: Path.basename(targetFile),
                            }));

                            let modeFull = stats.mode.toString(8);
                            let modeDec = stats.mode.toString();

                            let modeSmall = modeFull;
                            modeSmall = MODE_PAD.substring(0, MODE_PAD.length - modeSmall.length) + modeSmall;
                            if (modeSmall.length >= 3) {
                                modeSmall = modeSmall.substr(-3, 3);
                            }

                            // mode
                            putValues.push(new deploy_values.StaticValue({
                                name: 'mode',
                                value: modeSmall,
                            }));
                            // mode_full
                            putValues.push(new deploy_values.StaticValue({
                                name: 'mode_full',
                                value: modeFull,
                            }));
                            // mode_decimal
                            putValues.push(new deploy_values.StaticValue({
                                name: 'mode_decimal',
                                value: modeDec,
                            }));

                            // user
                            putValues.push(new deploy_values.StaticValue({
                                name: 'user',
                                value: ctx.user,
                            }));

                            let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Transform)(tCtx);
                            Promise.resolve(tResult).then((transformedData) => {
                                // first execute commands BEFORE upload
                                ctx.connection.executeCommands(target.beforeUpload, putValues).then(() => {
                                    ctx.connection.put(targetFile, transformedData).then(() => {
                                        // then execute commands AFTER uploaded
                                        ctx.connection.executeCommands(target.uploaded, putValues).then(() => {
                                            completed();
                                        }).catch((err) => {
                                            completed(err);
                                        });
                                    }).catch((err) => {
                                        completed(err);
                                    });
                                }).catch((err) => {
                                    completed(err);
                                });
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    }
                });
            };

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: targetDirectory,
                    file: file,
                    target: target,
                });
            }

            let getFileStats = (initDirCache?: boolean) => {
                FS.lstat(file, (err, stats) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        uploadFile(stats, initDirCache);
                    }
                });
            };

            if (deploy_helpers.isNullOrUndefined(ctx.cachedRemoteDirectories[targetDirectory])) {
                // first check if directory exists ...
                ctx.connection.cwd(targetDirectory).then(() => {
                    if (ctx.hasCancelled) {
                        completed();  // cancellation requested
                    }
                    else {
                        getFileStats(true);
                    }
                }).catch((err) => {
                    if (ctx.hasCancelled) {
                        completed();
                    }
                    else {
                        if (err) {
                            // does not exist => try to create

                            ctx.connection.mkdir(targetDirectory).then(() => {
                                getFileStats(true);
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        else {
                            getFileStats(true);
                        }
                    }
                });
            }
            else {
                getFileStats();
            }
        }
    }

    protected downloadFileWithContext(ctx: FTPContext,
                                      file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        let me = this;
        
        return new Promise<Buffer>((resolve, reject) => {
            let completedInvoked = false;
            let completed = (err: any, data?: Buffer) => {
                if (completedInvoked) {
                    return;
                }

                completedInvoked = true;
                if (opts.onCompleted) {
                    opts.onCompleted(me, {
                        canceled: ctx.hasCancelled,
                        error: err,
                        file: file,
                        target: target,
                    });
                }

                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            };

            if (ctx.hasCancelled) {
                completed(null);  // cancellation requested
            }
            else {
                let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativeFilePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                let dir = getDirFromTarget(target);

                let targetFile = toFTPPath(Path.join(dir, relativeFilePath));
                let targetDirectory = toFTPPath(Path.dirname(targetFile));

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: targetDirectory,
                        file: file,
                        target: target,
                    });
                }

                ctx.connection.get(targetFile).then((data) => {
                    try {
                        let subCtx = {
                            file: file,
                            remoteFile: relativeFilePath,
                        };

                        let tCtx = me.createDataTransformerContext(target, deploy_contracts.DataTransformerMode.Restore,
                                                                   subCtx);
                        tCtx.data = data;

                        let tResult = me.loadDataTransformer(target, deploy_contracts.DataTransformerMode.Restore)(tCtx);
                        Promise.resolve(tResult).then((untransformedData) => {
                            completed(null, untransformedData);
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                }).catch((err) => {
                    completed(err);
                });
            }
        });
    }

    protected getFileInfoWithContext(ctx: FTPContext,
                                     file: string, target: DeployTargetFTP, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        return new Promise<deploy_contracts.FileInfo>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<deploy_contracts.FileInfo>(resolve, reject);
            
            try {
                let relativeFilePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
                if (false === relativeFilePath) {
                    completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                let dir = getDirFromTarget(target);
                
                let targetFile = toFTPPath(Path.join(dir, relativeFilePath));

                ctx.connection.getFileInfo(targetFile).then((info) => {
                    completed(null, info);
                }).catch((err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
    
    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.ftp.description'),
        };
    }
}

/**
 * Creates a new Plugin.
 * 
 * @param {deploy_contracts.DeployContext} ctx The deploy context.
 * 
 * @returns {deploy_contracts.DeployPlugin} The new instance.
 */
export function createPlugin(ctx: deploy_contracts.DeployContext): deploy_contracts.DeployPlugin {
    return new FtpPlugin(ctx);
}
