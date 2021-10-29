import { extend } from "@vue/shared"
import { nodeOps } from "./nodeOps"
import { patchProps } from "./patchProp"
import { createRender } from "@vue/runtime-core/src"
const renderOptionsDom = extend({ patchProps }, nodeOps)

export { renderOptionsDom }

export const createApp = (rootComponent, rootProps) => {
	let app = createRender(renderOptionsDom).createApp(rootComponent, rootProps)
	let { mount } = app
	app.mount = (container) => {
		//挂载组件，清空之前的内容
		container = nodeOps.qureyElement(container)
		container.innerHTML = ''
		//将组件渲染的dom元素进行挂载
		mount(container)
	}
	return app
}

