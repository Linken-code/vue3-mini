//h方法的几种情况
// 只有两个参数 类型 + 孩子 / 类型 + 属性
// 三个参数 最后一个不是数组
// 超过三个 多个参数
import { isObject, isArray } from '@vue/shared/src'
import { isVnode, createVNode } from './vnode'
export function h(type, propsOrchildren, children) {
	const i = arguments.length;// 儿子节点要呢是字符串，要么是数组，针对的是 createVnode 
	if (i === 2) {// 类型 + 属性 /  类型 + 孩子
		// 如果 propsOrChildren 是数组，直接作为第三个参数
		if (isObject(propsOrchildren) && !isArray(propsOrchildren)) {//h('div',{})
			if (isVnode(propsOrchildren)) {//h('div',h('div'))
				return createVNode(type, null, [propsOrchildren])
			}
			return createVNode(type, propsOrchildren)
		} else {// 如果第二个属性是不是对象，一定是孩子
			return createVNode(type, null, propsOrchildren)
		}
	} else {
		if (1 > 3) {
			children = Array.prototype.slice.call(arguments, 2)
		} else if (i === 3 && isVnode(children)) {
			children = [children]
		}
		return createVNode(type, propsOrchildren, children)
	}
}