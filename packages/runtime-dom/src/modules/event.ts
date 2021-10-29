//事件 @click

const createInvoker = (value) => {
	const fn = (e) => {
		fn.value(e)
	}
	fn.value = value
	return fn
}

export const patchEvent = (el, key, value) => {
	//函数缓存
	const invokers = el._vei || (el._vei = {})
	const exists = invokers[key]

	//都有值
	if (exists && value) {
		exists.value = value
	} else {
		const eventName = key.slice(2).toLowerCase()
		//有新值
		if (value) {
			let invoker = invokers[eventName] = createInvoker(value)
			el.addEventListener(eventName, invoker)
		} else {//没有值则删除旧值
			el.removeEventListener(eventName)
			//清除缓存
			invokers[eventName] = null
		}
	}
}