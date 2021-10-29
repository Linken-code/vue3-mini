//style样式
export const patchStyle = (el, pre, next) => {
	//定义样式
	const style = el.style;

	//新值为空
	if (next === null) {
		el.removeAttribute("style")
	} else {
		//新值为空
		if (pre) {
			for (let key in pre) {
				if (next[key] === null) {
					style[key] = ''
				}
			}
		}

		//赋值
		for (let key in next) {
			style[key] = next[key]
		}
	}
}