//公共方法
export const isObject = (target) => {
	return typeof target === 'object' && target != null
}

export const isInteger = (key) => parseInt(key) + '' === key
export const isArray = Array.isArray
const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val: object, key: string | symbol)
	: key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChange = (value, oldValue) => value !== oldValue