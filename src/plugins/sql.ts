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
import * as deploy_sql from '../sql';
import * as FS from 'fs';
import * as i18 from '../i18';
import * as Path from 'path';


interface DeployTargetSql extends deploy_contracts.DeployTarget {
    encoding?: string;
    engine?: string;
    options?: any;
    sqlFilesOnly?: boolean;
}

interface SqlContext {
    connection: deploy_sql.SqlConnection;
    encoding: string;
    hasCancelled: boolean;
    sqlFilesOnly: boolean;
}

class SqlPlugin extends deploy_objects.DeployPluginWithContextBase<SqlContext> {
    protected createContext(target: DeployTargetSql,
                            files: string[],
                            opts: deploy_contracts.DeployFileOptions): Promise<deploy_objects.DeployPluginContextWrapper<SqlContext>> {
        let me = this;

        return new Promise<deploy_objects.DeployPluginContextWrapper<SqlContext>>((resolve, reject) => {
            let completed = (err?: any, wrapper?: deploy_objects.DeployPluginContextWrapper<SqlContext>) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(wrapper);
                }
            };

            try {
                let type: deploy_sql.SqlConnectionType;
                let args: any[];

                let enc = deploy_helpers.normalizeString(target.encoding);
                if (!enc) {
                    enc = 'utf8';
                }

                let engineName = deploy_helpers.normalizeString(target.engine);
                switch (engineName) {
                    case '':
                    case 'mysql':
                        // MySQL
                        type = deploy_sql.SqlConnectionType.MySql;
                        args = [
                            target.options,
                        ];
                        break;

                    case 'sql':
                        // Microsoft SQL
                        type = deploy_sql.SqlConnectionType.MSSql;
                        args = [
                            target.options,
                        ];
                        break;
                }

                if (deploy_helpers.isNullOrUndefined(type)) {
                    completed(new Error(i18.t('plugins.sql.unknownEngine', engineName)));
                }
                else {
                    deploy_sql.createSqlConnection(type, args).then((conn) => {
                        let ctx: SqlContext = {
                            connection: conn,
                            encoding: enc,
                            hasCancelled: false,
                            sqlFilesOnly: deploy_helpers.toBooleanSafe(target.sqlFilesOnly, true),
                        };

                        me.onCancelling(() => ctx.hasCancelled = true, opts);
                        
                        let wrapper: deploy_objects.DeployPluginContextWrapper<SqlContext> = {
                            context: ctx,
                            destroy: () => {
                                return new Promise<SqlContext>((resolve2, reject2) => {
                                    conn.close().then(() => {
                                        resolve2(ctx);
                                    }).catch((err) => {
                                        reject2(err);
                                    });
                                });
                            },
                        };

                        completed(null, wrapper);
                    }).catch((err) => {
                        completed(err);
                    });
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    protected deployFileWithContext(ctx: SqlContext,
                                    file: string, target: DeployTargetSql, opts?: deploy_contracts.DeployFileOptions) {
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
        
        try {
            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: ctx.connection.name,
                    file: file,
                    target: target,
                });
            }

            let isValidFile = true;
            if (ctx.sqlFilesOnly) {
                isValidFile = false;
                
                let temp = file.toLowerCase().trim();
                switch (Path.extname(temp)) {
                    case '.sql':
                        isValidFile = true;
                        break;
                }
            }

            if (isValidFile) {
                FS.readFile(file, (err, data) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    try {
                        let query = data.toString(ctx.encoding);
                        
                        ctx.connection.query(query).then(() => {
                            completed();
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    catch (e) {
                        completed(e);
                    }
                });
            }
            else {
                completed(i18.t('plugins.sql.invalidFile'));
            }
        }
        catch (e) {
            completed(e);
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.sql.description'),
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
    return new SqlPlugin(ctx);
}
