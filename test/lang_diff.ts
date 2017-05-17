import * as i18 from '../src/i18';

import * as en from '../src/lang/en';
import * as other from '../src/lang/de';

function findMissingProperties(enObj: Object, otherObj: Object, path: string[] = []): string[] {
    let result: string[] = [];

    for (let enProp in enObj) {
        if (otherObj.hasOwnProperty(enProp)) {
            let enSubObj = enObj[enProp];
            
            if ('object' !== typeof enSubObj) {
                continue;
            }

            let subPath = path.concat([ enProp ]);

            let subResult = findMissingProperties(enSubObj, otherObj[enProp],
                                                  subPath);

            result = result.concat( subResult );
        }
        else {
            let propName = path.concat([ enProp ]).join('.');

            result.push( propName );
        }
    }

    return result;
}

let props = findMissingProperties(en.translation, other.translation);

props = props.map(x => ('' + x).trim())
             .filter(x => '' !== x);
props = props.filter((p, i) => {
    return i === props.indexOf(p);
});
props = props.sort();

props.forEach(p => {
    console.log('| `' + p + '` |');
});
