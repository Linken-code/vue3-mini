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

调用patch函数的过程，也就是根据VNode的type，走不同的支流的过程；点击change按钮：

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
        if (n1 == null) {
            // first render
        } else {
            patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized)
        }
    }

```
如上代码，会直接调用patchElement，此时参数为：

- n1: 老的change按钮构成的VNode对象；
- n2：新的change按钮构成的VNode对象；
- parentComponent: instance实例；
- parentSuspense: null；
- isSVG: false；
- optimized: true；

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
    let e1 = c1.length - 1 
    let e2 = l2 - 1 

    while (i <= e1 && i <= e2) {
        const n1 = c1[i]
        const n2 = (c2[i] = optimized ? cloneIfMounted(c2[i] as VNode) : normalizeVNode(c2[i]))
        if (isSameVNodeType(n1, n2)) {
       		patch(n1,n2,container,null,parentComponent,parentSuspense,isSVG,optimized)
        } else {
            break
        }
        i++
    }

    while (i <= e1 && i <= e2) {
        const n1 = c1[e1]
        const n2 = (c2[e2] = optimized ? cloneIfMounted(c2[e2] as VNode) : normalizeVNode(c2[e2]))
        if (isSameVNodeType(n1, n2)) {
            patch(n1,n2,container,null,parentComponent,parentSuspense,isSVG,optimized)
        } else {
            break
        }
        e1--
        e2--
    }

    if (i > e1) {
        if (i <= e2) {
            const nextPos = e2 + 1
            const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor
            while (i <= e2) {
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

    else if (i > e2) {
        while (i <= e1) {
            unmount(c1[i], parentComponent, parentSuspense, true)
            i++
        }
    }

    else {
        const s1 = i
        const s2 = i 
        for (i = s2; i <= e2; i++) {
            const nextChild = (c2[i] = optimized ? cloneIfMounted(c2[i] as VNode) : normalizeVNode(c2[i]))
            if (nextChild.key != null) {
                keyToNewIndexMap.set(nextChild.key, i)
            }
        }

        let j
        let patched = 0
        const toBePatched = e2 - s2 + 1
        let moved = false
        let maxNewIndexSoFar = 0
        const newIndexToOldIndexMap = new Array(toBePatched)
        for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

        for (i = s1; i <= e1; i++) {
            const prevChild = c1[i]
            if (patched >= toBePatched) {
                unmount(prevChild, parentComponent, parentSuspense, true)
                continue
            }
            let newIndex
            if (prevChild.key != null) {
                newIndex = keyToNewIndexMap.get(prevChild.key)
            } else {
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
                newIndexToOldIndexMap[newIndex - s2] = i + 1
                if (newIndex >= maxNewIndexSoFar) {
                    maxNewIndexSoFar = newIndex
                } else {
                    moved = true
                }
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
                patched++
            }
        }

        const increasingNewIndexSequence = moved
            ? getSequence(newIndexToOldIndexMap)
            : EMPTY_ARR
        j = increasingNewIndexSequence.length - 1
        for (i = toBePatched - 1; i >= 0; i--) {
            const nextIndex = s2 + i
            const nextChild = c2[nextIndex] as VNode
            const anchor =
                nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor
            if (newIndexToOldIndexMap[i] === 0) {
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