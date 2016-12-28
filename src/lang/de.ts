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

// deutsch (german)
export const translation: Translation = {
    countableError: 'FEHLER #{0:trim}: {1}',
    couldNotResolveRelativePath: "Der relative Pfad für {0:trim,surround} konnte nicht ermittelt werden!",
    errorWithCategory: '[FEHLER] {0:trim}: {1}',
    noDirectory: "{0:trim,surround} ist kein Verzeichnis!",
    plugins: {
        ftp: {
            description: 'Lädt Dateien auf einen FTP-Server',
        },
        mail: {
            addressSelector: {
                placeholder: 'E-Mail-Adressen der Empfänger',
                prompt: 'Eine oder mehrere E-Mail-Adressen (per Komma getrennt) an die verschickt werden soll...',
            },
            description: 'Sendet Dateien als ZIP-Datei-Anhang an eine oder mehrere E-Mail-Adressen',
        },
        pipeline: {
            description: 'Leitet eine Liste von Quelldateien über ein Skript an einen anderen Ort und übermittelt die neuen Dateien an eine Liste von Zielen',
            noPipeFunction: "{0:trim,surround} implementiert keine 'pipe()' Funktion!",
        },
        remote: {
            description: 'Überträgt Dateien über eine TCP-Verbindung',
        },
        s3bucket: {
            credentialTypeNotSupported: 'Das Anmeldeverfahren {0:trim,surround} wird nicht unterstützt!',
            description: 'Lädt Dateien in ein Amazon S3 Bucket hoch',
        },
        script: {
            deployFileFailed: 'Das Bereitstellen der Datei {0:trim,surround} über das Skript {1:trim,surround} schlug fehl!',
            deployWorkspaceFailed: 'Das Bereitstellen des Arbeitsbereiches über das Skript {0:trim,surround} schlug fehl!',
            description: 'Stellt Dateien über ein NodeJS-Skript bereit',
            noDeployFileFunction: "{0:trim,surround} implementiert keine 'deployFile()' Funktion!",
        },
        sftp: {
            description: 'Lädt Dateien auf einen SFTP-Server',
        },
        test: {
            description: 'Ein Test-PlugIn, welches lediglich anzeigt, welche Dateien bereitgestellt würden',
        },
        zip: {
            description: 'Speichert Dateien in eine ZIP-Datei',
            fileAlreadyExists: 'Die Datei {0:trim,surround} existiert bereits! Bitte versuchen Sie es erneut...',
        }
    },
    relativePathIsEmpty: 'Der relative Pfad für {0:trim,surround} is leer!',
};
