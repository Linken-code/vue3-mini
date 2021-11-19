
export default {
	name: 'RouterView',
	functional: true,//函数式组件
	props: {
		name: {
			type: String,
			default: 'default'
		}
	},
	render(h, context) {
		let { props, parent, data, children } = context
		const name = props.name;
		const route = parent.$route;
		let depth = 0
		while (parent && parent._routerRoot !== parent) {
			const vnodeData = parent.$vnode ? parent.$vnode.data : {}
			if (vnodeData.routerView) {
				depth++;
			}
			parent = parent.$parent
		}
		data.routerViewDepth = depth
		const matched = route.matched[depth];
		const component = matched && matched.components[name]
		return h(component, data, children);
	}
}