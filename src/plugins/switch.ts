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
import * as deploy_switch from '../switch';
import * as deploy_targets from '../targets';
import * as Enumerable from 'node-enumerable';
import * as i18 from '../i18';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


/**
 * A button for a switch target.
 */
export interface DeploySwitchButton {
    /**
     * The custom (text) color for the button.
     */
    color?: string;
    /**
     * Enable button or not.
     */
    enabled?: boolean;
    /**
     * Put button on the right side or not.
     */
    isRight?: boolean;
    /**
     * The priority.
     */
    priority?: number;
    /**
     * The custom text.
     */
    text?: string;
    /**
     * The custom tooltip.
     */
    tooltip?: string;
}

/**
 * A switch target.
 */
export interface DeployTargetSwitch extends deploy_contracts.DeployTarget {
    /**
     * A button for the switch.
     */
    button?: DeploySwitchButton | boolean;
    /**
     * One or more options for the switch.
     */
    options: DeployTargetSwitchOptionValue | DeployTargetSwitchOptionValue[];
}

/**
 * An option entry for of a switch target.
 */
export interface DeployTargetSwitchOption extends deploy_contracts.Sortable {
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * Gets the ID of that option.
     */
    __id?: any;
    /**
     * [INTERNAL] DO NOT DEFINE OR OVERWRITE THIS PROPERTY BY YOUR OWN!
     * 
     * The zero-based index.
     */
    __index?: number;

    /**
     * The description.
     */
    description?: string;
    /**
     * Is default or not.
     */
    isDefault?: boolean;
    /**
     * The (display) name.
     */
    name?: string;
    /**
     * One or more other target names.
     */
    targets?: string | string[];
}

/**
 * A switch option value.
 */
export type DeployTargetSwitchOptionValue = DeployTargetSwitchOption | string;


class SwitchPlugin extends deploy_objects.MultiFileDeployPluginBase {
    public get canGetFileInfo(): boolean {
        return true;
    }
    
    public get canPull(): boolean {
        return true;
    }

