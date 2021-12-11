import { Text, Fragment, normalizeVNode, createVNode, isSameVnode } from './vnode'
import { createComponentInstance, setupComponent, initProps } from './component'
import { ShapeFlags, PatchFlags, invokeArrayFns } from '@vue/shared/src'
import { queueJob, queuePostFlushCb } from './scheduler'
import { pauseTracking, resetTracking, ReactiveEffect } from '@vue/reactivity'
import { createAppAPI } from './apiCreateApp'

export const createRenderer = options => {
  return baseCreateRenderer(options)
}
const baseCreateRenderer = renderOptionsDom => {
  //渲染vnode=>render,渲染时所到的api
  //元素操作方法
  const {
    //创建元素
    createElement,

    //删除元素
    removeElement,

    //插入元素
    insertElement,

    //选择元素
    queryElement,

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
  const patch = (n1, n2, container, anchor = null, parentComponent?) => {
    if (n1 === n2) {
      return
    }
    //判断是否为相同元素
    if (n1 && !isSameVnode(n1, n2)) {
      anchor = (n1.anchor || n1.el).nextSibling
      unmount(n1, parentComponent) //删除元素
      n1 = null
    }
    //区别不同类型
    let { type, shapeFlag } = n2
    switch (type) {
      //处理文本
      case Text:
        processText(n1, n2, container, anchor)
        break
      // 注释
      // case Comment:
      // 	processCommentNode(n1, n2, container, anchor)
      // 	break;
      //处理文本
      case Fragment:
        processFragment(n1, n2, container, anchor)
        break
      default:
        // 普通 DOM 元素
        if (shapeFlag & shapeFlag.ELEMENT) {
          processElement(n1, n2, container, anchor)
          // 自定义的 Vue 组件
        } else if (shapeFlag & shapeFlag.COMPONENT) {
          processComponent(n1, n2, container)
        }
    }
  }

  //创建文本
  const processText = (n1, n2, container, anchor) => {
    if (n1 === null) {
      //创建文本，渲染到页面
      insertElement((n2.el = createText(n2.children)), container, anchor)
    } else {
      setText(n2, container)
    }
  }

  //创建空标签
  const processFragment = (n1, n2, container, anchor) => {
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : createText(''))!
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : createText(''))!

    if (n1 == null) {
      insertElement(fragmentStartAnchor, container, anchor)
      insertElement(fragmentEndAnchor, container, anchor)
      mountChildren(n2.children, container, fragmentEndAnchor)
    } else {
      // 其他逻辑
      patchChildren(n1, n2, container, fragmentEndAnchor)
    }
  }

  //创建元素
  const processElement = (n1, n2, container, anchor) => {
    // 如果旧节点是空，进行首次渲染的挂载
    if (n1 === null) {
      mountElement(n2, container, anchor)
      // 如果不为空，进行 diff 更新
    } else {
      patchElement(n1, n2)
    }
  }

  //创建组件
  // n1 旧节点，n2 新节点
  const processComponent = (n1, n2, container) => {
    if (n1 === null) {
      //加载组件
      mountComponent(n2, container)
    } else {
      //组件更新
      updateComponent(n1, n2)
      // patchElement(n1, n2)
    }
  }

  //组件渲染流程
  const mountComponent = (initialVNode, container, anchor?, parentComponent?) => {
    // 组件初始化
    // 1. 先有实例,创建组件实例对象render(proxy)
    const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))
    // 2. 需要的数据解析到实例上
    setupComponent(instance)
    // 3. 创建一个effect 让render执行
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component)!
    instance.next = n2
    instance.update()
    // if (shouldUpdateComponent(n1, n2)) {
    //   // normal update
    //   instance.next = n2
    //   instance.update()
    // }
  }

  //创建真实节点
  const mountElement = (vnode, container, anchor) => {
    // 创建节点保存到vnode中 递归渲染
    const { props, shapeFlag, patchFlag, type, children } = vnode
    //获取真实元素
    let el = (vnode.el = createElement(type))
    //有子元素
    if (children) {
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        //设置文本
        setElementText(el, children)
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //设置数组
        mountChildren(children, el, null)
      }
    }
    // 处理属性
    if (props) {
      for (const key in props) {
        if (key === 'value') {
          patchProps(el, 'value', null, props.value)
        } else {
          patchProps(el, key, null, props[key])
        }
      }
    }

    //元素放到对应的位置
    insertElement(el, container, anchor)
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
        const prev = oldProps[key]
        const next = newProps[key]
        if (prev !== next) {
          patchProps(el, key, prev, next)
        }
      }
      // 老的有的属性 新的没有 将老的删除掉
      for (const key in oldProps) {
        if (!(key in newProps)) {
          patchProps(el, key, oldProps[key], null)
        }
      }
    }
  }

  //子节点对比
  const patchChildren = (n1, n2, container, anchor = null) => {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1 // 获取所有老的节点和元素的类型
    const { patchFlag, shapeFlag, children: c2 } = n2 // 获取新的所有的节点和元素的类型

    // fast path
    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // this could be either fully-keyed or mixed (some keyed some not)
        // presence of patchFlag means children are guaranteed to be arrays
        patchKeyedChildren(c1, c2, container, anchor)
        return
      } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // unkeyed
        patchUnkeyedChildren(c1, c2, container, anchor)
        return
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 目前是文本元素
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 老的是数组
        unmountChildren(c1) // 可能有组件 调用组件的卸载方法
      }
      if (c2 !== c1) {
        setElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新老都是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, container, anchor) // 核心diff算法
        } else {
          // 没有新孩子
          unmountChildren(c1)
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 移除老的文本
          setElementText(container, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 去把新的元素进行挂在 生成新的节点塞进去
          mountChildren(c2, container, anchor)
        }
      }
    }
  }

  const patchUnkeyedChildren = (c1, c2, container, anchor = null, parentComponent?) => {
    c1 = c1
    c2 = c2
    const oldLength = c1.length
    const newLength = c2.length
    const commonLength = Math.min(oldLength, newLength)
    let i
    for (i = 0; i < commonLength; i++) {
      const nextChild = (c2[i] = normalizeVNode(c2[i]))
      patch(c1[i], nextChild, container, null)
    }
    if (oldLength > newLength) {
      // remove old
      unmountChildren(c1, parentComponent)
    } else {
      // mount new
      mountChildren(c2, container, anchor)
    }
  }

  const patchKeyedChildren = (c1, c2, container, anchor = null) => {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1
    // 1. sync from start
    while (i <= e1 && i <= e2) {
      // 从左向右比较
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnode(n1, n2)) {
        // 相同就 patch
        patch(n1, n2, container, null)
      } else {
        // 不相同就跳出循环
        break
      }
      i++
    }

    // 2. sync from end
    while (i <= e1 && i <= e2) {
      // 从右向左比较
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, container, null)
      } else {
        break
      }
      e1--
      e2--
    }
    // 3. common sequence + mount
    if (i > e1) {
      // 说明有新增
      if (i <= e2) {
        // 表示有新增的部分
        // 先根据e2 取他的下一个元素  和 数组长度进行比较
        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 4. common sequence + unmount
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    } else {
      // 5. unknow squence
      // 5.1 构建映射表 map
      const s1 = i
      const s2 = i
      const keyToNewIndexMap = new Map()
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }
      // 5.2 去老的里面查有没有可以复用的
      let j
      let patched = 0
      const toBePatched = e2 - s2 + 1
      let moved = false
      // used to track whether any node has moved
      let maxNewIndexSoFar = 0
      const newIndexToOldIndexMap = new Array(toBePatched)
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        if (patched >= toBePatched) {
          // all new children have been patched so this can only be a removal
          unmount(prevChild)
          continue
        }
        let newIndex // 获取新的索引
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // key-less node, try to locate a key-less node of the same type
          for (j = s2; j <= e2; j++) {
            if (newIndexToOldIndexMap[j - s2] === 0 && isSameVnode(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }
        if (newIndex == undefined) {
          unmount(prevChild) // 老的有 新的没有直接删除
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          patch(prevChild, c2[newIndex], container)
          patched++
        }
      }
      // 5.3 移动和挂载
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
      j = increasingNewIndexSequence.length - 1
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i // [ecdh]   找到h的索引
        const nextChild = c2[nextIndex] // 找到 h
        let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null // 找到当前元素的下一个元素
        if (newIndexToOldIndexMap[i] == 0) {
          // 这是一个新元素 直接创建插入到 当前元素的下一个即可
          patch(null, nextChild, container, anchor)
        } else {
          // 根据参照物 将节点直接移动过去  所有节点都要移动 （但是有些节点可以不动）
          insertElement(nextChild.el, container, anchor)
        }
      }
    }
  }

  const unmount = (vnode, parentComponent?) => {
    const { type, props, children, shapeFlag, patchFlag } = vnode
    if (shapeFlag & ShapeFlags.COMPONENT) {
      unmountComponent(vnode.component!)
    } else if (type === Fragment && shapeFlag & ShapeFlags.COMPONENT) {
      unmountFragment(vnode)
    } else {
      //removeElement(children)
      unmountChildren(children, parentComponent)
    }
  }

  //卸载组件
  const unmountComponent = instance => {
    const { bum, scope, update, subTree, um } = instance
    unmount(subTree, instance)
  }

  //卸载Fragment
  const unmountFragment = vnode => {
    let { el: cur, anchor: end } = vnode
    const { parentNode } = cur
    while (cur !== end) {
      let next = cur.nextSibling
      parentNode.removeChild(cur)
      cur = next
    }
    parentNode.removeChild(end)
  }

  //卸载节点
  const unmountChildren = (children, parentComponent?) => {
    children.forEach(child => {
      unmount(child, parentComponent)
    })
  }

  //子节点的处理(数组)
  const mountChildren = (children, container, anchor) => {
    for (let i = 0; i < children.length; i++) {
      //['sfa'] or [h('div')]
      const child = normalizeVNode(children[i])
      //递归处理
      patch(null, child, container, anchor)
    }
  }

  //给组件增加渲染effect，保证组件中数据变化可以重新进行组件的渲染
  const setupRenderEffect = (instance, initialVNode, container, anchor = null) => {
    const componentUpdateFn = () => {
      //判断初始化
      if (!instance.isMounted) {
        // 初次渲染
        const { el, props } = initialVNode
        const { bm, m } = instance //生命周期
        effect.allowRecurse = false
        if (bm) {
          // beforeMount
          invokeArrayFns(bm)
        }
        effect.allowRecurse = true
        //执行render，返回dom树
        const subTree = (instance.subTree = renderComponentRoot(instance))
        //渲染子树,创建元素
        patch(null, subTree, container, anchor) // 渲染子树
        initialVNode.el = subTree.el // 组件的el和子树的el是同一个
        instance.isMounted = true // 组件已经挂载完毕
        if (m) {
          // mounted
          //invokeArrayFns(m)
          queuePostFlushCb(m) //异步处理,不能直接 invokeArrayFns(m);
        }
      } else {
        //更新逻辑
        let { next, bu, u, parent, vnode } = instance
        let originNext = next
        effect.allowRecurse = false
        if (next) {
          //被动更新
          next.el = vnode.el
          updateComponentPreRender(instance, next)
        } else {
          next = vnode
        }

        if (bu) {
          // beforeUpdate
          invokeArrayFns(bu)
        }
        effect.allowRecurse = true
        let proxy = instance.proxy
        //旧节点
        const prevTree = instance.subTree
        //新节点
        const nextTree = instance.render.call(proxy, proxy)
        //替换节点
        instance.subTree = nextTree
        //对比新旧节点
        patch(prevTree, nextTree, container, anchor)
        if (u) {
          // updated
          //invokeArrayFns(u)
          queuePostFlushCb(u) //异步处理,不能直接 invokeArrayFns(u);
        }
      }
    }

    // create reactive effect for rendering
    const effect = new ReactiveEffect(
      componentUpdateFn,
      () => queueJob(instance.update),
      instance.scope // track it in component's effect scope
    )
    const update = (instance.update = effect.run.bind(effect))
    update.id = instance.uid
    // allowRecurse
    // #1801, #2043 component render effects should allow recursive updates
    effect.allowRecurse = update.allowRecurse = true

    update()
  }

  const updateComponentPreRender = (instance, nextVNode) => {
    nextVNode.component = instance
    const prevProps = instance.vnode.props
    instance.vnode = nextVNode
    instance.next = null

    const { shapeFlag } = instance.vnode
    const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
    initProps(instance, nextVNode, isStateful)
    // updateProps(instance, nextVNode.props, prevProps)
    // updateSlots(instance, nextVNode.children)
  }

  const renderComponentRoot = instance => {
    const {
      type: Component,
      vnode,
      proxy,
      withProxy,
      props,
      slots,
      attrs,
      emit,
      render,
      renderCache,
      data,
      setupState,
      ctx
    } = instance
    let result
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // withProxy is a proxy with a different `has` trap only for
      // runtime-compiled render functions using `with` block.
      const proxyToUse = withProxy || proxy
      result = normalizeVNode(render!.call(proxyToUse, proxyToUse!, renderCache, props, setupState, data, ctx))
    } else {
      // functional
      const render = Component
      result = normalizeVNode(
        render.length > 1
          ? render(props, { attrs, slots, emit })
          : render(props, null as any /* we know it doesn't need it */)
      )
    }
    return result
  }

  //渲染函数
  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      //渲染
      patch(container._vnode || null, vnode, container) //1.旧节点2.新节点3.位置
    }
    container._vnode = vnode
  }
  return {
    render,
    createApp: createAppAPI(render) //创建虚拟vnode
  }
}

