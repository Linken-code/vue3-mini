//创建vnode 与h函数相同
export const createVnode = (type, props, children = null) => {
	let shapeFlag
	const vnode = {
		_v_isVnode: true,//是vnode节点
		type,
		props,
		children,
		key: props && props.key,//diff用来对比
		el: null,//虚拟dom元素
		shapeFlag
	}
	return vnode
}