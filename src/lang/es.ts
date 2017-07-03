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

// spanish
// 
// Translated by: Alejandro Iván Melo Domínguez (https://github.com/alejandroivan)

export const translation: Translation = {
    __plugins: {
        reload: {
            failed: 'No se pudo recargar plugins: {0}',
            loaded: {
                more: '{0:trim} plugins cargados.',
                none: 'No se cargó plugins.',
                one: '1 plugin cargado.',
            }
        }
    },
    canceled: '[Cancelado]',
    commands: {
        executionFailed: "La ejecución del comando {0:trim,surround} falló: {1}",
    },
    compare: {
        failed: 'No se pudo obtener el archivo {0:trim,surround}: {1}',
        noPlugins: '¡No se encontró plugin(s)!',
        noPluginsForType: '¡No se encontró plugin(s) que coincidan con {0:trim,surround}!',
        selectSource: 'Elige el origen desde donde obtener...',
    },
    deploy: {
        after: {
            button: {
                text: "{2}Desplegar: [{1}] {0}{3}",
                tooltip: "Haz click aquí para mostrar salida...", // Click here to show output...
            },
            failed: "No se pudo invocar operaciones 'después de desplegar': {0}",
        },
        before: {
            failed: "No se pudo invocar operaciones 'antes de desplegar': {0}",
        },
        button: {
            cancelling: 'Cancelando...',
            prepareText: 'Preparando despliegue...',
            text: 'Desplegando...',
            tooltip: 'Haz click aquí para cancelar despliegue...',
        },
        canceled: 'Cancelado.',
        canceledWithErrors: '¡Cancelado con errores!',
        cancelling: 'Cancelando despliegue...',
        file: {
            deploying: 'Desplegando archivo {0:trim,surround}{1:trim,leading_space}... ',
            deployingWithDestination: 'Desplegando archivo {0:trim,surround} hacia {1:trim,surround}{2:trim,leading_space}... ',
            failed: 'No se pudo desplegar archivo {0:trim,surround}: {1}',
            isIgnored: "¡El archivo {0:trim,surround} ha sido ignorado!",
            succeeded: 'El archivo {0:trim,surround} se ha desplegado con éxito.',
            succeededWithTarget: 'El archivo {0:trim,surround} se ha desplegado correctamente hacia {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: 'No se ha podido desplegar el archivo/carpeta {0:trim,surround}: {1}',
        },
        finished: 'Finalizado.',
        finished2: 'Finalizado',
        finishedWithErrors: '¡Finalizado con errores!',
        folder: {
            failed: 'No se pudo desplegar la carpeta {0:trim,surround}: {1}',
            selectTarget: 'Elige el destino donde desplegar la carpeta...',
        },
        newerFiles: {
            deploy: 'Desplegar',
            localFile: 'Archivo local',
            message: "¡Se encontró {0} nuevo(s) archivo(s)!",
            modifyTime: 'Última modificación',
            pull: 'Obtener',
            remoteFile: 'Archivo remoto',
            show: 'Mostrar archivos',
            size: 'Tamaño',
            title: 'Nuevos archivos en {0:trim,surround}',
            titleNoTarget: 'Nuevos archivos',
        },
        noFiles: '¡No hay archivos para desplegar!',
        noPlugins: '¡No se encontró plugin(s)!',
        noPluginsForType: '¡No se encontró plugin(s) que coincidan con {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: '¡El destino de despliegue {0:trim,surround} definido en el paquete{1:trim,surround,leading_space} no existe!',
            failed: 'No se pudo desplegar {0:trim,surround} al guardar ({1:trim}): {2}',
            failedTarget: 'No se pudo desplegar {0:trim,surround} hacia {1:trim} al guardar: {2}',
        },
        operations: {
            failed: "[ERROR: {0:trim,surround}]",
            finished: "[Hecho]",
            noFileCompiled: "¡Ninguno de los {0:trim} archivos pudo ser compilado!",
            noFunctionInScript: "¡La función {0:trim,surround} no se encontró en {1:trim,surround}!",
            open: 'Abriendo {0:trim,surround}... ',
            someFilesNotCompiled: "¡{0:trim} de {1:trim} archivos no pudieron ser compilados!",
            unknownCompiler: '¡El compilador {0:trim,surround} es desconocido!',
            unknownSqlEngine: '¡Motor SQL desconocido! {0:trim,surround}',
            unknownType: 'TIPO DESCONOCIDO: {0:trim,surround}',
        },
        startQuestion: '¿Iniciar despliegue?',
        workspace: {
            allFailed: 'No se pudo desplegar ningún archivo: {0}',
            allFailedWithTarget: 'No se pudo desplegar ningún archivo hacia {0:trim,surround}: {1}',
            allSucceeded: 'Los {0:trim} archivos fueron desplegados con éxito.',
            allSucceededWithTarget: 'Los {0:trim} fueron desplegados con éxito hacia {1:trim,surround}.',
            alreadyStarted: '¡Ya se inició un despliegue hacia {0:trim,surround}! ¿De verdad quieres iniciar esta operación?',
            clickToCancel: 'haz click aquí para cancelar',
            deploying: 'Desplegando paquete{0:trim,surround,leading_space}...',
            deployingWithTarget: 'Desplegando paquete{0:trim,surround,leading_space} hacia {1:trim,surround}...',
            failed: 'No se pudo desplegar archivos: {0}',
            failedWithCategory: 'No se pudo desplegar archivos ({0:trim}): {1}',
            failedWithTarget: 'No se pudo desplegar archivos hacia {0:trim,surround}: {1}',
            nothingDeployed: '¡No se desplegó ningún archivo!',
            nothingDeployedWithTarget: '¡No se pudo desplegar ningún archivo hacia {0:trim,surround}!',
            selectPackage: 'Elige un paquete...',
            selectTarget: 'Elige un destino...',
            someFailed: '¡{0:trim} de {1:trim} archivos no pudieron desplegarse!',
            someFailedWithTarget: '¡{0:trim} de {1:trim} archivos no pudieron desplegarse hacia {2:trim,surround}!',
            status: 'Desplegando {0:trim,surround}... ',
            statusWithDestination: 'Desplegando {0:trim,surround} hacia {1:trim,surround}... ',
            virtualTargetName: 'Destino virtual por lotes para el paquete actual', // Virtual batch target for current package
            virtualTargetNameWithPackage: 'Destino virtual por lots para el paquete {0:trim, surround}', // Virtual batch target for package {0:trim,surround}
        }
    },
    errors: {
        countable: 'ERROR #{0:trim}: {1}',
        withCategory: '[ERROR] {0:trim}: {1}',
    },
    extension: {
        update: "Actualizar...",
        updateRequired: "¡La extensión requiere una actualización!",
    },
    extensions: {
        notInstalled: 'La extensión {0:trim,surround} NO se encuentra instalada.',
    },
    failed: '[FALLÓ: {0}]',
    format: {
        dateTime: 'HH:mm:ss DD/MM/YYYY', // YYYY-MM-DD HH:mm:ss
    },
    host: {
        button: {
            text: 'Esperando archivos...',
            tooltip: 'Haz click aquí para cerrar el host de despliegue', // Click here to close deploy host
        },
        errors: {
            cannotListen: 'No se pudo comenzar a escuchar por archivos: {0}',
            couldNotStop: 'No se pudo detener el host de despliegue: {0}',
            fileRejected: '¡El archivo ha sido rechazado!',
            noData: '¡Sin información!',
            noFilename: '¡Sin archivo {0:trim}!', // No filename {0:trim}! // TODO: NOT SURE ABOUT THIS
        },
        receiveFile: {
            failed: '[FALLÓ:{0:trim,leading_space}]',
            ok: '[HECHO{0:trim}]',
            receiving: "Recibiendo archivo{2:trim,leading_space} desde '{0:trim}:{1:trim}'... ",
        },
        started: 'Iniciado host de despliegue con puerto {0:trim} en el directorio {1:trim,surround}.',
        stopped: 'El host de despliegue se ha detenido.',
    },
    install: 'Install',
    isNo: {
        directory: "¡{0:trim,surround} no es una carpeta!",
        file: "¡{0:trim,surround} no es un archivo!",
        validItem: '¡{0:trim,surround} no es un ítem válido para ser desplegado!',
    },
    load: {
        from: {
            failed: "La carga de información desde {0:trim,surround} falló: {1}",
        }
    },
    network: {
        hostname: 'Tu nombre de host: {0:trim,surround}',
        interfaces: {
            failed: 'No se pudo obtener las interfaces de red: {0}', // Could not get network interfaces: {0}
            list: 'Tus interfaces de red:', // Your network interfaces:
        }
    },
    ok: '[HECHO]',
    packages: {
        couldNotFindTarget: '¡No se pudo encontrar el destino {0:trim,surround} en el paquete {1:trim,surround}!',
        defaultName: '(Paquete #{0:trim})',
        noneDefined: "¡Por favor, define al menos un PAQUETE en tu 'settings.json'!",
        notFound: '¡El paquete {0:trim,surround} no se ha encontrado!',
        nothingToDeploy: '¡Sin paquetes para desplegar!',
    },
    plugins: {
        api: {
            clientErrors: {
                noPermissions: "¡Sin permisos de escritura!",
                notFound: '¡Archivo no encontrado!',
                unauthorized: "¡El usuario no está autorizado!",
                unknown: "Error de cliente desconocido: {0:trim} {2:trim,surround}",
            },
            description: "Despliega hacia una API REST, como 'vs-rest-api'",
            serverErrors: {
                unknown: "Error de servidor desconocido: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Despliega hacia una app, como un script o ejecutable, en la máquina local',
        },
        azureblob: {
            description: 'Despliega hacia blob storage de Microsoft Azure',
        },
        batch: {
            description: 'Despliega hacia otros destinos',
        },
        dropbox: {
            description: 'Despliega hacia una carpeta de Dropbox.',
            notFound: '¡Archivo no encontrado!',
            unknownResponse: 'Respuesta inesperada {0:trim} ({1:trim}): {2:trim,surround}',
        },
        each: {
            description: 'Despliega archivos usando una lista de valores', // Deploys files by using a list of values
        },
        ftp: {
            description: 'Despliega hacia un servidor FTP',
        },
        http: {
            description: 'Despliega hacia un servidor/servicio HTTP',
            protocolNotSupported: '¡El protocolo {0:trim,surround} no está soportado!',
        },
        list: {
            description: 'Deja al usuario elegir una entrada con ajustes para uno o más destinos', // Lets the user select an entry with settings for one or more targets
            selectEntry: 'Por favor, elige una entrada...',
        },
        local: {
            description: 'Despliega hacia una carpeta local o compartida (como SMB) dentro de tu red de área local (LAN)',
            emptyTargetDirectory: 'Directorio de destino LOCAL vacío {0:trim, surround}... ', // Empty LOCAL target directory {0:trim,surround}... 
        },
        mail: {
            addressSelector: {
                placeholder: 'Dirección(es) de correo electrónico de destino', // Target eMail address(es)
                prompt: 'Una o más direcciones de correo electrónico (separadas por comas) hacia donde desplegar...', // One or more email address (separated by comma) to deploy to...
            },
            description: 'Despliega hacia un archivo ZIP y lo envía como archivo adjunto de correo electrónico mediante SMTP', // Deploys to a ZIP file and sends it as attachment by mail via SMTP
        },
        map: {
            description: 'Despliega archivos utilizando una lista de valores', // Deploys files by using a list of values
        },
        pipeline: {
            description: 'Utilizando un script, efectúa un pipe de una lista de archivos fuente hacia un nuevo objetivo y envía la nueva lista de archivos a un destino', // Pipes a list of sources files to a new destination, by using a script and sends the new file list to a target
            noPipeFunction: "¡{0:trim,surround} no implementa una función 'pipe()'!",
        },
        prompt: {
            description: "Pregunta al usuario por una lista de ajustes que será aplicada a uno o más destinos", // Asks the user for a list of settings that will be applied to one or more targets
            invalidInput: "¡Entrada inválida!",
        },
        remote: {
            description: 'Despliega hacia una máquina remota usando una conexión TCP', // Deploys to a remote machine over a TCP connection
        },
        s3bucket: {
            credentialTypeNotSupported: '¡El tipo de credencial {0:trim,surround} no está soportada!',
            description: 'Despliega hacia un bucket de Amazon S3',
        },
        script: {
            deployFileFailed: '¡No se pudo desplegar el archivo {0:trim,surround} utilizando el script {1:trim,surround}!',
            deployWorkspaceFailed: '¡No se pudo desplegar el espacio de trabajo utilizando el script {0:trim,surround}!',
            description: 'Despliega mediante un script JS',
            noDeployFileFunction: "¡{0:trim,surround} no implementa una función 'deployFile()'!",
        },
        sftp: {
            description: 'Despliega hacia un servidor SFTP',
        },
        sql: {
            description: 'Ejecuta scripts SQL',
            invalidFile: '¡El archivo es inválido!',
            unknownEngine: '¡El motor {0:trim,surround} es desconocido!',
        },
        test: {
            description: 'Un despliegue fingido que solo muestra qué archivos serían desplegados', // A mock deployer that only displays what files would be deployed
        },
        zip: {
            description: 'Despliega hacia un archivo ZIP',
            fileAlreadyExists: '¡El archivo {0:trim,surround} ya existe! Intenta nuevamente...',
            fileNotFound: '¡El archivo no se ha encontrado!',
            noFileFound: "¡No se encontró archivos ZIP!",
        }
    },
    popups: {
        newVersion: {
            message: "¡Estás ejecutando la nueva versión de 'vs-deploy' ({0:trim})!",
            showChangeLog: 'Mostrar registro de cambios...',
        },
    },
    prompts: {
        inputAccessKey: 'Ingresa la clave de acceso...',
        inputAccessToken: 'Ingresa el token de acceso...',
        inputPassword: 'Ingresa la contraseña...',
    },
    pull: {
        button: {
            cancelling: 'Cancelando...',
            prepareText: 'Preparando obtención...',
            text: 'Obteniendo...',
            tooltip: 'Haz click aquí para cancelar la obtención...',
        },
        canceled: 'Cancelado.',
        canceledWithErrors: '¡Cancelado con errores!',
        file: {
            failed: 'No se pudo obtener el archivo {0:trim,surround}: {1}',
            pulling: 'Obteniendo el archivo {0:trim,surround}{1:trim,leading_space}... ',
            pullingWithDestination: 'Obteniendo el archivo {0:trim,surround} desde {1:trim,surround}{2:trim,leading_space}... ',
            succeeded: 'El archivo {0:trim,surround} se ha obtenido con éxito.',
            succeededWithTarget: 'El archivo {0:trim,surround} se ha obtenido con éxito desde {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: "No se pudo obtener el archivo/directorio {0:trim,surround}: {1}",
        },
        finished2: 'Finalizado',
        finishedWithErrors: '¡Finalizado con errores!',
        noPlugins: '¡No se encontró plugin(s)!',
        noPluginsForType: '¡No se encontró plugin(s) que coincidan con {0:trim,surround}!',
        workspace: {
            allFailed: 'No se pudo obtener ningún archivo: {0}',
            allFailedWithTarget: 'No se pudo obtener ningún archivo desde {0:trim,surround}: {1}',
            allSucceeded: 'Los {0:trim} archivos fueron obtenidos con éxito.',
            allSucceededWithTarget: 'Los {0:trim} archivos fueron obtenidos con éxito desde {1:trim,surround}.',
            alreadyStarted: '¡Ya has iniciado una operación para {0:trim,surround}! ¿De verdad quieres iniciar esta operación?',
            clickToCancel: 'haz click aquí para cancelar',
            failed: 'No se pudo obtener archivos: {0}',
            failedWithCategory: 'No se pudo obtener archivos ({0:trim}): {1}',
            failedWithTarget: 'No se pudo obtener archivos desde {0:trim,surround}: {1}',
            nothingPulled: '¡No se ha obtenido ningún archivo!',
            nothingPulledWithTarget: '¡No se ha obtenido ningún archivo desde {0:trim,surround}!',
            pulling: 'Obteniendo paquete{0:trim,surround,leading_space}...',
            pullingWithTarget: 'Obteniendo paquete{0:trim,surround,leading_space} desde {1:trim,surround}...',
            selectPackage: 'Elige un paquete...',
            selectSource: 'Elige un origen...',
            someFailed: '¡No se pudo obtener {0:trim} de {1:trim} archivo(s)!',
            someFailedWithTarget: '¡No se pudo obtener {0:trim} de {1:trim} archivo(s) desde {2:trim,surround}!',
            status: 'Obteniendo {0:trim,surround}... ',
            statusWithDestination: 'Obteniendo {0:trim,surround} desde {1:trim,surround}... ',
            virtualTargetName: 'Destino virtual por lotes para el paquete actual',
            virtualTargetNameWithPackage: 'Destino virtual por lotes para el paquete {0:trim,surround}',
        }
    },
    quickDeploy: {
        caption: '¡Despliegue rápido!',
        failed: 'El despliegue rápido falló: {0}',
        start: 'Iniciar un despliegue rápido...',
    },
    relativePaths: {
        couldNotResolve: "¡No se pudo obtener la ruta relativa para {0:trim,surround}!",
        isEmpty: '¡La ruta relativa para {0:trim,surround} está vacía!',
    },
    sync: {
        file: {
            doesNotExistOnRemote: '[no existe en el remoto]', // [remote does not exist] // TRANSLATION: 'does not exist on remote' // TODO: Check
            localChangedWithinSession: '[el local cambió durante la sesión]',
            localIsNewer: '[el local es más nuevo]',
            synchronize: 'Sincronizar archivo {0:trim,surround}{1:trim,leading_space}... ',
        }
    },
    targets: {
        cannotUseRecurrence: '¡No se puede usar el destino {0:trim,surround} (recurrencia)!',
        defaultName: '(Destino #{0:trim})',
        noneDefined: "¡Por favor, define al menos un DESTINO en tu 'settings.json'!",
        notFound: '¡No se pudo encontrar el destino {0:trim,surround}!',
        select: 'Elige el destino hacia donde desplegar...',
        selectSource: 'Elige el origen desde donde obtener...',
    },
    templates: {
        browserTitle: "Tema{0:trim,surround,leading_space}",
        currentPath: 'Ruta actual:{0:trim,leading_space}',
        noneDefined: "¡Por favor, define al menos un ORIGEN DE TEMA en tu 'settings.json'!", // Please define a least one TEMPLATE SOURCE in your 'settings.json'!
        officialRepositories: {
            newAvailable: "Los ORÍGENES DE TEMA oficiales se han actualizado.",
            openTemplates: "Abrir temas...",
        },
        placeholder: 'Por favor, elige un ítem...',
        publishOrRequest: {
            label: 'Publicar o solicitar un ejemplo...',
        }
    },
    warnings: {
        withCategory: '[ADVERTENCIA] {0:trim}: {1}',
    },
    yes: 'Sí',
};