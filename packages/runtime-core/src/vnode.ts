import { isString, isObject, isArray, ShapeFlags } from '@vue/shared'

//子节点标识h('div',{style:{color:red}},[])
const normalizeChildren = (vnode, children) => {
	let type = 0
	if (children === null) {
		children === null
	} else if (isArray(children)) {
		type = ShapeFlags.ARRAY_CHILDREN
	} else if (isString(children)) {
		type = ShapeFlags.TEXT_CHILDREN
	}
	vnode.shapeFlag = vnode.shapeFlag | type //00000100|0000100=00001100合并
	vnode.children = children
}

//创建vnode 与h函数相同
export const createVNode = (type, props, children = null) => {
	let shapeFlag = 0//标识
	// let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ?
	// 	ShapeFlags.STATEFUL_COMPONENT : 0//标识
	if (isString(type)) {
		shapeFlag = ShapeFlags.ELEMENT
	} else if (type === Text) {
		shapeFlag = ShapeFlags.TEXT_CHILDREN
	} else if (type === Fragment) {
		shapeFlag = ShapeFlags.STATEFUL_COMPONENT
	} else {
		shapeFlag = ShapeFlags.COMPONENT
	}
	const vnode = {
		_v_isVnode: true,//是vnode节点
		type,
		props,
		children,
		appContext: null,
		key: props && props.key,//diff用来对比
		el: null,//虚拟dom元素
		component: {},
		shapeFlag//类型标识
	}
	// 处理 children 子节点
	normalizeChildren(vnode, children)
	return vnode
}
//判断是否为虚拟dom
export const isVnode = (vnode) => {
	return vnode._v_isVnode
}

export const Text = Symbol('text')
export const Fragment = Symbol('Fragment')
export const normalizeVNode = (child) => {
	if (isObject(child)) return child
	return createVNode(Text, null, String(child))
}
