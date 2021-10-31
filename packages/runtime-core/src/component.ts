import { ShapeFlags, isFunction, isObject } from '@vue/shared/src'
import { componentPublicInstance } from './componentPublicInstance'
const creatContext = (instance) => {
	return {
		attrs: instance.attrs,
		slots: instance.slots,
		emit: () => { },//
		expose: () => { },
	}
}
//处理render
const finishComponentSetup = (instance) => {
	let Component = instance.type
	//判断组件是否有render
	if (!instance.render) { //没有
		//模板编译
		if (!Component.render && Component.template) {

		}
		instance.render = Component.render;
	}
}
//处理setup返回值
const handlerSetupResult = (instance, setupResult) => {
	if (isFunction(setupResult)) {
		//setup返回的函数保存到实例
		instance.render = setupResult
	} else if (isObject(setupResult)) {
		//setup返回的对象保存到实例
		instance.setupState = setupResult;
	}
	finishComponentSetup(instance)
}


const setupStateComponent = (instance) => {
	//代理
	instance.proxy = new Proxy(instance.ctx, componentPublicInstance as any)
	//获取组件的类型，拿到组件setup(props, context)
	let Component = instance.type
	let { setup } = Component
	//判断组件是否有setup
	if (setup) {//有
		let setupContext = creatContext(instance)//ctx对象
		let setupResult = setup(instance.props, setupContext)
		//处理setup返回值，对象或render函数
		handlerSetupResult(instance, setupResult)
	} else {	//没有
		finishComponentSetup(instance)
	}
	//render 
	Component.render(instance.proxy)//处理render
}

//创建组件实例
export const createComponentInstance = (vnode) => {
	const instance = {
		vnode,
		type: vnode.type,//组件的类型
		props: {},//组件的属性
		attr: {},//
		setupState: {},//setup返回值
		ctx: {},//代理
		proxy: {},//proxy代理
		render: false,
		isMounted: false,//是否挂载
	}
	instance.ctx = { _: instance }
	return instance
}

//解析数据到组件实例
export const setupComponent = (instance) => {
	//设置值
	const { props, children } = instance.vnode
	//根据props解析到组件实例
	instance.props = props
	instance.children = children//slot插槽
	//
	let shapeFlag = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
	if (shapeFlag) {//有状态的组件
		setupStateComponent(instance)
	}
}
