本篇将要讲解dom diff，那么咱们结合下面的例子来进行讲解，这个例子是在上一篇文章的基础上，加了一个数据变更，也就是list的值发生了改变。html中增加了一个按钮change，通过点击change按钮来调用change函数，来改变list的值。例子位于源代码`/packages/vue/examples/classic/`目录下，下面是例子的代码：
```javascript
const app = Vue.createApp({
    data() {
        return {
            list: ['a', 'b', 'c', 'd']
        }
    },
    methods: {
        change() {
            this.list = ['a', 'd', 'e', 'b']
        }
    }
});
app.mount('#demo')

```
```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport"
          content="initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0,user-scalable=no,target-densitydpi=medium-dpi,viewport-fit=cover"
    />
    <title>Vue3.js hello example</title>

    <script src="../../dist/vue.global.js"></script>
</head>
<body>
<div id="demo">
    <ul>
        <li v-for="item in list" :key="item">
            {{item}}
        </li>
    </ul>
    <button @click="change">change</button>
</div>
<script src="./hello.js"></script>
</body>
</html>

```

关于Vue3中数据发生变更，最终影响到页面发生变化的过程，我们本篇文章只对componentEffect以及以后的代码进行讲解，对于数据变更后，是如何执行到componentEffect函数，以及为何会执行componentEffect，后面的文章再进行讲解。

## componentEffect

来看下componentEffect更新部分的代码：
```javascript
  // @file packages/runtime-core/src/renderer.ts
  function componentEffect() {
    if (!instance.isMounted) {
    	// first render
    } else {
        let {next, bu, u, parent, vnode} = instance
        let originNext = next
        let vnodeHook: VNodeHook | null | undefined

        if (next) {
            updateComponentPreRender(instance, next, optimized)
        } else {
            next = vnode
        }
        next.el = vnode.el

        // beforeUpdate hook
        if (bu) {
            invokeArrayFns(bu)
        }
        // onVnodeBeforeUpdate
        if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
            invokeVNodeHook(vnodeHook, parent, next, vnode)
        }
        const nextTree = renderComponentRoot(instance)
        const prevTree = instance.subTree
        instance.subTree = nextTree

        if (instance.refs !== EMPTY_OBJ) {
            instance.refs = {}
        }
        patch(
            prevTree,
            nextTree,
            hostParentNode(prevTree.el!)!,
            getNextHostNode(prevTree),
            instance,
            parentSuspense,
            isSVG
        )
        next.el = nextTree.el
        if (originNext === null) {
            updateHOCHostEl(instance, nextTree.el)
        }
        // updated hook
        if (u) {
            queuePostRenderEffect(u, parentSuspense)
        }
        // onVnodeUpdated
        if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
            queuePostRenderEffect(() => {
                invokeVNodeHook(vnodeHook!, parent, next!, vnode)
            }, parentSuspense)
        }
    }
  }


```
当数据发生变化的时候，最终会走到上面的else的逻辑部分。

- 默认情况下next是null，父组件调用processComponent触发当前调用的时候会是VNode，此时next为null；
- 调用当前实例beforeUpdate钩子函数；调用要更新的Vnode(next)的父组件的beforeUpdate钩子函数；
- 获取当前实例的vNode => prevTree；获取要更新的vNode=> nextTree；然后调用patch；
```javascript
const patch: PatchFn = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  isSVG = false,
  slotScopeIds = null,
  optimized = false
) => {
  // patching & 不是相同类型的 VNode，则从节点树中卸载
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }
	// PatchFlag 是 BAIL 类型，则跳出优化模式
  if (n2.patchFlag === PatchFlags.BAIL) {
    optimized = false
    n2.dynamicChildren = null
  }

  const { type, ref, shapeFlag } = n2
  switch (type) { // 根据 Vnode 类型判断
    case Text: // 文本类型
      processText(n1, n2, container, anchor)
      break
    case Comment: // 注释类型
      processCommentNode(n1, n2, container, anchor)
      break
    case Static: // 静态节点类型
      if (n1 == null) {
        mountStaticNode(n2, container, anchor, isSVG)
      }
      break
    case Fragment: // Fragment 类型
      processFragment(/* 忽略参数 */)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) { // 元素类型
        processElement(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
      } else if (shapeFlag & ShapeFlags.COMPONENT) { // 组件类型
        processComponent(/* 忽略参数 */)
      } else if (shapeFlag & ShapeFlags.TELEPORT) { // TELEPORT 类型
        ;(type as typeof TeleportImpl).process(/* 忽略参数 */)
      }
  }
}


```
一起来看上面 👆 patch 函数的源码，我们先从入参看起：n1 与 n2 是待比较的两个节点，n1 为旧节点，n2 为新节点。container 是新节点的容器，而 anchor 是一个锚点，用来标识当我们对新旧节点做增删或移动等操作时，以哪个节点为参照物。optimized 参数是是否开启优化模式的标识。其他参数就不一一介绍了，我们暂时不用关心。

