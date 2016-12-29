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
    deploy: {
        before: {
            failed: "Could not invoke 'before deploy' operations: {0}",
        },
        file: {
            failed: 'Could not deploy file {0:trim,surround}: {1}',
        },
        fileOrFolder: {
            failed: 'Could not deploy file / folder {0:trim,surround}: {1}',
        },
        folder: {
            failed: 'Could not deploy folder {0:trim,surround}: {1}',
            selectTarget: 'Select the target to deploy the folder to...',
        },
        noFiles: 'There are no files to deploy!',
        operations: {
            unknownType: 'UNKNOWN TYPE: {0:trim,surround}',
        }
    },
    errors: {
        countable: 'ERROR #{0:trim}: {1}',
        withCategory: '[ERROR] {0:trim}: {1}',
    },
    failed: '[FAILED: {0}]',
    host: {
        button: {
            text: 'Waiting for files...',
            tooltip: 'Click here to close deploy host',
        },
        errors: {
            cannotListen: 'Could not start listening for files: {0}',
            couldNotStop: 'Could not stop deploy host: {0}',
            noData: 'No data!',
            noFilename: 'No filename {0:trim}!',
        },
        receiveFile: {
            failed: '[FAILED:{0:trim,leading_space}]',
            ok: '[OK{0:trim}]',
            receiving: "Receiving file{2:trim,leading_space} from '{0:trim}:{1:trim}'... ",
        },
        started: 'Started deploy host on port {0:trim} in directory {1:trim,surround}.',
        stopped: 'Deploy host has been stopped.',
    },
    isNo: {
        directory: "{0:trim,surround} is no directory!",
        file: "{0:trim,surround} is no file!",
        validItem: '{0:trim,surround} is no valid item that can be deployed!',
    },
    ok: '[OK]',
    packages: {
        defaultName: '(Package #{0:trim})',
        noneDefined: "Please define a least one PACKAGE in your 'settings.json'!",
        notFound: 'Package {0:trim,surround} not found!',
        nothingToDeploy: 'No package to deploy!',
    },
    plugins: {
        app: {
            description: 'Deploys to an app, like a script or executable, on the local machine',
        },
        azureblob: {
            description: 'Deploys to a Microsoft Azure blob storage',
        },
        batch: {
            description: 'Deploys to other targets',
        },
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
    quickDeploy: {
        caption: 'Quick deploy!',
        failed: 'Quick deploy failed: {0}',
        start: 'Start a quick deploy...',
    },
    relativePaths: {
        couldNotResolve: "Could not get relative path for {0:trim,surround}!",
        isEmpty: 'Relative path for {0:trim,surround} file is empty!',
    },
    targets: {
        cannotUseRecurrence: 'Cannot use target {0:trim,surround} (recurrence)!',
        defaultName: '(Target #{0:trim})',
        noneDefined: "Please define a least one TARGET in your 'settings.json'!",
        notFound: 'Could not find target {0:trim,surround}!',
        select: 'Select the target to deploy to...',
    },
    warnings: {
        withCategory: '[WARN] {0:trim}: {1}',
    },
};
