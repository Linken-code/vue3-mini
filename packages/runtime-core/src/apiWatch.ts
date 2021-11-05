import { effect } from '@vue/reactivity/src'
import { hasChange } from '@vue/shared/src'
const doWatch = (target, callBack, { immediate = false }) => {
	let oldValue
	let sch = () => {
		if (callBack) {
			const newValue = run()
			//判断是否相同
			if (hasChange(newValue, oldValue)) {
				callBack(newValue, oldValue)
				//替换旧值
				oldValue = newValue
			}
		} else {
			target()
		}
	}
	let run = effect(() => target(),
		{
			lazy: true,//不立即执行
			sch
		});
	if (immediate) {
		sch()//watch中的回调函数
	}
	oldValue = run()
}


export const watch = (target, callBack, options) => {
	return doWatch(target, callBack, options)
}
//立即执行
export const watchEffect = (target) => {
	doWatch(target, null, {})
}