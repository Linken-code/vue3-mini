import { createVNode } from "./vnode"

export const apiCreateApp = (render) => {
	return function createApp(rootComponent, rootProps = null) {
		const app = {
			_props: rootProps, // 属性
			_component: rootComponent, // 组件
			_container: null,
			mount(rootContainer) {
				// 1.通过rootComponent 创建vnode
				// 2.调用render方法将vnode渲染到rootContainer中
				const vnode = createVNode(rootComponent, rootProps);
				render(vnode, rootContainer);
				app._container = rootContainer
			}
		}
		return app;
	}
}
