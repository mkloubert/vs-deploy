# vs-deploy

[![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)

[Visual Studio Code](https://code.visualstudio.com/) (VS Code) extension that provides commands to deploy files of a workspace to a destination.

The extension supports the following destination types:

* Apps / executables / scripts (bash, batch, e.g.)
* External Node.js based scripts
* FTP
* Local or shared network folders inside a LAN
* Mail (SMTP)
* Remote machines like other VS Code instances
* SFTP

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2)

## Demos

### Deploying to SFTP

![Demo 1](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo.gif)

### Deploy on save

![Demo 2](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo2.gif)

### Deploy to remote Visual Studio Code instance

![Demo 3](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo3.gif)

### Deploy to ZIP file

![Demo 4](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo4.gif)

## License

[MIT license](https://github.com/mkloubert/vs-deploy/blob/master/LICENSE)

## Install

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-deploy
```

## How to use

### Settings

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `deploy` section:

```json
{
    "deploy": {
    }
}
```

| Name | Description |
| ---- | --------- |
| `host` | Settings for a host that receives files from a remote machine. (s. [host section](#host)) |
| `modules` | An optional list of one or more "external" plugin module files (.js) to load. |

#### Packages

A package is a description of files of your workspace that should be deployed.

Add the subsection `packages` and add one or more entry:

```json
{
    "deploy": {
        "packages": [
            {
                "name": "Version 2.3.4",
                "description": "Package version 2.3.4",
                "files": [
                    "**/*.php",
                    "/*.json"
                ],
                "exclude": [
                    "tests/**"
                ],
                "deployOnSave": true
            },
            
            {
                "name": "Version 2.3.5 (anything)",
                "description": "Package version 2.3.5"
            }
        ]
    }
}
```

| Name | Description |
| ---- | --------- |
| `deployOnSave` | Deploy a file of this package on save or not. This can be a list of one or more targets (s. below) to deploy to or `(true)` for all targets. Default: `(false)` |
| `description` | The description of the package. |
| `exclude` | Files to exclude (s. [node-glob](https://github.com/isaacs/node-glob)). |
| `files` | Files to include (s. [node-glob](https://github.com/isaacs/node-glob)). Default: `**` |
| `name` | The name of the package. |
| `sortOrder` | An optional number to sort the package elements. Default: `0` |

#### Targets

A target describes where a file or package should be transfered to.

Add the subsection `targets` and add one or more entry:

```json
{
    "deploy": {
        "targets": [
            {
                "type": "sftp",
                "name": "My SFTP folder",
                "description": "A SFTP folder",
                "dir": "/my_package_files",
                "host": "localhost", "port": 22,
                "user": "tester", "password": "password"
            },
            {
                "type": "ftp",
                "name": "My FTP folder",
                "description": "A FTP folder",
                "dir": "/my_package_files",
                "host": "localhost", "port": 21,
                "user": "anonymous", "password": "",
                "deployed": [
                    {
                        "target": "https://github.com/mkloubert"
                    }
                ]
            },
            {
                "type": "local",
                "name": "My local folder",
                "description": "A local folder",
                "dir": "E:/test/my_package_files"
            },
            {
                "type": "local",
                "name": "My network folder",
                "description": "A SMB shared network folder",
                "dir": "\\\\MyServer\\my_package_files"
            },
            {
                "type": "zip",
                "name": "My ZIP file",
                "description": "Create a ZIP file in a target directory",
                "target": "E:/test"
            },
            {
                "type": "mail",
                "name": "My mail server",
                "description": "An email deployer",
                "host": "smtp.example.com", "port": 465,
                "secure": true, "requireTLS": true,
                "user": "mkloubert@example.com", "password": "P@assword123!",
                "from": "mkloubert@example.com",
                "to": "tm@example.com, ys@example.com"
            },
            {
                "type": "script",
                "name": "My script",
                "description": "A deploy script",
                "script": "E:/test/deploy.js",
                "options": {
                    "TM": 5979,
                    "MK": "23979"
                }
            },
            {
                "type": "remote",
                "name": "My remote target",
                "description": "Some remote VS Code instances to deploy to",
                "hosts": ["localhost", "192.168.0.101", "192.168.0.101:5979"]
            },
            {
                "type": "app",
                "name": "My App",
                "description": "An app to call",
                "app": "E:/test/deploy.cmd",
                "arguments": ["a", "b", "c"]
            }
        ]
    }
}
```

| Name | Description |
| ---- | --------- |
| `deployed` | The operations that should be invoked AFTER ALL files have been deployed successfully. |
| `description` | The description of the target. |
| `name` | The name of the target. |
| `sortOrder` | An optional number to sort the target elements. Default: `0` |
| `type` | The type. |

##### deployed

| Name | Description |
| ---- | --------- |
| `type` | The type. Default: `open` |

###### open

| Name | Description |
| ---- | --------- |
| `target` | The thing should be opened. Can be a URL, file or executable. |

#### app

Deploys to an app, like a script or executable, on the local machine.

| Name | Description |
| ---- | --------- |
| `app` | The path to the app. |
| `arguments` | One or more arguments for the execution which are added BEFORE the list of files are submitted to the app. |

#### ftp

Deploys to a FTP server.

| Name | Description |
| ---- | --------- |
| `dir` | The remote directory on the server. Default: `/` |
| `host` | The host address of the server. Default: `127.0.0.1` |
| `password` | Password |
| `port` | The TCP port of the server. Default: `21` or `990` (`secure` = `(true)`) |
| `secure` | Use secure connection or not. Default: `(false)` |
| `user` | Username. Default: `anonymous` |

#### local

Deploys to a local folder or a shared folder (like SMB) inside your LAN.

| Name | Description |
| ---- | --------- |
| `dir` | The target directory. |
| `empty` | Empty target directory BEFORE deploy or not. Default: `(false)` |

#### mail

Deploys to a ZIP file and sends it as attachment by mail via SMTP.

| Name | Description |
| ---- | --------- |
| `from` | The optional email address of the sender. |
| `host` | The host address of the server. Default: `127.0.0.1` |
| `ignoreTLS` | Ignore TLS or not. Default: `(false)` |
| `password` | Password |
| `port` | The TCP port of the server. Default: `25`, `465`, `587` (based on the security settings) |
| `rejectUnauthorized` | s. [tls module](https://nodejs.org/api/tls.html). Default: `(true)` |
| `requireTLS` | Requires TLS or not. Default: `(false)` |
| `secure` | Use secure connection or not. Default: `(true)` |
| `to` | The optional initial list of target email addresses. |
| `user` | Username |

#### remote

Deploys to a remote machine over a TCP connection.

#### script

Deploys via a JS script.

| Name | Description |
| ---- | --------- |
| `options` | Optional value for the execution. |
| `script` | The script file to exeute. Default: `./deploy.js` |

A script file has the following skeleton:

```javascript
// [REQUIRED]
function deployFile(args) {
    return new Promise(function(resolve, reject) {
        try {
            //TODO

            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.deployFile = deployFile;

// [OPTIONAL]
function deployWorkspace(args) {
    return new Promise(function(resolve, reject) {
        try {
            //TODO

            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.deployWorkspace = deployWorkspace;
```

The `args` parameters have the following structure (for `DeployContext`, `DeployFileOptions` and `DeployWorkspaceOptions` interfaces see [contracts.ts](https://github.com/mkloubert/vs-deploy/blob/master/src/contracts.ts) file):

##### deployFile()

```typescript
/**
 * Arguments for deploying a file.
 */
export interface DeployFileArguments {
    /**
     * The underlying deploy context.
     */
    context: DeployContext;
    /**
     * Deploy options.
     */
    deployOptions: DeployFileOptions;
    /**
     * The file to deploy.
     */
    file: string;
    /**
     * Options from the target configuration.
     */
    targetOptions: any;
}
```

##### deployWorkspace()

```typescript
/**
 * Arguments for deploying the workspace.
 */
export interface DeployWorkspaceArguments {
    /**
     * The underlying deploy context.
     */
    context: DeployContext;
    /**
     * Deploy options.
     */
    deployOptions: DeployWorkspaceOptions;
    /**
     * The list of files to deploy.
     */
    files: string[];
    /**
     * Options from the target configuration.
     */
    targetOptions: any;
}
```

#### sftp

Deploys to a SFTP server.

| Name | Description |
| ---- | --------- |
| `dir` | The remote directory on the server. Default: `/` |
| `host` | The host address of the server. Default: `127.0.0.1` |
| `password` | Password |
| `port` | The TCP port of the server. Default: `22` |
| `user` | Username. Default: `anonymous` |

#### test

A mock deployer that only displays what files would be deployed.

This is a good tool to check package configuration.

#### zip

Deploys to a ZIP.

| Name | Description |
| ---- | --------- |
| `target` | The target directory of the new ZIP file. Default: `./` |

### How to execute

Press `F1` to open the list of commands and enter one of the following commands:

**HINT**: Since version 1.x the shortcuts have been changed for compatiblity reasons!

| Name | Description | Shortcut (`CTRL` is `CMD` on Mac) |
| ---- | --------- | --------- |
| `Deploy: Current file` | Deploys the current opened file. | `CTRL + ALT + F` |
| `Deploy: Start/stop listening for files` | Start/stop listening for files from a remote machine. | `CTRL + ALT + L` |
| `Deploy: Workspace` | Deploys a specific package. | `CTRL + ALT + W` |

#### host

| Name | Description |
| ---- | --------- |
| `maxMessageSize` | Maximum size of one remote file message. Default: `16777215` |
| `port` | The TCP port the host should be listen on. Default: `23979` |
