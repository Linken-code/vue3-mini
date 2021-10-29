//class样式
export const patchClass = (el, value) => {
	//样式为空
	if (value === null) {
		value = ''
	}
	//class样式赋值
	el.className = value
}