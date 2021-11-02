import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity'
import { ShapeFlags } from '@vue/shared/src'
import { normalizeVNode, Text } from './vnode'
import { renderOptionsDom } from '@vue/runtime-dom/src'
import { patchKeydChildren } from './diff'
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
		if (!instance.isMounted) {//首次加载
			//获取render返回值
			let proxy = instance.proxy
			let subTree = instance.subTree = instance.render.call(proxy, proxy)//执行render，返回dom树
			//渲染子树,创建元素
			patch(null, subTree, container)
			instance.isMounted = true;
		} else {//更新
			let proxy = instance.proxy
			//旧节点
			const prevTree = instance.subTree
			//新节点
			const nextTree = instance.render.call(proxy, proxy)
			//替换节点
			instance.subTree = nextTree
			//对比新旧节点
			patch(prevTree, nextTree, container)
		}
	})
}

const patchDomProp = (oldProps, newProps, el) => {
	if (oldProps !== newProps) {
		// 新的属性 需要覆盖掉老的
		for (let key in newProps) {
			const prev = oldProps[key];
			const next = newProps[key];
			if (prev !== next) {
				patchProps(el, key, prev, next);
			}
		}
		// 老的有的属性 新的没有 将老的删除掉
		for (const key in oldProps) {
			if (!(key in newProps)) {
				patchProps(el, key, oldProps[key], null);
			}
		}
	}
}

const unmountChildren = (children) => {
	children.forEach((child) => {
		unmount(child)
	})
}

const patchChildren = (n1, n2, container, anchor = null) => {
	const { shapeFlag: prevShapeFlag, children: c1 } = n1// 获取所有老的节点和元素的类型 
	const { shapeFlag, children: c2 } = n2  // 获取新的所有的节点和元素的类型 

	if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 目前是文本元素
		if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 老的是数组
			unmountChildren(c1); // 可能有组件 调用组件的卸载方法
		}
		if (c2 !== c1) {
			setElementText(container, c2)
		}
	} else {
		if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 新老都是数组
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				patchKeydChildren(c1, c2, container, anchor); // core
			} else {
				// 没有新孩子
				unmountChildren(c1);
			}
		} else {
			if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
				// 移除老的文本
				setElementText(container, '');
			}
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 去把新的元素进行挂在 生成新的节点塞进去
				mountChildren(c2, container);
			}
		}
	}
}
const patchElement = (n1, n2, container) => {
	let el = (n2.el = n1.el)
	const oldProps = n1.props || {}
	const newProps = n2.props || {}
	patchDomProp(oldProps, newProps, el)
	patchChildren(n1, n2, el)
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

//加载子元素(数组)
const mountChildren = (children, container) => {
	for (let i = 0; i < children.length; i++) {
		//['sfa'] or [h('div')]
		const child = normalizeVNode(children[i]);
		//递归
		patch(null, child, container)
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
			mountChildren(children, el)
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
		patchElement(n1, n2, container)
	}
}

//创建元素
const processElement = (n1, n2, container) => {
	if (n1 === null) {//
		mountElement(n2, container)
	} else {//更新，同一个元素比对
		patchElement(n1, n2, container)
	}
}

//创建文本
const processText = (n1, n2, container) => {
	if (n1 === null) {//创建文本，渲染到页面
		setElementText(createText(n2.children), container)
	} else {
		setText(n2, container)
	}
}

const isSomeVnode = (n1, n2) => {
	return n1.type === n2.type && n1.key === n2.key
}
const unmount = (vnode) => {
	removeElement(vnode.el)
}
export const patch = (n1, n2, container) => {
	//区别不同类型
	let { shapeFlag } = n2
	//判断是否为相同元素
	if (n1 && !isSomeVnode(n1, n2)) {
		unmount(n1)//删除元素
		n1 = null
	}
	switch (shapeFlag) {
		case Text://处理文本
			processText(n1, n2, container)
			break;
		default:
			if (shapeFlag & shapeFlag.ELEMENT) {// 处理元素类型
				processElement(n1, n2, container)
			} else if (shapeFlag & shapeFlag.STATEFUL_COMPONENT) {// 处理组件类型
				processComponent(n1, n2, container)
			}
	}
}