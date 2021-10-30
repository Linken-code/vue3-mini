//公共方法
export const isObject = (val: unknown): val is Record<any, any> =>
	val !== null && typeof val === 'object'

export const extend = Object.assign
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isInteger = (key) => parseInt(key) + '' === key
export const isArray = Array.isArray
export const isFunction = (val: unknown): val is Function =>
	typeof val === 'function'
const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val: object, key: string | symbol)
	: key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChange = (value, oldValue) => value !== oldValue

export * from './shapeFlags'