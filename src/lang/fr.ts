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

// french
//
// Translated by: Neiobaf (https://github.com/neiobaf)
//                Mathieu Lesniak (https://github.com/mathieulesniak)
export const translation: Translation = {
    __plugins: {
        reload: {
            failed: 'Impossible de charger les plugins: {0}',
            loaded: {
                more: '{0:trim} plugins chargés.',
                none: 'Aucun plugin chargé.',
                one: '1 plugin chargé.',
            }
        }
    },
    canceled: '[Annulé]',
    commands: {
        executionFailed: "L'exécution de la commande {0:trim,surround} a échoué: {1}",
    },
    compare: {
        noPlugins: 'Aucun plugin trouvé!',
        noPluginsForType: 'Aucun plugin correspondant pour {0:trim,surround}!',
        failed : 'Impossible de récupérer le fichier {0:trim,surround}: {1}',
        selectSource: 'Choisissez la source de récupération...',
    },
    deploy: {
        after: {
            button: {
                text: "{2}Déploiement: [{1}] {0}{3}",
                tooltip: "Cliquez ici pour voir la sortie...",
            },
            failed: "Les opérations APRES le déploiement n'ont pas pu être exécutées: {0}",
        },
        before: {
            failed: "Les opérations AVANT le déploiement n'ont pas pu être exécutées: {0}",
        },
        button: {
            cancelling: 'Annulation...',
            prepareText: 'Préparation au déploiement...',
            text: 'Déploiement...',
            tooltip: 'Cliquez ici pour annuler le déploiement...',
        },
        canceled: 'Annulé.',
        canceledWithErrors: 'Annulé avec erreurs!',
        cancelling: 'Annulation du déploiement...',
        file: {
            deploying: 'Déploiement du fichier {0:trim,surround}{1:trim,leading_space}... ',
            deployingWithDestination: 'Déploiement du fichier {0:trim,surround} vers {1:trim,surround}{2:trim,leading_space}... ',
            failed: 'Impossible de déployer le fichier {0:trim,surround}: {1}',
            isIgnored:'Le fichier {0:trim,surround} a été ignoré!',
            succeeded: 'Fichier {0:trim,surround} déployé avec succès.',
            succeededWithTarget: 'Fichier {0:trim,surround} déployé avec succès vers {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: 'Impossible de déployer le fichie / dossier {0:trim,surround}: {1}',
        },
        finished: 'Terminé.',
        finished2: 'Terminé',
        finishedWithErrors: 'Terminé avec erreurs!',
        folder: {
            failed: 'Impossible de déployer le dossier {0:trim,surround}: {1}',
            selectTarget: 'Sélectionnez la cible de déploiement du dossier...',
        },
        newerFiles: {
            deploy: 'Déployer',
            localFile: 'Fichiers locaux',
            message: "{0} nouveaux fichiers(s) trouvés!",
            modifyTime: 'Dernière modification',
            pull: 'Récupérer',
            remoteFile: 'Fichier distant',
            show: 'Afficher fichiers',
            size: 'Taille',
            title: 'Nouveaux fichiers dans {0:trim,surround}',
            titleNoTarget: 'Nouveaux fichiers',
        },
        noFiles: 'Aucun fichier à déployer!',
        noPlugins: 'Aucun plugin trouvé!',
        noPluginsForType: 'Aucun plugin correspondant pour {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: 'La cible de déploiement {0:trim,surround} définie pour le paquetage {1:trim,surround,leading_space} n\'existe pas!',
            failed: 'Impossible de déployer {0:trim,surround} à la sauvegarde ({1:trim}): {2}',
            failedTarget: 'Impossible de déployer {0:trim,surround} vers {1:trim} à la sauvegarde: {2}',
        },
        operations: {
            failed: "[ERREUR: {0:trim,surround}]",
            finished: "[Terminé]",
            noFileCompiled: "Aucun fichier parmi {0:trim} n'a pu être compilé!",
            noFunctionInScript: "La fonction {0:trim,surround} n'a pas été trouvée dans {1:trim,surround}!",
            open: 'Ouverture {0:trim,surround}... ',
            someFilesNotCompiled: "{0:trim} parmi {1:trim} le(s) fichier(s) n'a pu être compilé!",
            unknownCompiler: 'Compilateur {0:trim,surround} inconnu!',
            unknownSqlEngine: 'SGBD (Moteur SQL) inconnu {0:trim,surround}!',
            unknownType: 'TYPE INCONNU: {0:trim,surround}',
        },
        startQuestion: 'Lancer le déploiement?',
        workspace: {
            allFailed: 'Aucun fichier ne peut être déployé: {0}',
            allFailedWithTarget: 'Aucun fichier ne peut être déployé vers {0:trim,surround}: {1}',
            allSucceeded: 'Tous les {0:trim} fichiers déployés avec succès.',
            allSucceededWithTarget: 'Tous les {0:trim} fichiers déployés avec succès vers {1:trim,surround}.',
            alreadyStarted: 'Un déploiement est déjà en cours vers {0:trim,surround}! Voulez-vous vraiment lancer cette opération?',
            clickToCancel: 'cliquez ici pour annuler',
            deploying: 'Déploiement du paquetage {0:trim,surround,leading_space}...',
            deployingWithTarget: 'Déploiement du paquetage {0:trim,surround,leading_space} vers {1:trim,surround}...',
            failed: 'Impossible de déployer les fichiers: {0}',
            failedWithCategory: 'Impossible de déployer les fichiers ({0:trim}): {1}',
            failedWithTarget: 'Impossible de déployer les fichiers vers {0:trim,surround}: {1}',
            nothingDeployed: 'Aucun fichier déployé!',
            nothingDeployedWithTarget: 'Aucun fichier déployé vers {0:trim,surround}!',
            selectPackage: 'Sélectionnez un paquetage...',
            selectTarget : 'Sélectionnez une destination...',
            someFailed: '{0:trim} de {1:trim} fichiers n\'a pas pu être déployé!',
            someFailedWithTarget: '{0:trim} de {1:trim} fichiers n\'a pas pu être déployé vers {2:trim,surround}!',
            status: 'Déploiement {0:trim,surround}... ',
            statusWithDestination: 'Déploiement {0:trim,surround} vers {1:trim,surround}... ',
            virtualTargetName: 'Cible du lot virtuel pour le paquetage courant',
            virtualTargetNameWithPackage: 'Cible du lot virtuel pour le paquetage {0:trim,surround}',
        }
    },
    errors: {
        countable: 'ERREUR #{0:trim}: {1}',
        withCategory: '[ERREUR] {0:trim}: {1}',
    },
    extension: {
        update: "Mettre à jour...",
        updateRequired: "L'extension nécessite d'être mise à jour!",
    },
    extensions: {
        notInstalled: 'L\'extension {0:trim,surround} n\'est PAS installée.',
    },
    failed: '[ÉCHEC: {0}]',
    format: {
        dateTime: 'YYYY-MM-DD HH:mm:ss',
    },
    host: {
        button: {
            text: 'En attente de fichiers...',
            tooltip: 'Cliquez ici pour fermer l\'hôte de déploiement' ,
        },
        errors: {
            cannotListen: 'Impossible de démarrer l\'attente de fichier...: {0}',
            couldNotStop: 'Impossible d\'arrêter l\'hôte de déploiement: {0}',
            fileRejected: 'Le fichier a été rejeté!',
            noData: 'Pas de données!',
            noFilename: 'Pas de nom de fichier {0:trim}!',
        },
        receiveFile: {
            failed: '[ÉCHEC:{0:trim,leading_space}]',
            ok: '[OK{0:trim}]',
            receiving: "Réception du fichier {2:trim,leading_space} depuis '{0:trim}:{1:trim}'... ",
        },
        started: 'Hôte de déploiement démarré sur le port {0:trim} dans le dossier {1:trim,surround}.',
        stopped: 'L\'hôte de déploiement arrêté.',
    },
    install: 'Installer',
    isNo: {
        directory: "{0:trim,surround} n'est pas un répertoire!",
        file: "{0:trim,surround} n'est pas un fichier!",
        validItem: '{0:trim,surround} n\'est pas un élément valide pouvant être déployé!',
    },
    load: {
        from: {
            failed: "Échec du chargement des données depuis {0:trim,surround} : {1}",
        }
    },
    network: {
        hostname: 'Votre nom d\'hôte: {0:trim,surround}',
        interfaces: {
            failed: 'Impossible d\'accéder aux interfaces réseau: {0}',
            list: 'Vos interfaces réseau:',
        }
    },
    ok: '[OK]',
    packages: {
        couldNotFindTarget: 'Impossible de trouver la cible {0:trim,surround} dans le paquetage {1:trim,surround}!',
        defaultName: '(Paquetage #{0:trim})',
        noneDefined: "Merci de définir au moins un paquetage dans votre 'settings.json'!",
        notFound: 'Paquetage {0:trim,surround} introuvable!',
        nothingToDeploy: 'Aucun paquetage à déployer!',
    },
    plugins: {
        api: {
            clientErrors: {
                noPermissions: "Permissions en écriture non définies!",
                notFound: 'Fichier non trouvé!',
                unauthorized: "Utilisateur non autorisé!",
                unknown: "Erreur client inconnue: {0:trim} {2:trim,surround}",
            },
            description: "Déploiement via une API REST, comme 'vs-rest-api'",
            serverErrors: {
                unknown: "Erreur, serveur inconnu: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Déploie vers une application, comme un script ou un exécutable, sur la machine locale',
        },
        azureblob: {
            description: 'Déploie vers un blob de stockage Microsoft Azure',
        },
        batch: {
            description: 'Déploie vers d\'autres cibles',
        },
        dropbox: {
            description: 'Déploie dans dossier Dropbox.',
            notFound: 'Fichier non trouvé!',
            unknownResponse: 'Réponse inattendue {0:trim} ({1:trim}): {2:trim,surround}',
        },
        each: {
            description: 'Déploie les fichiers en utilisant une liste de valeurs',
        },
        ftp: {
            description: 'Déploie vers un serveur FTP',
        },
        http: {
            description: 'Déploie vers un serveur/service HTTP',
            protocolNotSupported: 'Le protocole {0:trim,surround} n\'est pas supporté!',
        },
        local: {
            description: 'Déploie dans un dossier local ou un dossier partagé (comme SMB) sur le réseau',
            emptyTargetDirectory: 'Dossier local vide {0:trim,surround}... ',
        },
        list: {
            description: 'Permet à l\'utilisateur de sélectionner une entrée avec des paramètres pour une ou plusieurs cibles',
            selectEntry: 'Sélectionnez une entrée...',
        },
        mail: {
            addressSelector: {
                placeholder: 'Adresses email de destination',
                prompt: 'Une ou plusieurs adresse(s) email (séparées par une virgule) pour déployer vers...',
            },
            description: 'Déploie les fichiers dans ZIP et l\'ajoute en tant que pièce jointe dans un email envoyé par SMTP',
        },
        map: {
            description: 'Déploie les fichiers en utilisant une liste de valeurs',
        },
        pipeline: {
            description: 'Place une liste de fichiers sources dans un \'pipe\' vers une nouvelle destination, en utilisant un script et envoie la liste des nouveaux fichiers vers la cible',
            noPipeFunction: "{0:trim,surround} n'implémente pas de fonction 'pipe()'!",
        },
        prompt: {
            description: "Demande à l'utilisateur une liste de paramètres à appliquer à une ou plusieurs cibles",
            invalidInput: "Entrée invalide!",
        },
        remote: {
            description: 'Déploie vers une machine distante via une connexion TCP',
        },
        s3bucket: {
            credentialTypeNotSupported: 'Type d\'identification {0:trim,surround} non supporté!',
            description: 'Déploie dans un bucket Amazon S3',
        },
        script: {
            deployFileFailed: 'Impossible de déployer le fichier {0:trim,surround} par script {1:trim,surround}!',
            deployWorkspaceFailed: 'Impossible de déployer l\'espace de travail par script {0:trim,surround}!',
            description: 'Déploie via un script JS',
            noDeployFileFunction: "{0:trim,surround} n'implémente pas de fonction 'deployFile()'!",
        },
        sftp: {
            description: 'Déploie vers un serveur SFTP',
        },
        sql: {
            description: 'Exécute des scripts SQL',
            invalidFile: 'Fichier invalide!',
            unknownEngine: 'Type de SGBD inconnu {0:trim,surround}!',
        },
        test: {
            description: 'Un déployeur de test qui ne fait qu\'afficher les fichiers qui seront deployés',
        },
        zip: {
            description: 'Déploie dans un fichier ZIP',
            fileAlreadyExists: 'Le fichier {0:trim,surround} existe déjà! Veuillez rééssayer...',
            fileNotFound: 'Fichier introuvable!',
            noFileFound: "Aucun fichier ZIP trouvé!",
        }
    },
    popups: {
        newVersion: {
            message: "Vous utilisez la version de 'vs-deploy' ({0:trim})!",
            showChangeLog: 'Afficher le journal de modifications...',
        },
    },
    prompts: {
        inputAccessKey: 'Entrez la clé d\'accès (Access Key)...',
        inputAccessToken: 'Entrez le jeton d\'accès (Access Token)...',
        inputPassword: 'Entrez le mot de passe...',
    },
    pull: {
        button: {
            cancelling: 'Annulation...',
            prepareText: 'Préparation de la récupération...',
            text: 'Récupération...',
            tooltip: 'Cliquez ici pour annuler la récupération...',
        },
        canceled: 'Annulé.',
        canceledWithErrors: 'Annulé avec erreurs!',
        file: {
            failed: 'Impossible de récupérer le fichier {0:trim,surround}: {1}',
            pulling: 'Récupération du fichier {0:trim,surround}{1:trim,leading_space}... ',
            pullingWithDestination: 'Récupération du fichier {0:trim,surround} depuis {1:trim,surround}{2:trim,leading_space}... ',
            succeeded: 'Fichier {0:trim,surround} récupéré avec succès.',
            succeededWithTarget: 'Fichier {0:trim,surround} récupéré avec succès depuis {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: "Impossible de récupérer le fichier / dossier {0:trim,surround}: {1}",
        },
        finished2: 'Terminé',
        finishedWithErrors: 'Terminé avec erreurs!',
        noPlugins: 'Aucun plugin trouvé!',
        noPluginsForType: 'Aucun plugin correspondant pour {0:trim,surround}!',
        workspace: {
            allFailed: 'Aucun fichier récupéré: {0}',
            allFailedWithTarget: 'Aucun fichier récupéré depuis {0:trim,surround}: {1}',
            allSucceeded: 'Tous les {0:trim} fichier(s) récupéré(s) avec succès.',
            allSucceededWithTarget: 'Tous les {0:trim} fichier(s) récupéré(s) avec succès depuis {1:trim,surround}.',
            alreadyStarted: 'Vous avez déjà une opération en cours pour {0:trim,surround}! Voulez-vous vraiment lancer cette opération?',
            clickToCancel: 'cliquez ici pour annuler',
            failed: 'Impossible de récupérer les fichiers: {0}',
            failedWithCategory: 'Impossible de récupérer les fichiers ({0:trim}): {1}',
            failedWithTarget: 'Impossible de récupérer les fichiers depuis {0:trim,surround}: {1}',
            nothingPulled: 'Aucun fichier récupéré!',
            nothingPulledWithTarget: 'Acuun fichier récupéré depuis {0:trim,surround}!',
            pulling: 'Récupération du paquetage {0:trim,surround,leading_space}...',
            pullingWithTarget: 'Récupération du paquetage {0:trim,surround,leading_space} depuis {1:trim,surround}...',
            selectPackage: 'Sélectionnez un paquetage...',
            selectSource: 'Sélectionnez une source...',
            someFailed: '{0:trim} des {1:trim} fichiers(s) ne peuvent pas être récupérés!',
            someFailedWithTarget: '{0:trim} de {1:trim} fichiers(s) ne peuvent pas être récupérés depuis {2:trim,surround}!',
            status: 'Récupération de {0:trim,surround}... ',
            statusWithDestination: 'Récupération de {0:trim,surround} depuis {1:trim,surround}... ',
            virtualTargetName: 'Cible du lot virtuel pour le paquetage courant',          
            virtualTargetNameWithPackage: 'Cible du lot virtuel pour le paquetage {0:trim,surround}',
        }
    },
    quickDeploy: {
        caption: 'Déploiement rapide!',
        failed: 'Échec du déploiement rapide: {0}',
        start: 'Démarre un déploiement rapide...',
    },
    relativePaths: {
        couldNotResolve: "Impossible d'obtenir le chemin relatif pour le fichier {0:trim,surround}!",
        isEmpty: 'Le chemin relatif du fichier {0:trim,surround} est vide!',
    },
    sync: {
        file: {
            doesNotExistOnRemote: '[Objet distant inexistant]',
            localChangedWithinSession: '[Modification locale durant la session]',
            localIsNewer: '[Fichier local plus récent]',
            synchronize: 'Synchronisation du fichier {0:trim,surround}{1:trim,leading_space}... ',
        }
    },
    targets: {
        cannotUseRecurrence: 'Impossible d\'utiliser la cible {0:trim,surround} (recurrence)!',
        defaultName: '(Cible #{0:trim})',
        noneDefined: "Merci de définir au moins une CIBLE dans votre 'settings.json'!",
        notFound: 'Impossible de trouver la cible {0:trim,surround}!',
        select: 'Sélectionnez la cible de déploiement...', selectSource: 'Select the source from where to pull from...',
    },
    templates: {
        browserTitle: "Template{0:trim,surround,leading_space}",
        currentPath: 'Chemin actuel:{0:trim,leading_space}',
        noneDefined: "Merci de définir au moins une SOURCE de TEMPLATE dans votre 'settings.json'!",
        officialRepositories: {
            newAvailable: "Les SOURCES de TEMPLATE ont été mises à jour.",
            openTemplates: "Ouvrir les templates...",
        },
        placeholder: 'Merci de sélectionner un élément...',
        publishOrRequest: {
            label: 'Publier ou demander un exemple...',
        }
    },
    warnings: {
        withCategory: '[ATTENTION] {0:trim}: {1}',
    },
    yes: 'Oui',
};
