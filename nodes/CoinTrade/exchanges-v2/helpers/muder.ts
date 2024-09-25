import muder from 'muder'

const addonFn = {
	toLower: (value: any) => value && value.toLowerCase() || '',
	toUpper: (value: any) => value && value.toUpperCase() || '',
	toString: (value: any) => value && value.toString() || '',
}

export default function<T>(source: any, dest: any, mapper: any, addon?: Record<string, (value: any) => any>): T {
    return Object.assign(dest, muder<T>(source, mapper, {...addonFn, ...(addon||{})}))
}
