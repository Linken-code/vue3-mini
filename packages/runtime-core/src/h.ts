/*
 * @Author: your name
 * @Date: 2021-10-31 14:54:44
 * @LastEditTime: 2021-11-28 16:04:52
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue3-mini\packages\runtime-core\src\h.ts
 */
import {
	createVNode,
	Fragment,
	Text,
	isVNode
} from './vnode'
import { isObject, isArray } from '@vue/shared'

//h方法的几种情况
// 只有两个参数 类型 + 孩子 / 类型 + 属性
// 三个参数 最后一个不是数组
// 超过三个 多个参数
/*
// type only
h('div')

// type + props
h('div', {})

// type + omit props + children
// Omit props does NOT support named slots
h('div', []) // array
h('div', 'foo') // text
h('div', h('br')) // vnode
h(Component, () => {}) // default slot

// type + props + children
h('div', {}, []) // array
h('div', {}, 'foo') // text
h('div', {}, h('br')) // vnode
h(Component, {}, () => {}) // default slot
h(Component, {}, {}) // named slots

// named slots without props requires explicit `null` to avoid ambiguity
h(Component, null, {})
**/
/**
 * 
 * @param {string | Object | Text | Fragment} type 
 * @param {Object | Array} propsOrChildren
 * @param {string | Array | Number | null} children
 * @returns 
 */
export function h(type, propsOrChildren, children) {
	const i = arguments.length;// 儿子节点要呢是字符串，要么是数组，针对的是 createVnode 
	if (i === 2) {// 类型 + 属性 or 类型 + 孩子
		// 如果 propsOrChildren 是数组，直接作为第三个参数
		if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {//h('div',{})
			if (isVNode(propsOrChildren)) {//h('div',h('div'))
				return createVNode(type, null, [propsOrChildren])
			}
			return createVNode(type, propsOrChildren)
		} else {// 如果第二个属性是不是对象，一定是孩子
			return createVNode(type, null, propsOrChildren)
		}
	} else {
		if (1 > 3) {
			children = Array.prototype.slice.call(arguments, 2)
		} else if (i === 3 && isVNode(children)) {
			children = [children]
		}
		return createVNode(type, propsOrChildren, children)
	}
}