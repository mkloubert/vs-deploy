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
import * as FS from 'fs';
import * as i18 from './i18';
const MergeDeep = require('merge-deep');
import * as Path from 'path';
import * as vs_deploy from './deploy';
import * as vscode from 'vscode';


/**
 * Returns the list of packages.
 * 
 * @returns {DeployPackage[]} The packages.
 */
export function getPackages(): deploy_contracts.DeployPackage[] {
    let me: vs_deploy.Deployer = this;

    let packages = (me.config.packages || []).filter(x => x);

    // load from
    packages = deploy_helpers.loadBaseSettingsFromFiles(packages, me.getValues());

    // inherit and merge
    packages = deploy_helpers.mergeInheritables(packages);

    let myName = me.name;
    packages = deploy_helpers.sortPackages(packages, () => myName);

    // isFor
    packages = packages.filter(p => {
        let validHosts = deploy_helpers.asArray(p.isFor)
                                       .map(x => deploy_helpers.normalizeString(x))
                                       .filter(x => '' !== x);

        if (validHosts.length < 1) {
            return true;
        }

        return validHosts.indexOf(myName) > -1;
    });

    // platforms
    packages = deploy_helpers.filterPlatformItems(packages);

    // if
    packages = me.filterConditionalItems(packages);

    return packages.map(p => {
        return deploy_helpers.applyValues(p, me.getValues());
    });
}
