// runtime-dom 操作节点、操作属性更新
import { createRender } from "@vue/runtime-core/src/index";
import { extend } from "@vue/shared/src";
import { nodeOps } from "./nodeOps";        // 对象
import { patchProps } from "./patchProp";    // 方法

export * from '@vue/runtime-core' // 后续将 runtime-core 中的方法都在这里暴露

// 渲染时用到的所有方法
const rendererOptions = extend({ patchProps }, nodeOps);
export { rendererOptions }
// vue中 runtime-core 提供了核心的方法，用来处理渲染的，他会使用runtime-dom 中的 api 进行渲染
export function createApp(rootComponent, rootProps = null) {
	const app = createRender(rendererOptions).createApp(rootComponent, rootProps)
	let { mount } = app
	app.mount = function (container) {
		// 清空容器
		container = document.querySelector(container);
		container.innerHTML = '';
		mount(container);   //函数劫持
		// 将组件渲染成DOM元素，进行挂载
	}
	return app;
}