我们看第一个 if 条件，当旧节点存在，并且新旧节点不是同一类型时，则将旧节点从节点树中卸载。这就是我们可以总结出的 patch 的第一个逻辑: 当两个节点的类型不同，则直接卸载旧节点。

再看第二个 if 分支条件，如果新节点的 patchFlag 的值是 BAIL ，优化模式会被关闭。这是我们第一次在源码中遇到 patchFlag，不过不用太细究这里，我们接着往下看。

接下来 patch 函数会通过 switch case 来判断节点类型，并分别对不同节点类型执行不同的操作。


点击change按钮：

n1的值：
![avatar](./images/patch1.awebp)

n2的值：
![avatar](./images/patch2.awebp)
根据这个值，可以知晓，会走到processFragment函数；

## processFragment
调用`processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized)`函数，参数的值：
- 此时n1和n2如上图；
- container为#demo；
- anchor为null；
- parentComponent为instance实例；
- parentSuspense为null；
- isSVG为false；
- optimized为false；

来看下processFragment函数的源码：
```javascript
// @file packages/runtime-core/src/renderer.ts
const processFragment = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
) => {
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))!
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))!

    let {patchFlag, dynamicChildren} = n2
    if (patchFlag > 0) {
        optimized = true
    }

    if (n1 == null) {
    	// first render的逻辑
    } else {
        if (
            patchFlag > 0 && patchFlag & PatchFlags.STABLE_FRAGMENT && dynamicChildren
        ) {
            patchBlockChildren(
                n1.dynamicChildren!,
                dynamicChildren,
                container,
                parentComponent,
                parentSuspense,
                isSVG
            )
            if (__DEV__ && parentComponent && parentComponent.type.__hmrId) {
                traverseStaticChildren(n1, n2)
            } else if (
                n2.key != null ||
                (parentComponent && n2 === parentComponent.subTree)
            ) {
                traverseStaticChildren(n1, n2, true /* shallow */)
            }
        } else {
            patchChildren(
                n1,
                n2,
                container,
                fragmentEndAnchor,
                parentComponent,
                parentSuspense,
                isSVG,
                optimized
            )
        }
    }
}

```
刨除掉first render的代码后，可以看到下面还是分为了两个分支；根据n1和n2可知，我们将会走if分支，执行patchBlockChildren。

## patchBlockChildren
调用`patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, container, parentComponent, parentSuspense, isSVG)`函数，此时参数如下：

- oldChildren：n1.dynamicChildren，也就是Symbol(Fragment) =>ul 和button两个元素组成的数组；
- newChildren： n2.dynamicChildren，也就是Symbol(Fragment) =>ul 和button两个元素组成的数组；
- fallbackContainer：container，也就是#demo;
- parentComponent：instance实例；
- parentSuspense：null；
- isSVG：false。

