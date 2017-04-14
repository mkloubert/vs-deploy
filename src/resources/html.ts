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
    "footer_markdown_template.html": "H4sIAAAAAAAAC51T30/bMBB+r9T/wYoGFGmJtYJ42JKgAYNXmIZ4rPyrjlsntuxLSoT43+ckHQ2l28NOSeQ7f3f33WdnOkFbSz1zygKC1oosAvEMeEUaMkSjfDqZTlYPtXDtbFlXDJSpZqfoZdrnbzdOrBOIGS5OThNBWLFDqs+IasPWbxmdFXrlk0LJQocXrrr92YD6NoBeu0X/2SWleGAUCH16afyNsNq08dIYEO71HZCrBimeRY3nY1A3ChpZahHTxPsRUIpKOAKCx7SN8rs/HqItSgkqnFhmUQFg/VeMpTGJ1Pia1l+uXYSAOCkgixZUk2od5Y2Ph6IpJnmKbT6m+Jf23FShXUyh8vtk+4x9CpvNJrGktUQnzJSYSRVTVeGNoEGqS1bybOHjZ6YVWx8XxodJFrQGMNUiyPPz6uzp8cevp7vzh8d54K9Ah+O/6SmgRhF0T9p7oj9O9pFYT06VEnnHduxCIPGFEpr7RBlMCZcCD/XjoXYsnRBV4ht5cNwg3L5oB2VYagLgegl8TUsFmNRgLpdhSHMxt2t+XDud9eijs+9H89vwSAVFTbuc4JRrbWoqHIT127kdkuS27/T/khCrkhHb4TC2/ONeoFh3pRNb/UOS9xGbj/+RcPe3fkoNb8M6xQWUOv8NlvudB/ADAAA=",
    // END: footer_markdown_template.html

    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC52TXW+bMBSG7yPlP1hsbYk0sJZOu1iBak3XXk1qp1W9jPwVcGKwZRsoqvLfZyBNyEc3aRZI9tF7znnOaxiPwGZFhmiuLLCNYrFn2YuFS1ShPuol49F4VCENKnPLlJDNTFIGYvDx9S0QEBdZX+2rfvL8QJW7SKsa7xrDvkeyF/w3zfKxZLrxF2VBLJeFPwGvfX4L0MLcCElWrvtGePGhMnSHejG56uVbaYgonQlkjD/EP5a1NH7NCyrrEFmJ/aEnk8l2uF0GQyTbgfJPALfhLXC7MrE0YcbTTLjXdml+r9r0X7eb9eQ96wYWL6S0TK/3hJRXgNPY21rQi1onwWBFCpDWgYEwZQXTyDIa4MZL7t9OADcgQiDTbBF7mbXKfIMwlTJMBZzh8vNMe8AinTIbe3MsULHyksoEfdEIoiSCau/G32lPZeHaBdgW5hC2yzhEqOs6VKhRSIRE5pCkPMC8gDXDzqprktN4boIXIjhZnWfSuEnmuLRWFnNnz6+by+enH7+f7788Pk0dP7fCfX23HQKoOAIPqHlA4niyY7AOjucpMJrs6FwgNBlngpqQS4gRTRns6wd97SDVjBWhqdKT4zrjDk07acNCIGt1Z4Epcc4tRKWV1ws3pPw6VSt6XmoRd+qzy+9n0zv3pNxmJW5z3CFfCVlipq3bb+/tlCV3Xaf/twQpHg5o+8vY8AedQYFoS4eq+Isl+xGVDP8R9+1vzhGWtHH7CGY2F8kfEu1y6v0EAAA=",
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
