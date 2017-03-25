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
import * as FS from 'fs';
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as i18 from '../i18';
import * as Moment from 'moment';
import * as Path from 'path';
import * as URL from 'url';


const DATE_RFC2822_UTC = "ddd, DD MMM YYYY HH:mm:ss [GMT]";

interface DeployTargetHttp extends deploy_contracts.DeployTarget {
    headers?: { [key: string]: any };
    method?: string;
    password?: string;
    submitContentLength?: boolean;
    submitContentType?: boolean;
    submitDate?: boolean;
    submitFileHeader?: boolean;
    transformer?: string;
    transformerOptions?: any;
    user?: string;
    url?: string;
}

/**
 * A data transformer sub context.
 */
export interface DataTransformerContext {
    /**
     * The path of the local file whats data should be transformed.
     */
    file: string;
    /**
     * Gets the list of global variables defined in settings.
     */
    globals: deploy_contracts.GlobalVariables;
    /**
     * The target URL of the HTTP service.
     */
    url: string;
}


class HttpPlugin extends deploy_objects.DeployPluginBase {
    public deployFile(file: string, target: DeployTargetHttp, opts?: deploy_contracts.DeployFileOptions): void {
        let now = Moment().utc();

        if (!opts) {
            opts = {};
        }

        let me = this;

        let hasCanceled = false;
        let completed = (err?: any) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCanceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        me.onCancelling(() => hasCanceled = true, opts);

        if (hasCanceled) {
            completed();  // cancellation requested
        }
        else {
            let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativePath) {
                completed(new Error(i18.t('relativePaths.couldNotResolve', file)));
                return;
            }

            let url = deploy_helpers.toStringSafe(target.url).trim();
            if (!url) {
                url = 'http://localhost';
            }

            let method = deploy_helpers.toStringSafe(target.method).toUpperCase().trim();
            if (!method) {
                method = 'PUT';
            }

            let headers = target.headers;
            if (!headers) {
                headers = {};
            }

            let user = deploy_helpers.toStringSafe(target.user);
            if (user) {
                let pwd = deploy_helpers.toStringSafe(target.password);

                headers['Authorization'] = 'Basic ' + 
                                        (new Buffer(`${user}:${pwd}`)).toString('base64');
            }

            let submitFileHeader = deploy_helpers.toBooleanSafe(target.submitFileHeader, false);
            if (submitFileHeader) {
                headers['X-vsdeploy-file'] = relativePath;
            }

            let contentType = deploy_helpers.detectMimeByFilename(file);

            // data transformer
            let dataTransformer: deploy_contracts.DataTransformer;
            if (target.transformer) {
                let transformerModule = deploy_helpers.loadDataTransformerModule(target.transformer);
                if (transformerModule) {
                    dataTransformer = transformerModule.transformData ||
                                    transformerModule.restoreData;
                }
            }
            dataTransformer = deploy_helpers.toDataTransformerSafe(dataTransformer);

            try {
                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(me, {
                        destination: url,
                        file: file,
                        target: target,
                    });
                }

                // get file info
                FS.lstat(file, (err, stats) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    let creationTime = Moment(stats.birthtime).utc();
                    let lastWriteTime = Moment(stats.mtime).utc();
                
                    // read file
                    FS.readFile(file, (err, untransformedData) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        try {
                            let dataTransformerCtx: DataTransformerContext = {
                                globals: me.context.globals(),
                                file: file,
                                url: url,
                            };

                            dataTransformer({
                                context: dataTransformerCtx,
                                data: untransformedData,
                                emitGlobal: function() {
                                    return me.context
                                             .emitGlobal
                                             .apply(me.context, arguments);
                                },
                                globals: me.context.globals(),
                                mode: deploy_contracts.DataTransformerMode.Transform,
                                options: target.transformerOptions,
                                require: function(id) {
                                    return me.context.require(id);
                                },
                            }).then((dataToSend) => {
                                let parsePlaceHolders = (str: string, transformer?: (val: any) => string): string => {
                                    if (!transformer) {
                                        transformer = (s) => deploy_helpers.toStringSafe(s);
                                    }

                                    str = deploy_helpers.toStringSafe(str);

                                    str = str.replace(/(\$)(\{)(vsdeploy\-date)(\})/i, transformer(now.format(DATE_RFC2822_UTC)));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file)(\})/i, transformer(<string>relativePath));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file\-mime)(\})/i, transformer(contentType));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file\-name)(\})/i, transformer(Path.basename(file)));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file\-size)(\})/i, transformer(dataToSend.length));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file\-time-changed)(\})/i, transformer(lastWriteTime.format(DATE_RFC2822_UTC)));
                                    str = str.replace(/(\$)(\{)(vsdeploy\-file\-time-created)(\})/i, transformer(creationTime.format(DATE_RFC2822_UTC)));

                                    return deploy_helpers.toStringSafe(str);
                                };

                                let targetUrl = URL.parse(parsePlaceHolders(url, (str) => {
                                    return encodeURIComponent(str);
                                }));

                                let submitContentLength = deploy_helpers.toBooleanSafe(target.submitContentLength, true);
                                if (submitContentLength) {
                                    headers['Content-length'] = deploy_helpers.toStringSafe(dataToSend.length, '0');
                                }

                                let submitContentType = deploy_helpers.toBooleanSafe(target.submitContentType, true);
                                if (submitContentType) {
                                    headers['Content-type'] = contentType;
                                }

                                let submitDate = deploy_helpers.toBooleanSafe(target.submitDate, true);
                                if (submitDate) {
                                    headers['Date'] = now.format(DATE_RFC2822_UTC);  // RFC 2822
                                }

                                let headersToSubmit = {};
                                for (let p in headers) {
                                    headersToSubmit[p] = parsePlaceHolders(headers[p]);
                                }

                                let protocol = deploy_helpers.toStringSafe(targetUrl.protocol).toLowerCase().trim();
                                if (!protocol) {
                                    protocol = 'http:';
                                }

                                let httpModule: any;
                                switch (protocol) {
                                    case 'http:':
                                        httpModule = HTTP;
                                        break;

                                    case 'https:':
                                        httpModule = HTTPs;
                                        break;
                                }

                                if (!httpModule) {
                                    completed(new Error(i18.t('plugins.http.protocolNotSupported', protocol)));
                                    return;
                                }

                                let hostName = deploy_helpers.toStringSafe(targetUrl.hostname).toLowerCase().trim();
                                if (!hostName) {
                                    hostName = 'localhost';
                                }

                                let port = deploy_helpers.toStringSafe(targetUrl.port).trim();
                                if (!port) {
                                    port = 'http:' == protocol ? '80' : '443';
                                }

                                // start the request
                                let req = httpModule.request({
                                    headers: headersToSubmit,
                                    host: hostName,
                                    method: method,
                                    path: targetUrl.path,
                                    port: parseInt(port),
                                    protocol: protocol,
                                }, (resp) => {
                                    if (!(resp.statusCode > 199 && resp.statusCode < 300)) {
                                        completed(new Error(`No success: [${resp.statusCode}] '${resp.statusMessage}'`));
                                        return;
                                    }

                                    if (resp.statusCode > 399 && resp.statusCode < 500) {
                                        completed(new Error(`Client error: [${resp.statusCode}] '${resp.statusMessage}'`));
                                        return;
                                    }

                                    if (resp.statusCode > 499 && resp.statusCode < 600) {
                                        completed(new Error(`Server error: [${resp.statusCode}] '${resp.statusMessage}'`));
                                        return;
                                    }

                                    if (resp.statusCode > 599) {
                                        completed(new Error(`Error: [${resp.statusCode}] '${resp.statusMessage}'`));
                                        return;
                                    }

                                    completed();
                                });

                                req.once('error', (err) => {
                                    if (err) {
                                        completed(err);
                                    }
                                });

                                // send file content
                                req.write(dataToSend);

                                req.end();
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                });
            }
            catch (e) {
                completed(e);
            }
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.http.description'),
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
    return new HttpPlugin(ctx);
}
