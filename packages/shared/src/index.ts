//公共方法
//export const IsDEV = process.env.NODE_ENV !== 'production';
export const IsDEV = false
export const isObject = (val: unknown): val is Record<any, any> =>
	val !== null && typeof val === 'object'

export const extend = Object.assign
export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
	objectToString.call(value)
export const isMap = (val: unknown): val is Map<any, any> =>
	toTypeString(val) === '[object Map]'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isInteger = (key) => parseInt(key) + '' === key
export const isArray = Array.isArray
export const isFunction = (val: unknown): val is Function =>
	typeof val === 'function'
export const isNumber = (val: unknown): val is Number => typeof val === 'number'
export const isSameVNodeType = (n1, n2) => {   // 判断是否为同一虚拟节点
	return n1.type == n2.type && n1.key === n2.key
}

export const isReactive = (target) => {
	return !!(target && target._isReactive)
}
export const isRef = (target) => {
	return !!(target && target._v_isRef)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val: object, key: string | symbol)
	: key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChange = (value, oldValue) => value !== oldValue

export const invokeArrayFns = (fns, arg?: any) => {
	for (let i = 0; i < fns.length; i++) {
		fns[i](arg)
	}
}

export const camelize = (string) => {
	return string.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

export const capitalize = (str) => {
	return str[0].toUpperCase() + str.slice(1)
}

// export const queuePostFlushCb = (cb) => { //  cb 可能是一个数组
// 	queueCb(cb, pendingPostFlushCbs)
// }
// const queueCb = (cb, pendingQueue) => {
// 	if (!isArray(cb)) {
// 		pendingQueue.push(cb);
// 	} else {
// 		pendingQueue.push(...cb);
// 	}
// 	queueFlush();
// }
export * from './shapeFlags'