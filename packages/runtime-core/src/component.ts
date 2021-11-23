import { ShapeFlags, isFunction, isObject } from '@vue/shared/src'
import { componentPublicInstance } from './componentPublicInstance'
import { baseCompile } from '@vue/compiler-core'
export let currentInstance
const setupStateComponent = (instance) => {
	// 1. 代理  传递给 render 函数的参数
	instance.proxy = new Proxy(instance.ctx, componentPublicInstance as any)
	// 2. 获取组件的类型，拿到组件的 setup 方法
	const Component = instance.type
	const { setup } = Component;
	//判断组件是否有setup
	if (setup) {  // 有 setup 再创建执行上下文的实例
		currentInstance = instance
		let setupContext = createSetupContext(instance);
		const setupResult = setup(instance.props, setupContext);
		//setup执行完毕
		currentInstance = null;
		// instance 中 props attrs slots emit expose 会被提取出来，因为开发过程中会使用这些属性
		handlerSetupResult(instance, setupResult)
	} else {
		finishComponentSetup(instance); // 完成组件的启动
	}
	//render 
	//	Component.render(instance.proxy)//处理render
}

//处理setup返回值
const handlerSetupResult = (instance, setupResult) => {
	if (isFunction(setupResult)) {
		//setup返回的函数保存到实例
		instance.render = setupResult
	} else if (isObject(setupResult)) {
		//setup返回的对象保存到实例
		instance.setupState = setupResult
	}
	finishComponentSetup(instance);
}

const createSetupContext = (instance) => {
	return {
		attrs: instance.attrs,
		slots: instance.slots,
		emit: () => { },
		expose: () => { }
	}
}

//处理render
const finishComponentSetup = (instance) => {
	let Component = instance.type

	if (!instance.render) {
		// 对template 模板编译产生render函数
		if (!Component.render && Component.template) {
			// 编译 将结果 赋予给 Component.template
			let { template } = Component
			if (template[0] === "#") {
				const el = document.querySelector(template)
				template = el ? el.innerHTML : ""
			}
			//const code = baseCompile(template)
			Component.render = baseCompile(template)
			//Component.render = new Function('ctx', code)
		}
		instance.render = Component.render;
	}
}

//创建组件实例
export const createComponentInstance = (vnode) => {
	const type = vnode.type;
	const instance = { // 组件实例
		__v_isVNode: true,
		vnode,          // 组件对应的虚拟节点
		subTree: null,  // 组件要渲染的子元素
		type,           // 组件对象
		ctx: {},        // 组件的上下文
		props: {},      // 组件的属性
		attrs: {},      // 元素本身的属性
		slots: {},      // 组件的插槽
		setupState: {}, // 组件setup的返回值
		isMounted: false, // 组件是否被挂载？
		expose: null,//
		emit: null, //
		update: null, //
		proxy: null,  //	
		components: null,  //
		//生命周期
		bc: null,  //
		m: null,  //
		bu: null,  //
		u: null,  //
		um: null,  //
	}
	instance.ctx = { _: instance };
	return instance
}

//初始化组件，解析数据到组件实例,拓展instance
export const setupComponent = (instance) => {
	//设置值
	const { props, children, shapeFlag } = instance.vnode
	//根据props解析到组件实例
	// 根据props解析出 attrs 和 props ，将其放在 instan上
	instance.props = props;         // 1.初始化属性 initProps()
	instance.children = children;   // 2.初始化插槽 initSlot()
	// 需要先看一下当前组件是不是有状态的组件，函数组件
	let isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
	if (isStateful) {  // 表示现在是一个带状态的组件
		// 调用 当前实例的setup 方法，用setup的返回值填充 setupState 和对应的 render 方法
		setupStateComponent(instance)
	}
}

export const setCurrentInstance = (target) => {
	return currentInstance = target
}
export const getCurrentInstance = () => {
	return currentInstance
}