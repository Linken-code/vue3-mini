import { Track, trigger } from "./effect"
import { TrackOpType, TriggerTypes } from "./operations"
import { hasChange, isArray } from '@vue/shared/src'

class RefImpl {
	public _v_isRef = true;//标识Ref
	public _value //声明变量

	constructor(public rawValue, public shallow) {
		this._value = rawValue
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
			this._value = newValue
			this.rawValue = newValue
			trigger(this, TriggerTypes.SET, 'value', newValue)
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
