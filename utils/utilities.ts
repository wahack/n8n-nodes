import type {
	IDataObject,
	IDisplayOptions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';

import { ApplicationError, jsonParse, randomInt } from 'n8n-workflow';

import { isEqual, get } from 'radash';



/**
 * Creates an array of elements split into groups the length of `size`.
 * If `array` can't be split evenly, the final chunk will be the remaining
 * elements.
 *
 * @param {Array} array The array to process.
 * @param {number} [size=1] The length of each chunk
 * @example
 *
 * chunk(['a', 'b', 'c', 'd'], 2)
 * // => [['a', 'b'], ['c', 'd']]
 *
 * chunk(['a', 'b', 'c', 'd'], 3)
 * // => [['a', 'b', 'c'], ['d']]
 */

export function chunk<T>(array: T[], size = 1) {
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
	return result as T[][];
}

/**
 * Shuffles an array in place using the Fisher-Yates shuffle algorithm
 * @param {Array} array The array to shuffle.
 */
export const shuffleArray = <T>(array: T[]): void => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[array[i], array[j]] = [array[j], array[i]];
	}
};

/**
 * Takes a multidimensional array and converts it to a one-dimensional array.
 *
 * @param {Array} nestedArray The array to be flattened.
 * @example
 *
 * flatten([['a', 'b'], ['c', 'd']])
 * // => ['a', 'b', 'c', 'd']
 *
 */

export function flatten<T>(nestedArray: T[][]) {
	const result = [];

	(function loop(array: T[] | T[][]) {
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(array[i])) {
				loop(array[i] as T[]);
			} else {
				result.push(array[i]);
			}
		}
	})(nestedArray);

	//TODO: check logic in MicrosoftSql.node.ts

	return result as any;
}

/**
 * Compares the values of specified keys in two objects.
 *
 * @param {T} obj1 - The first object to compare.
 * @param {T} obj2 - The second object to compare.
 * @param {string[]} keys - An array of keys to compare.
 * @param {boolean} disableDotNotation - Whether to use dot notation to access nested properties.
 * @returns {boolean} - Whether the values of the specified keys are equal in both objects.
 */
export const compareItems = <T extends { json: Record<string, unknown> }>(
	obj1: T,
	obj2: T,
	keys: string[],
	disableDotNotation: boolean = false,
): boolean => {
	let result = true;
	for (const key of keys) {
		if (!disableDotNotation) {
			if (!isEqual(get(obj1.json, key), get(obj2.json, key))) {
				result = false;
				break;
			}
		} else {
			if (!isEqual(obj1.json[key], obj2.json[key])) {
				result = false;
				break;
			}
		}
	}
	return result;
};

export function updateDisplayOptions(
	displayOptions: IDisplayOptions,
	properties: INodeProperties[],
) {
	return properties.map((nodeProperty) => {
		return {
			...nodeProperty,
			displayOptions: { ...nodeProperty.displayOptions, ...displayOptions },
		};
	});
}

export function processJsonInput<T>(jsonData: T, inputName?: string) {
	let values;
	const input = inputName ? `'${inputName}' ` : '';

	if (typeof jsonData === 'string') {
		try {
			values = jsonParse(jsonData);
		} catch (error) {
			// @ts-ignore
			throw new ApplicationError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
		}
	} else if (typeof jsonData === 'object') {
		values = jsonData;
	} else {
			// @ts-ignore

		throw new ApplicationError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
	}

	return values;
}

export function wrapData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export const keysToLowercase = <T>(headers: T) => {
	if (typeof headers !== 'object' || Array.isArray(headers) || headers === null) return headers;
	return Object.entries(headers).reduce((acc, [key, value]) => {
		acc[key.toLowerCase()] = value as IDataObject;
		return acc;
	}, {} as IDataObject);
};

/**
 * Formats a private key by removing unnecessary whitespace and adding line breaks.
 * @param privateKey - The private key to format.
 * @returns The formatted private key.
 */
export function formatPrivateKey(privateKey: string, keyIsPublic = false): string {
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
		} else {
			const passRegex = /Proc-Type|DEK-Info/;
			if (passRegex.test(part)) {
				part = part.replace(/:\s+/g, ':');
				formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			} else {
				formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			}
		}
	});
	return formattedPrivateKey;
}

/**
 * @TECH_DEBT Explore replacing with handlebars
 */
export function getResolvables(expression: string) {
	if (!expression) return [];

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

/**
 * Flattens an object with deep data
 *
 * @param {IDataObject} data The object to flatten
 */
export function flattenObject(data: IDataObject) {
	const returnData: IDataObject = {};
	for (const key1 of Object.keys(data)) {
		if (data[key1] !== null && typeof data[key1] === 'object') {
			if (data[key1] instanceof Date) {
				returnData[key1] = data[key1]?.toString();
				continue;
			}
			const flatObject = flattenObject(data[key1] as IDataObject);
			for (const key2 in flatObject) {
				if (flatObject[key2] === undefined) {
					continue;
				}
				returnData[`${key1}.${key2}`] = flatObject[key2];
			}
		} else {
			returnData[key1] = data[key1];
		}
	}
	return returnData;
}

/**
 * Capitalizes the first letter of a string
 *
 * @param {string} string The string to capitalize
 */
export function capitalize(str: string): string {
	if (!str) return str;

	const chars = str.split('');
	chars[0] = chars[0].toUpperCase();

	return chars.join('');
}

export function generatePairedItemData(length: number): IPairedItemData[] {
	return Array.from({ length }, (_, item) => ({
		item,
	}));
}

/**
 * Output Paired Item Data Array
 *
 * @param {number | IPairedItemData | IPairedItemData[] | undefined} pairedItem
 */
export function preparePairedItemDataArray(
	pairedItem: number | IPairedItemData | IPairedItemData[] | undefined,
): IPairedItemData[] {
	if (pairedItem === undefined) return [];
	if (typeof pairedItem === 'number') return [{ item: pairedItem }];
	if (Array.isArray(pairedItem)) return pairedItem;
	return [pairedItem];
}

export const sanitizeDataPathKey = (item: IDataObject, key: string) => {
	if (item[key] !== undefined) {
		return key;
	}

	if (
		(key.startsWith("['") && key.endsWith("']")) ||
		(key.startsWith('["') && key.endsWith('"]'))
	) {
		key = key.slice(2, -2);
		if (item[key] !== undefined) {
			return key;
		}
	}
	return key;
};