来看下patchBlockChildren的源码：
```javascript
// @file packages/runtime-core/src/renderer.ts
const patchBlockChildren: PatchBlockChildrenFn = (
    oldChildren,
    newChildren,
    fallbackContainer,
    parentComponent,
    parentSuspense,
    isSVG
) => {
    for (let i = 0; i < newChildren.length; i++) {
        const oldVNode = oldChildren[i]
        const newVNode = newChildren[i]
        const container =
            oldVNode.type === Fragment ||
            !isSameVNodeType(oldVNode, newVNode) ||
            oldVNode.shapeFlag & ShapeFlags.COMPONENT ||
            oldVNode.shapeFlag & ShapeFlags.TELEPORT
                ? hostParentNode(oldVNode.el!)!
                : fallbackContainer
        patch(
            oldVNode,
            newVNode,
            container,
            null,
            parentComponent,
            parentSuspense,
            isSVG,
            true
        )
    }
}

```
可以看到patchBlockChildren是for循环调用patch函数，上面看到newChildren是一个长度为2的数组。循环遍历调用`patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, true)`;
第一次循环:
1.1 oldVNode:老的ul数组生成的VNode对象；

1.2 newVNode：新的ul数组生成的VNode对象；

1.3 container：ul元素；

1.4 anchor：上面传递的是null；

1.5 parentComponent: instance实例；

1.6 parentSuspense: null；

1.7 isSVG: false；

1.8 optimized: true；

第二次循环：

2.1 oldVNode: 老的change按钮构成的VNode对象；

2.2 newVNode：新的change按钮构成的VNode对象；

2.3 container：此时的container为#demo；

2.4 anchor：上面传递的是null；

2.5 parentComponent: instance实例；

2.6 parentSuspense: null；

2.7 isSVG: false；

2.8 optimized: true；

## processElement

咱们先说第二次循环，第二次比较简单；上面说到调用patch函数，通过上面了解到第二次循环newVNode的type是button；则会走到processElement，参数全部是透传过来的:
```javascript
const processElement = (
        n1: VNode | null,
        n2: VNode,
        container: RendererElement,
        anchor: RendererNode | null,
        parentComponent: ComponentInternalInstance | null,
        parentSuspense: SuspenseBoundary | null,
        isSVG: boolean,
        optimized: boolean
    ) => {
        isSVG = isSVG || (n2.type as string) === 'svg'
        // 如果旧节点不存在
        if (n1 == null) {
           mountElement(
               n2,
               container,
               anchor
             /* 后续参数省略 */
           )
           // 如果新旧节点对比
        } else {
            patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized)
        }
    }

```
如上代码，会直接调用patchElement，源码如下

```javascript
 const patchElement = (n1, n2, anchor) => {
     // 两个元素相同  1.比较属性 2.比较儿子
     let el = (n2.el = n1.el);
     const oldProps = n1.props || {};
     const newProps = n2.props || {};
     patchProps(oldProps, newProps, el)
     patchChildren(n1, n2, el, anchor);
 }
```

此时参数为：
- n1: 老的change按钮构成的VNode对象；
- n2：新的change按钮构成的VNode对象；
- parentComponent: instance实例；
- parentSuspense: null；
- isSVG: false；
- optimized: true；


在元素类型的 patch 过程中，Vue3 首先会将新旧节点的 props 声明提取出来，因为之后需要对 props 进行 patch 比较
## 更新属性
之后开始比较 props，如果此时元素被标记过 patchFlag，则会通过 patchFlag 进行按需比较，否则会全量的 diff 元素中的 props。
```javascript
if (patchFlag > 0) {
  if (patchFlag & PatchFlags.FULL_PROPS) {
    // 如果元素的 props 中含有动态的 key，则需要全量比较
    patchProps(
      el,
      n2,
      oldProps,
      newProps,
      parentComponent,
      parentSuspense,
      isSVG
    )
  } else {
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        hostPatchProp(el, 'class', null, newProps.class, isSVG)
      }
    }

    if (patchFlag & PatchFlags.STYLE) {
      hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
    }

    if (patchFlag & PatchFlags.PROPS) {
      const propsToUpdate = n2.dynamicProps!
      for (let i = 0; i < propsToUpdate.length; i++) {
        const key = propsToUpdate[i]
        const prev = oldProps[key]
        const next = newProps[key]
        if (
          next !== prev ||
          (hostForcePatchProp && hostForcePatchProp(el, key))
        ) {
          hostPatchProp(
            el,
            key,
            prev,
            next,
            isSVG,
            n1.children as VNode[],
            parentComponent,
            parentSuspense,
            unmountChildren
          )
        }
      }
    }
  }

  if (patchFlag & PatchFlags.TEXT) {
    if (n1.children !== n2.children) {
      hostSetElementText(el, n2.children as string)
    }
  }
} else if (!optimized && dynamicChildren == null) {
  patchProps(
    el,
    n2,
    oldProps,
    newProps,
    parentComponent,
    parentSuspense,
    isSVG
  )
}

```
```javascript
const patchProps = (oldProps, newProps, el) => {
    if (oldProps !== newProps) {
        // 新的属性 需要覆盖掉老的
        for (let key in newProps) {
            const prev = oldProps[key];
            const next = newProps[key];
            if (prev !== next) {
                hostPatchProp(el, key, prev, next);
            }
        }
        // 老的有的属性 新的没有 将老的删除掉
        for (const key in oldProps) {
            if (!(key in newProps)) {
                hostPatchProp(el, key, oldProps[key], null);
            }
        }
    }
}
```

