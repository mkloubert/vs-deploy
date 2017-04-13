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
    "footer_simple_template.html": "H4sIAAAAAAAAC4WQ0W6DIBSG7018B9ItKSSrPkCtF2tve9FHQKADh2Lk1M40vvtgOLVbmp6EhPx8J+fjxBEaK7OsVQ0g6BuxW4H4grSkHQ3pKo+jOOpoizp7EI02/d5wgXbo9fYbbJhLhu09dVTVH6pyiafieXAaZuR34XOb8nQRbY/Pl5qBMjUm6Bb6vYCXedeGfbrpI7h+6SyfVddkG/AJTSjne02txUv9/5i3wVdVc3NNKJgCL3dCyPS5uUNQJmdR9YYKH0/CvqQubSLVh9TuwE8bDtQ4f/CXgTxa3WLFZ2NAtEPAssLw3r1nqYRK599kRSWq8AEAAA==",
    // END: footer_simple_template.html

    // START: header_simple_template.html
    "header_simple_template.html": "H4sIAAAAAAAAC61TXU/CMBR9J+E/FNQAxgomPo2xF3w2MfgHLvTCOrq2acvmJPx3N8rI8CNicMnS3dNzT0/X0zB2qYjaLVI+YYzADt/72i4M1464QuOk6/DNDRPIwKPdkthuZWBIZp9QC1W8YqrHFXjsH3pqdAJaVwhsai6s9WLX21qKxnwVi/J1iaXT2YwyXMJGuN0n+UrqXPVbsvW8FMyKy4CMxr7WwBiXKw/sV5grVtTsnDMXB+RhNLqpp68yy7zNhWJYE+ewWK+M2khWwkKZgDgD0mowKB3p8FQr40C6w6pLJR1dQspFEZCpklYJsHekN1Ubw9GQZ8x7Tarl71jaeNS1wHEbX7VzZRjNDeiAzA3CmlbAKe2SP/nzOf2u2qGUHJvuE0so/WPiGmkjE/K9l125Q8xA9HMumcrvwal5v9k5GJyR1Mpr8rJBU/yjSy94gUFfHq7qoawCG50eTDmPZtdQ0AajcB9Yzibdkwh3o3BYjeVQsSrZDye4HtoYBAAA",
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
