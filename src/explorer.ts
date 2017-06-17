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

import * as deploy_contracts from './contracts';
import * as deploy_globals from './globals';
import * as deploy_helpers from './helpers';
import * as deploy_targets from './targets';
import * as Enumerable from 'node-enumerable';
import * as i18 from './i18';
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


function addFileSystemNodes(fsNode: TargetFileSystemNode | TargetNode,
                            infos: deploy_contracts.FileSystemInfo[],
                            nodeStorage: TreeNode[],
                            dir?: string,
                            parent?: TargetDirectoryNode) {
    if (deploy_helpers.isEmptyString(dir)) {
        dir = '/';
    }

    Enumerable.from( deploy_helpers.asArray(infos) ).select(x => {
        let tNode: TreeNode;
        if (x) {
            switch (x.type) {
                case deploy_contracts.FileSystemType.Directory:
                    tNode = new TargetDirectoryNode(fsNode.explorer, fsNode.target, x, dir, parent);
                    break;
                
                case deploy_contracts.FileSystemType.File:
                    tNode = new TargetFileNode(fsNode.explorer, fsNode.target, x, dir, parent);
                    break;
            }
        }

        return tNode;
    }).where(x => {
        return !deploy_helpers.isNullOrUndefined(x);
    }).orderBy(x => {
        return getTargetFileSystemNodeSortValue(x);
    }).thenBy(x => {
        return deploy_helpers.normalizeString(x.label);
    }).pushTo(nodeStorage);
}

function getTargetFileSystemNodeSortValue(x: TreeNode): number {
    if (x instanceof TargetDirectoryNode) {
        return 0;
    }
    else if (x instanceof TargetFileNode) {
        return 1;
    }

    return Number.MAX_SAFE_INTEGER;
}

/**
 * A tree node.
 */
export class TreeNode {
    /**
     * Stores the underlying explorer.
     */
    protected readonly _EXPLORER: Explorer;
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {Explorer} explorer The underlying explorer.
     */
    constructor(explorer: Explorer) {
        this._EXPLORER = explorer;
    }

    /**
     * The collapsible state for the tree item.
     */
    public collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

    /**
     * A command to invoke.
     */
    public command: vscode.Command;

    /**
     * Gets the underlying explorer.
     */
    public get explorer(): Explorer {
        return this._EXPLORER;
    }

    /**
     * The function or method for receiving the children of that node.
     */
    public getChildren: () => Promise<TreeNode[]>;

    /**
     * The icon for the node.
     */
    public icon: string | vscode.Uri | { 
        light: string | vscode.Uri;
        dark: string | vscode.Uri
    };

    /**
     * The label.
     */
    public label: string;

    /**
     * Creates a tree item for that node.
     * 
     * @returns {vscode.TreeItem} The created item.
     */
    public toItem(): vscode.TreeItem {
        return new TreeItem(this);
    }
}

class RootNode extends TreeNode {
}

class PackageNode extends TreeNode {
    protected readonly _INDEX: number;
    protected readonly _PACKAGE: deploy_contracts.DeployPackage;

    constructor(explorer: Explorer,
                pkg: deploy_contracts.DeployPackage, index: number) {
        super(explorer);

        this._INDEX = index;
        this._PACKAGE = pkg;

        let me = this;

        this.getChildren = () => {
            return me._getChildren
                     .apply(me, []);
        };
    }

    protected _getChildren(): Promise<TreeNode[]> {
        return new Promise<TreeNode[]>((resolve, reject) => {
            resolve([]);
        });
    }

    public get label(): string {
        let l = deploy_helpers.toStringSafe(this.package.name).trim();
        if ('' === l) {
            l = i18.t('packages.defaultName', this._INDEX);
        }

        return l;
    }

    public get package(): deploy_contracts.DeployPackage {
        return this._PACKAGE;
    }
}

class TargetNode extends TreeNode {
    protected readonly _INDEX: number;
    protected readonly _TARGET: deploy_contracts.DeployTarget;

    constructor(explorer: Explorer,
                target: deploy_contracts.DeployTarget, index: number) {
        super(explorer);

        this._INDEX = index;
        this._TARGET = target;

        let me = this;

        this.getChildren = () => {
            return me._getChildren
                     .apply(me, []);
        };
    }

