//自定义属性
export const patchAttr = (el, key, value) => {
	//value值为空
	if (value === null) {
		el.removeAttribute(key)
	} else {
		el.addAttribute(key, value)
	}
}