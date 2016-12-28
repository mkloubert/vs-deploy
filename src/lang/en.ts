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

import { Translation } from '../i18';

// english
export const translation: Translation = {
    countableError: 'ERROR #{0:trim}: {1}',
    couldNotResolveRelativePath: "Could not get relative path for {0:trim,surround}!",
    errorWithCategory: '[ERROR] {0:trim}: {1}',
    failed: '[FAILED: {0}]',
    noDirectory: "{0:trim,surround} ist kein Verzeichnis!",
    ok: '[OK]',
    plugins: {
        ftp: {
            description: 'Deploys to a FTP server',
        },
        http: {
            description: 'Deploys to a HTTP server/service',
            protocolNotSupported: 'Protocol {0:trim,surround} is not supported!',
        },
        local: {
            description: 'Deploys to a local folder or a shared folder (like SMB) inside your LAN',
            emptyTargetDirectory: 'Empty LOCAL target directory {0:trim,surround}... ',
        },
        mail: {
            addressSelector: {
                placeholder: 'Target eMail address(es)',
                prompt: 'One or more email address (separated by comma) to deploy to...',
            },
            description: 'Deploys to a ZIP file and sends it as attachment by mail via SMTP',
        },
        pipeline: {
            description: 'Pipes a list of sources files to a new destination, by using a script and sends the new file list to a target',
            noPipeFunction: "{0:trim,surround} implements no 'pipe()' function!",
        },
        remote: {
            description: 'Deploys to a remote machine over a TCP connection',
        },
        s3bucket: {
            credentialTypeNotSupported: 'Credental type {0:trim,surround} is not supported!',
            description: 'Deploys to an Amazon S3 bucket',
        },
        script: {
            deployFileFailed: 'Could not deploy file {0:trim,surround} by script {1:trim,surround}!',
            deployWorkspaceFailed: 'Could not deploy workspace by script {0:trim,surround}!',
            description: 'Deploys via a JS script',
            noDeployFileFunction: "{0:trim,surround} implements no 'deployFile()' function!",
        },
        sftp: {
            description: 'Deploys to a SFTP server',
        },
        test: {
            description: 'A mock deployer that only displays what files would be deployed',
        },
        zip: {
            description: 'Deploys to a ZIP file',
            fileAlreadyExists: 'File {0:trim,surround} already exists! Try again...',
        }
    },
    relativePathIsEmpty: 'Relative path for {0:trim,surround} file is empty!',
};
