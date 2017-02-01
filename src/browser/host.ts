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
const Entities = require('html-entities').AllHtmlEntities;
import * as FS from 'fs';
import * as HTTP from 'http';
import * as Path from 'path';
import * as URL from 'url';
import * as vs_deploy from '../deploy';
import * as vscode from 'vscode';

import * as deploy_res_css from '../resources/css';
import * as deploy_res_fontawesome from '../resources/fonts/fontawesome';
import * as deploy_res_glyphicons from '../resources/fonts/glyphicons';
import * as deploy_res_images from '../resources/images';
import * as deploy_res_javascript from '../resources/javascript';


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
     * Returns the content from a "file object".
     * 
     * @param {Object} files The object.
     * @param {string} fileName The name of the file.
     * 
     * @return {Buffer} The data (if found).
     */    
    protected getFileContent(files: Object, fileName: string): Buffer {
        fileName = deploy_helpers.normalizeString(fileName);

        let data: Buffer;
        if (files) {
            for (let fn in files) {
                if (deploy_helpers.normalizeString(fn) == fileName) {
                    data = new Buffer(files[fn], 'base64');
                    break;
                }
            }
        }

        return data;
    }

    /**
     * Returns the value from a "parameter" object.
     * 
     * @param {Object} params The object.
     * @param {string} name The name of the parameter.
     * 
     * @return {string} The value of the parameter (if found).
     */
    protected getUrlParam(params: Object, name: string): string {
        if (params) {
            name = deploy_helpers.normalizeString(name);

            for (let p in params) {
                if (deploy_helpers.normalizeString(p) == name) {
                    return deploy_helpers.toStringSafe(params[p]);
                }
            }
        }
    }

    /**
     * Handles a local directory.
     * 
     * @param {string} dir The local directory.
     * @param {deploy_builders.HtmlBuilder} html The HTML builder.
     * @param {HTTP.IncomingMessage} req The request context.
     * @param {HTTP.ServerResponse} resp The response context.
     */
    protected handleDirectory(dir: string, html: deploy_builders.HtmlBuilder,
                              req: HTTP.IncomingMessage, resp: HTTP.ServerResponse) {
        let me = this;

        try {
            html.write(`@TODO: dir: ${dir}`);

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
     * @param {deploy_builders.HtmlBuilder} html The HTML builder.
     * @param {HTTP.IncomingMessage} req The request context.
     * @param {HTTP.ServerResponse} resp The response context.
     */
    protected handleFile(file: string, html: deploy_builders.HtmlBuilder,
                         req: HTTP.IncomingMessage, resp: HTTP.ServerResponse) {
        let me = this;

        FS.readFile(file, (err, data) => {
            if (err) {
                me.sendError(err, resp);
                return;
            }

            let ext = Path.extname(file);
            if (ext) {
                ext = ext.substr(1).toLowerCase().trim();
            }

            deploy_helpers.isBinaryContent(data).then((isBinary) => {
                if (isBinary) {
                    html.write('@TODO: This is binary content!');

                    html.sendTo(resp);
                }
                else {
                    let str = data.toString('utf8');

                    let content = `
<div class="panel panel-default vsd-code-panel">
  <div class="panel-heading">${Entities.encode(Path.basename(file))}</div>

  <div class="panel-body">
    <pre class="vsd-code-block"><code class="${ext}">${Entities.encode(str)}</code></pre>
  </div>
</div>

<script type="text/javascript">

jQuery(function() {
    jQuery('.vsd-code-block code').each(function(i, block) {
        hljs.highlightBlock(block);
    });
});

</script>
`;

                    html.write(content);

                    html.sendTo(resp);
                }
            }).catch((e) => {
                me.sendError(e, resp);
            });
        });
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

        let params = me.urlParamsToObject(url);

        try {
            let fontName = me.getUrlParam(params, 'f');
            if (!deploy_helpers.isEmptyString(fontName)) {
                me.outputFont(fontName, resp);
                return;
            }

            let cssName = me.getUrlParam(params, 'c');
            if (!deploy_helpers.isEmptyString(cssName)) {
                me.outputCSS(cssName, resp);
                return;
            }

            let jsName = me.getUrlParam(params, 'j');
            if (!deploy_helpers.isEmptyString(jsName)) {
                me.outputJavaScript(jsName, resp);
                return;
            }

            let imgName = me.getUrlParam(params, 'i');
            if (!deploy_helpers.isEmptyString(imgName)) {
                me.outputImage(imgName, resp);
                return;
            }
        }
        catch (e) {
            me.sendError(e, resp);

            return;
        }

        let workspaceRoot = Path.resolve(vscode.workspace.rootPath);

        let path = me.getUrlParam(params, 'p');
        if (deploy_helpers.isEmptyString(path)) {
            path = '/';
        }
        else {
            path = decodeURIComponent(path);
        }
        path = Path.join(workspaceRoot, path);
        path = Path.resolve(path);

        let relativePath = deploy_helpers.toRelativePath(path);
        if (false === relativePath) {
            me.sendNotFound(resp);
            return;
        }

        let html = new deploy_builders.HtmlBuilder();

        html.header = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>vs-deploy</title>

    <link href="/?c=bootstrap.css" rel="stylesheet">
    <link href="/?c=font-awesome.css" rel="stylesheet">
    <link href="/?c=highlight.darkula.css" rel="stylesheet">

    <style type="text/css">

    body {
        padding-bottom: 70px;
        padding-top: 70px;
    }

    #vsd-brand-image {
        float: left;
        height: 24px;
        width: 24px;
    }

    .navbar-brand span {
        float: left;
        margin-left: 8px;
    }

    #vsd-footer .row .vsd-left {
        font-size: 0.70em;
        padding-top: 16px;
    }

    #vsd-footer .row .vsd-right img {
        float: right;
        margin-left: 8px;
        position: relative;
        top: 15px;
        height: 16px;
    }

    .vsd-code-block {
        padding: 0;
        border: 0 none transparent;
        background-color: transparent;
    }

    .vsd-code-block code {
        padding: 0;
    }

    .vsd-code-panel .panel-body {
        background-color: #2b2b2b;
    }

    </style>

    <!--[if lt IE 9]>
      <script src="/?j=html5shiv.min.js"></script>
      <script src="/?j=respond.min.js"></script>
    <![endif]-->

    <script src="/?j=jquery.min.js"></script>
    <script src="/?j=bootstrap.min.js"></script>
    <script src="/?j=highlight.pack.js"></script>
  </head>
  <body>
    <nav class="navbar navbar-default navbar-fixed-top">
      <div class="container">
        <div class="navbar-header">
          <a class="navbar-brand" href="https://github.com/mkloubert/vs-deploy" target="_blank">
            <img alt="vs-deploy" title="vs-deploy" id="vsd-brand-image" src="/?i=brand.png">

            <span>vs-deploy</span>
          </a>
        </div>
      </div>
    </nav>

    <div class="container">
      <div class="row">{{ vsdeploy::breadcrumb }}</div>

      <div class="row">
        <div class="col-xs-12 col-md-4">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title">Workspace</h3>
            </div>
            
            <div class="panel-body">{{ vsdeploy::workspace }}</div>
          </div>
        </div>

        <div class="col-xs-12 col-md-8">
