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

// Brazilian Portuguese
// 
// Translated by: Celio Rodrigues (https://github.com/rodriguescelio)
export const translation: Translation = {
    __plugins: {
        reload: {
            failed: 'Não foi possivel recarregar os plugins: {0}',
            loaded: {
                more: '{0:trim} plugins carregados.',
                none: 'Nenhum plugin carregado.',
                one: '1 plugin carregado.',
            }
        }
    },
    canceled: '[Cancelado]',
    commands: {
        executionFailed: "A execução do comando {0:trim,surround} falhou: {1}",
    },
    compare: {
        failed: 'Não foi possível baixar o arquivo {0:trim,surround}: {1}',
        noPlugins: 'Nenhum plugin encontrado!',
        noPluginsForType: 'Nenhum plugin correspondente encontrado para {0:trim,surround}!',
        selectSource: 'Selecione a fonte de onde baixar...',
    },
    deploy: {
        after: {
            button: {
                text: "{2}Implementação: [{1}] {0}{3}",
                tooltip: "Clique aqui para exibir o resultado...",
            },
            failed: "Não foi possível executar as operações 'after deployed': {0}",
        },
        before: {
            failed: "Não foi possível executar as operações 'before deploy': {0}",
        },
        button: {
            cancelling: 'Cancelando...',
            prepareText: 'Preparando implementação...',
            text: 'Implementando...',
            tooltip: 'Clique aqui para cancelar a implementação...',
        },
        canceled: 'Cancelado.',
        canceledWithErrors: 'Cancelado com erros!',
        cancelling: 'Cancelando implementação...',
        file: {
            deploying: 'Implementando arquivo {0:trim,surround}{1:trim,leading_space}... ',
            deployingWithDestination: 'Implementando arquivo {0:trim,surround} para {1:trim,surround}{2:trim,leading_space}... ',
            failed: 'Não foi possível implementar o arquivo {0:trim,surround}: {1}',
            isIgnored: "O arquivo {0:trim,surround} foi ignorado!",
            succeeded: 'Arquivo {0:trim,surround} foi implementado com sucesso!',
            succeededWithTarget: 'Arquivo {0:trim,surround} foi implementado com sucesso para {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: 'Não foi possível implementar o arquivo / pasta {0:trim,surround}: {1}',
        },
        finished: 'Finalizado.',
        finished2: 'Finalizado',
        finishedWithErrors: 'Finalizado com erros!',
        folder: {
            failed: 'Não foi possível implementar a pasta {0:trim,surround}: {1}',
            selectTarget: 'Selecione o destino para implementar a pasta...',
        },
        newerFiles: {
            deploy: 'Implementar',
            localFile: 'Arquivo local',
            message: "{0} arquivo(s) mais recente(s) foi/foram encontrado(s)!",
            modifyTime: 'Ultima modificação',
            pull: 'Baixar',
            remoteFile: 'Arquivo remoto',
            show: 'Exibir arquivos',
            size: 'Tamanho',
            title: 'Novos arquivos em {0:trim,surround}',
            titleNoTarget: 'Novos arquivos',
        },
        noFiles: 'Não existem arquivos a serem implementados!',
        noPlugins: 'Nenhum plugin encontrado!',
        noPluginsForType: 'Nenhum plugin correspondente encontrado para {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: 'O destino da implementação {0:trim,surround} definido no pacote {1:trim,surround,leading_space} não existe!',
            failed: 'Não foi possível implementar {0:trim,surround} ao salvar ({1:trim}): {2}',
            failedTarget: 'Não foi possível implementar {0:trim,surround} para {1:trim} ao salvar: {2}',
        },
        operations: { 
            failed: "[ERRO: {0:trim,surround}]",
            finished: "[Feito]",
            noFileCompiled: "Nenhum dos arquivos {0:trim} puderam ser compilados!",
            noFunctionInScript: "A função {0:trim,surround} não foi encontrada em {1:trim,surround}!",
            open: 'Abrindo {0:trim,surround}... ',
            someFilesNotCompiled: "{0:trim} de {1:trim} arquivo(s) não puderam ser compilados!",
            unknownCompiler: 'Compilador {0:trim,surround} é desconhecido!',
            unknownSqlEngine: 'SQL engine desconhecida {0:trim,surround}!',
            unknownType: 'TIPO DESCONHECIDO: {0:trim,surround}',
        },                                                                                                                  
        startQuestion: 'Iniciar implementação?',
        workspace: {
            allFailed: 'Nenhum arquivo foi implementado: {0}',
            allFailedWithTarget: 'Nenhum arquivo foi implementado para {0:trim,surround}: {1}',
            allSucceeded: 'Todos os {0:trim} arquivo(s) foram implementados com sucesso.',
            allSucceededWithTarget: 'Todos os {0:trim} arquivos(s) foram implementados com sucesso para {1:trim,surround}.',
            alreadyStarted: 'Você já iniciou uma implementação para {0:trim,surround}! Você realmente deseja executar esta operação?',
            clickToCancel: 'clique aqui para cancelar',
            deploying: 'Implementando pacote {0:trim,surround,leading_space}...',
            deployingWithTarget: 'Implementando pacote {0:trim,surround,leading_space} para {1:trim,surround}...',
            failed: 'Não foi possível implementar os arquivos: {0}',
            failedWithCategory: 'Não foi possível implementar os arquivos ({0:trim}): {1}',
            failedWithTarget: 'Não foi possível implementar os arquivos para {0:trim,surround}: {1}',
            nothingDeployed: 'Nenhum arquivo implementado!',
            nothingDeployedWithTarget: 'Nenhum arquivo implementado para {0:trim,surround}!',
            selectPackage: 'Selecione um pacote...',
            selectTarget: 'Selecione um destino...',
            someFailed: '{0:trim} de {1:trim} arquivo(s) não foram implementados!',
            someFailedWithTarget: '{0:trim} de {1:trim} arquivo(s) não foram implementados para {2:trim,surround}!',
            status: 'Implementando {0:trim,surround}... ',
            statusWithDestination: 'Implementando {0:trim,surround} para {1:trim,surround}... ',
            virtualTargetName: 'Lote virtual de destino para o pacote atual',
            virtualTargetNameWithPackage: 'Lote virtual de destino para o pacote {0:trim,surround}',
        }
    },
    errors: {
        countable: 'ERRO #{0:trim}: {1}',
        withCategory: '[ERRO] {0:trim}: {1}',
    },
    extension: {
        update: "Atualizando...",
        updateRequired: "A extensão precisa ser atualizada!",
    },
    extensions: {
        notInstalled: 'A extensão {0:trim,surround} NÃO está instalada.',
    },
    failed: '[FALHOU: {0}]',
    format: {
        dateTime: 'HH:mm:ss DD/MM/YYYY',
    },
    host: {
        button: {
            text: 'Aguardando arquivos...',
            tooltip: 'Clique aqui para fechar o host de implementação',
        },
        errors: {
            cannotListen: 'Não foi possível iniciar a escuta para os arquivos: {0}',
            couldNotStop: 'Não foi possível fechar o host de implementação: {0}',
            fileRejected: 'O arquivo foi rejeitado!',
            noData: 'Sem dados!',
            noFilename: 'Sem filename {0:trim}!',
        },
        receiveFile: {
            failed: '[FALHOU:{0:trim,leading_space}]',
            ok: '[OK{0:trim}]',
            receiving: "Recebendo arquivos {2:trim,leading_space} de '{0:trim}:{1:trim}'... ",
        },
        started: 'Host de implementação iniciado na porta {0:trim}, no diretório {1:trim,surround}.',
        stopped: 'Host de implementação foi fechado.',
    },
    install: 'Instalar',
    isNo: {
        directory: "{0:trim,surround} não é um diretório!",
        file: "{0:trim,surround} não é um arquivo!",
        validItem: '{0:trim,surround} não é um item válido que possa ser implementado!',
    },
    load: {
        from: {
            failed: "Carregamento dos dados de {0:trim,surround} falhou: {1}",
        }
    },
    network: {
        hostname: 'Seu hostname: {0:trim,surround}',
        interfaces: {
            failed: 'Não foi possível identificar as interfaces de rede: {0}',
            list: 'Sua interface de rede:',
        }
    },
    ok: '[OK]',
    packages: {
        couldNotFindTarget: 'Não foi possível encontrar o destino {0:trim,surround} no pacote {1:trim,surround}!',
        defaultName: '(Pacote #{0:trim})',
        noneDefined: "Por favor, defina pelo menos um pacote em seu 'settings.json'!",
        notFound: 'Pacote {0:trim,surround} não encontrado!',
        nothingToDeploy: 'Nenhum pacote para implementar!',
    },
    plugins: {
        api: {
            clientErrors: {
                noPermissions: "Sem permissão de escrita!",
                notFound: 'Arquivo não encontrado!',
                unauthorized: "Usuário não autorizado!",
                unknown: "Erro desconhecido no cliente: {0:trim} {2:trim,surround}",
            },
            description: "Implemente para uma API REST, com 'vs-rest-api'",
            serverErrors: {
                unknown: "Erro desconhecido no servidor: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Implemente para um app, como um script ou executável, na máquina local',
        },
        azureblob: {
            description: 'Implemente para um Armazenamento de blobs Microsoft Azure',
        },
        batch: {
            description: 'Implemente para outros destinos',
        },
        dropbox: {
            description: 'Implemente para uma pasta do DropBox.',
            notFound: 'Arquivo não encontrado!',
            unknownResponse: 'Resposta inesperada {0:trim} ({1:trim}): {2:trim,surround}',
        },
        each: {
            description: 'Implemente arquivos usando uma lista de valores',
        },
        ftp: {
            description: 'Implemente para um servidor FTP',
        },
        http: {
            description: 'Implemente para um servidor/serviço HTTP',
            protocolNotSupported: 'Protocolo {0:trim,surround} não é suportado!',
        },
        list: {
            description: 'Permite que o usuário selecione um registro com configurações para um ou mais destinos',
            selectEntry: 'Por favor, selecione um registro...',
        },
        local: {
            description: 'Implementa para uma pasta local ou compartilhada (como SMB) dentro da sua rede',
            emptyTargetDirectory: 'Diretório local de destino vazio {0:trim,surround}... ',
        },
        mail: {
            addressSelector: {
                placeholder: 'Endereço(s) de email de destino',
                prompt: 'Um ou mais endereço(s) de email (separados por vírgula) para implementar para...',
            },
            description: 'Implementa em um arquivo ZIP e envia como anexo por email via SMTP',
        },
        map: {
            description: 'Implementa os asquivos utilizando uma lista de valores',
        },
        pipeline: {
            description: 'Pipes a list of sources files to a new destination, by using a script and sends the new file list to a target',
            noPipeFunction: "{0:trim,surround} implements no 'pipe()' function!",
        },
        prompt: {
            description: "Solicita ao usuário uma lista de configurações para serem aplicadas em um ou mais destinos",
            invalidInput: "Entrada invália!",
        },
        remote: {
            description: 'Implementa para uma maquina remota utilizando uma conexão TCP',
        },
        s3bucket: {
            credentialTypeNotSupported: 'Tipo de credencial {0:trim,surround} não é suportada!',
            description: 'Implementa para um Amazon S3 bucket',
        },
        script: {
            deployFileFailed: 'Não foi possível implementar o arquivo {0:trim,surround} utilizando o script {1:trim,surround}!',
            deployWorkspaceFailed: 'Não foi possível implementar o espaço de trabalho utilizando o script {0:trim,surround}!',
            description: 'Implementa utilizando um script JS',
            noDeployFileFunction: "{0:trim,surround} não possui a função 'deployFile()'!",
        },
        sftp: {
            description: 'Implementa para um servidor SFTP',
        },
        sql: {
            description: 'Executa scripts SQL',
            invalidFile: 'Arquivo inválido!',
            unknownEngine: 'Engine desconhecida {0:trim,surround}!',
        },
        test: {
            description: 'A mock deployer that only displays what files would be deployed',
        },
        zip: {
            description: 'Implementa para um arquivo ZIP',
            fileAlreadyExists: 'Arquivo {0:trim,surround} já existe! Tente novamente...',
            fileNotFound: 'Arquivo não encontrado!',
            noFileFound: "Nenhum arquivo ZIP encontrado!",
        }
    },
    popups: {
        newVersion: {
            message: "Você está utilizando uma versão nova do 'vs-deploy' ({0:trim})!",
            showChangeLog: 'Visualizar histórico de mudanças...',
        },
    },
    prompts: {
        inputAccessKey: 'Insira a chave de acesso...',
        inputAccessToken: 'Insira o token de acesso...',
        inputPassword: 'Insira a senha...',
    },
    pull: {
        button: {
            cancelling: 'Cancelando...',
            prepareText: 'Preparando download...',
            text: 'Baixando...',
            tooltip: 'Clique aqui para cancelar o download...',
        },
        canceled: 'Cancelado.',
        canceledWithErrors: 'Cancelado com erros!',
        file: {
            failed: 'Não foi possível baixar o arquivo {0:trim,surround}: {1}',
            pulling: 'Baixando o arquivo {0:trim,surround}{1:trim,leading_space}... ',
            pullingWithDestination: 'Baixando o arquivo {0:trim,surround} para {1:trim,surround}{2:trim,leading_space}... ',
            succeeded: 'Arquivo {0:trim,surround} foi baixado com sucesso.',
            succeededWithTarget: 'Arquivo {0:trim,surround} foi baixado com sucesso para {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: "Não foi possível baixar o arquivo/pasta {0:trim,surround}: {1}",
        },
        finished2: 'Finalizado',
        finishedWithErrors: 'Finalizado com erros!',
        noPlugins: 'Nenhum plugin encontrado!',
        noPluginsForType: 'Nenhum plugin correspondente encontrado para {0:trim,surround}!',
        workspace: {
            allFailed: 'Nenhum arquivo foi baixado: {0}',
            allFailedWithTarget: 'Nenhum arquivo foi baixado para {0:trim,surround}: {1}',
            allSucceeded: 'Todos os {0:trim} arquivo(s) foram baixados com sucesso.',
            allSucceededWithTarget: 'Todos os {0:trim} arquivo(s) foram baixados com sucesso para {1:trim,surround}.',
            alreadyStarted: 'Vocẽ já havia iniciado uma operação para {0:trim,surround}! Você realmente deseja executar esta operação?',
            clickToCancel: 'clique aqui para cancelar',
            failed: 'Não foi possível baixar os arquivos: {0}',
            failedWithCategory: 'Não foi possível baixar os arquivos ({0:trim}): {1}',
            failedWithTarget: 'Não foi possível baixar os arquivos para {0:trim,surround}: {1}',
            nothingPulled: 'Nenhum arquivo baixado!',
            nothingPulledWithTarget: 'Nenhum arquivo baixado para {0:trim,surround}!',
            pulling: 'Baixando pacote {0:trim,surround,leading_space}...',
            pullingWithTarget: 'Baixando pacote {0:trim,surround,leading_space} para {1:trim,surround}...',
            selectPackage: 'Selecione um pacote...',
            selectSource: 'Selecione uma fonte...',
            someFailed: '{0:trim} de {1:trim} arquivos(s) não foram baixados!',
            someFailedWithTarget: '{0:trim} de {1:trim} arquivos(s) não foram baixados para {2:trim,surround}!',
            status: 'Baixando {0:trim,surround}... ',
            statusWithDestination: 'Baixando {0:trim,surround} para {1:trim,surround}... ',
            virtualTargetName: 'Lote virtual de destino para o pacote atual',
            virtualTargetNameWithPackage: 'Lote virtual de destino para o pacote {0:trim,surround}',
        }
    },
    quickDeploy: {
        caption: 'Implementação rápida!',
        failed: 'Implementação rápida falhou: {0}',
        start: 'Iniciar uma implementação rápida...',
    },
    relativePaths: {
        couldNotResolve: "Não foi possível obter o caminho relativo para {0:trim,surround}!",
        isEmpty: 'Caminho relativo para o arquivo {0:trim,surround} está vazio!',
    },
    sync: {
        file: {
            doesNotExistOnRemote: '[Remoto não existe]',
            localChangedWithinSession: '[Local mudou dentro da sessão]',
            localIsNewer: '[Local é novo]',
            synchronize: 'Sincronizar arquivo {0:trim,surround}{1:trim,leading_space}... ',
        }
    },
    targets: {
        cannotUseRecurrence: 'Não é possível utilizar o destino {0:trim,surround} (recurrence)!',
        defaultName: '(Destino #{0:trim})',
        noneDefined: "Por favor, defina pelo menos um destino em seu 'settings.json'!",
        notFound: 'Não foi possível encontrar o destino {0:trim,surround}!',
        select: 'Selecione o destino da implementação...',
        selectSource: 'Selecione a fonte do download...',
    },
    templates: {
        browserTitle: "Modelo {0:trim,surround,leading_space}",
        currentPath: 'Caminho atual:{0:trim,leading_space}',
        noneDefined: "Por favor, defina pelo menos uma fonte de Modelos em seu 'settings.json'!",
        officialRepositories: {
            newAvailable: "A fonte de modelos oficial foi atualizada.",
            openTemplates: "Abrir modelos...",
        },
        placeholder: 'Por favor, selecione um item...',
        publishOrRequest: {
            label: 'Publicar ou solicitar um exemplo...',
        }
    },
    warnings: {
        withCategory: '[AVISO] {0:trim}: {1}',
    },
    yes: 'Sim',
};