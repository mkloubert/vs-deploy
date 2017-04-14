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
    "footer_markdown_template.html": "H4sIAAAAAAAAC52TXW+bMBSG7yPlP1hobVNpYCmderEB1aquvW2nVb2M/AU4GGzZB1JU9b/XQJbQpN3FLEC2z4ef8x48n6HtiB2z0gCCzogkAPEMeE1aMu4G6Xw2n60fGmG7RdbUDKSuF+foZT7Ebw1nxgrENBdn55EgrNh7yq+IKs3KXUQ/CrV2USHzQvkXrnv7YvT6MTq99pPhsw+K8Ujkgb68tO5GGKW7MNMahH1958hliyRPgtbxqVNfCpqM2CCmiHMTx1zUwhIQPKRdkN79XSHaoZigwoosCQoA475jnEsoGhoxXeGqVLqhwgJuXTimChAQmwtIghVVpC6DdGeKMUljbNIp8yc8XNf+/JBC7Q7ph4hDps1mExnSGaIGLpbLkMoabwT12l2xiicrFz4zJVl5WmjnS1vRBkDXK6/X7+uLp8dff57uvj08Lj2/BOX/h5sBAbWSoHvS3RN1XNkx2AAnqxw5y/Z0fiNyhRSKu0hqTAnPBR7zh2PuMLdC1JFr8w/L9cIdivahDJkiAHaQwDW0koBJA/oq80Xqy6Up+WljVTJ4n1z8PFne+mffTr/YNdTPpy09kuR2OOn/JSFGRhPasRlb/nAQKFR96sjU/5Dk/Y5Jp5fGX4btOqaad34e4wIqlb4Bz36OcwEEAAA=",
    // END: footer_markdown_template.html

    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC52TXW+bMBSG7yPlP1hsbYk0sJROu1iBam3XXk1qp1W9jPwVcGKwZRtSVOW/10AKJGk3aRZI9uE9Ps95baYTsBuRIZorC2ytWOxZ9mzhClWoi3rJdDKdVEiDytwwJWR9LSkDMfj88hYIiItsL/ZVv3h+oMpdpFFNh8Kwq5HsBf9Ns3ooma79ZVkQy2Xhz8BLl98ANDBXQpK1q74Tnn2qDB1Qz2YXnbyXhojSa4GM8cf4x7KGxt/wgspNiKzE/tiT2axvbshgiGQDKP8CcBPugZuRiZUJM55mwr22TfM71a7+tplsZx9ZN7J4KaVlersnpLwCnMZeb0EnapwEoxEpQBoHRsKUFUwjy2iAay+5e1sBXIMIgUyzZexl1irzHcKU26zEIZE5zNdClphpCysTdFt5wCKdMht7CyxQsfaS/lMEURJBtXcFPuChsnD1A2wLc0jfZhwybTabUKFaIdFykZQHmBdww7Dz7pLkNF6Y4JkITtanmTSutQUurZXFwvn1++r86fHnn6e7rw+Pc8fPrXDX8aZFABVH4B7V90gcd3YM1sLxPAVGk4HOBUKTcSaoCbmEGNGUwW7/oNs7SDVjRWiq9N12nXGHpr1rw1Iga3VrgSlxzi1EpZWXS9ek/DZXa3paahG36pPzHyfzW/cMx+kW/YG6+fhIjyy5bSv9vyVI8XBE2x3Gjj9oDQpEs3Woir9Ysh9RyfincT/Dbh1hSWs3j2Bmc5G8Asej2e8OBQAA",
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
