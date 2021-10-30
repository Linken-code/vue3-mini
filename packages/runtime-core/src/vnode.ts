import { isString, isObject, isArray, ShapeFlags } from '@vue/shared'

//子节点标识h('div',{style:{color:red}},[])
const normalizeChildren = (vnode, children) => {
	let type = 0
	if (children === null) {
		return
	} else if (isArray(children)) {
		type = ShapeFlags.ARRAY_CHILDREN
	} else {
		type = ShapeFlags.TEXT_CHILDREN
	}
	vnode.shapeFlag = vnode.shapeFlag | type //00000100|0000100=00001100合并
}

//创建vnode 与h函数相同
export const createVnode = (type, props, children = null) => {
	let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ?
		ShapeFlags.STATEFUL_COMPONENT : 0//标识
	const vnode = {
		_v_isVnode: true,//是vnode节点
		type,
		props,
		children,
		key: props && props.key,//diff用来对比
		el: null,//虚拟dom元素
		shapeFlag
	}
	normalizeChildren(vnode, children)
	return vnode
}