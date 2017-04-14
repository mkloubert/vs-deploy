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


export const STYLES = {
    // START: highlight.darkula.css
    "highlight.darkula.css": "H4sIAAAAAAAAC2VSwW7bMAy96ysE7FY0bZG1Serehu6w/sRAybSjhRI9iWprDP33WcPsWA14EZ9E8r1H3V4p9QzRZgJtmTjqZI/oUXeRvZYj6heUbxFcSLoD72jU3Okfz9+TUle3SqmbI/1K+o/SunVpIBgbbYjt6WlC+BVjR/y2eW80ZOGCDdC2LvSNvrt5QF8QA/bUR86hbfSXrSnxpD7Wnf8Rmy4NlDhfbpJEDv31/wz9cITk6ho4TLFd1ZhMhDLX/M4sOCfkwmk+h+wNxjmL2OP7cH4nGIGqObvD467iZrldGicktMJxYwnSJ3473G5xVVep6DjIpHIkbLQTIGdXL084vnFsL4YI9GfMiuMwpyASnclnxQH8cn6F6MAQVvSs2R++ru0bIIL/tJbHEvVaphXX9sBh/1C9ySYtW5BxWGiY7Eh+ulDlLlRU0+gN04Vwd+lFUXwBDglzy8vwyXECwbVvCzabsjg4/d7iaCUO7+z9zla79x7DIq+dBq/X4FGgarDvSpQGfwGQ7fP7kAMAAA==",
    // END: highlight.darkula.css

    // START: highlight.default.css
    "highlight.default.css": "H4sIAAAAAAAAC3VUXW/TMBR996+wtBeo+pGx0i4pQjAkJCQQD2jP0419k5o6drFv2lWI/z4nXRNnYY6iyNf349xzj7OYMPbTqVIZ0Hyryq0OL81/e+7ppJG/EW/5twMY/gtK0IAH/qECo0B88ragIzg8b/3cuvIjY5MFY/OtDvF/GedS+b2GU8ZzbcVuEyz2gK7Q9jh7zDjUZBvbHqRUpsx4Mn+PVWPJQexKZ2sjM371NWmeDfvHGFtM+B145MJq6zLugWoHpKzhyYZ3tafnz8zXuacWyLP/1XK5bBOdz4WtKjRDj9t2RU47PB2tk5ecQORUXhN2RVCjIOtmBOXFViHBy0BpReRhoMK2bmENzY7YsB5oslp2jd57dBdY2xoDPX2HMzrtewQBkekz11WOboROyZFJaPAdV39q2/dEWIW5EcY9yRDWMj1kKwkrYosU6Yga8WrEa52fIx2W+Ljv8pyqcH7ZHcApyPUY7MsDrcxu1HQzv5Fx77GWdoDz7ssqWfWq+w6mrKHEwUDSWHShHKELtyjOsr79nK5ifvJaaXpQZtrtdaB12glSduibSzFi7yZd3yQ9qh9BZwNE75JYJI0MB+HXxfo6TSM4rVDP+hneE5mmedHXUV5wLIrAlo/yB+K34JXvhdz+NDKuCLQSUZ1Qwj6X+O/YnwABWDEYhwQAAA==",
    // END: highlight.default.css

    // START: styles.css
    "styles.css": "H4sIAAAAAAAAC41V247aMBB9R+IfXK2qbSuyCoSiVXjc9/6DEzuxheOxnGGztOq/dwiJc+GyRbIEM5PjM2fOhOXiB/uzXDD6VNyX2qYs3l9+Oy6EtuUl8He5WC4yEKe+utECVcrWcfy1T/M+l4MBnzJtlfQaO7gCLEaN1KXClGVgRBdH+YGRkDl4jhrofgtWBshUwbv0M+BGaZT3Hj9aIb3RA4Zar5ja9BBdV1EGiFBRcy+JrDqsDDw9G1Jr98FqMFqwpyRJpnB0EjpbOj/p7KYiRgguZZut+9hPwgF512ZaPOcl9SVkj9DqVPBKm1PK3sASA16v2PMbHL0mKX7J5nksaa1/S0LcOtzP5si+6MqBR277VEMNRo3nRC7zkh+ic2Ba1nJCnplAqFOldjwPdhjFaSaGu5o49N/211LED3UYZfzFH6+DPhcuKFas+6Zmo0wZobB1EqAuxCbz2+12M7yAkvH8UHog20Q37NWFMkNVD4w8RvapRRXlShvxbWO/379n7CpywYq5+SqSDOHEgyRH0xcKXTvDT2eCEAgaXZMt8GRkhCdHg6GqvMsR8eygMeoHIQvwZ/uEHZgV8AJbKe/la+SeZIiD+LO8tOJWtt/C7vHtqDmjr5prG6KZ9BzanedGlyTRcB/minC9HGz89F4L6QycogIAh9fI2JnJZrj6qj4MJDeSn20A5JurrZoO4TpfGODUZGvt23vw+oDDSwgIsBxllKGtma7K6X62KrfvTnIgt3VQ4lyiOrdu4vm+GVmEdfv0bfyf3ML/wAOwfxn8m1V4BgAA",
    // END: styles.css

};


/**
 * Tries to return content from 'STYLES' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export function getContent(key: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        key = normalizeString(key);
        let data: Buffer;

        for (let p in STYLES) {
            if (normalizeString(p) === key) {
                data = new Buffer(STYLES[p], 'base64');
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
 * Tries to return content from 'STYLES' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return Buffer The content.
 */
export function getContentSync(key: string): Buffer {
    key = normalizeString(key);
    let data: Buffer;

    for (let p in STYLES) {
        if (normalizeString(p) === key) {
            data = new Buffer(STYLES[p], 'base64');
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
