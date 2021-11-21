export const forEachValue = (obj, fn) => {
	Object.keys(obj).forEach((item) => fn(item, obj[item]))
}