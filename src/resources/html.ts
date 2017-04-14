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
    // START: footer_markdown_template.html
    "footer_markdown_template.html": "H4sIAAAAAAAAC0WOUQqDMBBE/4XcIUhBhVYP0NSP0gv0CBrXJjY1IVmlQbx71Ugd2GXZeQNDIrqLOW6lQYrewC1G+GLRVWMVvnFJIhJ1zwGsT9uh5yh1n2Z0Ilt+NxJjgXLdQJLlUHFxkPJMa6X5+59YJVTnciFfQi2D99VPA3UN0Lwe2zpCrAiNlkKnaXQPMEr7S6s1gp0Dxmrd+MVnhcCPKn9Zc/JI4wAAAA==",
    // END: footer_markdown_template.html

    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC4WQ0W6DIBSG7018B9ItKSSrPkCtF2tve9FHQKADh2Lk1M40vvtgOLVbmp6EhPx8J+fjxBEaK7OsVQ0g6BuxW4H4grSkHQ3pKo+jOOpoizp7EI02/d5wgXbo9fYbbJhLhu09dVTVH6pyiafieXAaZuR34XOb8nQRbY/Pl5qBMjUm6Bb6vYCXedeGfbrpI7h+6SyfVddkG/AJTSjne02txUv9/5i3wVdVc3NNKJgCL3dCyPS5uUNQJmdR9YYKH0/CvqQubSLVh9TuwE8bDtQ4f/CXgTxa3WLFZ2NAtEPAssLw3r1nqYRK599kRSWq8AEAAA==",
    // END: footer_simple_template.html

    // START: header_markdown_template.html
    "header_markdown_template.html": "H4sIAAAAAAAAC61SWw6CMBD8J+EO1fghH4UDKPzoBYxeoMIqkEIJXcHGcHfLQwLGRHw0adKd7kwms7sOMeGeaRB91iGwoHs3tUTFgaDKwJ0jXNHxpZzrBtNY3Aq5hYwLRTVW1VDPchqaN8Kkn0cZDqViVrAWbRULlpOH5gGSbPWk2bQ+iU6xF0bnkOuLsaSb/Z4GcGIXjhMsf6H+XnVGKelJdiwJpd5nOQ0yIi557aXS6UHB+LKM0kCUNkNxXA6ZljUh39prvLtArv7oshX8wWBbdqvalUcRKG88GP0PeTXeVJEipPXo7/b+5YH2AgAA",
    // END: header_markdown_template.html

    // START: header_simple_template.html
    "header_simple_template.html": "H4sIAAAAAAAAC62TTW6DMBCF95FyB4d2kSwc9i14014gSi9g8DRADbbsgQRF3L3mpxFEjUqUIllmhnmf32hMkGAu2XJB3BMkwMXw3sUWawkEaw2hh3BCP7bWcwXLxfO5su+gpaqpyzVt6qLyOxmb5GxsUo1jVMYr3md7YsUN+WF+QK5fr5hd6RV0jr0kPSTSLcwsfdvvqYBPXkqcYfkm/amyYuhdCSDnXhTx+OtgVFkIl5bKvBA0vLCaGyiQrNJcK4O8QNfYI4ffbu1v6opSchFtM0soZfcNaTQgEpLfvTSuQ6i4XB/TQqjjlqOK1mPlZjNjuK3XbFeCqf/RZQ98wGAfDv/JEEZK1Gw6GPcdTDMiaAMs6G5LKkJvcn88Fvjt7ra2qsV+A5JU4KaVAwAA",
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
