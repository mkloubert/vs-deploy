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
    "footer_simple_template.html": "H4sIAAAAAAAAC4VQWw6CMBD8J+EODZrYJgoH4PGhXsAjlFJtsVJCC0gId5dSBP0wbrLJdjKzM13XAXNFilS81EB3JY09TZ86yHGDLeolruM6Da5Ao860FLI7yYyCGGz7N3AgIzKEhresDKw6+QL/++SXmlYdvNYF0VwWEIHe6k0AY3MUktxH95m42zQqW0PsUGjpC9U3NrDlRSZbH2uZws9vILSkXhUUE7Ym4HuQGnhJYoqJXPmM35gYW08yaFmz/2CGAf26yfRMZdaNcxQw/RDJC2M/U7WPAQAA",
    // END: footer_simple_template.html

    // START: header_simple_template.html
    "header_simple_template.html": "H4sIAAAAAAAAC61T0W7CIBR9N/EfsNsSXYK619r2ZfuBxf3AbWEtlQIBbNcY/31FrLFuy1xcEwL3cO7hlByiwlY8GY9Q90UFBXJcH2qTaaYssq2icWDph12UUINHg444HtWgUW1eqOKyfaOVWjnw1L/w1GQAGttyeq6ZGePF7ne9FC5YXvBu2NLg5/UaE/oOW273F/JO6lr1R7TzvAp0zkSIlitfKyCEidwDhxNSSdqe3TBiixA9LZcP/fZdbYi3mUlCe2IK2SbXcitIB3OpQ2Q1CKNAU2HRhFVKagvCri5cfN1qpCa40aBClGoKG+yAIe2Wi/j5mn9XnWCMTk3z0iCM/xiYs7CgGH3vZd/9Ia2BTxsmiGzmYGU6Pe+cza4ImvNavm6pbv/RpRe8waAvjy/tWLq8Db0rTZPokK6MgzFx4J5pgBiJg0H4giRauLmbXIvT+ARqmmoe0gMAAA==",
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