    protected _getChildren(): Promise<TreeNode[]> {
        let me = this;
        
        return new Promise<TreeNode[]>((resolve, reject) => {
            let completed = (err: any, nodeList?: TreeNode | TreeNode[]) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(deploy_helpers.asArray(nodeList)
                                          .filter(x => x));
                }
            };

            try {
                let targetAndPlugin = deploy_targets.getPluginsForTarget(me.target, me.explorer.controller.plugins)[0];

                let pullablePlugins = targetAndPlugin.plugins.filter(p => p.canList);
                if (pullablePlugins.length > 0) {
                    let dir = '/';

                    let wf = Workflows.create();

                    wf.next((ctx) => {
                        ctx.result = [];
                    });

                    pullablePlugins.forEach(p => {
                        wf.next((ctx) => {
                            let nodes: TreeNode[] = ctx.result;

                            return new Promise<any>((res, rej) => {
                                try {
                                    Promise.resolve( p.list(dir, me.target) ).then((infos: deploy_contracts.FileSystemInfo[]) => {
                                        addFileSystemNodes(me, infos, nodes, dir);

                                        res();
                                    }).catch((err) => {
                                        rej(err);
                                    });
                                }
                                catch (e) {
                                    rej(e);
                                }
                            });
                        });
                    });

                    wf.start().then((nodes: TreeNode[]) => {
                        completed(null, nodes);
                    }).catch((err) => {
                        completed(err);
                    });
                }
                else {
                    let notSupportedNode = new TreeNode(me.explorer);
                    notSupportedNode.label = 'Cannot make list of items from target';  //TODO: translate
                    notSupportedNode.collapsibleState = vscode.TreeItemCollapsibleState.None;

                    completed(null, notSupportedNode);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public get label(): string {
        let l = deploy_helpers.toStringSafe(this.target.name).trim();
        if ('' === l) {
            l = i18.t('targets.defaultName', this._INDEX);
        }

        return l;
    }

    public get target(): deploy_contracts.DeployTarget {
        return this._TARGET;
    }
}

class TargetFileSystemNode extends TreeNode {
    protected readonly _DIR: string;
    protected readonly _INFO: deploy_contracts.FileSystemInfo;
    protected readonly _PARENT: TargetDirectoryNode;
    protected readonly _TARGET: deploy_contracts.DeployTarget;
    
    constructor(explorer: Explorer,
                target: deploy_contracts.DeployTarget,
                info: deploy_contracts.FileSystemInfo,
                dir: string,
                parent?: TargetDirectoryNode) {
        super(explorer);

        this._DIR = dir;
        this._INFO = info;
        this._PARENT = parent;
        this._TARGET = target;
    }

    public get dir(): string {
        return this._DIR;
    }

    public get info(): deploy_contracts.FileSystemInfo {
        return this._INFO;
    }

    public get label(): string {
        let l = deploy_helpers.toStringSafe(this.info.name);
        if ('' === l.trim()) {
            l = '<NO NAME>';
        }

        return l;
    }

    public get parent(): TargetDirectoryNode {
        return this._PARENT;
    }

    public get target(): deploy_contracts.DeployTarget {
        return this._TARGET;
    }
}

class TargetDirectoryNode extends TargetFileSystemNode {
    constructor(explorer: Explorer,
                target: deploy_contracts.DeployTarget,
                info: deploy_contracts.DirectoryInfo,
                dir: string,
                parent?: TargetDirectoryNode) {
        super(explorer, target, info, dir, parent);

        let me = this;

        me.icon = {
            dark: me.explorer.controller.context.asAbsolutePath(Path.join('resources', 'dark', 'folder.svg')),
            light: me.explorer.controller.context.asAbsolutePath(Path.join('resources', 'light', 'folder.svg')),
        };

        me.getChildren = () => {
            return me._getChildren
                     .apply(me, []);
        };
    }

    protected _getChildren(): Promise<TreeNode[]> {
        let me = this;
        
        return new Promise<TreeNode[]>((resolve, reject) => {
            let completed = (err: any, nodeList?: TreeNode | TreeNode[]) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(deploy_helpers.asArray(nodeList)
                                          .filter(x => x));
                }
            };

            try {
                let targetAndPlugin = deploy_targets.getPluginsForTarget(me.target, me.explorer.controller.plugins)[0];

                let dir = me.dir + '/' + me.info.name;
                let pullablePlugins = targetAndPlugin.plugins.filter(p => p.canList);

                let wf = Workflows.create();

                wf.next((ctx) => {
                    ctx.result = [];
                });

                pullablePlugins.forEach(p => {
                    wf.next((ctx) => {
                        let nodes: TreeNode[] = ctx.result;

                        return new Promise<any>((res, rej) => {
                            try {
                                Promise.resolve( p.list(dir, me.target) ).then((infos: deploy_contracts.FileSystemInfo[]) => {
                                    addFileSystemNodes(me, infos, nodes, dir, me);

                                    res();
                                }).catch((err) => {
                                    rej(err);
                                });
                            }
                            catch (e) {
                                rej(e);
                            }
                        });
                    });
                });

                wf.start().then((nodes: TreeNode[]) => {
                    completed(null, nodes);
                }).catch((err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    public get info(): deploy_contracts.DirectoryInfo {
        return <deploy_contracts.DirectoryInfo>this._INFO;
    }
}

class TargetFileNode extends TargetFileSystemNode {
    constructor(explorer: Explorer,
                target: deploy_contracts.DeployTarget,
                info: deploy_contracts.FileInfo,
                dir: string,
                parent?: TargetDirectoryNode) {
        super(explorer, target, info, dir, parent);

        let me = this;

        me.icon = {
            dark: me.explorer.controller.context.asAbsolutePath(Path.join('resources', 'dark', 'file.svg')),
            light: me.explorer.controller.context.asAbsolutePath(Path.join('resources', 'light', 'file.svg')),
        };

        me.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }
    
    public get info(): deploy_contracts.FileInfo {
        return <deploy_contracts.FileInfo>this._INFO;
    }
}

class TreeItem extends vscode.TreeItem {
    protected readonly _NODE: TreeNode;
    
    constructor(node: TreeNode) {
        super(node.label, node.collapsibleState);

        this._NODE = node;
        
        this.command = this._NODE.command;
        this.iconPath = this._NODE.icon;
    }

    public get node(): TreeNode{
        return this._NODE;
    }
}


/**
 * An explorer instance.
 */
export class Explorer implements vscode.TreeDataProvider<TreeNode>, vscode.Disposable {
    /**
     * Stores the underlying controller.
     */
    protected readonly _CONTROLLER: vs_deploy.Deployer;
    /**
     * Stores the event listener that is raised when configuration changes.
     */
    protected readonly _CONFIG_CHANGED_LISTENER: (cfg: deploy_contracts.DeployConfiguration) => void;
    /**
     * Stores the event that tells the GUI to update the view.
     */
    protected readonly _ON_DID_CHANGE_TREE_DATA: vscode.EventEmitter<TreeNode | null> = new vscode.EventEmitter<TreeNode | null>();
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {vs_deploy.Deployer} controller The underlying controller.
     */
    constructor(controller: vs_deploy.Deployer) {
        this._CONTROLLER = controller;

        let me = this;

        this._CONFIG_CHANGED_LISTENER = (cfg: deploy_contracts.DeployConfiguration) => {
            me.onConfigReloaded
              .apply(me, [ cfg ]);
        };
        deploy_globals.EVENTS.on(deploy_contracts.EVENT_CONFIG_RELOADED, this._CONFIG_CHANGED_LISTENER);
    }

    /**
     * Gets the underlying controller.
     */
    public get controller(): vs_deploy.Deployer {
        return this._CONTROLLER;
    }

    /** @inheritdoc */
    public dispose() {
        if (this._CONFIG_CHANGED_LISTENER) {
            deploy_globals.EVENTS
                          .removeListener(deploy_contracts.EVENT_CONFIG_RELOADED, this._CONFIG_CHANGED_LISTENER);
        }
    }

    /** @inheritdoc */
    public getChildren(node?: TreeNode): Promise<TreeNode[]> {
        let me = this;
        
        return new Promise<TreeNode[]>((resolve, reject) => {
            let completed = (err: any, nodeList?: TreeNode[]) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(nodeList || []);
                }
            };

            try {
                if (node) {
                    if (node.getChildren) {
                        Promise.resolve( node.getChildren() ).then((children) => {
                            completed(null, children);
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                    else {
                        completed(null);
                    }
                }
                else {
                    let rootNodes: TreeNode[] = [];

                    let targetNode = new RootNode(me);
                    targetNode.label = i18.t('targets.plural');
                    targetNode.getChildren = () => {
                        return new Promise<TreeNode[]>((res, rej) => {
                            try {
                                let targets = me.controller.getTargets()
                                                           .filter(x => !x.isHidden);

                                let i = -1;
                                res(Enumerable.from(targets).select(x => {
                                    let childNode = new TargetNode(me, x, ++i);

                                    return childNode;
                                }).toArray());
                            }
                            catch (e) {
                                rej(e);
                            }
                        });
                    };

                    let packageNode = new RootNode(me);
                    packageNode.label = i18.t('packages.plural');
                    packageNode.getChildren = () => {
                        return new Promise<TreeNode[]>((res, rej) => {
                            try {
                                let packages = me.controller.getPackages()
                                                            .filter(x => !x.isHidden);

                                let i = -1;
                                res(Enumerable.from(packages).select(x => {
                                    let childNode = new PackageNode(me, x, ++i);

                                    return childNode;
                                }).toArray());
                            }
                            catch (e) {
                                rej(e);
                            }
                        });
                    };

                    rootNodes.push(targetNode, packageNode);

                    completed(null, rootNodes);
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /** @inheritdoc */
    public getTreeItem(node: TreeNode): vscode.TreeItem {
        return node.toItem();
    }

    /**
     * Is invoked when configuration has been reloaded.
     * 
     * @param {deploy_contracts.DeployConfiguration} cfg The (new) configuration.
     */
    protected onConfigReloaded(cfg: deploy_contracts.DeployConfiguration) {
        this._ON_DID_CHANGE_TREE_DATA.fire();
    }

    /** @inheritdoc */
    public get onDidChangeTreeData(): vscode.Event<TreeNode | null> {
        return this._ON_DID_CHANGE_TREE_DATA.event;
    }
}
