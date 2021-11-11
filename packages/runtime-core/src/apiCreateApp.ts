import { createVNode } from "./vnode"

export const createAppAPI = (render) => {
	return function createApp(rootComponent, rootProps = null) {
		//const context = createAppContext()
		let isMounted = false
		const app = {
			_props: rootProps, // 属性
			_component: rootComponent, // 组件
			_container: null,
			//	_context: context,
			mount(rootContainer) {
				// 1.通过rootComponent 创建vnode
				// 2.调用render方法将vnode渲染到rootContainer中						
				if (!isMounted) {
					// 创建 root vnode
					const vnode = createVNode(rootComponent, rootProps)
					// 缓存 context，首次挂载时设置
					//vnode.appContext = context

					render(vnode, rootContainer)

					isMounted = true
					// 缓存 rootContainer
					app._container = rootContainer
					rootContainer.__vue_app__ = app
					//	return vnode.component.proxy
				}
			}
		}
		return app;
	}
}
