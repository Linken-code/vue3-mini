import { reactive, readonly } from './reactive';
import { isObject } from '@vue/shared/src'
//getter
const createGetter = (isReadonly = false, shallow = false) => {
	return (target, key, reaceiver) => {
		//反射
		const res = Reflect.get(target, key, reaceiver)
		//只读
		if (!isReadonly) {//不是只读
			//收集依赖 effect
		}

		//浅层
		if (shallow) {//是浅层
			return res
		}

		//如果res是对象，则递归
		if (isObject(res)) {
			return isReadonly ? readonly(res) : reactive(res)
		}
		return res
	}
}
//get params 1、true只读 2、true浅层
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

//setter
const createSetter = (shallow = false) => {
	return (target, key, value, reaceiver) => {
		const result = Reflect.set(target, key, value, reaceiver)//获取最新的值
		//触发更新
		return result
	}
}
//set params1、true浅层
const set = createSetter()
const shallowSet = createSetter(true)

//暴露方法
export const reactiveHandlers = {
	get,
	set
}
export const shallowReactiveHandlers = {
	get: shallowGet,
	shallowSet
}
export const readonlyHandlers = {
	get: readonlyGet,
	set: (target, key, value) => {
		console.log("set on key is fail");
	}
}
export const shallowReadonlyHandlers = {
	get: shallowReadonlyGet,
	set: (target, key, value) => {
		console.log("set on key is fail");
	}
}

