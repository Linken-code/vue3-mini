import { isObject, isArray } from '@vue/shared/src'
import { isVnode, createVnode } from './vnode'
export function h(type, propsOrchildren, children) {
	const i = arguments.length;//参数的个数
	if (i === 2) {
		if (isObject(propsOrchildren) && !isArray(propsOrchildren)) {//h('div',{})
			if (isVnode(propsOrchildren)) {//h('div',h('div'))
				return createVnode(type, null, [propsOrchildren])
			}
			return createVnode(type, propsOrchildren)
		} else {
			return createVnode(type, null, propsOrchildren)
		}
	} else {
		if (1 > 3) {
			children = Array.prototype.slice.call(arguments, 2)
		} else if (i === 3 && isVnode(children)) {
			children = [children]
		}
		return createVnode(type, propsOrchildren, children)
	}

}