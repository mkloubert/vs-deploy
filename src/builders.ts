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

import * as deploy_helpers from './helpers';
import * as HTTP from 'http';
import * as vscode from 'vscode';


/**
 * Stores the default HTML text encoding.
 */
export const DEFAULT_HTML_ENCODING = 'utf8';

/**
 * A HTML builder.
 */
export class HtmlBuilder implements vscode.Disposable {
    /**
     * The current buffer.
     */
    protected _buffer: Buffer = Buffer.alloc(0);

    /**
     * Gets the current buffer.
     */
    public get buffer(): Buffer {
        return this._buffer;
    }

    /**
     * The (text) encoding to use.
     */
    public encoding = DEFAULT_HTML_ENCODING;

    /** @inheritdoc */
    public dispose() {
        this._buffer = null;
    }

    /**
     * The footer.
     */
    public footer: any = '</body></html>';

    /**
     * The header.
     */
    public header: any = '<html></body>';

    /**
     * Returns the current non null/undefined text encoding.
     * 
     * @return {string} The encoding.
     */
    public getEncodingSafe() : string{
        let enc = deploy_helpers.toStringSafe(this.encoding).toLowerCase().trim();
        if (!enc) {
            enc = DEFAULT_HTML_ENCODING;
        }

        return enc;
    }

    /**
     * Sends the current buffer over a HTTP response context.
     * 
     * @param {HTTP.ServerResponse} resp The response context.
     * @param {number} [code] The custom code to use.
     * @param {string} [mime] The custom MIME type to send.
     */
    public sendTo(resp: HTTP.ServerResponse, code = 200, mime = 'text/html') {
        mime = deploy_helpers.toStringSafe(mime).toLowerCase().trim();

        let headers: any = {};

        if (mime) {
            headers['Content-type'] = mime;
        }

        // header
        resp.writeHead(code, headers);

        // body
        resp.write(this.header);
        resp.write(this.buffer);
        resp.write(this.footer);
        
        resp.end();
    }

    /**
     * Writes data to the buffer.
     * 
     * @param {any} data The data to write.
     * 
     * @chainable.
     */
    public write(data: any): HtmlBuilder {
        if (data) {
            let enc = this.getEncodingSafe();

            let buff: Buffer;
            if ('object' === typeof data) {
                buff = data;
            }
            else {
                buff = new Buffer(deploy_helpers.toStringSafe(data), enc);
            }

            this._buffer = Buffer.concat([ this._buffer, buff ]);
        }
        
        return this;
    }
}
