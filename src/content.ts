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
import * as vscode from 'vscode';
import * as vs_deploy from './deploy';


/**
 * HTML content provider.
 */
export class HtmlTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    /**
     * Stores the underlying controller.
     */
    protected readonly _CONTROLLER: vs_deploy.Deployer;
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {vs_deploy.Deployer} controller The underlying controller instance.
     */
    constructor(controller: vs_deploy.Deployer) {
        this._CONTROLLER = controller;
    }

    /**
     * Gets the underlying controller.
     */
    public get controller(): vs_deploy.Deployer {
        return this._CONTROLLER;
    }

    /** @inheritdoc */
    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
        let me = this;
        
        return new Promise<string>((resolve, reject) => {
            let completed = deploy_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let htmlDocs = me.controller.htmlDocuments;

                let doc: deploy_contracts.Document;

                let params = deploy_helpers.uriParamsToObject(uri);

                let idValue = decodeURIComponent(deploy_helpers.getUrlParam(params, 'id'));

                if (!deploy_helpers.isEmptyString(idValue)) {
                    let id = idValue.trim();
                    
                    // search for document
                    for (let i = 0; i < htmlDocs.length; i++) {
                        let d = htmlDocs[i];

                        if (deploy_helpers.toStringSafe(d.id).trim() === id) {
                            doc = d;
                            break;
                        }
                    }
                }

                let html = '';

                if (doc) {
                    if (doc.body) {
                        let enc = deploy_helpers.normalizeString(doc.encoding);
                        if (!enc) {
                            enc = 'utf8';
                        }

                        html = doc.body.toString(enc);
                    }
                }

                completed(null, html);
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
