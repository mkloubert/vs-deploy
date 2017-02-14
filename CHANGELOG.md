# Change Log (vs-deploy)

## 5.26.0 (February 14th, 2017; NativeScript support)

* can deploy [NativeScript apps](https://github.com/mkloubert/vs-deploy/wiki/target_nativescript) now
* added `isHidden` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) and [targets](https://github.com/mkloubert/vs-deploy/wiki#targets-) to hide them in GUI
* added `noNode` for [packages](https://github.com/mkloubert/vs-deploy/wiki#packages-) to exclude `node_modules` folder by default

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
