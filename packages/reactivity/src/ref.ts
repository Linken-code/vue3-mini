import { Track, trigger } from "./effect"
import { TrackOpType, TriggerTypes } from "./operations"
import { hasChange } from '@vue/shared/src'
//使用 toRefs
export const ref = (target: any) => {
	return createRef(target)
}

export const shallowRef = (target: any) => {
	return createRef(target, true)
}

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



const createRef = (target, shallow = false) => {
	return new RefImpl(target, shallow)
}