我们一起来捋一捋上方的分支条件，并看看 patchFlag 此时做了些什么。

- 当 patchFlag 为 FULL_PROPS 时，说明此时的元素中，可能包含了动态的 key ，需要进行全量的 props diff。

- 当 patchFlag 为 CLASS 时，当新旧节点的 class 不一致时，此时会对 class 进行 patch，而当新旧节点的 class 属性完全一致时，不需要进行任何操作。这个 Flag 标记会在元素有动态的 class 绑定时加入。

- 当 patchFlag 为 STYLE 时，会对 style 进行更新，这是每次 patch 都会进行的，这个 Flag 会在有动态 style 绑定时被加入。

- 当 patchFlag 为 PROPS 时，需要注意这个 Flag 会在元素拥有动态的属性或者 attrs 绑定时添加，不同于 class 和 style，这些动态的prop 或 attrs 的 key 会被保存下来以便于更快速的迭代。

- PROPS 的比较会将新节点的动态属性提取出来，并遍历这个这个属性中所有的 key，当新旧属性不一致，或者该 key 需要强制更新时，则调用 hostPatchProp 对属性进行更新。

- 当 patchFlag 为 TEXT 时，如果新旧节点中的子节点是文本发生变化，则调用 hostSetElementText 进行更新。这个 flag 会在元素的子节点只包含动态文本时被添加。

此时当元素拥有 patchFlag 时的分支判断就结束了，我们可以在这些分支判断中，体会到 patchFlag 为 patch 算法的速度提升所做出的努力。

分支走到最后一个 else，若当前不存在优化标记，并且动态子节点也不存在，则直接对 props 进行全量 diff，通过 patchProps 这个函数完成。

## patchChildren
现在再来说第一次循环，执行patch的时候，newVNode的type为Symbol(Fragment) => ul，此时还是会走到processFragment函数，不过此时的dynamicChildren为空，会继续运行到patchChildren函数。

此时运行到patchChildren函数，我们来看下运行到此时的参数：
n1：老的ul数组生成的VNode对象；
![avatar](./images/patch3.awebp)
n2：新的ul数组生成的VNode对象；
![avatar](./images/patch4.awebp)
- container：ul元素；
- anchor：ul结尾生成的对象；
- parentComponent：instance实例；
- parentSuspense：null
- isSVG：false；
- optimized：true；

下面看下patchChildren的源码：
```javascript
const patchChildren: PatchChildrenFn = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    optimized = false
) => {
    const c1 = n1 && n1.children
    const prevShapeFlag = n1 ? n1.shapeFlag : 0
    const c2 = n2.children

    const {patchFlag, shapeFlag} = n2
    if (patchFlag > 0) {
        if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
            patchKeyedChildren(
                c1 as VNode[],
                c2 as VNodeArrayChildren,
                container,
                anchor,
                parentComponent,
                parentSuspense,
                isSVG,
                optimized
            )
            return
        } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
            // patchUnkeyedChildren
            return
        }
    }

    // other ......
}

```
此时patchFlag的值为128，同时我们的list渲染是有key的，so 会运行patchKeyedChildren函数，c1为四个li组成的数组(a,b,c,d);c2为新的li组成的数组(a,d,e,b);其他值透传到patchKeyedChildren。

