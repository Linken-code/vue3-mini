import { createVnode } from "./vnode"
export const apiCreateApp = (render) => {
	return {
		createApp(rootComponent, rootProps) {
			let app = {
				//添加属性
				_component: rootComponent,
				_props: rootProps,
				_container: null,

				mount(container) {
					//创建vnode节点
					let vnode = createVnode(rootComponent, rootProps)
					render(vnode, container)
					app._component = container
				}

			}
			return app
		}
	}



}


