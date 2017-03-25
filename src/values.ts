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

import * as deploy_contracts from './contracts';
import * as deploy_helpers from './helpers';


/**
 * A basic value.
 */
export abstract class ValueBase implements deploy_contracts.ObjectWithNameAndValue {
    /**
     * Stores the underlying item.
     */
    protected readonly _ITEM: deploy_contracts.ValueWithName;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {deploy_contracts.ValueWithName} [item] The underlying item.
     */
    constructor(item?: deploy_contracts.ValueWithName) {
        if (!item) {
            item = {
                name: undefined,
                type: undefined,
            };
        }
        
        this._ITEM = item;
    }

    /**
     * Gets the underlying item.
     */
    public get item(): deploy_contracts.ValueWithName {
        return this._ITEM;
    }

    /** @inheritdoc */
    public get name(): string {
        return this.item.name;
    }

    /** @inheritdoc */
    public abstract get value(): any;
}

export class CodeValue extends ValueBase {
    /** @inheritdoc */
    constructor(value?: deploy_contracts.CodeValueWithName) {
        super(value);
    }

    
    /** @inheritdoc */
    public get code(): string {
        return deploy_helpers.toStringSafe(this.item.code);
    }

    /**
     * Gets the underlying item.
     */
    public get item(): deploy_contracts.CodeValueWithName {
        return <deploy_contracts.CodeValueWithName>super.item;
    }

    /** @inheritdoc */
    public get value(): any {
        return eval(this.code);
    }
}

/**
 * A static value.
 */
export class StaticValue extends ValueBase {
    /** @inheritdoc */
    constructor(value?: deploy_contracts.StaticValueWithName) {
        super(value);
    }

    /**
     * Gets the underlying item.
     */
    public get item(): deploy_contracts.StaticValueWithName {
        return <deploy_contracts.StaticValueWithName>super.item;
    }

    /** @inheritdoc */
    public get value(): any {
        return this.item.value;
    }
}

/**
 * Converts a list of value items to objects.
 * 
 * @param {(deploy_contracts.ValueWithName|deploy_contracts.ValueWithName[])} items The item(s) to convert.
 *  
 * @returns {ValueBase[]} The items as objects. 
 */
export function toValueObjects(items: deploy_contracts.ValueWithName | deploy_contracts.ValueWithName[]): ValueBase[] {
    let result: ValueBase[] = [];

    deploy_helpers.asArray(items).filter(i => i).forEach(i => {
        let newValue: ValueBase;
        
        switch (deploy_helpers.normalizeString(i.type)) {
            case '':
            case 'static':
                newValue = new StaticValue(<deploy_contracts.StaticValueWithName>i);
                break;

            case 'code':
                newValue = new CodeValue(<deploy_contracts.CodeValueWithName>i);
                break;
        }

        if (newValue) {
            result.push(newValue);
        }
    });

    return result;
}
