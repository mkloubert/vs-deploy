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

// russian
// 
// Translated by: Ovsyannikov Oleg sag3ll0 (https://github.com/sag3ll0)
export const translation: Translation = {
    __plugins: {
        reload: {
            failed: 'Не могу обновить модули: {0}',
            loaded: {
                more: '{0:trim} модулей загружено.',
                none: 'Нет загруженных модулей.',
                one: '1 модуль загружен.',
            }
        }
    },
    commands: {
        executionFailed: "Выполнение команды {0:trim,surround} не удалось: {1}",
    },
    deploy: {
        after: {
            button: {
                text: "{2}Развёртывание: [{1}] {0}{3}",
                tooltip: "Щелкните здесь, что бы показать окно вывода...",
            },
            failed: "Не могу вызвать 'after deployed' операции: {0}",
        },
        before: {
            failed: "Не могу вызвать 'before deploy' операции: {0}",
        },
        button: {
            cancelling: 'Отмена...',
            prepareText: 'Подготовка развёртывания...',
            text: 'Развёртывание...',
            tooltip: 'Щелкните здесь, что бы отменить развёртывание...',
        },
        canceled: 'Отменено.',
        canceledWithErrors: 'Отменено с ошибками!',
        cancelling: 'Отмена развёртывания...',
        file: {
            deploying: 'Развёртывание файла {0:trim,surround}{1:trim,leading_space}... ',
            deployingWithDestination: 'Развёртывание файла {0:trim,surround} в {1:trim,surround}{2:trim,leading_space}... ',
            failed: 'Не могу развернуть файл {0:trim,surround}: {1}',
            succeeded: 'Файл {0:trim,surround} был успешно развёрнут.',
            succeededWithTarget: 'Файл {0:trim,surround} был успешно развёрнут в {1:trim,surround}.',
        },
        fileOrFolder: {
            failed: 'Не могу развернуть файл / каталог {0:trim,surround}: {1}',
        },
        finished: 'Завершено.',
        finished2: 'Завершено',
        finishedWithErrors: 'Завершено с ошибками!',
        folder: {
            failed: 'Не могу развернуть каталог {0:trim,surround}: {1}',
            selectTarget: 'Выберите назначение, в которое следует развернуть каталог...',
        },
        noFiles: 'Нет файлов для развёртывания!',
        noPlugins: 'Модули не найдены!',
        noPluginsForType: 'Не найдено модулей соответствующих {0:trim,surround}!',
        onSave: {
            couldNotFindTarget: 'Назначение развёртывания (target) {0:trim,surround} указанного в пакете {1:trim,surround,leading_space} отсутствует!',
            failed: 'Не могу развернуть {0:trim,surround} при сохранении ({1:trim}): {2}',
            failedTarget: 'Не могу развернуть {0:trim,surround} в {1:trim} при сохранении: {2}',
        },
        operations: {
            failed: "[ОШИБКА: {0:trim,surround}]",
            finished: "[Завершено]",
            noFileCompiled: "Ни один из {0:trim} файлов не был скомпилирован!",
            noFunctionInScript: "Функция {0:trim,surround} не была найдена в {1:trim,surround}!",
            open: 'Запуск {0:trim,surround}... ',
            someFilesNotCompiled: "{0:trim} из {1:trim} файл(ов) не может быть скомпилирован!",
            unknownCompiler: 'Компилятор {0:trim,surround} не известен!',
            unknownSqlEngine: 'Неизвестный SQL engine {0:trim,surround}!',
            unknownType: 'НЕИЗВЕСТНЫЙ ТИП: {0:trim,surround}',
        },
        workspace: {
            allFailed: 'Файлы не могут быть развёрнуты: {0}',
            allFailedWithTarget: 'Файлы не могут быть развёрнуты в {0:trim,surround}: {1}',
            allSucceeded: 'Все {0:trim} файл(ы) были успешно развёрнуты.',
            allSucceededWithTarget: 'Все {0:trim} файлы были успешно развёрнуты в {1:trim,surround}.',
            alreadyStarted: 'Вы уже начали развертывание в {0:trim,surround}! Вы действительно хотите начать эту операцию?',
            clickToCancel: 'щелкнте здесь для отмены',
            deploying: 'Развёртывание пакета {0:trim,surround,leading_space}...',
            deployingWithTarget: 'Развёртывание пакета {0:trim,surround,leading_space} в {1:trim,surround}...',
            failed: 'Не могу развернуть файлы: {0}',
            failedWithCategory: 'Не могу развернуть файлы ({0:trim}): {1}',
            failedWithTarget: 'Не могу развернуть файлы в {0:trim,surround}: {1}',
            nothingDeployed: 'Файлы для развёртывания не найдены!',
            nothingDeployedWithTarget: 'Файлы для развёртывания в {0:trim,surround} не найдены!',
            selectPackage: 'Выберите пакет...',
            someFailed: '{0:trim} из {1:trim} файлов не могут быть развернуты!',
            someFailedWithTarget: '{0:trim} из {1:trim} файлов не могут быть развернуты в {2:trim,surround}!',
            status: 'Развёртывание {0:trim,surround}... ',
            statusWithDestination: 'Развёртывание {0:trim,surround} в {1:trim,surround}... ',
            virtualTargetName: 'Виртуальное пакетное назначение для текущего пакета',
            virtualTargetNameWithPackage: 'Виртуальное пакетное назначение для пакета {0:trim,surround}',
        }
    },
    errors: {
        countable: 'ОШИБКА #{0:trim}: {1}',
        withCategory: '[ОШИБКА] {0:trim}: {1}',
    },
    failed: '[НЕУДАЧНО: {0}]',
    host: {
        button: {
            text: 'Ожидание файлов ...',
            tooltip: 'Щелкните здесь, что бы закрыть deploy host',
        },
        errors: {
            cannotListen: 'Не могу перейти в режим ожидания получения файлов: {0}',
            couldNotStop: 'Не могу остановить deploy host: {0}',
            fileRejected: 'Файл был отклонён!',
            noData: 'Нет данных!',
            noFilename: 'Нет имени файла {0:trim}!',
        },
        receiveFile: {
            failed: '[НЕУДАЧНО:{0:trim,leading_space}]',
            ok: '[УСПЕШНО{0:trim}]',
            receiving: "Получение файла {2:trim,leading_space} от '{0:trim}:{1:trim}'... ",
        },
        started: 'Запущено deploy host на порту {0:trim} в каталоге {1:trim,surround}.',
        stopped: 'Deploy host был остановлен.',
    },
    isNo: {
        directory: "{0:trim,surround} это не каталог!",
        file: "{0:trim,surround} это не файл!",
        validItem: '{0:trim,surround} это не допустимый элемент, который мог бы быть развёрнут!',
    },
    network: {
        hostname: 'Имя вашего компьютера: {0:trim,surround}',
        interfaces: {
            failed: 'Не могу получить информацию о сетевых интерфейсах: {0}',
            list: 'Ваши сетевые интерфейсы:',
        }
    },
    ok: '[УСПЕШНО]',
    packages: {
        couldNotFindTarget: 'Не могу найти назначение {0:trim,surround} в пакете {1:trim,surround}!',
        defaultName: '(Пакет #{0:trim})',
        noneDefined: "Пожалуйста,определение по крайней мере один ПАКЕТ в вашем 'settings.json'!",
        notFound: 'Пакет {0:trim,surround} не найден!',
        nothingToDeploy: 'Нет пакетов для развёртывания!',
    },
    plugins: {
        api: {
            clientErrors: {
                noPermissions: "Не хватает прав для записи!",
                unauthorized: "Пользователь не авторизован!",
                unknown: "Неизвестная ошибка клиента: {0:trim} {2:trim,surround}",
            },
            description: "Разворачивает для REST API, как 'vs-rest-api'",
            serverErrors: {
                unknown: "Неизвестная ошибка сервера: {0:trim} {2:trim,surround}",
            },
        },
        app: {
            description: 'Разворачивает скрипт или исполняемый файл на локальном компьютере',
        },
        azureblob: {
            description: 'Разворачивает в облако Microsoft Azure',
        },
        batch: {
            description: 'Разворачивает в другие назначения',
        },
        dropbox: {
            description: 'Разворачивает в DropBox каталог.',
            unknownResponse: 'Необжиданный ответ {0:trim} ({1:trim}): {2:trim,surround}',
        },
        ftp: {
            description: 'Разворачивает на FTP сервер',
        },
        http: {
            description: 'Разворачивает на HTTP сервер/сервис',
            protocolNotSupported: 'Протокол {0:trim,surround} не поддерживается!',
        },
        local: {
            description: 'Разворачивает в каталог на локальном компьютере или сетевой каталог (например SMB) внутри вашей локальной сети',
            emptyTargetDirectory: 'Пустой каталог назначения {0:trim,surround}... ',
        },
        mail: {
            addressSelector: {
                placeholder: 'eMail адрес(а) назначения',
                prompt: 'Один или больше email адресов (разделенных запятой) для отправки...',
            },
            description: 'Разворачивает в ZIP архив и отправляет как вложение почты через SMTP',
        },
        pipeline: {
            description: 'Pipes a list of sources files to a new destination, by using a script and sends the new file list to a target',
            noPipeFunction: "{0:trim,surround} не реализует 'pipe()' функцию!",
        },
        remote: {
            description: 'Разворачивает на удаленный компьютер через TCP соединение',
        },
        s3bucket: {
            credentialTypeNotSupported: 'Credental тип {0:trim,surround} не поддерживается!',
            description: 'Разворачивает на Amazon S3 bucket',
        },
        script: {
            deployFileFailed: 'Не могу развернуть файл {0:trim,surround} при помощи скрипта {1:trim,surround}!',
            deployWorkspaceFailed: 'Не могу развернуть рабочее пространство при помощи скрипта {0:trim,surround}!',
            description: 'Разворачивает при помощи JS скрипта',
            noDeployFileFunction: "{0:trim,surround} не реализует 'deployFile()' функцию!",
        },
        sftp: {
            description: 'Разворачивает на SFTP сервер',
        },
        sql: {
            description: 'Выполняет SQL скрипт',
            invalidFile: 'Файл некорретный!',
            unknownEngine: 'Неизвестный engine {0:trim,surround}!',
        },
        test: {
            description: 'Шаблон, который только показывает какие файлы будут развернуты',
        },
        zip: {
            description: 'Разворачивает в ZIP-архив',
            fileAlreadyExists: 'Файл {0:trim,surround} уже существует! Попробуйте снова...',
        }
    },
    popups: {
        newVersion: {
            message: "Запущена новая версия 'vs-deploy' ({0:trim})!",
            showChangeLog: 'Показать список изменений...',
        },
    },
    pull: {
        button: {
            cancelling: 'Отмена...',
        },
        canceled: 'Отменено.',
        canceledWithErrors: 'Отменено с ошибками!',
        finished2: 'Завершено',
        finishedWithErrors: 'Завершено с ошибками!',
        noPlugins: 'Модули не найдены!',
        noPluginsForType: 'Не найдено модулей соответствующих {0:trim,surround}!',
        workspace: {
            clickToCancel: 'щелкнте здесь для отмены',
            selectPackage: 'Выберите пакет...',
            virtualTargetName: 'Виртуальное пакетное назначение для текущего пакета',
            virtualTargetNameWithPackage: 'Виртуальное пакетное назначение для пакета {0:trim,surround}',
        }
    },
    quickDeploy: {
        caption: 'Быстрое развёртывание!',
        failed: 'Быстрое развёртывание отклонено: {0}',
        start: 'Начать быстрое развёртывание...',
    },
    relativePaths: {
        couldNotResolve: "Не могу получить относительный путь к {0:trim,surround}!",
        isEmpty: 'Относительный путь к файлу {0:trim,surround} пуст!',
    },
    targets: {
        cannotUseRecurrence: 'Не могу использовать назначение {0:trim,surround} (повторение)!',
        defaultName: '(Назначение #{0:trim})',
        noneDefined: "Пожалуйста, определите по крайней мере одно назначение(TARGET) в вашем 'settings.json'!",
        notFound: 'Не могу найти назначение {0:trim,surround}!',
        select: 'Выберите назначение для развёртывания...',
    },
    warnings: {
        withCategory: '[ВНИМАНИЕ] {0:trim}: {1}',
    },
    yes: 'Да',
};
