
// runtime-dom 操作节点、操作属性更新
import { createRenderer } from "@vue/runtime-core/src";
import { extend, isFunction, isString, IsDEV } from "@vue/shared/src";
import { nodeOps } from "./nodeOps";        // 对象
import { patchProps } from "./patchProp";    // 方法
// re-export everything from core
// h, Component, reactivity API, nextTick, flags & types
export * from '@vue/runtime-core'// 后续将 runtime-core 中的方法都在这里暴露
// 渲染时用到的所有方法
const rendererOptions = extend({ patchProps }, nodeOps);

let renderer

function ensureRenderer() {
	return (
		renderer ||
		(renderer = createRenderer(rendererOptions))
	)
}

export const render = (
	(...args) => {
		ensureRenderer().render(...args)
	}
)

// vue中 runtime-core 提供了核心的方法，用来处理渲染的，他会使用runtime-dom 中的 api 进行渲染
export function createApp(rootComponent, rootProps = null) {
	const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps)
	const { mount } = app
	app.mount = (containerOrSelector) => {
		// 获取 DOM 容器节点
		const container = normalizeContainer(containerOrSelector)
		// 不是合法的 DOM 节点 return
		if (!container) return
		// 获取定义的 Vue app 对象, 之前的 rootComponent
		const component = app._component
		// 如果不是函数、没有 render 方法、没有 template 使用 DOM 元素内的 innerHTML 作为内容
		if (!isFunction(component) && !component.render && !component.template) {
			component.template = container.innerHTML
		}
		// clear content before mounting
		container.innerHTML = ''
		// 真正的挂载
		const proxy = mount(container)

		// ...
		return proxy
	}
	return app;
}

function normalizeContainer(
	container: Element | ShadowRoot | string
): Element | null {
	if (isString(container)) {
		const res = document.querySelector(container)
		if (IsDEV && !res) {
			console.log(`Failed to mount app: mount target selector "${container}" returned null.`);
		}
		return res
	}
	if (
		IsDEV &&
		window.ShadowRoot &&
		container instanceof window.ShadowRoot &&
		container.mode === 'closed'
	) {
		console.log(`mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`);

	}
	return container as any
}