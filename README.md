# vs-deploy

![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/mkloubert.vs-deploy.svg)
![Installs](https://vsmarketplacebadge.apphb.com/installs/mkloubert.vs-deploy.svg)
![Rating](https://vsmarketplacebadge.apphb.com/rating-short/mkloubert.vs-deploy.svg)

[Visual Studio Code](https://code.visualstudio.com/) (VS Code) extension that provides commands to deploy files of a workspace to a destination.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2)

## Demo

![Demo](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo.gif)

## License

[MIT license](https://github.com/mkloubert/vs-deploy/blob/master/LICENSE)

## Install

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-deploy
```

## How to use

### Settings

Open (or create) your `settings.json` in your `.vcode` subfolder of your workspace.

Add a `deploy` section:

```json
{
    "deploy": {
    }
}
```

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
                ]
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
                "type": "sftp",
                "name": "My SFTP folder",
                "description": "A SFTP folder",
                "dir": "/my_package_files",
                "host": "localhost", "port": 22,
                "user": "tester", "password": "password"
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
| `host` | The host address of the server. Default: `localhost` |
| `password` | Password. |
| `port` | The TCP port of the server. Default: `21` or `990` (`secure` = `(true)`) |
| `secure` | Use secure connection or not. Default: `(false)` |
| `user` | Username. Default: `anonymous` |

#### local

Deploys to a local folder.

| Name | Description |
| ---- | --------- |
| `dir` | The target directory. |
| `empty` | Empty target directory BEFORE deploy or not. Default: `(false)` |

#### sftp

Deploys to a SFTP server.

| Name | Description |
| ---- | --------- |
| `dir` | The remote directory on the server. Default: `/` |
| `host` | The host address of the server. Default: `localhost` |
| `password` | Password. |
| `port` | The TCP port of the server. Default: `22` |
| `user` | Username. Default: `anonymous` |

### How to execute

Press `F1` to open the list of commands and enter one of the following commands:

| Name | Description | Shortcut (`CTRL` is `CMD` on Mac) |
| ---- | --------- | --------- |
| `Deploy: Current file` | Deploys the currently opened file. | `CTRL + D` |
| `Deploy: Workspace` | Deploys a specific package. | `CTRL + ALT + D` |