    public deployWorkspace(files: string[], target: DeployTargetSwitch, opts?: deploy_contracts.DeployWorkspaceOptions): void {
        const ME = this;

        if (!opts) {
            opts = {};
        }

        let canceled = false;
        ME.onCancelling(() => canceled = true,
                        opts);

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(ME, {
                    canceled: canceled,
                    error: err,
                    target: target,
                });
            }
        };

        const OPTION = ME.getSwitchOption(target);
        if (false === OPTION) {
            canceled = true;

            COMPLETED(null);
            return;
        }

        const TARGETS_AND_PLUGINS = ME.getTargetsWithPlugins(target, OPTION.targets);
        if (TARGETS_AND_PLUGINS.length < 1) {
            canceled = true;

            COMPLETED(null);  //TODO: error message
            return;
        }

        ME.forEachTargetAndPlugin(target, TARGETS_AND_PLUGINS, (t, p) => {
            return new Promise<void>(async (resolve, reject) => {
                const COMPLETED = deploy_helpers.createSimplePromiseCompletedAction(resolve, reject);

                try {
                    if (p.deployWorkspace) {
                        p.deployWorkspace(files, t, {
                            baseDirectory: opts.baseDirectory,
                            context: opts.context || ME.context,
                            onBeforeDeployFile: (sender, e) => {
                                if (opts.onBeforeDeployFile) {
                                    opts.onBeforeDeployFile(ME, {
                                        destination: e.destination,
                                        file: e.file,
                                        target: t,
                                    });
                                }
                            },
                            onCompleted: (sender, e) => {
                                COMPLETED(e.error);
                            },
                            onFileCompleted: (sender, e) => {
                                if (opts.onFileCompleted) {
                                    opts.onFileCompleted(ME, {
                                        canceled: e.canceled,
                                        error: e.error,
                                        file: e.file,
                                        target: t,
                                    });
                                }
                            }
                        });
                    }
                    else {
                        COMPLETED(null);
                    }
                }
                catch (e) {
                    COMPLETED(e);
                }
            });
        }).then(() => {
            COMPLETED(null);
        }).catch((err) => {
            COMPLETED(err);
        });
    }

    public async downloadFile(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): Promise<Buffer> {
        const ME = this;
        
        if (!opts) {
            opts = {};
        }

        let canceled = false;
        ME.onCancelling(() => canceled = true,
                        opts);

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(ME, {
                    canceled: canceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        const OPTION = ME.getSwitchOption(target);
        if (false === OPTION) {
            canceled = true;

            COMPLETED(null);
            return;
        }

        const TARGETS_AND_PLUGINS = ME.getTargetsWithPlugins(target, OPTION.targets);
        if (TARGETS_AND_PLUGINS.length < 1) {
            canceled = true;

            COMPLETED(null);  //TODO: error message
            return;
        }

        let data: Buffer;
        try {
            await ME.forEachTargetAndPlugin(target, TARGETS_AND_PLUGINS, async (t, p) => {
                return new Promise<void>(async (res, rej) => {
                    const COMP = deploy_helpers.createSimplePromiseCompletedAction(res, rej);

                    try {
                        if (p.downloadFile) {
                            data = await Promise.resolve(
                                p.downloadFile(file, t, {
                                    baseDirectory: opts.baseDirectory,
                                    context: opts.context || ME.context,
                                    onBeforeDeploy: (sender, e) => {
                                        if (opts.onBeforeDeploy) {
                                            opts.onBeforeDeploy(ME, {
                                                destination: e.destination,
                                                file: e.file,
                                                target: e.target,
                                            });
                                        }
                                    },
                                    onCompleted: (sender, e) => {
                                        COMP(e.error);
                                    }
                                })
                            );
                        }
                    }
                    catch (e) {
                        COMP(e);
                    }
                });
            });

            COMPLETED(null);
        }
        catch (e) {
            COMPLETED(e);

            throw e;
        }

        return data;
    }

    private async forEachTargetAndPlugin(target: DeployTargetSwitch, targetsWithPlugins: deploy_contracts.DeployTargetWithPlugins[],
                                         action: (target: deploy_contracts.DeployTarget, plugin: deploy_contracts.DeployPlugin) => any) {
        const ME = this;

        return new Promise<void>((resolve, reject) => {
            const COMPLETED = deploy_helpers.createSimplePromiseCompletedAction(resolve, reject);

            let canceled = false;
            ME.onCancelling(() => canceled = true);

            try {
                let nextTarget: () => void;
                nextTarget = () => {
                    if (canceled) {
                        COMPLETED(null);
                        return;
                    }
        
                    if (targetsWithPlugins.length < 1) {
                        COMPLETED(null);
                        return;
                    }
        
                    try {
                        const TARGET_AND_PLUGINS = targetsWithPlugins.shift();
                        
                        const TARGET = deploy_helpers.cloneObject(
                            TARGET_AND_PLUGINS.target
                        );
                        const PLUGINS = TARGET_AND_PLUGINS.plugins.map(p => p);

                        let nextPlugin: () => void;
                        nextPlugin = () => {
                            if (canceled) {
                                COMPLETED(null);
                                return;
                            }

                            if (PLUGINS.length < 1) {
                                nextTarget();
                                return;
                            }

                            try {
                                const P = PLUGINS.shift();

                                if (action) {
                                    Promise.resolve(action(TARGET, P)).then(() => {
                                        nextPlugin();
                                    }).catch((err) => {
                                        COMPLETED(err);
                                    });
                                }
                                else {
                                    nextPlugin();
                                }
                            }
                            catch (e) {
                                COMPLETED(e);
                            }
                        };

                        nextPlugin();  // start with first plugin
                                       // of current target
                    }
                    catch (e) {
                        COMPLETED(e);
                    }
                };
        
                nextTarget();  // start with first target
            }
            catch (e) {
                COMPLETED(e);
            }
        });
    }
    
    public async getFileInfo(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): Promise<deploy_contracts.FileInfo> {
        const ME = this;
        
        if (!opts) {
            opts = {};
        }

        let canceled = false;
        ME.onCancelling(() => canceled = true,
                        opts);

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(ME, {
                    canceled: canceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        const OPTION = ME.getSwitchOption(target);
        if (false === OPTION) {
            canceled = true;

            COMPLETED(null);
            return;
        }

        const TARGETS_AND_PLUGINS = ME.getTargetsWithPlugins(target, OPTION.targets);
        if (TARGETS_AND_PLUGINS.length < 1) {
            canceled = true;

            COMPLETED(null);  //TODO: error message
            return;
        }

        let fi: deploy_contracts.FileInfo;
        try {
            await ME.forEachTargetAndPlugin(target, TARGETS_AND_PLUGINS, async (t, p) => {
                return new Promise<void>(async (res, rej) => {
                    const COMP = deploy_helpers.createSimplePromiseCompletedAction(res, rej);

                    try {
                        if (p.getFileInfo) {
                            fi = await Promise.resolve(
                                p.getFileInfo(file, t, {
                                    baseDirectory: opts.baseDirectory,
                                    context: opts.context || ME.context,
                                    onBeforeDeploy: (sender, e) => {
                                        if (opts.onBeforeDeploy) {
                                            opts.onBeforeDeploy(ME, {
                                                destination: e.destination,
                                                file: e.file,
                                                target: e.target,
                                            });
                                        }
                                    },
                                    onCompleted: (sender, e) => {
                                        COMP(e.error);
                                    }
                                })
                            );
                        }
                    }
                    catch (e) {
                        COMP(e);
                    }
                });
            });

            COMPLETED(null);
        }
        catch (e) {
            COMPLETED(e);

            throw e;
        }

        return fi;
    }

    private getSwitchOption(target: DeployTargetSwitch): DeployTargetSwitchOption | false {
        const OPTION = deploy_switch.getCurrentOptionOf(target);
        if (false === OPTION) {
            vscode.window.showWarningMessage(
                '[vs-deploy] ' + i18.t('plugins.switch.noOptionSelected')
            );

            return false;
        }

        return OPTION;
    }
    
    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.switch.description'),
        };
    }

    public pullFile(file: string, target: DeployTargetSwitch, opts?: deploy_contracts.DeployFileOptions): void {
        const ME = this;
        
        if (!opts) {
            opts = {};
        }

        let canceled = false;
        ME.onCancelling(() => canceled = true,
                        opts);

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(ME, {
                    canceled: canceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        const OPTION = ME.getSwitchOption(target);
        if (false === OPTION) {
            canceled = true;

            COMPLETED(null);
            return;
        }

        const TARGETS_AND_PLUGINS = ME.getTargetsWithPlugins(target, OPTION.targets);
        if (TARGETS_AND_PLUGINS.length < 1) {
            canceled = true;

            COMPLETED(null);  //TODO: error message
            return;
        }

        ME.forEachTargetAndPlugin(target, TARGETS_AND_PLUGINS, async (t, p) => {
            return new Promise<void>((resolve, reject) => {
                const COMPLETED = deploy_helpers.createSimplePromiseCompletedAction(resolve, reject);

                try {
                    if (p.pullFile) {
                        p.pullFile(file, t, {
                            baseDirectory: opts.baseDirectory,
                            context: opts.context || ME.context,
                            onBeforeDeploy: (sender, e) => {
                                if (opts.onBeforeDeploy) {
                                    opts.onBeforeDeploy(ME, {
                                        destination: e.destination,
                                        file: e.file,
                                        target: e.target,
                                    });
                                }
                            },
                            onCompleted: (sender, e) => {
                                COMPLETED(e.error);
                            },
                        });
                    }
                }
                catch (e) {
                    COMPLETED(e);
                }
            });
        }).then(() => {
            COMPLETED(null);
        }).catch((err) => {
            COMPLETED(err);
        });
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
    return new SwitchPlugin(ctx);
}