//实现最长递增子序列算法
const getSequence = arr => {
  // 最终的结果是索引
  const len = arr.length
  const result = [0] // 索引  递增的序列 用二分查找性能高
  const p = arr.slice(0) // 里面内容无所谓 和 原本的数组相同 用来存放索引
  let start
  let end
  let middle
  for (let i = 0; i < len; i++) {
    // O(n)
    const arrI = arr[i]
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1]
      // 取到索引对应的值
      if (arr[resultLastIndex] < arrI) {
        p[i] = resultLastIndex // 标记当前前一个对应的索引
        result.push(i)
        // 当前的值 比上一个人大 ，直接push ，并且让这个人得记录他的前一个
        continue
      }
      // 二分查找 找到比当前值大的那一个
      start = 0
      end = result.length - 1
      while (start < end) {
        // 重合就说明找到了 对应的值  // O(logn)
        middle = ((start + end) / 2) | 0 // 找到中间位置的前一个
        if (arr[result[middle]] < arrI) {
          start = middle + 1
        } else {
          end = middle
        } // 找到结果集中，比当前这一项大的数
      }
      if (arrI < arr[result[start]]) {
        // 如果相同 或者 比当前的还大就不换了
        if (start > 0) {
          // 才需要替换
          p[i] = result[start - 1] // 要将他替换的前一个记住
        }
        result[start] = i
      }
    }
  }
  let len1 = result.length // 总长度
  let last = result[len1 - 1] // 找到了最后一项
  while (len1-- > 0) {
    // 根据前驱节点一个个向前查找
    result[len1] = last
    last = p[last]
  }
  return result
}
