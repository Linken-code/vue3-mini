import { isObject, isReactive } from '@vue/shared/src'
import {
	reactiveHandlers,
	shallowReactiveHandlers,
	readonlyHandlers,
	shallowReadonlyHandlers
} from './baseHandlers'

const reactiveMap = new WeakMap()//key 必须是对象，自动垃圾回收
const readonlyMap = new WeakMap()
//实现核心代理

const createReactObj = (target, isReadonly, baseHandlers) => {
	//判断target是否为对象
	if (!isObject(target)) {
		return target
	}

	//判断是否只读,进行映射
	const proxyMap = isReadonly ? readonlyMap : reactiveMap
	//判断缓存中是否有这个对象
	const exisitProxy = proxyMap.get(target)//已经代理过了
	if (exisitProxy) {
		return exisitProxy
	}
	// if (isReactive(target)) {
	// 	return target
	// }

	//进行代理
	const proxy = new Proxy(target, baseHandlers)
	proxyMap.set(target, proxy)//存放代理对象
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