## patchKeyedChildren
上面对patchKeyedChildren函数的参数已经进行了说明，在这里我们再回顾下：

- c1：四个li组成的数组(a,b,c,d)；
- c2：新的li组成的数组(a,d,e,b)；
- container：ul元素；
- parentAnchor：ul结尾生成的对象；
- parentComponent：instance实例；
- parentSuspense：null
- isSVG：false；
- optimized：true；

接下来看下patchKeyedChildren函数的源码：
```javascript
const patchKeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    parentAnchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
) => {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1 // prev ending index
    let e2 = l2 - 1  // next ending index

    while (i <= e1 && i <= e2) {
        const n1 = c1[i]
        const n2 = (c2[i] = optimized ? cloneIfMounted(c2[i] as VNode) : normalizeVNode(c2[i]))
        // 比较 n1 与 n2 是否是同一类型的 VNode
        if (isSameVNodeType(n1, n2)) {
       		patch(n1,n2,container,null,parentComponent,parentSuspense,isSVG,optimized)
        } else {
             // 如果 n1 与 n2 不是同一类型，则 break 出 while 循环
            break
        }
          // 递增 i
        i++
    }

    while (i <= e1 && i <= e2) {
        const n1 = c1[e1]
        const n2 = (c2[e2] = optimized ? cloneIfMounted(c2[e2] as VNode) : normalizeVNode(c2[e2]))
         // 比较 n1 与 n2 是否是同一类型的 VNode
        if (isSameVNodeType(n1, n2)) {
            patch(n1,n2,container,null,parentComponent,parentSuspense,isSVG,optimized)
        } else {
             // 如果 n1 与 n2 不是同一类型，则 break 出 while 循环
            break
        }
         // 完成 patch 操作后，尾部索引递减
        e1--
        e2--
    }
// 当旧子节点被遍历完
    if (i > e1) {
        // 新节点还有元素未被遍历完
        if (i <= e2) {
            const nextPos = e2 + 1
            // 确定好锚点元素
            const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor
             // 遍历剩余的新子节点
            while (i <= e2) {
                // patch 时第一个参数传入 null，代表没有旧节点，直接将新节点插入即可
                patch(
                    null,
                    (c2[i] = optimized
                        ? cloneIfMounted(c2[i] as VNode)
                        : normalizeVNode(c2[i])),
                    container,
                    anchor,
                    parentComponent,
                    parentSuspense,
                    isSVG
                )
                i++
            }
        }
    }
// 如果新子节点已被遍历完
    else if (i > e2) {
        // 就子节点未被遍历完
        while (i <= e1) {
// 调用 unmount 卸载旧子节点
            unmount(c1[i], parentComponent, parentSuspense, true)
            // 递增索引
            i++
        }
    }

    else {
        const s1 = i // 旧子节点的起始索引
        const s2 = i // 新子节点的起始索引
        // 对新子节点，创建一个索引的 map 对象
        const keyToNewIndexMap: Map<string | number, number> = new Map()
        for (i = s2; i <= e2; i++) {
            const nextChild = (c2[i] = optimized ? cloneIfMounted(c2[i] as VNode) : normalizeVNode(c2[i]))
            if (nextChild.key != null) {
                // 如果是 DEV 环境，且 keyToNewIndexMap 已经存在当前节点的 key 值，则警告。
              if (__DEV__ && keyToNewIndexMap.has(nextChild.key)) {
                warn(
                 `Duplicate keys found during update:`,
                  JSON.stringify(nextChild.key),
                 `Make sure keys are unique.`
                )
              }
               // 以新子节点的 key 为键，索引为值，存入 map。
               keyToNewIndexMap.set(nextChild.key, i)
            }
        }

/**
 * 遍历旧子节点，尝试 patch 比较需要被 patch 的节点，并且移除不会再出现的子节点
 */
        let j
        let patched = 0
        const toBePatched = e2 - s2 + 1
        let moved = false// 用于跟踪是否有节点发生移动
        let maxNewIndexSoFar = 0// 用于确定最长递增子序列
        const newIndexToOldIndexMap = new Array(toBePatched)
        for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

        for (i = s1; i <= e1; i++) {
            const prevChild = c1[i]
            if (patched >= toBePatched) {
                // 所有新节点都被 patch 了，所以剩下的只需要移除
                unmount(prevChild, parentComponent, parentSuspense, true)
                continue
            }
            let newIndex
            if (prevChild.key != null) {
                newIndex = keyToNewIndexMap.get(prevChild.key)
            } else {
                // 对于找不到 key 的节点，尝试去定位相同 type 的节点
                for (j = s2; j <= e2; j++) {
                    if (
                        newIndexToOldIndexMap[j - s2] === 0 &&
                        isSameVNodeType(prevChild, c2[j] as VNode)
                    ) {
                        newIndex = j
                        break
                    }
                }
            }
            if (newIndex === undefined) {
                unmount(prevChild, parentComponent, parentSuspense, true)
            } else {
                // 在 newIndexToOldIndexMap 记录下被 patch 的节点的索引
                newIndexToOldIndexMap[newIndex - s2] = i + 1
                 // 如果 newIndex 的索引大于最远移动的索引，则更新
                if (newIndex >= maxNewIndexSoFar) {
                    maxNewIndexSoFar = newIndex
                } else {// 否则标记 moved 为 true
                    moved = true
                }
                  // 对新旧子节点进行 patch
                patch(
                    prevChild,
                    c2[newIndex] as VNode,
                    container,
                    null,
                    parentComponent,
                    parentSuspense,
                    isSVG,
                    optimized
                )
                // patch 完毕后，递增 patched 计数。
                patched++
            }
        }
/**
 * 移动和挂载
 */
// 当节点被移动时，创建最长递增子序列
        const increasingNewIndexSequence = moved
            ? getSequence(newIndexToOldIndexMap)
            : EMPTY_ARR
        j = increasingNewIndexSequence.length - 1
        // 为了能方便的获取锚点，选择从后向前遍历
        for (i = toBePatched - 1; i >= 0; i--) {
            const nextIndex = s2 + i
            const nextChild = c2[nextIndex] as VNode
            const anchor =
                nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor
            if (newIndexToOldIndexMap[i] === 0) {
                // 如果在 newIndexToOldIndexMap 中找不到对应的索引，则新增节点
                patch(
                    null,
                    nextChild,
                    container,
                    anchor,
                    parentComponent,
                    parentSuspense,
                    isSVG
                )
            } else if (moved) {
                // 如果不是一个稳定的子序列，或者当前节点不在递增子序列上时，需要移动
                if (j < 0 || i !== increasingNewIndexSequence[j]) {
                    move(nextChild, container, anchor, MoveType.REORDER)
                } else {
                    j--
                }
            }
        }
    }
}

```
上面代码包含的有两个while循环和两对if-else；
- i=0，循环开始下标；e1、e2为c1和c2的长度；l2为新的children的长度；
- 第一个while循环，从头开始对列表进行遍历：
- 1.1 当nodeType一样的时候，调用patch；
- 1.2当nodeType不一样的时候，跳出循环；
- 第二个while循环，当第一个while循环对c1和c2都没有遍历完的时候，从尾部开始对其进行遍历：
- 2.1 当nodeType一样的时候，调用patch；
- 2.2 当nodeType不一样的时候，跳出循环；
- 第一个if，i>e1证明c1已经遍历完，i<=e2证明c2还没遍历完，对剩余的c2继续遍历，调用patch；
- 第二个else-if，i>e2证明c2已经遍历完，i<=e1证明c1还没遍历完，对剩余的c1继续遍历，因为c1为老的列表，则调用unmount把无用的列表内容卸载掉：
- 第二个else：c1和c2至少有一个没有遍历完，走到最后一个else的逻辑：
- 3.1 `for (i = s2; i <= e2; i++)`for循环遍历剩余c2，收集每个c2的元素的key，构成`map => keyToNewIndexMap`；
- 3.2 `for (i = 0; i < toBePatched; i++)`for循环遍历剩余c2部分长度来生成映射，并赋值为0；
- 3.3 `for (i = s1; i <= e1; i++)` for循环遍历剩余c1，使用key进行直接获取(for循环剩余c2进行获取)newIndex，此处证明还是要绑定好key，唯一性很重要；newIndex有值说明c2中存在当前老的元素在c1中，老的preChild，在c2中还需要，则调用patch；如果newIndex为undefined，则说明老的preChild在c2中不需要了，调用unmount，把当前preChild卸载掉；
- 3.4 遍历完剩余c1后，再倒着遍历剩余c2：`for (i = toBePatched - 1; i >= 0; i--)`；如果`(newIndexToOldIndexMap[i] === 0`则证明当前nextChild为新的节点，调用patch；否则判断之前是否发生了移动moved，经过逻辑判断，调用move；

