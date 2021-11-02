import { Track, Trigger } from "./effect"
import { TrackOpType, TriggerTypes } from "./operations"
import { hasChange, isArray, isObject } from '@vue/shared/src'
import { reactive } from './reactive'

const convert = (target) => {
	return isObject(target) ? reactive(target) : target
}
class RefImpl {
	public _v_isRef = true;//标识Ref
	public _value

	constructor(public rawValue, public shallow) {
		this._value = convert(rawValue)
	}
	//getter
	get value() {
		//收集依赖
		Track(this, TrackOpType.GET, "value")
		return this._value
	}

	//setter
	set value(newValue) {
		if (hasChange(newValue, this._value)) {
			this._value = convert(newValue)
			this.rawValue = newValue
			Trigger(this, TriggerTypes.SET, 'value', newValue)
		}

	}
}
class ObjectRefImpl {
	public _v_isRef = true
	constructor(public target, public key) {

	}

	//getter
	get value() {
		return this.target[this.key]
	}

	//setter
	set value(newValue) {
		if (newValue) {
			this.target[this.key] = newValue
		}

	}
}
//创建ref
const createRef = (target, shallow = false) => {
	return new RefImpl(target, shallow)
}

//Ref
export const ref = (target: any) => {
	return createRef(target)
}

export const shallowRef = (target: any) => {
	return createRef(target, true)
}

export const toRef = (target: any, key: any) => {
	return new ObjectRefImpl(target, key)
}

export const toRefs = (target: any) => {
	let arr = isArray(target) ? new Array(target.length) : {}
	for (let key in target) {
		arr[key] = toRef(target, key)
	}
	return arr
}
