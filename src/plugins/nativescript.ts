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

import * as deploy_compilers from '../compilers';
import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as i18 from '../i18';
import * as Path from 'path';
import * as vscode from 'vscode';


interface DeployTargetNativeScript extends deploy_contracts.DeployTarget {
    build?: boolean;
    buildArgs?: string | string[];
    cleanup?: boolean;
    deploy?: boolean;
    deployArgs?: string | string[];
    platform?: string;
    release?: boolean;  //TODO
    run?: string;
    runArgs?: string | string[];
    tns?: string;
    typescript?: boolean;  //TODO
    uglify?: boolean | string | string[];  //TODO
}


function normalizeArgs (args: string | string[]): string[] {
    return deploy_helpers.asArray(args)
                            .filter(x => '' !== x)
                            .filter(x => !deploy_helpers.isNullOrUndefined(x));
};

class NativeScriptPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public deployWorkspace(files: string[], target: DeployTargetNativeScript, opts?: deploy_contracts.DeployWorkspaceOptions) {
        let me = this;
        
        let hasCancelled = false;
        let completed = (err?: any) => {
            if (opts.onFileCompleted) {
                opts.onFileCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    file: '/app/*',
                    target: target,
                });
            }

            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: hasCancelled,
                    error: err,
                    target: target,
                });
            }
        };

        me.onCancelling(() => {
            hasCancelled = true;
        });

        if (hasCancelled) {
            completed();
            return;
        }
        
        try {
            if (opts.onBeforeDeployFile) {
                opts.onBeforeDeployFile(me, {
                    destination: 'android',  //TODO
                    file: '/app/*',
                    target: target,
                });
            }

            let cmd = deploy_helpers.toStringSafe(target.tns);
            if (deploy_helpers.isEmptyString(cmd)) {
                cmd = 'tns';
            }

            let platform = deploy_helpers.normalizeString(target.platform);
            if (!platform) {
                if (process.platform === 'darwin') {
                    platform = 'ios';
                }
                else {
                    platform = 'android';
                }
            }

            let filesToUglify = [];
            if (!deploy_helpers.isNullOrUndefined(target.uglify)) {
                if (false !== target.uglify) {
                    if (true === target.uglify) {
                        filesToUglify.push('app/**/*.js');
                    }
                    else {
                        filesToUglify = deploy_helpers.asArray(target.uglify)
                                                      .filter(x => !deploy_helpers.isEmptyString(x));
                        filesToUglify = deploy_helpers.distinctArray(filesToUglify);
                    }
                }
            }

            let compileTypeScript = (next: () => void) => {
                if (deploy_helpers.toBooleanSafe(target.typescript)) {
                    deploy_compilers.compileTypeScript({
                        exclude: [ "node_modules/**" ],
                    }).then(() => {
                        next();
                    }).catch((err) => {
                        completed(err);
                    });
                }
                else {
                    next();
                }
            };

            let uglifyFiles = (next: () => void) => {
                compileTypeScript(() => {
                    if (filesToUglify.length > 0) {
                        deploy_compilers.compileUglifyJS({
                            files: filesToUglify,
                            exclude: [ "node_modules/**" ],
                            extension: 'js',
                        }).then(() => {
                            next();
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    else {
                        next();
                    }
                });
            };

            // tns run
            let runApp = () => {
                if (deploy_helpers.toBooleanSafe(target.run, true)) {
                    let runArgs = [ cmd, "run", platform ].concat( normalizeArgs(target.runArgs) );

                    let targetArg = runArgs.pop();

                    uglifyFiles(() => {
                        deploy_helpers.open(targetArg, {
                            app: runArgs,
                            wait: false,
                        }).then(() => {
                            completed();
                        }).catch((err) => {
                            completed(err);
                        });
                    });
                }
                else {
                    completed();
                }
            };

            // tns deploy
            let deployToDevice = () => {
                if (deploy_helpers.toBooleanSafe(target.deploy)) {
                    let deployArgs = normalizeArgs(target.deployArgs);

                    deploy_helpers.executeCmd(`${cmd} deploy ${platform}${deployArgs.length > 0 ? (' ' + deployArgs.join(' ')) : ''}`, {
                        wait: true,
                    }).then(() => {
                        runApp();
                    }).catch((err) => {
                        completed(err);
                    });
                }
                else {
                    runApp();
                }
            };

            // tns build
            let buildApp = () => {
                if (deploy_helpers.toBooleanSafe(target.build)) {
                    let buildArgs = normalizeArgs(target.buildArgs);

                    uglifyFiles(() => {
                        deploy_helpers.executeCmd(`${cmd} build ${platform}${buildArgs.length > 0 ? (' ' + buildArgs.join(' ')) : ''}`, {
                            wait: true,
                        }).then(() => {
                            deployToDevice();
                        }).catch((err) => {
                            completed(err);
                        });
                    });
                }
                else {
                    // no build
                    deployToDevice();
                }
            };

            // tns platform (remove | add)
            let cleanup = () => {
                if (deploy_helpers.toBooleanSafe(target.cleanup)) {
                    let readdPlatform = () => {
                        // readd platform
                        deploy_helpers.executeCmd(`${cmd} platform add ${platform}`, {
                            wait: true,
                        }).then(() => {
                            buildApp();  // start building
                        }).catch((err) => {
                            completed(err);
                        });
                    };

                    // first remove platform
                    deploy_helpers.executeCmd(`${cmd} platform remove ${platform}`, {
                        wait: true,
                    }).then(() => {
                        readdPlatform();
                    }).catch((err) => {
                        readdPlatform();
                    });
                }
                else {
                    // no cleanup
                    buildApp();
                }
            };

            cleanup();
        }
        catch (e) {
            completed(e);
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.nativescript.description'),
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
    return new NativeScriptPlugin(ctx);
}
