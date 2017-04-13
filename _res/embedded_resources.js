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

var resources = require('./resources');
var vscode = require('vscode');

function createCompletedAction(ctx, resolve, reject) {
    return function(err) {
        if (err) {
            reject(err);
        }
        else {
            resolve(ctx);
        }
    };
}

function createFileRepository(ctx, opts) {
    if (!opts) {
        opts = {};
    }

    var args = ctx.arguments;
    var deploy_helpers = args.require('./helpers');

    var compress = deploy_helpers.toBooleanSafe(opts.compress);
    var dir = deploy_helpers.toStringSafe(opts.dir);
    var files = opts.files.map(function(f) { return f; });
    var excludeFiles = opts.excludeFiles;
    var targetFile = opts.targetFile;
    var varName = deploy_helpers.toStringSafe(opts.varName);

    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var FS = require('fs');
            var Path = require('path');
            
            var ZLib = require('zlib');

            dir = Path.resolve(dir);
            targetFile = Path.resolve(targetFile);

            // generate files
            {
                var imports = '';
                if (compress) {
                    imports += `
import * as ZLib from 'zlib';

`;
                }


                var ts = `${resources.LICENSE_HEADER}

/**
 * AUTO GENERATED CODE
 */
${imports}
export const ${varName} = {`;

                var finished = () => {
                    ts += `
};
`;

                    var funcs = `

/**
 * Tries to return content from '${varName}' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return {Promise<Buffer>} The promise.
 */
export function getContent(key: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        key = normalizeString(key);
        let data: Buffer;

        for (let p in ${varName}) {
            if (normalizeString(p) === key) {
                data = new Buffer(${varName}[p], 'base64');
                break;
            }
        }

`;
                    if (compress) {
                        funcs += `        if (data) {
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
        }`;
                    }
                    else {
                        funcs += `        resolve(data);`;
                    }
                    funcs += `
    });
}

/**
 * Tries to return content from '${varName}' constant.
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return Buffer The content.
 */
export function getContentSync(key: string): Buffer {
    key = normalizeString(key);
    let data: Buffer;

    for (let p in ${varName}) {
        if (normalizeString(p) === key) {
            data = new Buffer(${varName}[p], 'base64');
            break;
        }
    }

`;
                    if (compress) {
                        funcs += `    if (data) {
        data = ZLib.gunzipSync(data);
    }
`;
                    }

                    funcs += `
    return data;
}

function normalizeString(str: any): string {
    if (null === str ||
        'undefined' === typeof str) {
        
        str = '';
    }

    return ('' + str).toLowerCase().trim();
}
`;

                    ts += funcs;

                    FS.writeFile(targetFile, new Buffer(ts, 'utf8'), (err) => {
                        completed(err);
                    });            
                };

                var nextFile;
                nextFile = () => {
                    if (files.length < 1) {
                        finished();
                        return;
                    }

                    var f = files.shift();
                    ctx.onBeforeDeployFile(f);

                    FS.readFile(f, (err, data) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            var appendVar = (dataToAppend) => {
                                try {
                                    var base64 = dataToAppend.toString('base64');
                                    var key = deploy_helpers.normalizeString(Path.basename(f));

                                    ts += `
    // START: ${key}
    ${JSON.stringify(key)}: ${JSON.stringify(base64)},
    // END: ${key}
`;

                                    ctx.onFileCompleted(null, f);
                                    nextFile();
                                }
                                catch (err) {
                                    completed(err);
                                }
                            };

                            if (compress) {
                                ZLib.gzip(data, (err, compressedData) => {
                                    if (err) {
                                        completed(err);
                                    }
                                    else {
                                        appendVar(compressedData);
                                    }
                                });
                            }
                            else {
                                appendVar(data);
                            }
                        }
                    });
                };

                nextFile();
            };
        }
        catch (e) {
            completed(e);
        }
    });
}

function generateCSS(ctx) {
    var args = ctx.arguments;

    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(ctx, resolve, reject);

        try {
            var Path = require('path');

            var workspaceDir = vscode.workspace.rootPath;
            var cssDir = Path.join(workspaceDir, '_res/css');
            var outFile = Path.join(workspaceDir, 'src/resources/css.ts');

            createFileRepository(ctx, {
                dir: cssDir,
                varName: 'STYLES',
                targetFile: outFile,
                files: ctx.files,
                compress: true
            }).then(function() {
                completed();    
            }).catch(function(err) {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

function generateHtml(ctx) {
    var args = ctx.arguments;

    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(ctx, resolve, reject);

        try {
            var Path = require('path');

            var workspaceDir = vscode.workspace.rootPath;
            var htmlDir = Path.join(workspaceDir, '_res/html');
            var outFile = Path.join(workspaceDir, 'src/resources/html.ts');

            createFileRepository(ctx, {
                dir: htmlDir,
                varName: 'TEMPLATES',
                targetFile: outFile,
                files: ctx.files,
                compress: true
            }).then(function() {
                completed();    
            }).catch(function(err) {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

function generateJavaScript(ctx) {
    var args = ctx.arguments;

    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(ctx, resolve, reject);

        try {
            var Path = require('path');

            var workspaceDir = vscode.workspace.rootPath;
            var jsDir = Path.join(workspaceDir, '_res/javascript');
            var outFile = Path.join(workspaceDir, 'src/resources/javascript.ts');

            createFileRepository(ctx, {
                dir: jsDir,
                varName: 'SCRIPTS',
                targetFile: outFile,
                files: ctx.files,
                compress: true
            }).then(function() {
                completed();    
            }).catch(function(err) {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

function deploy(args, files) {
    var deploy_helpers = args.require('./helpers');

    return new Promise(function(resolve, reject) {
        args.context.once('deploy.cancel', function() {
            args.canceled = true;
        });

        var onBeforeDeployFile = function(file) {
            if (args.deployOptions.onBeforeDeployFile) {
                args.deployOptions.onBeforeDeployFile(args.sender, {
                    file: file,
                    target: args.target
                });
            }
        };

        var onFileCompleted = function(err, file) {
            if (args.deployOptions.onFileCompleted) {
                args.deployOptions.onFileCompleted(args.sender, {
                    error: err,
                    file: file,
                    target: args.target
                });
            }
        };

        var completed = function(err) {
            if (err) {
                reject(err);
            }
            else {
                resolve(args);
            }
        };

        try {
            var func;
            var type = deploy_helpers.normalizeString(args.targetOptions);
            switch (type) {
                case 'css':
                    func = generateCSS;
                    break;

                case 'html':
                    func = generateHtml;
                    break;

                case 'js':
                    func = generateJavaScript;
                    break;
            }

            if (func) {
                var ctx = {
                    arguments: args,
                    files: files,
                    onBeforeDeployFile: onBeforeDeployFile,
                    onFileCompleted: onFileCompleted,
                };

                Promise.resolve(func(ctx)).then(function() {
                    completed(null);
                }).catch(function(err) {
                    completed(err);
                });
            }
            else {
                completed(new Error("Type '" + type + "' is UNKNOWN!"));
            }
        }
        catch (e) {
            completed(e);
        }
    });
};

exports.deployWorkspace = function(args) {
    return Promise.resolve(deploy(args, args.files));
};
