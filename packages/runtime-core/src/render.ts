import { apiCreateApp } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity'
import { ShapeFlags } from '@vue/shared/src'
import { childVnode, Text } from './vnode'
export const createRender = (renderOptionsDom) => { //渲染vnode=>render
	//元素操作方法
	const {
		//创建元素
		createElement,

		//删除元素
		removeElement,

		//插入元素
		insertElement,

		//选择元素
		qureyElement,

		//设置元素
		setElementText,

		//创建文本
		createText,

		//设置文本
		setText,
		//设置属性
		patchProps
	} = renderOptionsDom

	//setupRenderEffect
	const setupRenderEffect = (instance, container) => {
		effect(() => {
			//判断初始化
			if (!instance.isMounted) {
				//获取render返回值
				let proxy = instance.proxy
				let subTree = instance.render.call(proxy, proxy)//执行render，返回dom树
				//渲染子树,创建元素
				patch(null, subTree, container)
			}
		})
	}

	//组件渲染流程
	const mountComponent = (vnode, container) => {
		//创建组件实例对象render(proxy)
		const instance = vnode.component = createComponentInstance(vnode)
		//解析数据到这个实例对象
		setupComponent(instance)
		//创建effect，让render函数执行
		setupRenderEffect(instance, container)
	}

	//加载子元素
	const mountChildren = (el, children) => {
		for (let i = 0; i < children.length; i++) {
			//['sfa'] or [h('div')]
			let child = childVnode[children[i]]
			//创建文本
			patch(null, child, el)
		}
	}

	//加载元素
	const mountElement = (vnode, container) => {
		const { props, shapeFlag, type, children } = vnode
		//获取真实元素
		let el = createElement(type)
		//添加属性
		if (props) {
			for (let key in props) {
				patchProps(el, key, null, props[key])
			}
		}
		if (children) {//有子元素
			if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {//设置文本
				setElementText(el, children)
			} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {//设置数组
				mountChildren(el, children)
			}
		}
		//元素放到对应的位置
		insertElement(el, container)
	}

	//创建组件
	const processComponent = (n1, n2, container) => {
		if (n1 === null) {//第一次加载
			mountComponent(n2, container)
		} else {//组件更新

		}
	}

	//创建元素
	const processElement = (n1, n2, container) => {
		if (n1 === null) {//
			mountElement(n2, container)
		} else {//更新

		}
	}

	//创建文本
	const processText = (n1, n2, container) => {
		if (n1 === null) {//创建文本，渲染到页面
			insertElement(createText(n2.children), container)
		}
	}
	const patch = (n1, n2, container) => {
		//区别不同类型
		let { shapeFlag } = n2

		switch (shapeFlag) {
			case Text://处理文本
				processText(n1, n2, container)
				break;
			default:
				if (shapeFlag & shapeFlag.ELEMENT) {//元素
					processElement(n1, n2, container)
				} else if (shapeFlag & shapeFlag.STATEFUL_COMPONENT) {//组件
					processComponent(n1, n2, container)
				}
		}


	}

	let render = (vnode, container) => {//渲染函数
		//组件初始化
		//渲染
		patch(null, vnode, container)//1.旧节点2.新节点3.位置
	}
	return {
		createApp: apiCreateApp(render)//创建虚拟vnode
	}
}