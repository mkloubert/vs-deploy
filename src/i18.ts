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

import * as deploy_helpers from './helpers';
import * as FS from 'fs';
import * as i18next from 'i18next';
import * as Path from 'path';
import * as vscode from 'vscode';


/**
 * Stores the strings of a translation.
 */
export interface Translation {
    __plugins?: {
        reload?: {
            failed?: string;
            loaded?: {
                more?: string;
                none?: string;
                one?: string;
            }
        }
    },
    canceled?: string;
    commands?: {
        executionFailed?: string;
    },
    compare?: {
        failed?: string;
        noPlugins?: string;
        noPluginsForType?: string;
        selectSource?: string;
    },
    deploy?: {
        after?: {
            button?: {
                text?: string;
                tooltip?: string;
            },
            failed?: string;
        },
        before?: {
            failed?: string;
        },
        button?: {
            cancelling?: string;
            prepareText?: string;
            text?: string;
            tooltip?: string;
        },
        canceled?: string;
        canceledWithErrors?: string;
        cancelling?: string;
        file?: {
            deploying?: string;
            deployingWithDestination?: string;
            failed?: string;
            isIgnored?: string;
            succeeded?: string;
            succeededWithTarget?: string;
        },
        fileOrFolder?: {
            failed?: string;
        },
        finished?: string;
        finished2?: string;
        finishedWithErrors?: string;
        folder?: {
            failed?: string;
            selectTarget?: string;
        },
        newerFiles?: {
            deploy?: string;
            localFile?: string;
            message?: string;
            modifyTime?: string;
            pull?: string;
            remoteFile?: string;
            show?: string;
            size?: string;
            title?: string;
            titleNoTarget?: string;
        },
        noFiles?: string;
        noPlugins?: string;
        noPluginsForType?: string;
        onSave?: {
            couldNotFindTarget?: string;
            failed?: string;
            failedTarget?: string;
        },
        operations?: {
            failed?: string;
            finished?: string;
            noFileCompiled?: string;
            noFunctionInScript?: string;
            open?: string;
            someFilesNotCompiled?: string;
            unknownCompiler?: string;
            unknownSqlEngine?: string;
            unknownType?: string;
        },
        startQuestion?: string;
        workspace?: {
            allFailed?: string;
            allFailedWithTarget?: string;
            allSucceeded?: string;
            allSucceededWithTarget?: string;
            alreadyStarted?: string;
            clickToCancel?: string;
            deploying?: string;
            deployingWithTarget?: string;
            failed?: string;
            failedWithCategory?: string;
            failedWithTarget?: string;
            nothingDeployed?: string;
            nothingDeployedWithTarget?: string;
            selectPackage?: string;
            selectTarget?: string;
            someFailed?: string;
            someFailedWithTarget?: string;
            status?: string;
            statusWithDestination?: string;
            virtualTargetName?: string;
            virtualTargetNameWithPackage?: string;
        }
    },
    errors?: {
        countable?: string;
        withCategory?: string;
    },
    extension?: {
        update?: string;
        updateRequired?: string;
    },
    extensions?: {
        notInstalled?: string;
    },
    failed?: string;
    format?: {
        dateTime?: string;
    },
    host?: {
        button?: {
            text?: string;
            tooltip?: string;
        },
        errors?: {
            cannotListen?: string;
            couldNotStop?: string;
            fileRejected?: string;
            noData?: string;
            noFilename?: string;
        },
        receiveFile?: {
            failed?: string;
            ok?: string;
            receiving?: string;
        },
        started?: string;
        stopped?: string;
    },
    install?: string;
    isNo?: {
        directory?: string;
        file?: string;
        validItem?: string;
    },
    load?: {
        from?: {
            failed?: string;
        }
    },
    network?: {
        hostname?: string;
        interfaces?: {
            failed?: string;
            list?: string;
        }
    },
    ok?: string;
    packages?: {
        couldNotFindTarget?: string;
        defaultName?: string;
        noneDefined?: string;
        notFound?: string;
        nothingToDeploy?: string;
    },
    plugins?: {
        api?: {
            clientErrors?: {
                noPermissions?: string;
                notFound?: string;
                unauthorized?: string;
                unknown?: string;
            },
            description?: string;
            serverErrors?: {
                unknown?: string;
            },
        },
        app?: {
            description?: string;
        },
        azureblob?: {
            description?: string;
        },
        batch?: {
            description?: string;
        },
        dropbox?: {
            description?: string;
            notFound?: string;
            unknownResponse?: string;
        },
        each?: {
            description?: string;
        },
        ftp?: {
            description?: string;
        },
        http?: {
            description?: string;
            protocolNotSupported?: string;
        },
        list?: {
            description?: string;
            selectEntry?: string;
        },
        local?: {
            description?: string;
            emptyTargetDirectory?: string;
        },
        mail?: {
            addressSelector?: {
                placeholder?: string;
                prompt?: string;
            };
            description?: string;
        },
        map?: {
            description?: string;
        },
        prompt?: {
            description?: string;
            invalidInput?: string;
        },
        pipeline?: {
            description?: string;
            noPipeFunction?: string;
        },
        remote?: {
            description?: string;
        },
        s3bucket?: {
            credentialTypeNotSupported?: string;
            description?: string;
        },
        script?: {
            deployFileFailed?: string;
            deployWorkspaceFailed?: string;
            description?: string;
            noDeployFileFunction?: string;
        },
        sftp?: {
            description?: string;
        },
        slack?: {
            description?: string;
        },
        sql?: {
            description?: string;
            invalidFile?: string;
            unknownEngine?: string;
        },
        switch?: {
            button?: {
                text?: string;
                tooltip?: string;
            },
            defaultName?: string;
            defaultOptionName?: string;
            description?: string;
            item?: string;
            noDefined?: string;
            noOptionsDefined?: string;
            noOptionSelected?: string;
            selectOption?: string;
            selectSwitch?: string;
            states?: string;
        },
        test?: {
            description?: string;
        },
        zip?: {
            description?: string;
            fileAlreadyExists?: string;
            fileNotFound?: string;
            noFileFound?: string;
        }
    },
    popups?: {
        newVersion?: {
            message?: string;
            showChangeLog?: string;
        },
    },
    prompts?: {
        inputAccessKey?: string;
        inputAccessToken?: string;
        inputPassword?: string;
    },
    pull?: {
        button?: {
            cancelling?: string;
            prepareText?: string;
            text?: string;
            tooltip?: string;
        },
        canceled?: string;
        canceledWithErrors?: string;
        file?: {
            failed?: string;
            pulling?: string;
            pullingWithDestination?: string;
            succeeded?: string;
            succeededWithTarget?: string;
        },
        fileOrFolder?: {
            failed?: string;
        },
        finished2?: string;
        finishedWithErrors?: string;
        noPlugins?: string;
        noPluginsForType?: string;
        workspace?: {
            allFailed?: string;
            allFailedWithTarget?: string;
            allSucceeded?: string;
            allSucceededWithTarget?: string;
            alreadyStarted?: string;
            clickToCancel?: string;
            failed?: string;
            failedWithCategory?: string;
            failedWithTarget?: string;
            nothingPulled?: string;
            nothingPulledWithTarget?: string;
            pulling?: string;
            pullingWithTarget?: string;
            selectPackage?: string;
            selectSource?: string;
            someFailed?: string;
            someFailedWithTarget?: string;
            status?: string;
            statusWithDestination?: string;
            virtualTargetName?: string;
            virtualTargetNameWithPackage?: string;
        }
    },
    quickDeploy?: {
        caption?: string;
        failed?: string;
        start?: string;
    },
    relativePaths?: {
        couldNotResolve?: string;
        isEmpty?: string;
    },
    selected?: string;
    sync?: {
        file?: {
            doesNotExistOnRemote?: string;
            localChangedWithinSession?: string;
            localIsNewer?: string;
            synchronize?: string;
        }
    },
    targets?: {
        cannotUseRecurrence?: string;
        defaultName?: string;
        noneDefined?: string;
        notFound?: string;
        select?: string;
        selectSource?: string;
    },
    templates?: {
        browserTitle?: string;
        currentPath?: string;
        noneDefined?: string;
        officialRepositories?: {
            newAvailable?: string;
            openTemplates?: string;
        },
        placeholder?: string;
        publishOrRequest?: {
            label?: string;
        },
    },
    warnings?: {
        withCategory?: string;
    },
    workspace?: {
        autoSelect?: {
            failed?: string;
        }
    },
    yes?: string,
}


