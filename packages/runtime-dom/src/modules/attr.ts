
//自定义属性
const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/

export const patchAttr = (el, key, value) => {
	let AttrVal = value
	if (domPropsRE.test(key)) {
		//{checked:""}
		if (AttrVal === "" && typeof el[key] === "boolean") {
			AttrVal = true;
		}
		el[key] = AttrVal;
	} else {
		//value值为空
		if (value == null || value === false) {
			el.removeAttribute(key)
		} else {
			el.setAttribute(key, value)
		}
	}
}