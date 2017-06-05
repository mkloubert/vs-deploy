# Change Log (vs-deploy)

## 9.18.3 (June 5th, 2017; prompt target)

* added new [prompt](https://github.com/mkloubert/vs-deploy/wiki/target_prompt) target, which asks the user for a list of settings that will be applied to one or more other [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-)

## 9.17.0 (June 5th, 2017; folder mappings)

* added support for [regular expressions](https://en.wikipedia.org/wiki/Regular_expression) and [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) in [folder mappings](https://github.com/mkloubert/vs-deploy/wiki/folder_mappings)

## 9.16.0 (June 4th, 2017; password prompts)

* password box is shown now if no password / token / key is defined in [API](https://github.com/mkloubert/vs-deploy/wiki/target_api), [Azure blob](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob), [DropBox](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox), [FTP](https://github.com/mkloubert/vs-deploy/wiki/target_ftp), [HTTP](https://github.com/mkloubert/vs-deploy/wiki/target_http) and [mail](https://github.com/mkloubert/vs-deploy/wiki/target_mail) targets

## 9.15.1 (June 4th, 2017; bugfixes and password prompt for SFTP)

* fixed bug when deploying of a single file failed
* password box is shown now if no password is defined in [SFTP target](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) ... this behavior can be changed by setting `promptForPassword` to `(false)`

## 9.14.0 (June 1st, 2017; french translation)

* [french translation](https://github.com/mkloubert/vs-deploy/blob/master/src/lang/fr.ts) updated by [neiobaf](https://github.com/neiobaf)

## 9.13.2 (May 31st, 2017; CoffeeScript)

* added [CoffeeScript](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-) compiler support

## 9.12.0 (May 31st, 2017; load settings from external files)

* added `loadFrom` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), which can define a path to an external JSON file with data to use as base settings for the underlying objects

## 9.11.0 (May 29th, 2017; dropbox, settings and placeholders)

* added `alwaysShowPackageList` setting that indicates if package list is shown, even if there is only 1 entry
* added `alwaysShowTargetList` setting that indicates if target list is shown, even if there is only 1 entry
* added `username` and `password` settings for [HTTP target operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#http-)
* added build-in [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) `EOL`, `hostName`, `tempDir`, `userName`
* added `runBuildTaskOnStartup` which defines if `workbench.action.tasks.build` command (build task) should be run on startup or not
* added `runGitPullOnStartup`, which defines if `git.pull` command should be run on startup or not
* added `password` and `passwordAlgorithm` settings for [dropbox targets](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox), that can be used to encrypt/decrypt files before they will be uploaded / after have been downloaded
* lots of code improvements

## 9.10.0 (May 28th, 2017; new list target)

* added [list target](https://github.com/mkloubert/vs-deploy/wiki/target_list), that lets the user select an entry by the GUI, which contains settings for one or more other target

## 9.9.1 (May 28th, 2017; http target operations)

* added [http target operation](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#http-)
* bugfixes in [helpers](https://mkloubert.github.io/vs-deploy/modules/_helpers_.html#makeenvvarsforprocess) and [http target](https://github.com/mkloubert/vs-deploy/wiki/target_http)

## 9.8.0 (May 28th, 2017; environment variables)

* can define environment variables for [app targets](https://github.com/mkloubert/vs-deploy/wiki/target_app), [open operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#open-) and [webdeploy operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#webdeploy-) now

## 9.7.0 (May 22nd, 2017; speed up check for newer files)

* improved speed of checking for newer files

## 9.6.0 (May 21st, 2017; french translation)

* [french translation](https://github.com/mkloubert/vs-deploy/blob/master/src/lang/fr.ts) updated by [neiobaf](https://github.com/neiobaf)

## 9.5.0 (May 18th, 2017; inherit settings)

* added `inheritFrom` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), that can define the name(s) of one or more other items from where to inherit settings from

## 9.4.0 (May 18th, 2017; russian translation)

* [russian translation](https://github.com/mkloubert/vs-deploy/blob/master/src/lang/ru.ts) updated by [sag3ll0](https://github.com/sag3ll0)

## 9.3.0 (May 17th, 2017; package settings)

* added `showForDeploy` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), that defines if underlying package is visible in GUI when user wants to deploy files
* added `showForPull` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), that defines if underlying package is visible in GUI when user wants to pull files

## 9.2.0 (May 17th, 2017; ignore files)

* files that are part of `ignore` [setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) will not be pulled anymore

## 9.1.1 (May 13th, 2017; extended HTTP target)

* thanks to [owenfarrell](https://github.com/owenfarrell), who added new `encodeUrlValues` and `submitFile` settings to [http target](https://github.com/mkloubert/vs-deploy/wiki/target_http) to control the submission of a file and its contents
* bugfixes

## 9.0.0 (May 11th, 2017; glob patterns, compilers and package updates)

* [glob patterns](https://github.com/isaacs/node-glob) are also used for directories in [settings](https://github.com/mkloubert/vs-deploy/wiki#settings--), [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), [open on startup](https://github.com/mkloubert/vs-deploy/wiki/open_on_startup) and [deploy on change](https://github.com/mkloubert/vs-deploy/wiki/deploy_on_change) now ... this can be changed by setting `useGitIgnoreStylePatterns` property to `(false)`
* added [compiler support](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-) for [html-minifier](https://www.npmjs.com/package/html-minifier)
* replaced [node-uuid](https://www.npmjs.com/package/node-uuid) with [uuid](https://www.npmjs.com/package/uuid)
* updated [aws-sdk](https://www.npmjs.com/package/aws-sdk) to `2.49.0`
* updated [file-type](https://www.npmjs.com/package/file-type) to `4.3.0`
* updated [html-entities](https://www.npmjs.com/package/html-entities) to `1.2.1`
* updated [i18next](https://www.npmjs.com/package/i18next) to `4.2.0`
* updated [mime](https://www.npmjs.com/package/mime) to `1.3.5`
* updated [minimatch](https://www.npmjs.com/package/minimatch) to `3.0.4`
* updated [moment](https://www.npmjs.com/package/moment) to `2.18.1`
* updated [mysql](https://www.npmjs.com/package/mysql) to `2.13.0`
* updated [nodemailer](https://www.npmjs.com/package/nodemailer) to `2.7.2`
* updated [pug](https://www.npmjs.com/package/pug) to `2.0.0-rc.1`
* updated [typescript](https://www.npmjs.com/package/typescript) to `2.3.2`
* updated [uglify-js](https://www.npmjs.com/package/) to `2.8.23`

## 8.17.0 (May 3rd, 2017; environment variables / settings for VSCode process)

* added `env` [setting](https://github.com/mkloubert/vs-deploy/wiki/environment_settings), which can define settings for the environment of the current process, like additional environment variables, now

## 8.16.0 (April 29th, 2017; apply values to packages and targets)

* added `applyValuesTo` settings for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), that define objects with lists of property names and their values that should be applied to the underlying setting object

## 8.15.0 (April 29th, 2017; execute commands on FTP server)

* added `beforeUpload`, `closing`, `connected` and `uploaded` for [ftp](https://github.com/mkloubert/vs-deploy/wiki/target_ftp) targets, which can execute commands on a server (s. [Execute commands on server](https://github.com/mkloubert/vs-deploy/wiki/target_ftp#execute-commands-on-server))

## 8.14.0 (April 28th, 2017; execute commands on SFTP server)

* added `closing` and `connected` for [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets, which can execute commands on a server (s. [Execute commands on server](https://github.com/mkloubert/vs-deploy/wiki/target_sftp#execute-commands-on-server))

## 8.13.0 (April 28th, 2017; placeholder support for SFTP private key file paths)

* added [placeholder](https://github.com/mkloubert/vs-deploy/wiki/values) support for `privateKey` setting of [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets

## 8.12.0 (April 27th, 2017; execute commands on SFTP server)

* added `beforeUpload` and `uploaded` for [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets, which can execute commands on a server (s. [Execute commands on server](https://github.com/mkloubert/vs-deploy/wiki/target_sftp#execute-commands-on-server))

## 8.11.0 (April 27th, 2017; custom permissions for SFTP uploaded files)

* added `modes` setting for [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets, that can define one or more [chmod](https://en.wikipedia.org/wiki/Chmod) access permission values for target files on the server

## 8.10.0 (April 26th, 2017; placeholder support for SFTP agents)

* added [placeholder](https://github.com/mkloubert/vs-deploy/wiki/values) support for `agent` setting of [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets

## 8.9.0 (April 19th, 2017; check for newer files before deploy)

* added `checkBeforeDeploy` setting for [azureblob](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob), [dropbox](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox), [ftp](https://github.com/mkloubert/vs-deploy/wiki/target_ftp), [local](https://github.com/mkloubert/vs-deploy/wiki/target_local), [s3bucket](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket), [script](https://github.com/mkloubert/vs-deploy/wiki/target_script), [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp), [test](https://github.com/mkloubert/vs-deploy/wiki/target_test) and [zip](https://github.com/mkloubert/vs-deploy/wiki/target_zip) targets, which will check for newer files BEFORE a deployment starts (if set `(true)`) 

## 8.8.0 (April 16th, 2017; additional possible sources for iterator targets)

* can also use sources like `ftp://` or `sftp://` for [each](https://github.com/mkloubert/vs-deploy/wiki/target_each) and [map](https://github.com/mkloubert/vs-deploy/wiki/target_map) targets now

## 8.7.0 (April 16th, 2017; map target)

* added [map](https://github.com/mkloubert/vs-deploy/wiki/target_map) target, which is similar to [each](https://github.com/mkloubert/vs-deploy/wiki/target_each), but with other value handling

## 8.6.0 (April 16th, 2017; ignore files for deployment)

* added optional global `ignore` [setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) that can define a list of pattern of files which should NOT be deployed, even if a deployment is trying to be started for them

## 8.5.0 (April 16th, 2017; templates and examples from (S)FTP)

* can load [templates and examples](https://github.com/mkloubert/vs-deploy/wiki/templates) from `ftp://` and `sftp://` now
* can use credentials in urls now

## 8.4.0 (April 16th, 2017; required extension version for example / template files and items)

* can define a minimum extension version, that is required to display [template / example items](https://github.com/mkloubert/vs-deploy/wiki/templates#sources--repositories)

## 8.3.0 (April 15th, 2017; scripts can be implemented much easier now)

* implementation of [deploy scripts](https://github.com/mkloubert/vs-deploy/wiki/target_script) is much easier now, s. [example](https://github.com/mkloubert/vs-deploy/wiki/target_script#implement-own-scripts)
* implementation of [pipes](https://github.com/mkloubert/vs-deploy/wiki/target_pipeline) is much easier now, s. [example](https://github.com/mkloubert/vs-deploy/wiki/target_pipeline#implement-a-pipe)
* implementation of [target operation scripts](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script--1) is much easier now, s. [example](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script--1)
* implementation of [compiler scripts](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script-) is much easier now, s. [example](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script-)
* each [canceled](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployarguments.html#canceled) property of [DeployArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployarguments.html) and [PipeArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_pipeline_.pipearguments.html) interfaces is set automatically now
* added `onBeforeDeploy()` method for [DeployFileArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployfilearguments.html) interface
* added `onBeforeDeployFile()` and `onFileCompleted()` methods for [DeployWorkspaceArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployworkspacearguments.html) interface
* [deploy scripts](https://github.com/mkloubert/vs-deploy/wiki/target_script) do not need to return a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) anymore

## 8.2.0 (April 15th, 2017; code improvements)

* improved execution of (internal) deploy commands

## 8.1.0 (April 15th, 2017; open HTML documents from scripts)

* added `openHtml()` methods to [EventModuleExecutorArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.eventmoduleexecutorarguments.html) ([global events](https://github.com/mkloubert/vs-deploy/wiki/events)), [PipeArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_pipeline_.pipearguments.html) ([pipelines](https://github.com/mkloubert/vs-deploy/wiki/target_pipeline)), [DeployArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployarguments.html) ([scripts](https://github.com/mkloubert/vs-deploy/wiki/target_script)), [DeployScriptOperationArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deployscriptoperationarguments.html) ([deploy operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script--1)) and [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.scriptcommandexecutorarguments.html) ([commands](https://github.com/mkloubert/vs-deploy/wiki/commands)) interfaces

## 8.0.0 (April 15th, 2017; examples and new 'each')

* can access repositories of [examples and templates](https://github.com/mkloubert/vs-deploy/wiki/templates) from editor now, by pressing `F1` and selecting the command `Deploy: Open example / template` ... you can post and share own examples in [that issue](https://github.com/mkloubert/vs-deploy/issues/56)
* added [each](https://github.com/mkloubert/vs-deploy/wiki/target_each) target type

## 7.26.0 (April 12th, 2017; data transformation)

* [api](https://github.com/mkloubert/vs-deploy/wiki/target_api), [azure blob](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob), [ftp](https://github.com/mkloubert/vs-deploy/wiki/target_ftp), [local](https://github.com/mkloubert/vs-deploy/wiki/target_local), [mail](https://github.com/mkloubert/vs-deploy/wiki/target_mail), [s3 bucket](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket), [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp), [sql](https://github.com/mkloubert/vs-deploy/wiki/target_sql), [test](https://github.com/mkloubert/vs-deploy/wiki/target_test) and [zip](https://github.com/mkloubert/vs-deploy/wiki/target_zip) targets now support [data transformation](https://github.com/mkloubert/vs-deploy/wiki/transform_data)

## 7.25.0 (April 5th, 2017; faster file checks for deploy on save / change)

* added `fastCheckOnChange` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), that can define if a "faster" file check should be used for [deploy on change](https://github.com/mkloubert/vs-deploy/wiki/deploy_on_change)
* added `fastCheckOnSave` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), which can define if a "faster" file check should be used for "deploy on save" feature
* `showWarningsForNonExistingTargets` [setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) also works for [package buttons](https://github.com/mkloubert/vs-deploy/wiki#buttons-) now

## 7.24.0 (April 2nd, 2017; passwords for hosts and remote targets)

* can use passwords for [hosts](https://github.com/mkloubert/vs-deploy/wiki#host-) and [remote targets](https://github.com/mkloubert/vs-deploy/wiki/target_remote) now
* added `replaceWithValues()` to [DataTransformerContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.datatransformercontext.html) interface
* added `autoStart` setting for [hosts](https://github.com/mkloubert/vs-deploy/wiki#host-)

## 7.23.0 (April 2nd, 2017; buttons for packages)

* can use boolean values for [package buttons](https://github.com/mkloubert/vs-deploy/wiki#buttons-) now

## 7.22.0 (April 2nd, 2017; buttons for packages)

* can define [buttons](https://github.com/mkloubert/vs-deploy/wiki#buttons-) for each [package](https://github.com/mkloubert/vs-deploy/wiki#packages-) now

## 7.21.0 (April 2nd, 2017; REST API and cron jobs)

* added `startApi` [setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) to start a REST API provided by extensions like [vs-rest-api](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-rest-api)
* added `startCronJobs` [setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) to start cron jobs handled by extensions like [vs-cron](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-cron)

## 7.20.0 (April 2nd, 2017; global events)

* added `replaceWithValues()` method to [EventModuleExecutorArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.eventmoduleexecutorarguments.html) interface

## 7.19.0 (April 2nd, 2017; global events)

* can define [global events](https://github.com/mkloubert/vs-deploy/wiki/events) now

## 7.18.0 (April 1st, 2017; imports and custom name)

* can define [external config files](https://github.com/mkloubert/vs-deploy/wiki/imports) that can be imported/merged into the data defined in `settings.json`
* can define custom machine name in [settings](https://github.com/mkloubert/vs-deploy/wiki#settings--) now

## 7.17.0 (March 31th, 2017; script values)

* can also use [scripts](https://github.com/mkloubert/vs-deploy/wiki/values#script-) for providing values now
* added `detail` settings for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), which can be used to show additional information in the GUI, e.g.

## 7.16.0 (March 31th, 2017; if settings)

* added `if` properties for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-), [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) and [files](https://github.com/mkloubert/vs-deploy/wiki/open_on_startup), that can define via JavaScript code if item is available or not

## 7.15.0 (March 30th, 2017; alternate FTP engine)

* added [jsftp](https://github.com/sergi/jsftp) as alternate engine for [ftp targets](https://github.com/mkloubert/vs-deploy/wiki/target_ftp), which can be defined by `engine` setting ... s. [issue](https://github.com/mkloubert/vs-deploy/issues/50)

## 7.14.0 (March 29th, 2017; cancellation of FTP deployments)

* improved cancellation of FTP deployments
* added `connTimeout`, `pasvTimeout` and `keepalive` properties for [ftp targets](https://github.com/mkloubert/vs-deploy/wiki/target_ftp)

## 7.13.0 (March 26th, 2017; placeholders)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) in [remote](https://github.com/mkloubert/vs-deploy/wiki/target_remote) targets now

## 7.12.0 (March 26th, 2017; placeholders)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) for [hosts](https://github.com/mkloubert/vs-deploy/wiki#host-) now

## 7.11.0 (March 26th, 2017; placeholders)

* added `$require` variable for [code based placeholders](https://github.com/mkloubert/vs-deploy/wiki/values#code-)

## 7.10.0 (March 26th, 2017; placeholders)

* added `$others` variable for [code based placeholders](https://github.com/mkloubert/vs-deploy/wiki/values#code-)

## 7.9.0 (March 26th, 2017; placeholders for commands)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) for [commands](https://github.com/mkloubert/vs-deploy/wiki/commands) and [quick deploy buttons](https://github.com/mkloubert/vs-deploy/wiki#quick-deployment-) now

## 7.8.0 (March 26th, 2017; placeholders)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) in [pipline](https://github.com/mkloubert/vs-deploy/wiki/target_pipeline) and [script](https://github.com/mkloubert/vs-deploy/wiki/target_script) targets now

## 7.7.0 (March 25th, 2017; placeholders from files)

* can use [files](https://github.com/mkloubert/vs-deploy/wiki/values#file-) as [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) now

## 7.6.0 (March 25th, 2017; placeholders from environment vars)

* can use [environment variables](https://github.com/mkloubert/vs-deploy/wiki/values#env-) as [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) now

## 7.5.0 (March 25th, 2017; placeholders for zip targets)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) in [zip](https://github.com/mkloubert/vs-deploy/wiki/target_zip) targets now

## 7.4.0 (March 25th, 2017; values and placeholders)

* can use [placeholders](https://github.com/mkloubert/vs-deploy/wiki/values) in [app](https://github.com/mkloubert/vs-deploy/wiki/target_app) and [local](https://github.com/mkloubert/vs-deploy/wiki/target_local) targets and [deploy operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#open-) now

## 7.3.0 (March 25th, 2017; platform specific packages and targets)

* added `platforms` setting for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), which can define for which platform an item is for

## 7.2.0 (March 23rd, 2017; content type for Azure and S3)

* content type is detected (and submitted) for files that are deployed to [Azure blob storages](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob) now ... this behavior can be changed by setting the `contentType` or `detectMime` properties in the target(s)
* added `contentType` property for [S3 bucket targets](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket), which can define the mime type for all files explicit

## 7.1.0 (March 20th, 2017; WebDeploy)

* added `runInTerminal` property for [webdeploy target operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#webdeploy-), that indicates if the tool should be executed in VS Code integrated terminal instead in the external shell

## 7.0.0 (March 18th, 2017; run in terminal)

* added `runInTerminal` settings for [app targets](https://github.com/mkloubert/vs-deploy/wiki/target_app) and [open target operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#open-), that indicates if applications should be executed in VS Code integrated terminal instead in the external shell

## 6.3.0 (March 17th, 2017; diff before deploy)

* added `diffBeforeDeploy` property for [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), that indicates if a diff should be made BEFORE a file is being to be deployed

## 6.2.0 (March 16th, 2017; compare files)

* can compare local files with remote ones in a diff window now

## 6.1.0 (March 11th, 2017; russian translation)

* [sag3ll0](https://github.com/sag3ll0) updated russian translation

## 6.0.0 (March 11th, 2017; Pull / download files)

Today there is a new big major release that supports pulling / downloading files from the following targets:

* [Amazon AWS S3 buckets](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket)
* [Azure blob storages](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob)
* [DropBox](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox)
* [External Node.js based scripts](https://github.com/mkloubert/vs-deploy/wiki/target_script)
* [FTP](https://github.com/mkloubert/vs-deploy/wiki/target_ftp)
* [Local or shared network folders inside a LAN](https://github.com/mkloubert/vs-deploy/wiki/target_local)
* [REST APIs](https://github.com/mkloubert/vs-deploy/wiki/target_api)
* [SFTP](https://github.com/mkloubert/vs-deploy/wiki/target_sftp)
* [ZIP files](https://github.com/mkloubert/vs-deploy/wiki/target_zip)

## 5.34.1 (March 9th, 2017; Gitter)

* created [room](https://gitter.im/mkloubert/vs-deploy) at [Gitter](https://gitter.im/mkloubert)

## 5.34.0 (March 9th, 2017; use files of deployment for compilers)

* added `useFilesOfDeployment` property for [compiler operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-), which indicates if files for deployment will be used as source, when not defined explicit

## 5.33.0 (March 4th, 2017; result button in status bar)

* added more information for result button in status bar (s. [issue #42](https://github.com/mkloubert/vs-deploy/issues/42))

## 5.32.0 (March 3rd, 2017; readyTimeout setting for sftp targets)

* added `readyTimeout` property for [sftp](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) targets, as described in [that issue](https://github.com/mkloubert/vs-deploy/issues/33#issuecomment-283950361) (thanks to [lvbeck](https://github.com/lvbeck)!)

## 5.31.0 (March 1st, 2017; russian translation)

* added russian translation (thanks to [sag3ll0](https://github.com/sag3ll0)!)
* if you would like to submit another translation, have a look at [that issue](https://github.com/mkloubert/vs-deploy/issues/18)

## 5.30.0 (February 28th, 2017; french translation)

* added french translation (thanks to [neiobaf](https://github.com/neiobaf)!)
* if you would like to submit another translation, have a look at [that issue](https://github.com/mkloubert/vs-deploy/issues/18)

## 5.29.0 (February 25th, 2017; sftp targets)

* added `tryKeyword` setting for [sftp targets](https://github.com/mkloubert/vs-deploy/wiki/target_sftp)
* fixed [sftp agent settings](https://github.com/mkloubert/vs-deploy/wiki/target_sftp)

## 5.28.0 (February 25th, 2017; ssh agents)

* added support for [ssh agents](https://github.com/mkloubert/vs-deploy/wiki/target_sftp)

## 5.27.0 (February 14th, 2017; Pug support)

* added [Pug](https://pugjs.org/) support for [target operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#pug-)

## 5.26.0 (February 14th, 2017; exclude 'node_modules' folder and hide packages and targets in GUI)

* added `noNodeModules` property for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) to exclude `node_modules/**` by default
* added `isHidden` property for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) for hiding those items in the GUI (but they are still available)

## 5.25.0 (February 14th, 2017; get targets command)

* added (invisible) command `extension.deploy.getTargets` to get [targets](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploytarget.html) via this command

## 5.24.0 (February 14th, 2017; deploy command)

* added (invisible) command `extension.deploy.filesTo` to deploy files via this command

## 5.23.0 (February 14th, 2017; REST API)

* added support for [REST APIs](https://github.com/mkloubert/vs-deploy/wiki/target_api) like [vs-rest-api](https://github.com/mkloubert/vs-rest-api)

## 5.22.0 (February 5th, 2017; UglifyJS)

* added [UglifyJS](https://www.npmjs.com/package/uglify-js) compiler support, e.g. for [target operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations).

## 5.21.0 (February 4th, 2017; sharing data between scripts)

* added `globalState` and `state` to [DeployArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_script_.deployarguments.html), [DeployScriptOperationArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deployscriptoperationarguments.html) and [PipeArguments](https://mkloubert.github.io/vs-deploy/interfaces/_plugins_pipeline_.pipearguments.html), which can be used to share / store data between scripts and their executions

## 5.20.0 (February 4th, 2017; deploy on save)

* improved speed of `deploy on save`
* added [showWarningsForNonExistingTargets](https://github.com/mkloubert/vs-deploy/wiki#settings--) setting, that defines if warn popups should be shown if a target does not exist

## 5.19.1 (February 3th, 2017; deploy on change)

* bug fix in [deploy on change](https://github.com/mkloubert/vs-deploy/wiki/deploy_on_change)

## 5.19.0 (January 31th, 2017; deploy via context)

* added `deployFiles()` to [DeployContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html)

## 5.18.0 (January 31th, 2017; deploy via event)

* added global event `deploy.deployFiles`
* added global event `deploy.deployFiles.complete`
* added global event `deploy.deployFiles.error`
* added global event `deploy.deployFiles.success`
* added [deployFiles()](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.filedeployer.html#deployfiles) that can be used in scripts to deploy files

## 5.17.0 (January 29th, 2017; global events)

* added global event `deploy.deployOnChange.toggle`
* added global event `deploy.deployOnSave.toggle`

## 5.16.0 (January 29th, 2017; global events)

* added [ScriptArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.scriptarguments.html) which extends all script based arguments and contextes with features like emitting global events
* added [emitGlobal](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html#emitglobal) to [DeployContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html)
* added global events `deploy.deployOnChange.disable` and `deploy.deployOnChange.enable`
* added global events `deploy.deployOnSave.disable` and `deploy.deployOnSave.enable`

## 5.15.0 (January 27th, 2017; custom filename for ZIP files)

* added `fileName` option for [zip targets](https://github.com/mkloubert/vs-deploy/wiki/target_zip), that can be used to define a custom output filename

## 5.14.0 (January 22nd, 2017; Generic / script based compiler support)

* added generic script based support for [compile operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-)

## 5.13.0 (January 21st, 2017; TypeScript compiler support)

* added [TypeScript](https://www.typescriptlang.org/) support for [compile operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-)

## 5.12.0 (January 21st, 2017; compiler operations, like LESS)

* added [compile](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#compile-) deploy operation type, that is currently able to compile `.less` files

## 5.11.0 (January 21st, 2017; Visual Studio Code command deploy operations)

* added `submitContext`, that defines if a context object should be submitted as first argument to a [vscommand](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#vscommand-) deploy operation or not

## 5.10.0 (January 20th, 2017; state data for additional commands)

* added `commandState` and `globalState` properties to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface, which can be used to store/share data beetween all additional defined [script based commands](https://github.com/mkloubert/vs-deploy/wiki/commands)

## 5.9.0 (January 20th, 2017; isCancelling() method readded)

* re-added `isCancelling()` to [DeployContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html) interface

## 5.8.0 (January 20th, 2017; convert CR+LF to LF when deploying to SFTP)

* added `unix` setting for [SFTP targets](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) that can control if Windows text files should be converted to UNIX format, e.g.

## 5.7.0 (January 19th, 2017; addtional, custom commands for Visual Studio Code)

* added [commands](https://github.com/mkloubert/vs-deploy/wiki#settings--) that can define additional script based commands for Visual Studio Code 

## 5.6.0 (January 19th, 2017; startup commands)

* added [startupCommands](https://github.com/mkloubert/vs-deploy/wiki#settings--) that can define Visual Studio Code commands that should be run on startup 

## 5.5.0 (January 19th, 2017; execute Visual Studio Code commands)

* can execute any available VSCode command via [operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#vscommand-) now

## 5.3.2 (January 17th, 2017; fixed fatal bug)

* fixed bug that crashes extension, because of [none existing SQL libraries in package.json](https://github.com/mkloubert/vs-deploy/issues/28#issuecomment-273445589)

## 5.3.0 (January 17th, 2017; SQL)

* added support for SQL [targets](https://github.com/mkloubert/vs-deploy/wiki/target_sql) and [operations](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#sql-) (Microsoft SQL, MySQL)

## 5.2.1 (January 17th, 2017; cancel deployments)

* fixed cancellation of deployments

## 5.2.0 (January 17th, 2017; cancel deployments)

* improved cancellation of deployments

## 5.1.0 (January 17th, 2017; open files on startup)

* added [open](https://github.com/mkloubert/vs-deploy/wiki#settings--) setting property

## 5.0.0 (January 17th, 2017; cancel deployments)

* improved cancellation of deployments

## 4.22.0 (January 16th, 2017; display loaded plugins and network info)

* added `displayLoadedPlugins` and `displayNetworkInfo` [settings](https://github.com/mkloubert/vs-deploy/wiki#settings--)

## 4.21.0 (January 14th, 2017; (S)FTP improvements)

* improved speed when deploying to [SFTP](https://github.com/mkloubert/vs-deploy/wiki/target_sftp) or [FTP](https://github.com/mkloubert/vs-deploy/wiki/target_ftp) servers

## 4.20.0 (January 14th, 2017; warning if already running)

* removed warn popups for single files, that are being deployed several times

## 4.19.0 (January 6th, 2017; warning if already running)

* now showing popup if a deployment is currently running, to prevent running deployments several times

## 4.18.0 (January 6th, 2017; improved deployment)

* add [showDeployResultInStatusBar](https://github.com/mkloubert/vs-deploy/wiki#settings--) setting that can display a button in the status bar after deployment has been finished
* improved deploy status bar button
* fixed cancellation of deployments in (s)ftp plugins

## 4.17.0 (January 6th, 2017; full IntelliSense support for settings.json)

* completed "IntelliSense" support for `settings.json` file, especially for ['beforeDeploy' and 'deploy' properties](https://github.com/mkloubert/vs-deploy/wiki/targetoperations) in [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-)  

## 4.16.0 (January 5th, 2017; deploy on change)

* can define files that will be [deployed on change](https://github.com/mkloubert/vs-deploy/wiki/deploy_on_change)

## 4.15.0 (January 5th, 2017; empty DropBox folder)

* added support for empty the root directory of a [DropBox folder](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox)

## 4.14.0 (January 5th, 2017; DropBox support)

* added support for deploying to [DropBox folder](https://github.com/mkloubert/vs-deploy/wiki/target_dropbox)

## 4.13.0 (January 4th, 2017; script support for "before" and "after" deploy actions)

* added script support for actions / tasks that are invoked [before and after a deployment](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#script-)

## 4.12.0 (January 4th, 2017; global variables)

* added [globals](https://github.com/mkloubert/vs-deploy/wiki#settings--) property

## 4.11.0 (January 4th, 2017; supress deploy host popups)

* added `showPopupOnSuccess` for [deploy hosts](https://github.com/mkloubert/vs-deploy/wiki#host-), which can set to `(false)` if no popup should be shown if a host has started / stopped successfully

## 4.10.0 (January 4th, 2017; data transformation)

* extended [DataTransformerContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.datatransformercontext.html) interface with `context` property

## 4.9.0 (January 3th, 2017; validate remote files)

* can define a script for a [deploy host](https://github.com/mkloubert/vs-deploy/wiki#validation-) now, which validates a received file

## 4.8.0 (January 3th, 2017; deploy hosts)

* optimized [deploy host](https://github.com/mkloubert/vs-deploy/wiki#host-) feature

## 4.7.0 (January 2th, 2017; visibility and sortability of packages and targets)

* added `hideIf` and `showIf` properties for [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), which can control the visibilty of targets by [package name(s)](https://github.com/mkloubert/vs-deploy/wiki#packages-)
* extended `sortOrder` properties for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-), which can contain object instead of number and define own sort values for machines

## 4.6.0 (December 31th, 2016; Web Deploy)

* added support for [Web Deploy](https://github.com/mkloubert/vs-deploy/wiki/targetoperations#webdeploy-)

## 4.5.0 (December 30th, 2016; tag support for remote targets)

* added optional `tag` setting for [remote](https://github.com/mkloubert/vs-deploy/wiki/target_remote) targets, that sends this value with each remote JSON file message

## 4.4.0 (December 30th, 2016; deploy on save behavior for packages)

* [useTargetListForDeployOnSave](https://github.com/mkloubert/vs-deploy/wiki#packages-) setting is also available for single packages now, which would overwrite the [global setting](https://github.com/mkloubert/vs-deploy/wiki#settings--) value

## 4.3.0 (December 30th, 2016; app targets)

* added `submitFileList` and `wait` settings for [app](https://github.com/mkloubert/vs-deploy/wiki/target_app) targets

## 4.2.0 (December 30th, 2016; deploy on save behavior)

* added [useTargetListForDeployOnSave](https://github.com/mkloubert/vs-deploy/wiki#settings--) setting, which can define the behavior of 'deploy on save' feature

## 4.1.1 (December 29th, 2016; hints for new installed versions)

* now showing info popup (once) if new version of extension is installed (can be disabled by [disableNewVersionPopups](https://github.com/mkloubert/vs-deploy/wiki#settings--) setting)

## 4.0.0 (December 29th, 2016; translations and deploy via context menu)

* can deploy whole folders from [explorer's context menu](https://github.com/mkloubert/vs-deploy#how-to-execute-) now
* added support for translations (s. [Issue #18](https://github.com/mkloubert/vs-deploy/issues/18))
* improved [app](https://github.com/mkloubert/vs-deploy/wiki/target_app) plugin
* added descriptions for [https://github.com/mkloubert/vs-deploy/wiki/target_azureblob](azureblob) and [s3bucket](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket) plugins
* changed name of `FileDeployedCompletedEventHandler` interface to [FileDeployCompletedEventHandler](https://mkloubert.github.io/vs-deploy/modules/_contracts_.html#filedeploycompletedeventhandler)
* cleaned up [DeployContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html) interface
* replaced [opn](https://www.npmjs.com/package/opn) module with own and extended implementation

## 3.31.0 (December 26th, 2016; Amazon S3 buckets)

* automatic detection and definition of MIME types for files that are uploaded to [Amazon S3 buckets](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket)

## 3.30.0 (December 24th, 2016; Amazon S3 bucket credentials)

* can define custom credential provider in a [Amazon S3 bucket](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket) target now

## 3.29.0 (December 23th, 2016; Azure blob storages)

* added support for deploying to [Azure blob storages](https://github.com/mkloubert/vs-deploy/wiki/target_azureblob)

## 3.28.0 (December 23th, 2016; Amazon S3 buckets)

* added `dir` property for [Amazon S3 buckets](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket) target settings

## 3.27.0 (December 23th, 2016; Amazon S3 buckets)

* added support for deploying to [Amazon S3 buckets](https://github.com/mkloubert/vs-deploy/wiki/target_s3bucket)

## 3.26.0 (December 23th, 2016; suppress popup on successful deploy)

* added `showPopupOnSuccess` to [global settings](https://github.com/mkloubert/vs-deploy/wiki#settings--) that can be set to `(false)` if no popup should be appear after a successful deployment

## 3.24.0 (December 21th, 2016; package and target filtering)

* added `clearOutputOnStartup` to [global settings](https://github.com/mkloubert/vs-deploy/wiki#settings--) that can be set to `(true)` if output window should be cleared on startup
* added `isFor` property for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) that filter the items by hostname(s)

## 3.22.0 (December 20th, 2016; quick deployment)

* added optional [status bar button](https://github.com/mkloubert/vs-deploy/wiki#quick-deployment-) for quick deployments

## 3.19.0 (December 20th, 2016; before deploy actions)

* actions can be defined in a [target](https://github.com/mkloubert/vs-deploy/wiki#targets-) now before a deployment starts

## 3.18.0 (December 20th, 2016; explicit targets for packages)

* can define a list of one or more explicit targets for a [package](https://github.com/mkloubert/vs-deploy/wiki#packages-) now

## 3.16.0 (December 19th, 2016; remote targets)

* can transform a whole [remote JSON message](https://github.com/mkloubert/vs-deploy/wiki/target_remote) now

## 3.13.0 (December 18th, 2016; pipelines)

* added [pipline](https://github.com/mkloubert/vs-deploy/wiki/target_pipeline) target type

## 3.11.0 (December 18th, 2016; batches)

* added [batch](https://github.com/mkloubert/vs-deploy/wiki/target_batch) target type

## 3.7.0 (December 17th, 2016; require() in deploy contextes)

* added [require]() method for [DeployContext](https://mkloubert.github.io/vs-deploy/interfaces/_contracts_.deploycontext.html) objects

## 3.6.0 (December 17th, 2016; cancel deployments)

* deployments can be cancelled now

## 3.5.0 (December 17th, 2016; open output window settings)

* added `openOutputOnDeploy` global setting that be set to `(false)` if output window should be opened when a deployment starts
* added `openOutputOnStartup` global setting that be set to `(false)` if output window should be opened on startup

## 3.4.0 (December 16th, 2016; mappings)

* can use folder mappings in [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) now

## 2.6.0 (December 14th, 2016; http)

* added [http](https://github.com/mkloubert/vs-deploy/wiki/target_http) target type

## 2.3.0 (December 12th, 2016; directories for remote hosts)

* can define output directories for [remote](https://github.com/mkloubert/vs-deploy/wiki/target_remote) targets now

## 2.1.0 (December 11th, 2016; ZIP files)

* added [zip](https://github.com/mkloubert/vs-deploy/wiki/target_zip) target type

## 2.0.0 (December 11th, 2016; deploy to other VS Code editors)

* added [remote](https://github.com/mkloubert/vs-deploy/wiki/target_remote) target type

## 1.8.0 (December 11th, 2016; scripts)

* added [script](https://github.com/mkloubert/vs-deploy/wiki/target_script) target type

## 1.6.0 (December 11th, 2016; deploy on save)

* can [deploy on save](https://github.com/mkloubert/vs-deploy/wiki#packages-) now

## 1.5.0 (December 10th, 2016; additional modules)

* can implement and use additional [modules / plugins](https://github.com/mkloubert/vs-deploy/wiki#settings--) now

## 1.4.0 (December 10th, 2016; sort packages and targets in GUI)

* can set `sortOrder` property for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) to sort them in the GUI now

## 1.3.0 (December 10th, 2016; external executables)

* added [app](https://github.com/mkloubert/vs-deploy/wiki/target_app) target type

## 1.2.0 (December 10th, 2016; after deploy events)

* can define ["after deploy" events](https://github.com/mkloubert/vs-deploy/wiki#targets-) in targets now

## 1.1.0 (December 10th, 2016; auto selecting packages and targets)

* [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) are auto selected if there is only 1 element

## 1.0.0 (December 10th, 2016)

* first stable release
