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

#### Package

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

#### Targets

A target description where a file or package should be transfered to.

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
                "user": "anonymous", "password": ""
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
            }
        ]
    }
}
```

### Execute

Press `F1` to open the list of commands and enter one of the following commands:

* `Deploy file`; Shortcut `(CTRL + D)`
* `Deploy workspace` `(CTRL + ALT + D)`
