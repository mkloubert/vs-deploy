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
// 
// Translated by: Marcel Joachim Kloubert (https://github.com/mkloubert)
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
    commands: {
        executionFailed: "Die Ausführung des Kommandos {0:trim,surround} Schlug fehl: {1}",
    },
    compare: {
        failed: 'Datei {0:trim,surround} konnte nicht geladen werden: {1}',
        noPlugins: 'Keine passenden PlugIns gefunden!',
        noPluginsForType: 'Keine passenden PlugIns gefunden für {0:trim,surround}!',
        selectSource: 'Bitte wählen Sie eine Quelle aus...',
    },
    deploy: {
        after: {
            button: {
                text: "{2}Bereitstellen: [{1}] {0}{3}",
                tooltip: "Hier klicken, um die Ausgabe zu öffnen...",
            },
            failed: 'Fehler beim Ausführen der Aufgaben, die NACH dem Bereitstellen ausgeführt werden sollen: {0}',
        },
        before: {
            failed: 'Fehler beim Ausführen der Aufgaben, die VOR dem Bereitstellen ausgeführt werden sollten: {0}',
        },
        button: {
            cancelling: 'Breche ab...',
            prepareText: 'Bereite das Bereitstellen vor...',
            text: 'Bereitstellen läuft...',
            tooltip: 'Hier klicken, um den Vorgang abzubrechen...',
        },
        canceled: 'Abgebrochen.',
        canceledWithErrors: 'Abgebrochen mit Fehlern!',
        cancelling: 'Breche das Bereitstellen ab...',
        file: {
            deploying: 'Stelle Datei {0:trim,surround}{1:trim,leading_space} bereit... ',
            deployingWithDestination: 'Stelle Datei {0:trim,surround} in {1:trim,surround}{2:trim,leading_space} bereit... ',
            failed: 'Die Datei {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
            isIgnored: "Die Datei {0:trim,surround} wurde ignoriert!",
            succeeded: 'Die Datei {0:trim,surround} wurde erfolgreich bereitgestellt.',
            succeededWithTarget: 'Die Datei {0:trim,surround} wurde erfolgreich in {1:trim,surround} bereitgestellt.',
        },
        fileOrFolder: {
            failed: 'Datei bzw. Verzeichnis {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
        },
        finished: 'Fertig.',
        finished2: 'Fertig',
        finishedWithErrors: 'Beendet mit Fehlern!',
        folder: {
            failed: 'Das Verzeichnis {0:trim,surround} konnte nicht bereitgestellt werden: {1}',
            selectTarget: 'Wählen Sie das Ziel in welches das Verzeichnis bereitgestellt werden soll...',
        },
        newerFiles: {
            deploy: 'Bereitstellen',
            localFile: 'Lokale Datei',
            message: "{0} neuere Datei(en) wurde(n) gefunden!",
            modifyTime: 'Letzte Änderung',
            pull: 'Herunterladen',
            remoteFile: 'Zieldatei',
            show: 'Anzeigen',
            size: 'Größe',
            title: 'Neuere Dateien in {0:trim,surround}',
            titleNoTarget: 'Neuere Dateien',
        },
        noFiles: 'Es gibt keine Dateien zum Bereitstellen!',
        noPlugins: 'Keine passenden PlugIns gefunden!',
        noPluginsForType: 'Keine passenden PlugIns gefunden für {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: 'Konnte das Ziel {0:trim,surround} nicht im Paket{1:trim,surround,leading_space} finden!',
            failed: 'Konnte {0:trim,surround} nach dem Speichern nicht bereitstellen ({1:trim}): {2}',
            failedTarget: 'Konnte {0:trim,surround} nach dem Speichern nicht in das Ziel {1:trim} bereitstellen: {2}',
        },
        operations: {
            failed: "[FEHLER: {0:trim,surround}]",
            finished: "[Fertig]",
            noFileCompiled: "Keine der {0:trim} Datei(en) konnte kompiliert werden!",
            noFunctionInScript: "Die Funktion {0:trim,surround} wurde nicht in {1:trim,surround} gefunden!",
            open: 'Öffne {0:trim,surround}... ',
            someFilesNotCompiled: "{0:trim} der {1:trim} Datei(en) konnte(n) nicht kompiliert werden!",
            unknownCompiler: 'Der Compiler {0:trim,surround} existiert nicht!',
            unknownSqlEngine: 'Unbekannter SQL Typ {0:trim,surround}!',
            unknownType: 'UNBEKANNTER TYP: {0:trim,surround}',
        },
        startQuestion: 'Soll das Bereitstellen gestartet werden?',
        workspace: {
            allFailed: 'Keine Datei konnte bereitgestellt werden: {0}',
            allFailedWithTarget: 'Keine Datei konnte nach {0:trim,surround} bereitgestellt werden: {1}',
            allSucceeded: 'Alle {0:trim} Datei(en) wurden erfolgreich bereitgestellt.',
            allSucceededWithTarget: 'Alle {0:trim} Datei(en) wurden erfolgreich in {1:trim,surround} bereitgestellt.',
            alreadyStarted: 'Sie haben schon einen Bereitstellungs-Vorgang an {0:trim,surround} gestartet! Möchten Sie die Aktion dennoch durchführen?',
            clickToCancel: 'hier klicken, um abzubrechen',
            deploying: 'Stelle Paket{0:trim,surround,leading_space} bereit...',
            deployingWithTarget: 'Stelle Paket{0:trim,surround,leading_space} in {1:trim,surround} bereit...',
            failed: 'Das Bereitstellen der Dateien schlug fehl: {0}',
            failedWithCategory: 'Das Bereitstellen der Dateien schlug fehl ({0:trim}): {1}',
            failedWithTarget: 'Das Bereitstellen der Dateien nach {0:trim,surround} schlug fehl: {1}',
            nothingDeployed: 'Keine Datei bereitgestellt!',
            nothingDeployedWithTarget: 'Keine Datei in {0:trim,surround} bereitgestellt!',
            selectPackage: 'Wählen Sie ein Paket...',
            selectTarget: 'Wählen Sie ein Ziel...',
            someFailed: '{0:trim} der {1:trim} Datei(en) konnten nicht bereitgestellt werden!',
            someFailedWithTarget: '{0:trim} der {1:trim} Datei(en) konnten nicht in {2:trim,surround} bereitgestellt werden!',
            status: 'Stelle {0:trim,surround} bereit... ',
            statusWithDestination: 'Stelle {0:trim,surround} in {1:trim,surround} bereit... ',
            virtualTargetName: 'Virtuelles Ziel für aktuelles Paket',
            virtualTargetNameWithPackage: 'Virtuelles Ziel für Paket {0:trim,surround}',
        }
    },
    errors: {
        countable: 'FEHLER #{0:trim}: {1}',
        withCategory: '[FEHLER] {0:trim}: {1}',
    },
    extension: {
        update: "Aktualisieren...",
        updateRequired: "Die Erweiterung muss aktualisiert werden!",
    },
    extensions: {
        notInstalled: 'Die Erweiterung {0:trim,surround} ist NICHT installiert.',
    },
    failed: '[FEHLGESCHLAGEN: {0}]',
    format: {
        dateTime: 'DD.MM.YYYY HH:mm:ss',
    },
    host: {
        button: {
            text: 'Warte auf Dateien...',
            tooltip: 'Hier klicken, um den Host zu schließen',
        },
        errors: {
            cannotListen: 'Das Starten des Bereitstellungs-Dienstes schlug fehl: {0}',
            couldNotStop: 'Das Beenden des Bereitstellungs-Dienstes schlug fehl: {0}',
            fileRejected: 'Die Datei wurde abgelehnt!',
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
    install: 'Installieren',
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
        api: {
            clientErrors: {
                noPermissions: "Keine Schreibrechte!",
                notFound: 'Datei nicht gefunden!',
                unauthorized: "Benutzer hat keinen Zugriff!",
                unknown: "Unbekannter Clientfehler: {0:trim} {2:trim,surround}",
            },
            description: "Sendet Dateien an eine REST API, wie 'vs-rest-api'",
            serverErrors: {
                unknown: "Unbekannter Serverfehler: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Sendet Dateien an eine ausführbare Datei',
        },
        azureblob: {
            description: 'Lädt Dateien in ein Microsoft Azure Blob Speicherkonto hoch',
        },
        batch: {
            description: 'Stapelverarbeitung von Dateien durch mehrere Ziele',
        },
        dropbox: {
            description: 'Lädt Dateien in ein DropBox-Verzeichnis.',
            notFound: 'Datei nicht gefunden!',
            unknownResponse: 'Unerwartete Antwort {0:trim} ({1:trim}): {2:trim,surround}',
        },
        each: {
            description: 'Stellt Dateien mit Hilfe einer Liste von Werten breit',
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
        map: {
            description: 'Stellt Dateien mit Hilfe einer Liste von Werten breit',
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
        sql: {
            description: 'Führt SQL-Skripte aus',
            invalidFile: 'Datei ist ungültig!',
            unknownEngine: 'Unbekannter Typ {0:trim,surround}!',
        },
        test: {
            description: 'Ein Test-PlugIn, welches lediglich anzeigt, welche Dateien bereitgestellt würden',
        },
        zip: {
            description: 'Speichert Dateien in eine ZIP-Datei',
            fileAlreadyExists: 'Die Datei {0:trim,surround} existiert bereits! Bitte versuchen Sie es erneut...',
            fileNotFound: 'Datei nicht gefunden!',
            noFileFound: "Keine ZIP-Datei gefunden!",
        }
    },
    popups: {
        newVersion: {
            message: "Sie nutzen die neue Version {0:trim} von 'vs-deploy'!",
            showChangeLog: 'Änderungsprotokoll anzeigen (englisch)...',
        },
    },
    pull: {
        button: {
            cancelling: 'Breche ab...',
            prepareText: 'Bereite das Laden vor...',
            text: 'Lade...',
            tooltip: 'Hier klicken, um den Vorgang abzubrechen...',
        },
        canceled: 'Abgebrochen.',
        canceledWithErrors: 'Abgebrochen mit Fehlern!',
        file: {
            failed: 'Datei {0:trim,surround} konnte nicht geladen werden: {1}',
            pulling: 'Lade Datei {0:trim,surround}{1:trim,leading_space}... ',
            pullingWithDestination: 'Lade Datei {0:trim,surround} von {1:trim,surround}{2:trim,leading_space}... ',
            succeeded: 'Die Datei {0:trim,surround} wurde erfolgreich geladen.',
            succeededWithTarget: 'Die Datei {0:trim,surround} wurde erfolgreich von {1:trim,surround} geladen.',
        },
        fileOrFolder: {
            failed: "Datei bzw. Verzeichnis {0:trim,surround} konnte nicht geladen werden: {1}",
        },
        finished2: 'Fertig',
        finishedWithErrors: 'Beendet mit Fehlern!',
        noPlugins: 'Keine passenden PlugIns gefunden!',
        noPluginsForType: 'Keine passenden PlugIns gefunden für {0:trim,surround}!',
        workspace: {
            allFailed: 'Keine Datei konnte geladen werden: {0}',
            allFailedWithTarget: 'Keine Datei konnte von {0:trim,surround} geladen werden: {1}',
            allSucceeded: 'Alle {0:trim} Datei(en) wurden erfolgreich geladen.',
            allSucceededWithTarget: 'Alle {0:trim} Datei(en) wurden erfolgreich von {1:trim,surround} geladen.',
            alreadyStarted: 'Es wurde bereits einen Vorgang für {0:trim,surround} gestartet! Möchten Sie die Aktion wirklich durchführen?',
            clickToCancel: 'hier klicken, um abzubrechen',
            failed: 'Das Laden der Dateien schlug fehl: {0}',
            failedWithCategory: 'Das Laden der Dateien schlug fehl ({0:trim}): {1}',
            failedWithTarget: 'Das Laden der Dateien von {0:trim,surround} schlug fehl: {1}',
            nothingPulled: 'Keine Datei geladen!',
            nothingPulledWithTarget: 'Keine Datei von {0:trim,surround} geladen!',
            pulling: 'Lade Paket{0:trim,surround,leading_space}...',
            pullingWithTarget: 'Lade Paket{0:trim,surround,leading_space} von {1:trim,surround}...',
            selectPackage: 'Wählen Sie ein Paket...',
            selectSource: 'Wählen Sie eine Quelle...',
            someFailed: '{0:trim} der {1:trim} Datei(en) konnten nicht geladen werden!',
            someFailedWithTarget: '{0:trim} der {1:trim} Datei(en) konnten nicht von {2:trim,surround} geladen werden!',
            status: 'Lade {0:trim,surround}... ',
            statusWithDestination: 'Lade {0:trim,surround} von {1:trim,surround}... ',
            virtualTargetName: 'Virtuelles Ziel für aktuelles Paket',
            virtualTargetNameWithPackage: 'Virtuelles Ziel für Paket {0:trim,surround}',
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
        selectSource: 'Bitte wählen Sie eine Quelle aus...',
    },
    templates: {
        browserTitle: "Vorlage{0:trim,surround,leading_space}",
        currentPath: 'Aktueller Pfad:{0:trim,leading_space}',
        noneDefined: "Definieren sie bitte mindestens eine VORLAGEN-QUELLE in Ihrer 'settings.json'-Datei!",
        officialRepositories: {
            newAvailable: "Das VORLAGEN-VERZEICHNIS wurde aktualisiert.",
            openTemplates: "Vorlagen öffnen...",
        },
        placeholder: 'Wählen Sie einen Eintrag aus...',
        publishOrRequest: {
            label: 'Eigenes Beispiel veröffentlichen oder anfragen...',
        }
    },
    warnings: {
        withCategory: '[WARNUNG] {0:trim}: {1}',
    },
    yes: 'Ja',
};
