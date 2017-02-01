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

import * as deploy_builders from '../builders';
import * as deploy_helpers from '../helpers';
import * as deploy_resources from '../resources/browser';
import * as FS from 'fs';
import * as HTTP from 'http';
import * as Path from 'path';
import * as URL from 'url';
import * as vs_deploy from '../deploy';
import * as vscode from 'vscode';


/**
 * The default port for the workspace browser host.
 */
export const DEFAULT_WORKSPACE_BROWSER_PORT = 1781;

/**
 * A HTTP for browsing the workspace.
 */
export class WorkspaceBrowserHost implements vscode.Disposable {
    /**
     * Stores the underlying deployer.
     */
    protected readonly _DEPLOYER: vs_deploy.Deployer;
    /**
     * The current server instance.
     */
    protected _server: HTTP.Server;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vs_deploy.Deployer} deployer The underlying deployer.
     */
    constructor(deployer: vs_deploy.Deployer) {
        this._DEPLOYER = deployer;
    }

    /**
     * Gets the underlying deployer.
     */
    public get deployer(): vs_deploy.Deployer {
        return this._DEPLOYER;
    }
    
    /** @inheritdoc */
    public dispose() {
        let me = this;
        
        me.stop().then(() => {

        }).catch((err) => {
            me.deployer.log(`[ERROR] browser.host.dispose(): ${deploy_helpers.toStringSafe(err)}`);
        });
    }

    /**
     * Handles a local directory.
     * 
     * @param {string} dir The local directory.
     * @param {HTTP.IncomingMessage} req The request context.
     * @param {HTTP.ServerResponse} resp The response context.
     */
    protected handleDirectory(dir: string,
                              req: HTTP.IncomingMessage, resp: HTTP.ServerResponse) {
        let me = this;

        let html = new deploy_builders.HtmlBuilder();
        try {
            html.header = deploy_resources.HTML_HEADER;
            html.footer = deploy_resources.HTML_FOOTER;

            html.write(`<u>dir: ${dir}</u>`);

            html.sendTo(resp);
        }
        finally {
            deploy_helpers.tryDispose(html);
        }
    }

    /**
     * Handles a local file.
     * 
     * @param {string} file The local file.
     * @param {HTTP.IncomingMessage} req The request context.
     * @param {HTTP.ServerResponse} resp The response context.
     */
    protected handleFile(file: string,
                         req: HTTP.IncomingMessage, resp: HTTP.ServerResponse) {
        let me = this;

        let html = new deploy_builders.HtmlBuilder();
        try {
            html.header = deploy_resources.HTML_HEADER;
            html.footer = deploy_resources.HTML_FOOTER;

            html.write(`<u>file: ${file}</u>`);

            html.sendTo(resp);
        }
        finally {
            deploy_helpers.tryDispose(html);
        }
    }

    /**
     * Handles a request.
     * 
     * @param {HTTP.IncomingMessage} req The request context.
     * @param {HTTP.ServerResponse} resp The response context.
     */
    protected handleRequest(req: HTTP.IncomingMessage, resp: HTTP.ServerResponse) {
        let me = this;

        let url = URL.parse(req.url);

        let workspaceRoot = Path.resolve(vscode.workspace.rootPath);

        let path = Path.join(vscode.workspace.rootPath, url.pathname);
        path = Path.resolve(path);
        if (0 != path.indexOf(workspaceRoot)) {
            me.sendNotFound(resp);
            return;
        }

        FS.exists(path, (exists) => {
            if (!exists) {
                me.sendNotFound(resp);
                return;
            }

            FS.lstat(path, (err, stats) => {
                if (err) {
                    me.sendError(err, resp);
                    return;
                }

                try {
                    if (stats.isFile()) {
                        me.handleFile(path,
                                      req, resp);
                    }
                    else if (stats.isDirectory()) {
                        me.handleDirectory(path,
                                           req, resp);
                    }
                    else {
                        me.sendNotFound(resp);
                    }
                }
                catch (e) {
                    me.sendError(e, resp);
                }
            });
        });
    }

    /**
     * Sends an error response.
     * 
     * @param {any} err The error to send.
     * @param {HTTP.ServerResponse} resp The response context.
     * @param {number} code The custom status code to send.
     */
    protected sendError(err: any, resp: HTTP.ServerResponse, code = 500) {
        try {
            resp.statusCode = code;
            resp.statusMessage = deploy_helpers.toStringSafe(err);

            resp.end();
        }
        catch (e) {
            this.deployer.log(`[ERROR] browser.host.sendError(): ${deploy_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Sends a "not found" response.
     * 
     * @param {HTTP.ServerResponse} resp The response context.
     * @param {number} code The custom status code to send.
     */
    protected sendNotFound(resp: HTTP.ServerResponse, code = 404) {
        try {
            resp.statusCode = 404;

            resp.end();
        }
        catch (e) {
            this.deployer.log(`[ERROR] browser.host.sendNotFound(): ${deploy_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Starts the server.
     * 
     * @param {number} [port] The custom TCP port to use.
     * 
     * @return Promise<boolean> The promise.
     */
    public start(port?: number): Promise<boolean> {
        if (deploy_helpers.isNullOrUndefined(port)) {
            port = DEFAULT_WORKSPACE_BROWSER_PORT;
        }
        port = parseInt(deploy_helpers.toStringSafe(port).trim());
        
        let me = this;
        
        return new Promise<boolean>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction<boolean>(resolve, reject);

            try {
                if (me._server) {
                    completed(null, false);
                    return;
                }

                let newServer = HTTP.createServer((req, resp) => {
                    try {
                        me.handleRequest(req, resp);
                    }
                    catch (e) {
                        me.sendError(e, resp);
                    }
                });

                newServer.on('error', (err) => {
                    if (err) {
                        me.deployer.log(`[ERROR] browser.host.start(): ${deploy_helpers.toStringSafe(err)}`);
                    }
                });

                newServer.listen(port, () => {
                    me._server = newServer;
                    completed(null, true);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Starts the server.
     * 
     * @param {number} [port] The custom TCP port to use.
     * 
     * @return Promise<boolean> The promise.
     */
    public stop(): Promise<boolean> {
        let me = this;
        
        return new Promise<boolean>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let oldServer = me._server;
                if (!oldServer) {
                    completed(null, false);
                    return;
                }

                oldServer.close((err) => {
                    completed(err, true);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
