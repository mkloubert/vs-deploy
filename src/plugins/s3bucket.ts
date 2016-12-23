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

const AWS = require('aws-sdk');
import * as deploy_contracts from '../contracts';
import * as deploy_helpers from '../helpers';
import * as deploy_objects from '../objects';
import * as FS from 'fs';


interface DeployTargetS3Bucket extends deploy_contracts.DeployTarget {
    acl?: string;
    bucket: string;
}

class S3BucketPlugin extends deploy_objects.DeployPluginWithContextBase<any> {
    protected createContext(target: DeployTargetS3Bucket,
                            files: string[]): Promise<deploy_objects.DeployPluginContextWrapper<any>> {
        AWS.config.signatureVersion = "v4";                    
                            
        let bucketName = deploy_helpers.toStringSafe(target.bucket)
                                       .trim();

        let acl = deploy_helpers.toStringSafe(target.acl);
        if (deploy_helpers.isEmptyString(acl)) {
            acl = 'public-read';
        }
        
        return new Promise<deploy_objects.DeployPluginContextWrapper<any>>((resolve, reject) => {
            try {
                let s3bucket = new AWS.S3({
                    params: {
                        Bucket: bucketName,
                        ACL: acl,
                    }
                });

                let wrapper: deploy_objects.DeployPluginContextWrapper<any> = {
                    context: s3bucket,
                };

                resolve(wrapper);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    protected deployFileWithContext(s3bucket: any,
                                    file: string, target: DeployTargetS3Bucket, opts?: deploy_contracts.DeployFileOptions): void {
        let me = this;

        let completed = (err?: any, canceled?: boolean) => {
            if (opts.onCompleted) {
                opts.onCompleted(me, {
                    canceled: canceled,
                    error: err,
                    file: file,
                    target: target,
                });
            }
        };

        try {
            let relativePath = deploy_helpers.toRelativeTargetPath(file, target, opts.baseDirectory);
            if (false === relativePath) {
                completed(new Error(`Could not get relative path for '${file}'!`));
                return;
            }

            let acl = deploy_helpers.toStringSafe(target.acl);
            if (deploy_helpers.isEmptyString(acl)) {
                acl = 'public-read';
            }

            // remove leading '/' chars
            let bucketKey = relativePath;
            while (0 == bucketKey.indexOf('/')) {
                bucketKey = bucketKey.substr(1);
            }

            if (opts.onBeforeDeploy) {
                opts.onBeforeDeploy(me, {
                    destination: relativePath,
                    file: file,
                    target: target,
                });
            }

            FS.readFile(file, (err, data) => {
                if (err) {
                    completed(err);
                    return;
                }

                if (me.context.isCancelling()) {
                    completed(null, true);
                    return;
                }

                s3bucket.createBucket(() => {
                    if (me.context.isCancelling()) {
                        completed(null, true);
                        return;
                    }

                    let params = {
                        Key: bucketKey,
                        Body: data,
                    };

                    s3bucket.putObject(params, (err, data) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        completed();
                    });
                });
            });
        }
        catch (e) {
            completed(e);
        }
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
    return new S3BucketPlugin(ctx);
}
