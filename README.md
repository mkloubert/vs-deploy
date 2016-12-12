# vs-deploy

[![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/mkloubert.vs-deploy.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-deploy)

[Visual Studio Code](https://code.visualstudio.com/) (VS Code) extension that provides commands to deploy files of a workspace to a destination.

The extension supports the following destination types:

* [Apps / executables / scripts (bash, batch, e.g.)](https://github.com/mkloubert/vs-deploy/wiki/target_app)
* [External Node.js based scripts](https://github.com/mkloubert/vs-deploy/wiki/target_script)
* [FTP](https://github.com/mkloubert/vs-deploy/wiki/target_ftp)
* [Local or shared network folders inside a LAN](https://github.com/mkloubert/vs-deploy/wiki/target_local)
* [Mail (SMTP)](https://github.com/mkloubert/vs-deploy/wiki/target_mail)
* [Remote machines like other VS Code instances](https://github.com/mkloubert/vs-deploy/wiki/target_remote)
* [SFTP](https://github.com/mkloubert/vs-deploy/wiki/target_sftp)
* [ZIP files](https://github.com/mkloubert/vs-deploy/wiki/target_zip)

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RB3WUETWG4QU2)

## Table of contents

1. [Demos](#demos-)
   * [Deploying to SFTP](#deploying-to-sftp)
   * [Deploy on save](#deploy-on-save)
   * [Deploy to remote Visual Studio Code instance](#deploy-to-remote-visual-studio-code-instance)
   * [ZIP file](#deploy-to-zip-file)
2. [Install](#install)
3. [How to use](#how-to-use)
   * [Settings](#settings-)
      * [Packages](#packages-)
      * [Targets](#targets-)
   * [How to execute](#how-to-execute-)

## Demos [[&uarr;](#table-of-contents)]

### Deploying to SFTP [[&uarr;](#demos-)]

![Demo SFTP](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo.gif)

### Deploy on save [[&uarr;](#demos-)]

![Demo Deploy on save](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo2.gif)

### Deploy to remote Visual Studio Code instance [[&uarr;](#demos-)]

![Demo Remote](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo3.gif)

### Deploy to ZIP file [[&uarr;](#demos-)]

![Demo ZIP](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo4.gif)

## Install [[&uarr;](#table-of-contents)]

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-deploy
```

## How to use [[&uarr;](#table-of-contents)]

Detailed information can be found at the [wiki](https://github.com/mkloubert/vs-deploy/wiki).

Otherwise...

### Settings [[&uarr;](#how-to-use)]

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `deploy` section:

```json
{
    "deploy": {
    }
}
```

#### Packages [[&uarr;](#settings-)]

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
            }
        ]
    }
}
```

Look at the [wiki](https://github.com/mkloubert/vs-deploy/wiki#packages) to get more information about packages.

#### Targets [[&uarr;](#settings-)]

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

Look at the [wiki](https://github.com/mkloubert/vs-deploy/wiki#targets) to get more information about targets.

### How to execute [[&uarr;](#how-to-use)]

Press `F1` to open the list of commands and enter one of the following commands:

![Demo How to execute](https://raw.githubusercontent.com/mkloubert/vs-deploy/master/img/demo5.gif)

**HINT**: Since version 1.x the shortcuts have been changed for compatiblity reasons!

| Name | Description | Shortcut (`CTRL` is `CMD` on Mac) |
| ---- | --------- | --------- |
| `Deploy: Current file` | Deploys the current opened file. | `CTRL + ALT + F` |
| `Deploy: Start/stop listening for files` | Start/stop listening for files from a remote machine. | `CTRL + ALT + L` |
| `Deploy: Workspace` | Deploys a specific package. | `CTRL + ALT + W` |
