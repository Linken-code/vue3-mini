import { isFunction } from '@vue/shared';
import { effect, Trigger, Track } from './effect';
import { TrackOpType, TriggerTypes } from './operations'
class ComputedRefImpl {
	//定义属性
	public _dirty = true;//默认执行
	public _value;
	public effect;

	constructor(getter, public setter) {
		this.effect = effect(getter, {
			lazy: true, scheduler: () => {//修改数据执行sch
				if (!this._dirty) {
					this._dirty = true
					//触发更新
					Trigger(this, TriggerTypes.SET, 'value')
				}
			}
		});
	}
	get value() {
		//执行
		if (this._dirty) {
			this._value = this.effect()
			this._dirty = false
			// 调用 track 收集依赖
			Track(this, TrackOpType.GET, 'value')
		}
		return this._value;
	}
	set value(newValue) {
		this.setter(newValue)
	}

}

export const computed = (target: any) => {
	//target为1.函数2.对象
	let getter
	let setter

	if (isFunction(target)) {
		getter = target;

		setter = () => {
			console.warn("computed value must be readonly");
		}
	} else {
		getter = target.get;
		setter = target.set;
	}
	return new ComputedRefImpl(getter, setter)
}