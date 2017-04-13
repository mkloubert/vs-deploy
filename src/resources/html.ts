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


/**
 * AUTO GENERATED CODE
 */

import * as ZLib from 'zlib';


export const TEMPLATES = {
    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC4WQ3wrCIBSH7wd7B6kghdoeoNpFddtFj+DU0uXmmLYasXdPc239ITog6I/vcD5PGICulppUojTANCVbjQy7mjjDNfbpKAmDMKhxBWq9ZaVUzUZRBlZgcnsGc2KTdvFO7UT+QeU2cVQ4DI79jOQt/G+T7c+sauDhXBAjVAERuPl+J+Bk1lKRk53egdNxremgOkULj/dohCndSKw1fNX/xpwNvIiCqkuEjUrh604Q6j83dDBM+CAqZiB1cS/sistMR1wcubTHPNqgp7r5rbu06NfqHs9U0cbelzE3uUzunBH8nNwBAAA=",
    // END: footer_simple_template.html

    // START: header_simple_template.html
    "header_simple_template.html": "H4sIAAAAAAAAC61TXU/CMBR9J+E/FNQAxgomPo2PF3w2MfgHLvSyFbq2abvNSfjvrpQR8CNicMnS3bNzT0/b01HiUjFpNkj1jBIEtv/e1XZhuHbElRrHbYdvrr+CHALarojNRg6G5PYJtVDlK6Z66MFDfz9QJyegdaXAY82FtUHselNL0YTHiahet7J0OptRhkvIhNt+kvdS56rfkk3gpWBiLiMyGIZaA2NcxgHYzTBXrKzZBWcuicjDYHBT/77KLQs2F4phTZzDYh0blUlWwUKZiDgD0mowKB1p8VQr40C6/axLJR1dQspFGZGpklYJsHekM1WZ4WjIMxadY6rl71jZeNS1wGEZX7ULZRgtDOiIzA3CmnrglHbJTv58Tr+rtiglh6b7lSWU/jFxR2kjY/K9l221QsxBdAsumSruwal597iz1zsjqd7r6iVDU/6jyyB4gcFQ7q/qvvSBPfWuDU5Gu3hyNm6fBLY9GfX9WA2e5ds+AJiFmswGBAAA",
    // END: header_simple_template.html

};


/**
 * Tries to return content from 'TEMPLATES' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export function getContent(key: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        key = normalizeString(key);
        let data: Buffer;

        for (let p in TEMPLATES) {
            if (normalizeString(p) === key) {
                data = new Buffer(TEMPLATES[p], 'base64');
                break;
            }
        }

        if (data) {
            ZLib.gunzip(data, (err, umcompressedData) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(umcompressedData);
                }
            });
        }
        else {
            resolve(data);
        }
    });
}

/**
 * Tries to return content from 'TEMPLATES' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return Buffer The content.
 */
export function getContentSync(key: string): Buffer {
    key = normalizeString(key);
    let data: Buffer;

    for (let p in TEMPLATES) {
        if (normalizeString(p) === key) {
            data = new Buffer(TEMPLATES[p], 'base64');
            break;
        }
    }

    if (data) {
        data = ZLib.gunzipSync(data);
    }

    return data;
}

function normalizeString(str: any): string {
    if (null === str ||
        'undefined' === typeof str) {
        
        str = '';
    }

    return ('' + str).toLowerCase().trim();
}