## patchKeyedChildren 例子
根据咱们上面的例子，由old: ['a', 'b', 'c', 'd']变更为new: ['a', 'd', 'e', 'b']的过程如下：
- 首先进入第一个while循环，此时i为0，l2为4，e1为3，e2为3；
- 1.1 第一次循环，old-a与new-a是相同的，调用patch，不发生变化；
- 1.2 第二次循环，old-b与new-b是不相同的，break；
- 1.3 跳出循环，从头开始的循环结束；
- 进入第二个while循环，此时i为1，l2为4，e1为3，e2为3；
- 2.1第一次循环，old-d与new-b是不相同的，break；
- 2.2跳出循环，从尾部开始的循环结束；
- 进入第一个if判断为false，进入第二个else-if判断为false，进入else；
- for循环收集每个c2的元素的key，`keyToNewIndexMap = ['d' => 1, 'e' => 2, 'b' => 3]`;
- 建立长度为剩余c2长度的数组newIndexToOldIndexMap = [0, 0 ,0];
- 此时进入`for (i = s1; i <= e1; i++)` for循环遍历剩余c1阶段，此时i为1，s1为1，s2为1：
- 3.1 第一次循环：遍历的元素为old-b,发现在new中存在，通过keyToNewIndexMap获得在new中的index为3；调用patch；
- 3.2 第二次循环：遍历的元素为old-c,在new中不存在，调用unmount卸载当前old-c，改变后c1为`['a', 'b', 'd']`
- 3.3 第三次循环：遍历的元素为old-d，在new中存在，通过keyToNewIndexMap获得在new中的index为1；调用patch；
- 3.4 跳出循环，遍历c1剩余阶段结束；
- 此时进入`for (i = toBePatched - 1; i >= 0; i--)`倒着遍历剩余c2阶段，此时i为2，j为0，s1为1，s2为1，newIndexToOldIndexMap为[4, 0, 2]：
- 4.1 第一次循环，判断当前nextChild(new-b)存不存在，通过newIndexToOldIndexMap发现nextChild存在，并且在old里面的索引值为2，j--,此时j为-1；i--，i为1；
- 4.2 第二次循环，判断当前nextChild(new-e)存不存在,通过newIndexToOldIndexMap发现nextChild的索引值为0，表示不存在，则调用patch；i--，i为0；改变后c1为`['a', 'e', 'b', 'd']`;
- 4.3 第三次循环，判断当前nextChild(new-d)存不存在,通过newIndexToOldIndexMap发现nextChild的索引值为4，表示存在，则调用move；i--，i为-1；改变后c1为`['a',, 'd' 'e', 'b']`;
- 4.4 此时i为-1，跳出循环，循环结束
- 遍历结束，结果变更为了`new: ['a', 'd', 'e', 'b']`

### isSameVNodeType
大家可以看下下面isSameVNodeType的代码，大家在写代码的时候，为了能够提高页面性能，dom diff的速度，如果没有发生变更的元素，key一定要保持一样，不要`v-for="(item, index) in list" :key="index"`这样来写，因为当只有数组内部元素发生了位置移动而元素未发生改变时，index的值是变更的，这样在dom diff的时候就会使程序发生误解。key的唯一性很重要
```javascript
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
    return n1.type === n2.type && n1.key === n2.key
}

```