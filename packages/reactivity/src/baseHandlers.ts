import { reactive, readonly } from './reactive';
import { isObject, hasOwn, isInteger, isArray, hasChange } from '@vue/shared/src'
import { Track, Trigger } from './effect'
import { TrackOpType, TriggerTypes } from './operations'
//getter
const createGetter = (isReadonly = false, shallow = false) => {
	return (target, key, receiver) => {
		//反射
		const res = Reflect.get(target, key, receiver)
		//只读
		if (!isReadonly) {//不是只读
			//收集依赖 effect
			Track(target, TrackOpType.GET, key)
		}

		//浅层
		if (shallow) {//是浅层
			return res
		}

		//如果res是对象，则递归 称为懒代理
		if (isObject(res)) {
			return isReadonly ? readonly(res) : reactive(res)
		}
		return res
	}
}
//get params 1、true只读readonly 2、true浅层shallow
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

//setter
const createSetter = (shallow = false) => {
	return (target, key, value, receiver) => {
		//获取之前的值
		const oldValue = target[key]
		//判断是否有值
		let hasKey = isArray(target) && isInteger(key) ?
			Number(key) < target.length
			: hasOwn(target, key)
		//获取最新的值
		const result = Reflect.set(target, key, value, receiver)
		if (!hasKey) {//没有key
			//新增
			Trigger(target, TriggerTypes.ADD, key, value)
		} else {//修改 
			//判断新值和原来是否相同
			if (hasChange(value, oldValue)) {
				Trigger(target, TriggerTypes.SET, key, value, oldValue)
			}
		}
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
	set: shallowSet
}
export const readonlyHandlers = {
	get: readonlyGet,
	set: (target, key, value) => {
		console.log(`set on key ${key} is failed!`);
	}
}
export const shallowReadonlyHandlers = {
	get: shallowReadonlyGet,
	set: (target, key, value) => {
		console.log(`set on key ${key} is failed!`);
	}
}

