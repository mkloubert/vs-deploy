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
    __plugins: {
        reload: {
            failed: 'Das Neuladen der PlugIns ist fehlgeschlagen: {0}',
            loaded: {
                more: '{0:trim} PlugIns geladen.',
                none: 'Keine PlugIns geladen.',
                one: '1 PlugIn geladen.',
            }
        }
    },
    deploy: {
        before: {
            failed: 'Fehler beim Ausführen der Aufgaben, die VOR dem Bereitstellen ausgeführt werden sollten: {0}',
        },
        file: {
            failed: 'Die Datei {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
        },
        fileOrFolder: {
            failed: 'Datei bzw. Verzeichnis {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
        },
        folder: {
            failed: 'Das Verzeichnis {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
            selectTarget: 'Wählen Sie das Ziel in welches das Verzeichnis bereitgestellt werden soll...',
        },
        noFiles: 'Es gibt keine Dateien zum Bereitstellen!',
        operations: {
            unknownType: 'UNBEKANNTER TYP: {0:trim,surround}',
        }
    },
    errors: {
        countable: 'FEHLER #{0:trim}: {1}',
        withCategory: '[FEHLER] {0:trim}: {1}',
    },
    failed: '[FEHLGESCHLAGEN: {0}]',
    host: {
        button: {
            text: 'Warte auf Dateien...',
            tooltip: 'Hier klicken, um den Host zu schließen',
        },
        errors: {
            cannotListen: 'Das Starten des Bereitstellungs-Dienstes schlug fehl: {0}',
            couldNotStop: 'Das Beenden des Bereitstellungs-Dienstes schlug fehl: {0}',
            noData: 'Keine Daten!',
            noFilename: 'Kein Dateiname {0:trim}!',
        },
        receiveFile: {
            failed: '[FEHLGESCHLAGEN:{0:trim,leading_space}]',
            receiving: "Empfange Datei{2:trim,leading_space} von '{0:trim}:{1:trim}'... ",
        },
        started: 'Bereitstellungs-Dienst wurde erfolgreich auf Port {0:trim} im Verzeichnis {1:trim,surround} gestartet.',
        stopped: 'Bereitstellungs-Dienst wurde beendet.',
    },
    isNo: {
        directory: "{0:trim,surround} ist kein Verzeichnis!",
        file: "{0:trim,surround} ist keine Datei!",
        validItem: '{0:trim,surround} ist kein gültiges Element, das bereitgestellt werden kann!',
    },
    network: {
        hostname: 'Name dieses Computers: {0:trim,surround}',
        interfaces: {
            failed: 'Konnte Netzwerk-Adapter nicht ermitteln: {0}',
            list: 'Netzwerk-Adapter:',
        }
    },
    packages: {
        couldNotFindTarget: 'Konnte das Ziel {0:trim,surround} nicht im Paket {1:trim,surround} finden!',
        defaultName: '(Paket #{0:trim})',
        noneDefined: "Definieren sie bitte mindestens ein PAKET in Ihrer 'settings.json'-Datei!",
        notFound: 'Paket {0:trim,surround} wurde nicht gefunden!',
        nothingToDeploy: 'Kein Paket zum Bereitstellen gefunden!',
    },
    plugins: {
        app: {
            description: 'Sendet Dateien an eine ausführbare Datei',
        },
        azureblob: {
            description: 'Lädt Dateien in ein Microsoft Azure Blob Speicherkonto hoch',
        },
        batch: {
            description: 'Stapelverarbeitung von Dateien durch mehrere Ziele',
        },
        ftp: {
            description: 'Lädt Dateien auf einen FTP-Server',
        },
        http: {
            description: 'Sendet Dateien an einen HTTP-Server/-Dienst',
            protocolNotSupported: 'Protokolle vom Typ {0:trim,surround} werden nicht unterstützt!',
        },
        local: {
            description: 'Kopiert Dateien in ein lokales Verzeichnis oder eine Netwerkfreigabe',
            emptyTargetDirectory: 'Leere lokales Verzeichnis {0:trim,surround}... ',
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
    quickDeploy: {
        caption: 'Bereitstellen!',
        failed: 'Schnelles Bereitstellen fehlgeschlagen: {0}',
        start: 'Schnelles Bereitstellen...',
    },
    relativePaths: {
        couldNotResolve: "Der relative Pfad für {0:trim,surround} konnte nicht ermittelt werden!",
        isEmpty: 'Der relative Pfad für {0:trim,surround} is leer!',
    },
    targets: {
        cannotUseRecurrence: 'Kann das Ziel {0:trim,surround} nicht verwenden (Rekursion)!',
        defaultName: '(Ziel #{0:trim})',
        noneDefined: "Definieren sie bitte mindestens ein ZIEL in Ihrer 'settings.json'-Datei!",
        notFound: 'Konnte das Ziel {0:trim,surround} nicht finden!',
        select: 'Bitte wählen Sie ein Ziel aus...',
    },
    warnings: {
        withCategory: '[WARNUNG] {0:trim}: {1}',
    },
};
