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
    "footer_markdown_template.html": "H4sIAAAAAAAAC51TXW/bIBR9j5T/gLy1TaTZltKqD6vtal3WvrbToj5GgIlNggHBtVOryn8vtvPhpNkehmwBl8M95x5gOEDbFllquAYEtWaxB+wNwiWucBf1kuFgOKiwQZWdMi1U/VNJYBJQjL6+72I+7YKbuwa9fCmZqUeLUlLgSo7G6H3Ysm0Xrr5UNj3adzUOcijEiNzeTBlVKZtJ3nSjE9LxuCXo59KGoQbqUjBM8wMr/4aIUHS1Z29aLpY2yHmWC/fDQ7M+6lB3HWjTDDYHmtagsPPCWdEreaEUMLM5Aqa8QjyNvX19HagxEfVapBEV2NoeMGOSGQws9UntJU+7GSI1ijDKDVvEXo9cG7VkFHyNM7bxEGCTMYi9ORFYrryksn6XNwpxEoU66av8i4JUScfoE5D2VG+7Y6ciB9D2exiu1+tA41pjEVBVhDTjPuEyXDPi3LqnRRrPrf9GBaery1xZV8yclABKzp1Dvx+uX2e//rw+3bzMJk4/B+Hu3rSVgCqO0TOun7H4XNlnYa04XmTIGnpQ5wKBzTkTqQ24CglOMxZ2+f0ut58ZxmRgq+xsuc64U9PO2rAQGMC0FtiSFBxCXIK6X7gi1e1Er9LL0oi4RV9c/7iYPLov45CXpNnjJsVKqJIwA268P7dzljy2TP9vCdY86KntDmOr328N8kWTOtDyH5YcR3TSfybu+m/nEVFp7cZR2Lzr5AMKrCjcbQQAAA==",
    // END: footer_markdown_template.html

    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC52TXWvbMBSG7wP5D8JbWwdmG9LSi9V2WZu1V4N2LPQy6Cu2EtkSkuzUlPz3SnY+nCbdYMLG0uE9Os95JQ8HYDNijRWTBphG0sQz9NVEC1jDLuqlw8FwUEMFaj2hkovmXhAKEvD1bRsIsI2sbw5Vv1jxQVXYiFMN94WjrkZ6EPw3zeK5oqrx51WJDROlPwJvXb4DcDB3XOClrb4RXnypNdmjXoxuOvlOGkJC7jnU2u/jH8scjY+urybUxaYlcx+/b8xotOtwn0Yhzve07BtALryjdiPnCx3mLMu5fU2b5neqDcTaTdajz/zr+TwXwlC1PhASVgNGEm/nQydydoLeiCXAzoaeMKMlVdBQEqDGSx+3K4AaEEOQKzpPvF5xqcSCYhNImNG1BwxUGTWJN0MclksvrXXQ7RtHMI0jeXDynxAQUdqKATKl/sjbZmwpcmOk/h5Fq9UqlLCRkIdYFBHOWIBYGa0osm7d4oIkMx28Ys7w8jwX2jYzQ5UxopxZh37fXb5Mf/55ebx6no4tPzPc3sJJiwBqBsETbJ4gP+7sGKyFY0UGtMJ7OhsIdc4oJzpkIkKQZDTq9g+6vYNMUVqGus5OtmuN+2jaSRvmHBqjWgt0hQpmIlgZcTu3TYrrsVyS80rxpFWfXf44Gz/YJ2Mmr5DLsYtiyUWFqDJ2vju3U5Y8tJX+3xIoWdij7Q5jwx+0BgXcbR3K8i+WHEZk2v9N7PXfrGMkSGPncZSbgqfvW6ZzhAUFAAA=",
    // END: footer_simple_template.html

    // START: header_markdown_template.html
    "header_markdown_template.html": "H4sIAAAAAAAAC62Tz0vDMBTH74L/QxY8bGA2vAm2vWyeVbaLxyx5W1PSpDSvrUX2v5s1VbopOOcCJX0/vh++PPKi0eJpvnp9fiQp5jq5vor2N9HcbGMKhvoM8SdKgcv+v4tzQE5EyksHGNMKN+yefqsbnkNMawVNYUukRFiDYHx/oySmsYRaCWBdcEuUUai4Zk5wDfHdnjbgOWw1EGwLD0R4w5lwLrTcvNduAYW2LfO53YFq1smOSKJUBQ5RGa95yAZizUvyyVxBXjwcMbvWM+ylaptq/2Hm2Hy5ZBI2vNJ4guUz6L9TR4yRL9E0c4Sx5G9zGsyIxORnLzs/Pai5HjfKSNtMOdr1eKicTE6Y795r9lJB2V7QZQBezqCoHNqc9JYu5zN0/cNnCPsV7sO1lW1y+IB8HUr/biJXcEOU9KvrZL9ZYXNp4qm+6IUf5XVhcTkEAAA=",
    // END: header_markdown_template.html

    // START: header_simple_template.html
    "header_simple_template.html": "H4sIAAAAAAAAC62UTU/DMAyG70j8h6xwAIkwcUPQ9gKcAY0LR68xa0qaVInbUk3776QfoG4w8bFVqhI79tPXtZVwcnt/8/T8cMdSylV8eBC2K1OgF1GAOvAe5p8wRRDDvrNzJGBJCtYhRUFJL/wy+HKuIccoqCTWhbEUsMRoQu3jaykojQRWMkHeGWdMakkSFHcJKIwuWtqI56hRyKgpPJDwjaaJc33I8bJyt1go03DvW61lTbu0DVJiZUFjVAYV9N6eWIFlH8wnzIvrDWYX+g95qVykyr+UOX4zm3GBL1Aq+oXkrfSjyomhdiOQLfukOSSvC2tKLbxbGXvFyIJ2BVj/99lE5m07QJMvbJePby/tZ+qEc/aZdJ45xnn8tyaNGsQi9r2Wla8QK1AntdTC1OdAZn4yzjw9/UVzW63ZY4m22aPKHrg/gUnpyORskLQ/nX3UDjp7c7g/BnNuRBOvD5A/R7saEQqLcdhNtRT+EhnPeRCH03b1SxvVYt8Bg1Mm3cgEAAA=",
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
