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
// 
// Translated by: Marcel Joachim Kloubert (https://github.com/mkloubert)
export const translation: Translation = {
    __plugins: {
        reload: {
            failed: 'Could not reload plugins: {0}',
            loaded: {
                more: '{0:trim} plugins loaded.',
                none: 'No plugin loaded.',
                one: '1 plugin loaded.',
            }
        }
    },
    commands: {
        executionFailed: "Execution of command {0:trim,surround} failed: {1}",
    },
    deploy: {
        after: {
            button: {
                text: "Deploy: {0}",
                tooltip: "Click here to show output...",
            },
            failed: "Could not invoke 'after deployed' operations: {0}",
        },
        before: {
            failed: "Could not invoke 'before deploy' operations: {0}",
        },
        button: {
            cancelling: 'Cancelling...',
            prepareText: 'Preparing deployment...',
            text: 'Deploying...',
            tooltip: 'Click here to cancel deployment...',
        },
        canceled: 'Canceled.',
        canceledWithErrors: 'Canceled with errors!',
        cancelling: 'Cancelling deployment...',
        file: {
            deploying: 'Deploying file {0:trim,surround}{1:trim,leading_space}... ',
            deployingWithDestination: 'Deploying file {0:trim,surround} to {1:trim,surround}{2:trim,leading_space}... ',
            failed: 'Could not deploy file {0:trim,surround}: {1}',
            succeeded: 'File {0:trim,surround} has been successfully deployed.',
            succeededWithTarget: 'File {0:trim,surround} has been successfully deployed to {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: 'Could not deploy file / folder {0:trim,surround}: {1}',
        },
        finished: 'Finished.',
        finishedWithErrors: 'Finished with errors!',
        folder: {
            failed: 'Could not deploy folder {0:trim,surround}: {1}',
            selectTarget: 'Select the target to deploy the folder to...',
        },
        noFiles: 'There are no files to deploy!',
        noPlugins: 'No plugin(s) found!',
        noPluginsForType: 'No matching plugin(s) found for {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: 'Deploy target {0:trim,surround} defined in package{1:trim,surround,leading_space} does not exist!',
            failed: 'Could not deploy {0:trim,surround} on save ({1:trim}): {2}',
            failedTarget: 'Could not deploy {0:trim,surround} to {1:trim} on save: {2}',
        },
        operations: {
            failed: "[ERROR: {0:trim,surround}]",
            finished: "[Done]",
            noFileCompiled: "No of the {0:trim} file(s) could be compiled!",
            noFunctionInScript: "The function {0:trim,surround} was not found in {1:trim,surround}!",
            open: 'Opening {0:trim,surround}... ',
            someFilesNotCompiled: "{0:trim} of {1:trim} file(s) could not be compiled!",
            unknownCompiler: 'Compiler {0:trim,surround} is unknown!',
            unknownSqlEngine: 'Unknown SQL engine {0:trim,surround}!',
            unknownType: 'UNKNOWN TYPE: {0:trim,surround}',
        },
        workspace: {
            allFailed: 'No file could be deployed: {0}',
            allFailedWithTarget: 'No file could be deployed to {0:trim,surround}: {1}',
            allSucceeded: 'All {0:trim} file(s) were successfully deployed.',
            allSucceededWithTarget: 'All {0:trim} file(s) were successfully deployed to {1:trim,surround}.',
            alreadyStarted: 'You have already started a deployment to {0:trim,surround}! Do you really want to start this operation?',
            clickToCancel: 'click here to cancel',
            deploying: 'Deploying package{0:trim,surround,leading_space}...',
            deployingWithTarget: 'Deploying package{0:trim,surround,leading_space} to {1:trim,surround}...',
            failed: 'Could not deploy files: {0}',
            failedWithCategory: 'Could not deploy files ({0:trim}): {1}',
            failedWithTarget: 'Could not deploy files to {0:trim,surround}: {1}',
            nothingDeployed: 'No file deployed!',
            nothingDeployedWithTarget: 'No file deployed to {0:trim,surround}!',
            selectPackage: 'Select a package...',
            someFailed: '{0:trim} of the {1:trim} file(s) could not be deployed!',
            someFailedWithTarget: '{0:trim} of the {1:trim} file(s) could not be deployed to {2:trim,surround}!',
            status: 'Deploying {0:trim,surround}... ',
            statusWithDestination: 'Deploying {0:trim,surround} to {1:trim,surround}... ',
            virtualTargetName: 'Virtual batch target for current package',
            virtualTargetNameWithPackage: 'Virtual batch target for package {0:trim,surround}',
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
            fileRejected: 'The file has been rejected!',
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
    network: {
        hostname: 'Your hostname: {0:trim,surround}',
        interfaces: {
            failed: 'Could not get network interfaces: {0}',
            list: 'Your network interfaces:',
        }
    },
    ok: '[OK]',
    packages: {
        couldNotFindTarget: 'Could not find target {0:trim,surround} in package {1:trim,surround}!',
        defaultName: '(Package #{0:trim})',
        noneDefined: "Please define a least one PACKAGE in your 'settings.json'!",
        notFound: 'Package {0:trim,surround} not found!',
        nothingToDeploy: 'No package to deploy!',
    },
    plugins: {
        api: {
            clientErrors: {
                noPermissions: "No permissions to write!",
                unauthorized: "User is unauthorized!",
                unknown: "Unknown client error: {0:trim} {2:trim,surround}",
            },
            description: "Deploys to a REST API, like 'vs-rest-api'",
            serverErrors: {
                unknown: "Unknown server error: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Deploys to an app, like a script or executable, on the local machine',
        },
        azureblob: {
            description: 'Deploys to a Microsoft Azure blob storage',
        },
        batch: {
            description: 'Deploys to other targets',
        },
        dropbox: {
            description: 'Deploys to a DropBox folder.',
            unknownResponse: 'Unexpected response {0:trim} ({1:trim}): {2:trim,surround}',
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
        nativescript: {
            description: "Deploys a NativeScript project to a device or emulator",
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
        sql: {
            description: 'Executes SQL scripts',
            invalidFile: 'File is invalid!',
            unknownEngine: 'Unknown engine {0:trim,surround}!',
        },
        test: {
            description: 'A mock deployer that only displays what files would be deployed',
        },
        zip: {
            description: 'Deploys to a ZIP file',
            fileAlreadyExists: 'File {0:trim,surround} already exists! Try again...',
        }
    },
    popups: {
        newVersion: {
            message: "You are running new version of 'vs-deploy' ({0:trim})!",
            showChangeLog: 'Show changelog...',
        },
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
    yes: 'Yes',
};
