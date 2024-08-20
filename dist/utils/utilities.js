"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeDataPathKey = exports.keysToLowercase = exports.fuzzyCompare = exports.compareItems = exports.flattenKeys = exports.shuffleArray = void 0;
exports.chunk = chunk;
exports.flatten = flatten;
exports.updateDisplayOptions = updateDisplayOptions;
exports.processJsonInput = processJsonInput;
exports.wrapData = wrapData;
exports.formatPrivateKey = formatPrivateKey;
exports.getResolvables = getResolvables;
exports.flattenObject = flattenObject;
exports.capitalize = capitalize;
exports.generatePairedItemData = generatePairedItemData;
exports.preparePairedItemDataArray = preparePairedItemDataArray;
const n8n_workflow_1 = require("n8n-workflow");
const lodash_1 = require("lodash");
function chunk(array, size = 1) {
    const length = array === null ? 0 : array.length;
    if (!length || size < 1) {
        return [];
    }
    let index = 0;
    let resIndex = 0;
    const result = new Array(Math.ceil(length / size));
    while (index < length) {
        result[resIndex++] = array.slice(index, (index += size));
    }
    return result;
}
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = (0, n8n_workflow_1.randomInt)(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
};
exports.shuffleArray = shuffleArray;
const flattenKeys = (obj, prefix = []) => {
    return !(0, lodash_1.isObject)(obj)
        ? { [prefix.join('.')]: obj }
        : (0, lodash_1.reduce)(obj, (cum, next, key) => (0, lodash_1.merge)(cum, (0, exports.flattenKeys)(next, [...prefix, key])), {});
};
exports.flattenKeys = flattenKeys;
function flatten(nestedArray) {
    const result = [];
    (function loop(array) {
        for (let i = 0; i < array.length; i++) {
            if (Array.isArray(array[i])) {
                loop(array[i]);
            }
            else {
                result.push(array[i]);
            }
        }
    })(nestedArray);
    return result;
}
const compareItems = (obj1, obj2, keys, disableDotNotation = false) => {
    let result = true;
    for (const key of keys) {
        if (!disableDotNotation) {
            if (!(0, lodash_1.isEqual)((0, lodash_1.get)(obj1.json, key), (0, lodash_1.get)(obj2.json, key))) {
                result = false;
                break;
            }
        }
        else {
            if (!(0, lodash_1.isEqual)(obj1.json[key], obj2.json[key])) {
                result = false;
                break;
            }
        }
    }
    return result;
};
exports.compareItems = compareItems;
function updateDisplayOptions(displayOptions, properties) {
    return properties.map((nodeProperty) => {
        return {
            ...nodeProperty,
            displayOptions: (0, lodash_1.merge)({}, nodeProperty.displayOptions, displayOptions),
        };
    });
}
function processJsonInput(jsonData, inputName) {
    let values;
    const input = inputName ? `'${inputName}' ` : '';
    if (typeof jsonData === 'string') {
        try {
            values = (0, n8n_workflow_1.jsonParse)(jsonData);
        }
        catch (error) {
            throw new n8n_workflow_1.ApplicationError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
        }
    }
    else if (typeof jsonData === 'object') {
        values = jsonData;
    }
    else {
        throw new n8n_workflow_1.ApplicationError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
    }
    return values;
}
function isFalsy(value) {
    if ((0, lodash_1.isNull)(value))
        return true;
    if (typeof value === 'string' && value === '')
        return true;
    if (Array.isArray(value) && value.length === 0)
        return true;
    return false;
}
const parseStringAndCompareToObject = (str, arr) => {
    try {
        const parsedArray = (0, n8n_workflow_1.jsonParse)(str);
        return (0, lodash_1.isEqual)(parsedArray, arr);
    }
    catch (error) {
        return false;
    }
};
const fuzzyCompare = (useFuzzyCompare, compareVersion = 1) => {
    if (!useFuzzyCompare) {
        return (item1, item2) => (0, lodash_1.isEqual)(item1, item2);
    }
    return (item1, item2) => {
        if (!(0, lodash_1.isNull)(item1) && !(0, lodash_1.isNull)(item2) && typeof item1 === typeof item2) {
            return (0, lodash_1.isEqual)(item1, item2);
        }
        if (compareVersion >= 2) {
            if ((0, lodash_1.isNull)(item1) && ((0, lodash_1.isNull)(item2) || item2 === 0 || item2 === '0')) {
                return true;
            }
            if ((0, lodash_1.isNull)(item2) && ((0, lodash_1.isNull)(item1) || item1 === 0 || item1 === '0')) {
                return true;
            }
        }
        if (isFalsy(item1) && isFalsy(item2))
            return true;
        if (isFalsy(item1) && item2 === undefined)
            return true;
        if (item1 === undefined && isFalsy(item2))
            return true;
        if (typeof item1 === 'number' && typeof item2 === 'string') {
            return item1.toString() === item2;
        }
        if (typeof item1 === 'string' && typeof item2 === 'number') {
            return item1 === item2.toString();
        }
        if (!(0, lodash_1.isNull)(item1) && typeof item1 === 'object' && typeof item2 === 'string') {
            return parseStringAndCompareToObject(item2, item1);
        }
        if (!(0, lodash_1.isNull)(item2) && typeof item1 === 'string' && typeof item2 === 'object') {
            return parseStringAndCompareToObject(item1, item2);
        }
        if (typeof item1 === 'boolean' && typeof item2 === 'string') {
            if (item1 === true && item2.toLocaleLowerCase() === 'true')
                return true;
            if (item1 === false && item2.toLocaleLowerCase() === 'false')
                return true;
        }
        if (typeof item2 === 'boolean' && typeof item1 === 'string') {
            if (item2 === true && item1.toLocaleLowerCase() === 'true')
                return true;
            if (item2 === false && item1.toLocaleLowerCase() === 'false')
                return true;
        }
        if (typeof item1 === 'boolean' && typeof item2 === 'number') {
            if (item1 === true && item2 === 1)
                return true;
            if (item1 === false && item2 === 0)
                return true;
        }
        if (typeof item2 === 'boolean' && typeof item1 === 'number') {
            if (item2 === true && item1 === 1)
                return true;
            if (item2 === false && item1 === 0)
                return true;
        }
        if (typeof item1 === 'boolean' && typeof item2 === 'string') {
            if (item1 === true && item2 === '1')
                return true;
            if (item1 === false && item2 === '0')
                return true;
        }
        if (typeof item2 === 'boolean' && typeof item1 === 'string') {
            if (item2 === true && item1 === '1')
                return true;
            if (item2 === false && item1 === '0')
                return true;
        }
        return (0, lodash_1.isEqual)(item1, item2);
    };
};
exports.fuzzyCompare = fuzzyCompare;
function wrapData(data) {
    if (!Array.isArray(data)) {
        return [{ json: data }];
    }
    return data.map((item) => ({
        json: item,
    }));
}
const keysToLowercase = (headers) => {
    if (typeof headers !== 'object' || Array.isArray(headers) || headers === null)
        return headers;
    return Object.entries(headers).reduce((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
    }, {});
};
exports.keysToLowercase = keysToLowercase;
function formatPrivateKey(privateKey, keyIsPublic = false) {
    let regex = /(PRIVATE KEY|CERTIFICATE)/;
    if (keyIsPublic) {
        regex = /(PUBLIC KEY)/;
    }
    if (!privateKey || /\n/.test(privateKey)) {
        return privateKey;
    }
    let formattedPrivateKey = '';
    const parts = privateKey.split('-----').filter((item) => item !== '');
    parts.forEach((part) => {
        if (regex.test(part)) {
            formattedPrivateKey += `-----${part}-----`;
        }
        else {
            const passRegex = /Proc-Type|DEK-Info/;
            if (passRegex.test(part)) {
                part = part.replace(/:\s+/g, ':');
                formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
            }
            else {
                formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
            }
        }
    });
    return formattedPrivateKey;
}
function getResolvables(expression) {
    if (!expression)
        return [];
    const resolvables = [];
    const resolvableRegex = /({{[\s\S]*?}})/g;
    let match;
    while ((match = resolvableRegex.exec(expression)) !== null) {
        if (match[1]) {
            resolvables.push(match[1]);
        }
    }
    return resolvables;
}
function flattenObject(data) {
    var _a;
    const returnData = {};
    for (const key1 of Object.keys(data)) {
        if (data[key1] !== null && typeof data[key1] === 'object') {
            if (data[key1] instanceof Date) {
                returnData[key1] = (_a = data[key1]) === null || _a === void 0 ? void 0 : _a.toString();
                continue;
            }
            const flatObject = flattenObject(data[key1]);
            for (const key2 in flatObject) {
                if (flatObject[key2] === undefined) {
                    continue;
                }
                returnData[`${key1}.${key2}`] = flatObject[key2];
            }
        }
        else {
            returnData[key1] = data[key1];
        }
    }
    return returnData;
}
function capitalize(str) {
    if (!str)
        return str;
    const chars = str.split('');
    chars[0] = chars[0].toUpperCase();
    return chars.join('');
}
function generatePairedItemData(length) {
    return Array.from({ length }, (_, item) => ({
        item,
    }));
}
function preparePairedItemDataArray(pairedItem) {
    if (pairedItem === undefined)
        return [];
    if (typeof pairedItem === 'number')
        return [{ item: pairedItem }];
    if (Array.isArray(pairedItem))
        return pairedItem;
    return [pairedItem];
}
const sanitizeDataPathKey = (item, key) => {
    if (item[key] !== undefined) {
        return key;
    }
    if ((key.startsWith("['") && key.endsWith("']")) ||
        (key.startsWith('["') && key.endsWith('"]'))) {
        key = key.slice(2, -2);
        if (item[key] !== undefined) {
            return key;
        }
    }
    return key;
};
exports.sanitizeDataPathKey = sanitizeDataPathKey;
//# sourceMappingURL=utilities.js.map