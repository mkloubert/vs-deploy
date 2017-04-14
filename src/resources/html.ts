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
    "footer_markdown_template.html": "H4sIAAAAAAAAC52TXU/bMBSG7yv1P1jRgCLNsVSmXWxJ0BCDW5iGuKz8lcStE1v2SUqE+t/nJIUG6HYxK4n88Z7j57x25jO0b4nnTllA0FmZRiCfgKxpS8fZKJvP5rP1fSNdt8ibmoMy9eIcPc+H+P3CmXUScSPk2XksKS8PSvUZMW345jWib6Ve+7hURanDC1f9+mJUfR9Fu74zfA5BCRmJAtCn59ZfS6tNh3NjQLrdG6FQLVIijVovpqK+FDRpiUVcU+8nwkLW0lGQArMuym5fRoh1KKGodDJPo8nm1pm15IAtLeQuQkBdISGNVkzTehNlrcdj3oTQLCE2m1L+hUCYOuyIGdT+Pe8Q8UJRAlj/jZDtdhtb2lmqY24qwguFmarJVrLg1iWvRLry+IlrxTenpfGhmBVrAEy9Cg79urp4fPj5+/H2y/3DMvAr0OEGXA8IqFUU3dHujuqPlX0EG+BUVSDv+IEuTMS+VFILHytDGBWFJGN+PObGhZOyjn1bHC03GPfetKM25JoCuMEC37BKAaENmMs8FGm+Lu1GnDZOp4P65OLHyfImPIWCsmF9TBhUG20aJh2E/uu5HbPkZtjp/y2hVsUT2vEw9vx4MAjrPnVs639Y8nbGZtPfJFz//ThhRnShn5ASKp39AUP1K3zzAwAA",
    // END: footer_markdown_template.html

    // START: footer_simple_template.html
    "footer_simple_template.html": "H4sIAAAAAAAAC52TXWvbMBSG7wP5D8Jb2wRmG9Kxi9V2Wdu1V4N2rPQy6Cu2EtkS0rFTU/LfK9v5cD66wYQN0uE95zznlT0coPWKLDVCA4Ja89gD/grhHFe4i3rJcDAcVNigyt5xLVV9qxhHMfr8tgn41EVWV/uqXyI/UOUu0qiGu8Zh1yPZC/6bZv5UclOPZmVBQahiNEZvXX4D0MDcSEUXrvtaePGpsmyHejG+6uRbaYAZu5XY2lEf/1jW0IyWomBqGWBQZNT3ZDzeDrfL4JhmO1DxBZEmvAVuVibnNshEmkn3Qps26lTr/qtmsxp/ZF3P4plSwM1qT8hEhQSLva0FnahxEvVWpBFtHOgJU15wg4Ezn9Re8rA5IVKjCKPM8Fns9Zpro+acgq9xylceAmxSDrE3JRIXCy+prN/VjUKcRKHeu/QPCJgqXEefQGEPeduMDUUGoO33MFwul4HGtcYyoCoPaSp8IopwyYlz65rmLJ5a/5VKQRfnmbJumCkpAVQxdQ79vrl8ef755+Xh69PzxPELkO4DvGsRUCUwesT1I5bHkx2DtXAiT5E1dEfnAoHNBJfMBkKFBLOUh119v6vtp4bzIrBVenJcZ9yhaSdtmEkMYFoLbElyASEuQV3P3JDq20Qv2HlpZNyqzy5/nE3u3ZMKyErS5LhDvpCqJNyA22/v7ZQl922n/7cEaxH0aLvLWPP7rUG+bEoHuviLJfsRnfR/E/f5r88RUax2+yjMIJfJO8wMOrYABQAA",
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
