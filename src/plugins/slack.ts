/// <reference types="node" />

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

import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as Enumerable from 'node-enumerable';
import * as FS from 'fs';
import * as i18 from '../i18';
import * as Path from 'path';
const Slack = require('@slack/client');
import * as Stream from 'stream';


interface DeployTargetSlack extends deploy_contracts.DeployTarget {
    channels: string | string[];
    token: string;
}

class SlackPlugin extends deploy_objects.DeployPluginBase {
    public deployFile(file: string, target: DeployTargetSlack, opts?: deploy_contracts.DeployFileOptions): void {
        const ME = this;

        let hasCanceled = false;
        ME.onCancelling(() => hasCanceled = true,
                        opts);

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (opts.onCompleted) {
                opts.onCompleted(ME, {
                    canceled: hasCanceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        if (hasCanceled) {
            COMPLETED(null);
        }
        else {
            try {
                const RELATIVE_TARGET_FILE_PATH = deploy_helpers.toRelativeTargetPathWithValues(file, target, ME.context.values(), opts.baseDirectory);
                if (false === RELATIVE_TARGET_FILE_PATH) {
                    COMPLETED(new Error(i18.t('relativePaths.couldNotResolve', file)));
                    return;
                }

                const CHANNELS = Enumerable.from(
                    deploy_helpers.asArray(target.channels)
                ).selectMany(c => {
                    return deploy_helpers.toStringSafe(c)
                                         .split(',');
                }).select(c => {
                    return c.trim();
                }).where(c => {
                    return '' !== c;
                }).distinct()
                  .joinToString(',');
                const TOKEN = deploy_helpers.toStringSafe(target.token).trim();
        
                const CLIENT = new Slack.WebClient(TOKEN);

                const FILENAME = Path.basename(file);

                if (opts.onBeforeDeploy) {
                    opts.onBeforeDeploy(ME, {
                        destination: CHANNELS,
                        file: file,
                        target: target,
                    });
                }

                const UPLOAD_OPTS = {
                    file: FS.createReadStream(file),
                    filetype: 'auto',
                    channels: CHANNELS,
                    title: RELATIVE_TARGET_FILE_PATH,
                };

                CLIENT.files.upload(FILENAME, UPLOAD_OPTS, function(err, res) {
                    COMPLETED(err);
                });
            }
            catch (e) {
                COMPLETED(e);
            }
        }
    }

    public info(): deploy_contracts.DeployPluginInfo {
        return {
            description: i18.t('plugins.slack.description'),
        };
    }
}

/**
 * Creates a new Plugin.
 * 
 * @param {deploy_contracts.DeployContext} ctx The deploy context.
 * 
 * @returns {deploy_contracts.DeployPlugin} The new instance.
 */
export function createPlugin(ctx: deploy_contracts.DeployContext): deploy_contracts.DeployPlugin {
    return new SlackPlugin(ctx);
}
