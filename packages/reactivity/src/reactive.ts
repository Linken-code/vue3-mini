import { isObject } from '@vue/shared/src'
import {
	reactiveHandlers,
	shallowReactiveHandlers,
	readonlyHandlers,
	shallowReadonlyHandlers
} from './baseHandlers'

const reactiveMap = new WeakMap()//key 必须是对象，自动垃圾回收，不会造成内存泄漏
const readonlyMap = new WeakMap()
//实现核心代理
const createReactObj = (target, isReadonly, baseHandlers) => {
	//判断target是否为对象, typeof 不是 object 类型的，直接返回
	if (!isObject(target)) {
		return target
	}

	//判断是否只读,进行映射
	const proxyMap = isReadonly ? readonlyMap : reactiveMap
	//判断缓存中是否有这个对象
	const exisitProxy = proxyMap.get(target)//已经代理过了
	if (exisitProxy) {//如果已经存在 map 中了，就直接返回
		return exisitProxy
	}

	//进行代理
	const proxy = new Proxy(target, baseHandlers)
	proxyMap.set(target, proxy)//缓存代理对象
	//返回代理对象
	return proxy
}

export const reactive = (target) => {
	return createReactObj(target, false, reactiveHandlers);
}

export const shallowReactive = (target) => {
	return createReactObj(target, false, shallowReactiveHandlers);
}

export const readonly = (target) => {
	return createReactObj(target, true, readonlyHandlers);
}

export const shallowReadonly = (target) => {
	return createReactObj(target, true, shallowReadonlyHandlers);
}

export const toRaw = (observed) => {
	const raw = observed
	return raw
}
