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

var resources = require('./resources');


function createCompletedAction(args, resolve, reject) {
    return function(err) {
        if (err) {
            reject(err);
        }
        else {
            resolve(args);
        }
    };
}

function createFileRepository(args, opts) {
    var deploy_helpers = args.require('./helpers');

    var compress = deploy_helpers.toBooleanSafe(opts.compress);
    var dir = opts.dir;
    var files = opts.files;
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

            onBeforeDeploy(args, targetFile);

            findFiles(args, dir, files, excludeFiles).then((files) => {
                var imports = `
import * as deploy_helpers from '../helpers';`;
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
    key = deploy_helpers.normalizeString(key);

    return new Promise<Buffer>((resolve, reject) => {
        let data: Buffer;

        for (let p in ${varName}) {
            if (deploy_helpers.normalizeString(p) === key) {
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
 * Tries to return content from '${varName}' constant (synchronous).
 * 
 * @param {string} key The key inside the constant.
 * 
 * @return {Buffer} The data.
 */
export function getContentSync(key: string): Buffer {
    key = deploy_helpers.normalizeString(key);

    let data: Buffer;

    for (let p in ${varName}) {
        if (deploy_helpers.normalizeString(p) === key) {
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
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

// creates 'src/resources/css.ts'
// from 'res/css'
function deploy_css(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var cssDir = Path.join(workspaceDir, 'res/css');
            var outFile = Path.join(workspaceDir, 'src/resources/css.ts');

            createFileRepository(args, {
                dir: cssDir,
                varName: 'STYLES',
                targetFile: outFile,
                files: [ '*.css' ],
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

// creates 'src/resources/fonts/fontawesome.ts'
// from 'res/fontawesome'
function deploy_fontawesome(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var fontDir = Path.join(workspaceDir, 'res/fontawesome');
            var outFile = Path.join(workspaceDir, 'src/resources/fonts/fontawesome.ts');

            createFileRepository(args, {
                dir: fontDir,
                varName: 'FONTS',
                targetFile: outFile
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

// creates 'src/resources/fonts/glyphicons.ts'
// from 'res/glyphicons'
function deploy_glyphicons(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var fontDir = Path.join(workspaceDir, 'res/glyphicons');
            var outFile = Path.join(workspaceDir, 'src/resources/fonts/glyphicons.ts');

            createFileRepository(args, {
                dir: fontDir,
                varName: 'FONTS',
                targetFile: outFile
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

// creates 'src/resources/html.ts'
// from 'res/html'
function deploy_html(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var htmlDir = Path.join(workspaceDir, 'res/html');
            var outFile = Path.join(workspaceDir, 'src/resources/html.ts');

            createFileRepository(args, {
                dir: htmlDir,
                varName: 'TEMPLATES',
                targetFile: outFile,
                files: [ '*.html' ],
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

// creates 'src/resources/images.ts'
// from 'res/images'
function deploy_images(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var imageDir = Path.join(workspaceDir, 'res/images');
            var outFile = Path.join(workspaceDir, 'src/resources/images.ts');

            createFileRepository(args, {
                dir: imageDir,
                varName: 'IMAGES',
                targetFile: outFile
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

// creates 'src/resources/javascript.ts'
// from 'res/javascript'
function deploy_javascript(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        try {
            var Path = require('path');
            var vscode = require('vscode');

            var workspaceDir = vscode.workspace.rootPath;
            var jsDir = Path.join(workspaceDir, 'res/javascript');
            var outFile = Path.join(workspaceDir, 'src/resources/javascript.ts');

            createFileRepository(args, {
                dir: jsDir,
                varName: 'SCRIPTS',
                targetFile: outFile,
                files: [ '*.js' ],
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

function findFiles(args, dir, patterns, excludePatterns) {
    return new Promise(function(resolve, reject) {
        var deploy_helpers = args.require('./helpers');

        var matchingFiles = [];
        var completed = (err) => {
            if (err) {
                reject(err);
            }
            else {
                matchingFiles.sort((x, y) => {
                    return deploy_helpers.compareValues(deploy_helpers.normalizeString(x),
                                                        deploy_helpers.normalizeString(y));
                });

                resolve(matchingFiles);
            }
        };

        try {
            var Glob = args.require('glob');
            var Path = require('path');
            var vscode = require('vscode');

            if (!Path.isAbsolute(dir)) {
                dir = Path.join(vscode.workspace.rootPath, dir);
            }
            dir = Path.resolve(dir);

            patterns = deploy_helpers.asArray(patterns)
                                     .map(x => deploy_helpers.toStringSafe(x))
                                     .filter(x => !deploy_helpers.isEmptyString(x));
            patterns = deploy_helpers.distinctArray(patterns);
            if (patterns.length < 1) {
                patterns = [ '**' ];
            }

            excludePatterns = deploy_helpers.asArray(excludePatterns)
                                            .map(x => deploy_helpers.toStringSafe(x))
                                            .filter(x => !deploy_helpers.isEmptyString(x));
            excludePatterns = deploy_helpers.distinctArray(excludePatterns);

            var nextPattern;
            nextPattern = () => {
                if (patterns.length < 1) {
                    completed();
                    return;
                }

                try {
                    var p = patterns.shift();

                    Glob(p, {
                        absolute: true,
                        cwd: dir,
                        dot: true,
                        ignore: excludePatterns,
                        nodir: true,
                        root: dir,
                    }, (err, files) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        matchingFiles = matchingFiles.concat(files);
                        nextPattern();
                    });
                }
                catch (e) {
                    completed(e);
                }
            };

            nextPattern();
        }
        catch (e) {
            completed(e);
        }
    });
}

function onBeforeDeploy(args, destination) {
    if (args.deployOptions.onBeforeDeploy) {
        args.deployOptions.onBeforeDeploy(args.sender, {
            destination: destination,
            file: args.file,
            target: args.target
        });
    }
}

function deployFile(args) {
    return new Promise(function(resolve, reject) {
        var completed = createCompletedAction(args, resolve, reject);

        args.context.once('deploy.cancel', function() {
            args.canceled = true;
        });

        if (args.context.isCancelling()) {
            completed();  // cancellation request
            return;
        }



        try {
            var helpers = args.require('./helpers');

            var func;

            var mode = helpers.normalizeString(args.targetOptions);
            switch (mode) {
                case 'css':
                    func = deploy_css;
                    break;

                case 'fontawesome':
                    func = deploy_fontawesome;
                    break;

                case 'glyphicons':
                    func = deploy_glyphicons;
                    break;

                case 'html':
                    func = deploy_html;
                    break;

                case 'images':
                    func = deploy_images;
                    break;

                case 'javascript':
                    func = deploy_javascript;
                    break;
            }

            if (func) {
                func(args).then(function() {
                    completed();
                }).catch(function(e) {
                    completed(e);
                });
            }
            else {
                completed(new Error('Unknown mode: ' + mode));
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.deployFile = deployFile;