`;

        html.footer = `
        </div>
      </div>
    </div>
    
    <nav class="navbar navbar-default navbar-fixed-bottom" id="vsd-footer">
      <div class="container-fluid">
        <div class="row">
          <div class="col-xs-6 vsd-left">
            Copyright (c) <a href="https://github.com/mkloubert" target="_blank">Marcel Joachim Kloubert</a>
          </div>

          <div class="col-xs-6 vsd-right">
            <a href="https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-deploy" target="_blank">
              <img src="/?i=flattr.png" />
            </a>

            <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2" target="_blank">
              <img src="/?i=paypal.svg" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  </body>
</html>`;

        let breadCrumb = '<ol class="breadcrumb">';
        {
            let currentDir = '';

            let addCrumbItem = (path: string, content: string, isLast: boolean) => {
                breadCrumb += `<li`;
                if (isLast) {
                    breadCrumb += ' class="active">';
                }
                else {
                    breadCrumb += `><a href="${path}">`;
                }
                breadCrumb += content;
                if (!isLast) {
                    breadCrumb += '</a>';
                }
                breadCrumb += `</li>`;
            };

            addCrumbItem('/', '<i class="fa fa-home" aria-hidden="true"></i>',
                         workspaceRoot == path);

            let parts = relativePath.split('/')
                                    .filter(x => x);
            parts.forEach((x, i) => {
                let isLast = i >= (parts.length - 1);
                currentDir += '/' + x;

                addCrumbItem('/?p=' + encodeURIComponent(currentDir), Entities.encode(x),
                             isLast);
            });
        }
        breadCrumb += '</ol>';
        html.header = deploy_helpers.replaceAllStrings(html.header, '{{ vsdeploy::breadcrumb }}', breadCrumb);

        let includeFilesAndDirectories = (dir: string): Promise<any> => {
            return new Promise<any>((resolve, reject) => {
                let completed = deploy_helpers.createSimplePromiseCompletedAction<any>(resolve, reject);

                let dirRelativePath = deploy_helpers.toRelativePath(dir);
                if (false === dirRelativePath) {
                    completed(new Error());  //TODO
                    return;
                }

                try {
                    FS.readdir(dir, (err, files) => {
                        let dirList = [];
                        let fileList = [];
                        let includeList = () => {
                            dirList.sort((x, y) => {
                                return deploy_helpers.compareValues(deploy_helpers.normalizeString(x),
                                                                    deploy_helpers.normalizeString(y));
                            });

                            fileList.sort((x, y) => {
                                return deploy_helpers.compareValues(deploy_helpers.normalizeString(x),
                                                                    deploy_helpers.normalizeString(y));
                            });

                            let content = '';
                            {
                                if (dir != workspaceRoot) {
                                    let dirName = '..';

                                    let dirPath = encodeURIComponent(dirRelativePath + '/..');

                                    content += `<li class="list-group-item vsd-parent-dir"><a href="/?p=${dirPath}">${dirName}</a></li>`;
                                }

                                dirList.forEach((x) => {
                                    let dirName = Path.basename(x);

                                    let ext = Path.extname(x);
                                    if (ext) {
                                        ext = ext.substr(1).toLowerCase().trim();
                                    }

                                    let cssClass = '';
                                    if (ext) {
                                        cssClass = `vsd-dir-${ext}`;
                                    }

                                    let dirPath = encodeURIComponent(dirRelativePath + '/' + dirName);

                                    content += `<li class="list-group-item vsd-dir${cssClass}"><a href="/?p=${dirPath}">${Entities.encode(dirName)}</a></li>`;
                                });

                                fileList.forEach((x) => {
                                    let fileName = Path.basename(x);

                                    let ext = Path.extname(x);
                                    if (ext) {
                                        ext = ext.substr(1).toLowerCase().trim();
                                    }

                                    let cssClass = '';
                                    if (ext) {
                                        cssClass = `vsd-file-${ext}`;
                                    }

                                    let filePath = encodeURIComponent(dirRelativePath + '/' + fileName);

                                    content += `<li class="list-group-item vsd-file${cssClass}"><a href="/?p=${filePath}">${Entities.encode(fileName)}</a></li>`;
                                });

                                content += '</ul>';
                            }

                            if (content) {
                                content = '<ul class="list-group">' + 
                                          content + 
                                          '</ul>';
                            }
                            else {
                                content ='Nothing found here.';
                            }

                            html.header = deploy_helpers.replaceAllStrings(html.header, '{{ vsdeploy::workspace }}',
                                                                           content);

                            completed();
                        };
                        
                        let nextFile: () => void;
                        nextFile = () => {
                            if (files.length < 1) {
                                includeList();
                                return;
                            }

                            let f = Path.join(dir, files.shift());
                            FS.lstat(f, (err, stats) => {
                                if (err) {
                                    completed(err);
                                }
                                else {
                                    if (stats.isFile()) {
                                        fileList.push(f);
                                    }
                                    else if (stats.isDirectory()) {
                                        dirList.push(f);
                                    }

                                    nextFile();
                                }
                            });
                        };

                        nextFile();
                    });
                }
                catch (e) {
                    completed(e);
                }
            });
        };

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
                        let dir = Path.dirname(path);
                        dir = Path.resolve(dir);

                        includeFilesAndDirectories(dir).then(() => {
                            me.handleFile(path, html,
                                          req, resp);
                        }).catch((err) => {
                            me.sendError(err, resp);
                        });
                    }
                    else if (stats.isDirectory()) {
                        includeFilesAndDirectories(path).then(() => {
                            me.handleDirectory(path, html,
                                               req, resp);
                        }).catch((err) => {
                            me.sendError(err, resp);
                        });
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
     * Outputs an embedded CSS file.
     * 
     * @param {string} fileName The name of the file.
     * @param {HTTP.ServerResponse} resp The HTTP response context.
     */
    protected outputCSS(fileName: string, resp: HTTP.ServerResponse) {
        let me = this;

        let file: Buffer = me.getFileContent(deploy_res_css.STYLES, fileName);

        if (file) {
            let headers: any = {
                'Content-type': 'text/css; charset=utf-8',
            };

            resp.writeHead(200, headers);

            resp.write(file);

            resp.end();
        }
        else {
            me.sendNotFound(resp);
        }
    }

    /**
     * Outputs an embedded font file.
     * 
     * @param {string} fileName The name of the file.
     * @param {HTTP.ServerResponse} resp The HTTP response context.
     */
    protected outputFont(fileName: string, resp: HTTP.ServerResponse) {
        let me = this;

        let allFonts: any[] = [ deploy_res_fontawesome.FONTS,
                                deploy_res_glyphicons.FONTS ];

        let font: Buffer;
        for (let i = 0; i < allFonts.length; i++) {
            let fontObj: Object = allFonts[i];

            font = me.getFileContent(fontObj, fileName);
            if (font) {
                break;
            }
        }

        if (font) {
            let headers: any = {
                'Content-type': deploy_helpers.detectMimeByFilename(fileName),
            };

            resp.writeHead(200, headers);

            resp.write(font);

            resp.end();
        }
        else {
            me.sendNotFound(resp);
        }
    }

    /**
     * Outputs an embedded image file.
     * 
     * @param {string} fileName The name of the file.
     * @param {HTTP.ServerResponse} resp The HTTP response context.
     */
    protected outputImage(fileName: string, resp: HTTP.ServerResponse) {
        let me = this;

        let file: Buffer = me.getFileContent(deploy_res_images.IMAGES, fileName);

        if (file) {
            let headers: any = {
                'Content-type': deploy_helpers.detectMimeByFilename(fileName),
            };

            resp.writeHead(200, headers);

            resp.write(file);

            resp.end();
        }
        else {
            me.sendNotFound(resp);
        }
    }

    /**
     * Outputs an embedded JavaScript file.
     * 
     * @param {string} fileName The name of the file.
     * @param {HTTP.ServerResponse} resp The HTTP response context.
     */
    protected outputJavaScript(fileName: string, resp: HTTP.ServerResponse) {
        let me = this;

        let file: Buffer = me.getFileContent(deploy_res_javascript.SCRIPTS, fileName);

        if (file) {
            let headers: any = {
                'Content-type': 'text/javascript; charset=utf-8',
            };

            resp.writeHead(200, headers);

            resp.write(file);

            resp.end();
        }
        else {
            me.sendNotFound(resp);
        }
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

    /**
     * Extracts the query parameters of an URL to an object.
     * 
     * @param {URL.Url} url The URL.
     * 
     * @return {Object} The parameters of the URL as object.
     */
    protected urlParamsToObject(url: URL.Url): Object {
        if (!url) {
            return url;
        }

        let params: any;
        if (!deploy_helpers.isEmptyString(url.query)) {
            // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
            params = url.query.replace(/(^\?)/,'')
                              .split("&")
                              .map(function(n){return n = n.split("="),this[n[0]] = n[1],this}
                              .bind({}))[0];
        }

        if (!params) {
            params = {};
        }

        return params;
    }
}