/**
 * Returns a translated string by key.
 * 
 * @param {string} key The key.
 * @param {any} [args] The optional arguments.
 * 
 * @return {string} The "translated" string.
 */
export function t(key: string, ...args: any[]): string {
    let formatStr = i18next.t(deploy_helpers.toStringSafe(key).trim());
    formatStr = deploy_helpers.toStringSafe(formatStr);

    return deploy_helpers.formatArray(formatStr, args);
}

/**
 * Initializes the language repository.
 * 
 * @param {string} [lang] The custom language to use.
 * 
 * @returns {Promise<any>} The promise.
 */
export function init(lang?: string): Promise<any> {
    if (deploy_helpers.isEmptyString(lang)) {
        lang = vscode.env.language;
    }
    lang = normalizeLangName(lang);
    if ('' === lang) {
        lang = 'en';
    }

    return new Promise<any>((resolve, reject) => {
        let completed = (err?: any, tr?: any) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(tr);
            }
        };

        try {
            let langDir = Path.join(__dirname, 'lang');

            let resources: any = {};

            // initialize 'i18next'
            // with collected data
            let initLang = () => {
                i18next.init({
                    lng: lang,
                    resources: resources,
                    fallbackLng: 'en',
                }, (err, tr) => {
                    completed(err, tr);
                });
            };

            // load language files
            let loadFiles = () => {
                FS.readdir(langDir, (err, files) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    // load files
                    for (let i = 0; i < files.length; i++) {
                        try {
                            let fileName = files[i];
                            if (fileName.length < 3) {
                                continue;
                            }

                            if ('.js' !== fileName.substr(fileName.length - 3)) {
                                continue;  // no JavaScript file
                            }

                            let langName = normalizeLangName( fileName.substr(0, fileName.length - 3) );
                            if ('' === langName) {
                                continue;  // no language name available
                            }

                            let fullPath = Path.join(langDir, fileName);
                            fullPath = Path.resolve(fullPath);

                            let stats = FS.lstatSync(fullPath);
                            if (!stats.isFile()) {
                                continue;  // no file
                            }

                            // deleted cached data
                            // and load current translation
                            // from file
                            delete require.cache[fullPath];
                            resources[langName] = {
                                translation: require(fullPath).translation,
                            };
                        }
                        catch (e) {
                            deploy_helpers.log(`[vs-deploy :: ERROR] i18.init(): ${deploy_helpers.toStringSafe(e)}`);
                        }
                    }

                    initLang();
                })
            };

            // check if directory
            let checkIfDirectory = () => {
                FS.lstat(langDir, (err, stats) => {
                    if (stats.isDirectory()) {
                        loadFiles();
                    }
                    else {
                        completed(new Error(`'${langDir}' is no directory!`));
                    }
                });
            };

            FS.exists(langDir, (exists) => {
                if (exists) {
                    checkIfDirectory();
                }
                else {
                    initLang();
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

function normalizeLangName(lang: string): string {
    lang = deploy_helpers.normalizeString(lang);
    lang = deploy_helpers.replaceAllStrings(lang, '-', '_');

    return lang;
}
