import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity'
import { ShapeFlags, invokeArrayFns, queuePostFlushCb } from '@vue/shared/src'
import { normalizeVNode, Text } from './vnode'
import { patchKeydChildren } from './diff'
import { queueJob } from './scheduler'
export const createRender = (renderOptionsDom) => { //渲染vnode=>render,渲染时所到的api
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

	//操作元素
	const patch = (n1, n2, container, anchor = null) => {
		//判断是否为相同元素
		if (n1 && !isSameVnode(n1, n2)) {
			//	anchor = getNextHostNode(n1)
			unmount(n1)//删除元素
			n1 = null
		}
		//区别不同类型
		let { shapeFlag } = n2
		switch (shapeFlag) {
			case Text://处理文本
				processText(n1, n2, container)
				break;
			// case Fragment:
			// 	processFragment(
			// 		n1,
			// 		n2,
			// 		container,
			// 		anchor,
			// 		parentComponent,
			// 		parentSuspense,
			// 		isSVG,
			// 		slotScopeIds,
			// 		optimized
			// 	)
			// 	break;
			default:
				if (shapeFlag & shapeFlag.ELEMENT) {// 处理元素类型
					processElement(n1, n2, container)
				} else if (shapeFlag & shapeFlag.STATEFUL_COMPONENT) {// 处理组件类型
					processComponent(n1, n2, container)
				}
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

	//创建元素
	const processElement = (n1, n2, container) => {
		if (n1 === null) {//挂载元素
			mountElement(n2, container)
		} else {//更新，同一个元素比对
			patchElement(n1, n2)
		}
	}

	//创建组件
	const processComponent = (n1, n2, container) => {
		if (n1 === null) {//加载组件
			mountComponent(n2, container)
		} else {//组件更新
			patchElement(n1, n2)
		}
	}

	//创建真实节点
	const mountElement = (vnode, container) => {
		// 创建节点保存到vnode中 递归渲染
		const { props, shapeFlag, type, children } = vnode
		//获取真实元素
		let el = vnode.el = createElement(type)
		// 处理属性
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

	//节点对比
	const patchElement = (n1, n2) => {
		// 两个元素相同  1.比较属性 2.比较儿子
		let el = (n2.el = n1.el)
		const oldProps = n1.props || {}
		const newProps = n2.props || {}
		patchDomProp(oldProps, newProps, el)
		patchChildren(n1, n2, el)
	}

	//虚拟dom对比
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

	//子节点对比
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
					patchKeydChildren(c1, c2, container, anchor); // 核心diff算法
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

	//卸载节点
	const unmountChildren = (children) => {
		children.forEach((child) => {
			unmount(child)
		})
	}
	const unmount = (vnode) => {
		removeElement(vnode.el)
	}

	//子节点的处理(数组)
	const mountChildren = (children, container) => {
		for (let i = 0; i < children.length; i++) {
			//['sfa'] or [h('div')]
			const child = normalizeVNode(children[i]);
			//递归处理
			patch(null, child, container)
		}
	}

	const isSameVnode = (n1, n2) => {
		return n1.type === n2.type && n1.key === n2.key
	}

	//组件渲染流程
	const mountComponent = (initialVNode, container) => {
		// 组件初始化
		// 1. 先有实例,创建组件实例对象render(proxy)
		const instance = initialVNode.component = createComponentInstance(initialVNode)
		// 2. 需要的数据解析到实例上
		setupComponent(instance);
		// 3. 创建一个effect 让render执行
		setupRenderEffect(instance, container);
	}

	//给组件增加渲染effect，保证组件中数据变化可以重新进行组件的渲染
	const setupRenderEffect = (instance, container) => {
		instance.update = effect(() => {
			//判断初始化
			if (!instance.isMounted) { // 初次渲染
				const { bm, m } = instance;//生命周期
				if (bm) { // beforeMount
					invokeArrayFns(bm);
				}
				const proxyToUse = instance.proxy; // 实例中的代理属性
				const subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse))//执行render，返回dom树
				//渲染子树,创建元素
				patch(null, subTree, container) // 渲染子树			
				//	initialVNode.el = subTree.el; // 组件的el和子树的el是同一个
				instance.isMounted = true;// 组件已经挂载完毕
				if (m) { // mounted
					invokeArrayFns(m);
					//queuePostFlushCb(m) //异步处理,不能直接 invokeArrayFns(m);
				}
			} else {//更新逻辑
				const { bu, u } = instance;
				if (bu) { // beforeUpdate
					invokeArrayFns(bu);
				}

				let proxy = instance.proxy
				//旧节点
				const prevTree = instance.subTree
				//新节点
				const nextTree = instance.render.call(proxy, proxy)
				if (u) { // updated
					invokeArrayFns(u);
					//	queuePostFlushCb(u);//异步处理,不能直接 invokeArrayFns(u);
				}
				//替换节点
				instance.subTree = nextTree
				//对比新旧节点
				patch(prevTree, nextTree, container)
			}
		}, { sch: queueJob })
	}

	//渲染函数
	const render = (vnode, container) => {
		if (vnode == null) {
			if (container._vnode) {
				unmount(container._vnode)
			}
		} else {
			//渲染
			patch(container._vnode || null, vnode, container)//1.旧节点2.新节点3.位置
		}
		container._vnode = vnode
	}
	return {
		render,
		createApp: createAppAPI(render)//创建虚拟vnode
	}
}
