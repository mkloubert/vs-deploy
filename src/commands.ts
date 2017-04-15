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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';
import * as i18 from './i18';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


interface ScriptCommandWrapper extends vscode.Disposable {
    button?: vscode.StatusBarItem;
    command: vscode.Disposable;
}

const _COMMANDS: ScriptCommandWrapper[] = [];


/**
 * Reloads the commands defined in the settings.
 */
export function reloadCommands() {
    let me: vs_deploy.Deployer = this;

    try {
        let cfg = me.config;

        // remove old commands
        while (_COMMANDS.length > 0) {
            let oldCmd = _COMMANDS.shift();

            deploy_helpers.tryDispose(oldCmd);
        }

        if (cfg.commands) {
            let newCommands = deploy_helpers.asArray(cfg.commands)
                                            .filter(x => x);

            let globalState: any = {};

            newCommands.filter(x => !deploy_helpers.isEmptyString(x.command))
                       .forEach(x => {
                            let cmdName = deploy_helpers.toStringSafe(x.command).trim();

                            let btn: vscode.StatusBarItem;
                            let cmd: vscode.Disposable;

                            let commandState: any;
                            if ((<Object>x).hasOwnProperty("commandState")) {
                                commandState = deploy_helpers.cloneObject(x.commandState);
                            }
                            else {
                                commandState = {};
                            }
                            
                            let disposeItems = false;
                            try {
                                cmd = vscode.commands.registerCommand(cmdName, function() {
                                    return new Promise<any>((resolve, reject) => {
                                        let args: deploy_contracts.ScriptCommandExecutorArguments;
                                        let completed = (err: any, result?: any) => {
                                            try {
                                                if (err) {
                                                    vscode.window.showErrorMessage(i18.t('commands.executionFailed',
                                                                                         cmdName, err));

                                                    reject(err);
                                                }
                                                else {
                                                    resolve(result);
                                                }
                                            }
                                            finally {
                                                if (args) {
                                                    commandState = args.commandState;
                                                    globalState = args.globalState;
                                                }
                                            }
                                        };
                                        
                                        try {
                                            let moduleScript = deploy_helpers.toStringSafe(x.script);
                                            moduleScript = me.replaceWithValues(moduleScript);

                                            let cmdModule = deploy_helpers.loadScriptCommandModule(moduleScript);
                                            if (!cmdModule.execute) {
                                                completed(null);
                                                return;  // no execute() function found
                                            }

                                            let sym = Symbol("deploy.compilers.Deployer.reloadCommands");

                                            args = {
                                                arguments: arguments,
                                                command: cmdName,
                                                commandState: commandState,
                                                deployFiles: (files, targets) => {
                                                    return deploy_helpers.deployFiles(files, targets, sym);
                                                },
                                                emitGlobal: function() {
                                                    return me.emitGlobal
                                                             .apply(me, arguments);
                                                },
                                                globals: me.getGlobals(),
                                                openHtml: function() {
                                                    let funcArgs = [ <any>me.htmlDocuments ];
                                                    funcArgs = funcArgs.concat(deploy_helpers.toArray(arguments));

                                                    return deploy_helpers.openHtmlDocument
                                                                         .apply(null, funcArgs);
                                                },
                                                options: deploy_helpers.cloneObject(x.options),
                                                require: function(id) {
                                                    return require(id);
                                                },
                                                replaceWithValues: (v) => me.replaceWithValues(v),
                                            };

                                            // args.globalState
                                            Object.defineProperty(args, 'globalState', {
                                                enumerable: true,
                                                get: () => { return globalState; }, 
                                            });

                                            // args.button
                                            Object.defineProperty(args, 'button', {
                                                configurable: true,
                                                enumerable: true,
                                                get: () => { return btn; }, 
                                            });

                                            let cmdModuleResult = cmdModule.execute(args);
                                            Promise.resolve(cmdModuleResult).then((result) => {
                                                completed(null, result);
                                            }).catch((err) => {
                                                completed(err);
                                            });
                                        }
                                        catch (e) {
                                            completed(e);
                                        }
                                    });
                                });

                                if (x.button) {
                                    // status bar button

                                    // right alignment?
                                    let alignment = vscode.StatusBarAlignment.Left;
                                    if (deploy_helpers.toBooleanSafe(x.button.isRight)) {
                                        alignment = vscode.StatusBarAlignment.Right;
                                    }

                                    let priority: number;
                                    if (!deploy_helpers.isNullOrUndefined(x.button.priority)) {
                                        priority = parseFloat(deploy_helpers.toStringSafe(x.button.priority).trim());
                                    }

                                    btn = vscode.window.createStatusBarItem(alignment, priority);
                                    btn.command = cmdName;
                                    
                                    // caption / text
                                    if (deploy_helpers.isEmptyString(x.button.text)) {
                                        btn.text = cmdName;
                                    }
                                    else {
                                        let txt = deploy_helpers.toStringSafe(x.button.text);
                                        txt = me.replaceWithValues(txt);

                                        btn.text = txt;
                                    }

                                    // tooltip
                                    if (deploy_helpers.isEmptyString(x.button.tooltip)) {
                                        btn.tooltip = cmdName;
                                    }
                                    else {
                                        let tt = deploy_helpers.toStringSafe(x.button.tooltip);
                                        tt = me.replaceWithValues(tt);

                                        btn.tooltip = tt;
                                    }

                                    // color
                                    let color = deploy_helpers.normalizeString(x.button.color);
                                    color = me.replaceWithValues(x.button.color);
                                    if (!deploy_helpers.isEmptyString(color)) {
                                        btn.color = color;
                                    }

                                    if (deploy_helpers.toBooleanSafe(x.button.show, true)) {
                                        btn.show();
                                    }
                                }

                                _COMMANDS.push({
                                    button: btn,
                                    command: cmd,
                                    dispose: function() {
                                        deploy_helpers.tryDispose(this.button);
                                        deploy_helpers.tryDispose(this.command);
                                    }
                                });
                            }
                            catch (e) {
                                disposeItems = true;

                                me.log(i18.t('errors.withCategory',
                                             'commands.reloadCommands(2)', e));
                            }
                            finally {
                                if (disposeItems) {
                                    deploy_helpers.tryDispose(btn);
                                    deploy_helpers.tryDispose(cmd);
                                }
                            }
                        });
        }
    }
    catch (e) {
        me.log(i18.t('errors.withCategory',
                     'commands.reloadCommands(1)', e));
    }
}
