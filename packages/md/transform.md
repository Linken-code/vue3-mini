## 静态提升

### 什么是静态提升
什么是静态提升呢？当 Vue 的编译器在编译过程中，发现了一些不会变的节点或者属性，就会给这些节点打上标记。然后编译器在生成代码字符串的过程中，会发现这些静态的节点，并提升它们，将他们序列化成字符串，以此减少编译及渲染成本。有时可以跳过一整棵树。
```javascript
<div>
  <span class="foo">
    Static
  </span>
  <span>
    {{ dynamic }}
  </span>
</div>

```
例如这段模板代码，毫无疑问，我们能看出来 这个节点，不论 dynamic 表达式如何变，它都不会再改变了。对于这样的节点，就可以打上标记进行静态提升。

而 Vue3 也可以对 props 属性进行静态提升。
```javascript
<div id="foo" class="bar">
	{{ text }}
</div>

```
### 编译后的代码字符串
上面的例子我们只是简单的分析了一些模板，现在我们通过一个例子，来了解静态提升前后的变化。
```javascript
<div>
  <div>
    <span class="foo"></span>
    <span class="foo"></span>
    <span class="foo"></span>
    <span class="foo"></span>
    <span class="foo"></span>
  </div>
</div>
```

来看这样一个模板，符合静态提升的条件，但是如果没有静态提升的机制，它会被编译成如下代码：
```javascript
const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _createVNode("div", null, [
      _createVNode("span", { class: "foo" }),
      _createVNode("span", { class: "foo" }),
      _createVNode("span", { class: "foo" }),
      _createVNode("span", { class: "foo" }),
      _createVNode("span", { class: "foo" })
    ])
  ]))
}

```
编译后生成的 render 函数很清晰，是一个柯里化的函数，返回一个函数，创建一个根节点的 div，children 里有再创建一个 div 元素，最后在最里面的 div 节点里创建五个 span 子元素。

如果进行静态提升，那么它会被编译成这样：
```javascript
const { createVNode: _createVNode, createStaticVNode: _createStaticVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

const _hoisted_1 = /*#__PURE__*/_createStaticVNode("<div><span class=\"foo\"></span><span class=\"foo\"></span><span class=\"foo\"></span><span class=\"foo\"></span><span class=\"foo\"></span></div>", 1)

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _hoisted_1
  ]))
}

```
静态提升以后生成的代码，我们可以看出有明显区别，它会生成一个变量: _hoisted_1，并打上 `/*#__PURE__*/` 标记。 _hoisted_1 通过字符串的传参，调用 createStaticVNode 创建了静态节点。而 _createBlock 中由原来的多个创建节点的函数的传入，变为了仅仅传入一个函数。性能的提升自然不言而喻。

在知道了静态提升的现象后，我们就一起来看看源码中的实现。

## transform 转换器

在上一篇文章中我提到编译时会调用 compiler-core 模块中 @vue/compiler-core/src/compile.ts 文件下的 baseCompile 函数。在这个函数的执行过程中会执行 transform 函数，传入解析出来的 AST 抽象语法树。那么我们首先一起看一下 transform 函数做了什么。
```javascript
export function transform(root: RootNode, options: TransformOptions) {
  // 创建转换上下文
  const context = createTransformContext(root, options)
  // 遍历所有节点，执行转换
  traverseNode(root, context)
  // 如果编译选项中打开了 hoistStatic 开关，则进行静态提升
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  // 确定最终的元信息 
  root.helpers = [...context.helpers.keys()]
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.imports = context.imports
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached
}

```

transform 函数很简短，并且从中文注释中，我们可以关注到在第 7 行代码的位置，转换器判断了编译时是否有开启静态提升的开关，若是打开的话则对节点进行静态提升。今天的文章主要是介绍静态提升，那么就围绕静态提升的代码往下探索下去，而其余部分代码则不展开来细究了。

### hoistStatic 静态提升转换
hoistStatic 的函数源码如下：
```javascript
export function hoistStatic(root: RootNode, context: TransformContext) {
  walk(
    root,
    context,
    // 很不幸，根节点是不能被静态提升的
    isSingleElementRoot(root, root.children[0])
  )
}

```

从函数的声明中我们能够得知，静态提升转换器接收根节点以及转换器上下文作为参数。并且仅仅是调用了 walk 函数。

walk 函数很长，所以在我们讲解 walk 函数之前，我先将 walk 函数的函数签名写出来给大家讲一讲。
```javascript
(node: ParentNode, context: TransformContext, doNotHoistNode: boolean) => void

```

### walk 函数
接下来会分段的给大家解析 walk 函数。
```javascript
function walk(
  node: ParentNode,
  context: TransformContext,
  doNotHoistNode: boolean = false
) {
  let hasHoistedNode = false
  let canStringify = true

  const { children } = node
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    /* 省略逻辑 */
  }
   
  if (canStringify && hasHoistedNode && context.transformHoist) {
    context.transformHoist(children, context, node)
  }
}

```

walk 函数首先会声明两个标记，hasHoistedNode：记录该节点是否可以被提升; canStringify: 当前节点是否可以被字符序列化。

对于 canStringify 这个变量，源码是这样解释的：有一些转换，比如 @vue/compiler-sfc 中的 transformAssetUrls，用表达式代替静态的绑定。这些表达式是不可变的，所以它们依然是可以被合法的提升的，但是他们只有在运行时的时候才会被发现，因此不能提前评估。这只是字符串序列化之前的一个问题(通过 @vue/compiler-dom 的 transformHoist 功能)，但是在这里允许我们执行一次完整的 AST 解析，并允许 stringifyStatic 在满足其字符串阈值后立即停止执行 walk 函数。

之后会遍历当前节点的 children 所有子节点，而 for 内处理的逻辑我们暂时忽略，后面再看。

执行完 for 循环之后，可以看到如果该节点能被提升且能被字符序列化，并且上下文中有 transformHoist 的转换器，则对当前节点通过提升转换器进行提升。由此可以推测出 for 循环主体内的工作就是遍历节点，并且判断是否可以被提升以及字符序列化，并将结果赋值给函数开头声明的这两个标记。这样的遍历行为跟函数名 walk 的意义也是一致的。

一起来看一下 for 循环体内的逻辑：
```javascript
for (let i = 0; i < children.length; i++) {
  const child = children[i]
  // 只有简单的元素以及文本是可以被合法提升的
  if (
    child.type === NodeTypes.ELEMENT &&
    child.tagType === ElementTypes.ELEMENT
  ) {
    // 如果不允许被提升，则赋值 constantType NOT_CONSTANT 不可被提升的标记
    // 否则调用 getConstantType 获取子节点的静态类型
    const constantType = doNotHoistNode
      ? ConstantTypes.NOT_CONSTANT
      : getConstantType(child, context)
    // 如果获取到的 constantType 枚举值大于 NOT_CONSTANT
    if (constantType > ConstantTypes.NOT_CONSTANT) {
      // 根据 constantType 枚举值判断是否可以被字符序列化
      if (constantType < ConstantTypes.CAN_STRINGIFY) {
        canStringify = false
      }
      // 如果可以被提升
      if (constantType >= ConstantTypes.CAN_HOIST) {
        // 则将子节点的 codegenNode 属性的 patchFlag 标记为 HOISTED 可提升
        ;(child.codegenNode as VNodeCall).patchFlag =
          PatchFlags.HOISTED + (__DEV__ ? ` /* HOISTED */` : ``)
        child.codegenNode = context.hoist(child.codegenNode!)
        // hasHoistedNode 记录为 true
        hasHoistedNode = true
        continue
      }
    } else {
      // 节点可能包含动态的子节点，但是它的 props 属性也可能能被合法提升
      const codegenNode = child.codegenNode!
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        // 获取 patchFlag
        const flag = getPatchFlag(codegenNode)
        // 如果不存在 flag，或者 flag 是文本类型
        // 并且该节点 props 的 constantType 值判断出可以被提升
        if (
          (!flag ||
            flag === PatchFlags.NEED_PATCH ||
            flag === PatchFlags.TEXT) &&
          getGeneratedPropsConstantType(child, context) >=
            ConstantTypes.CAN_HOIST
        ) {
          // 获取节点的 props，并在转换器上下文中执行提升操作
          const props = getNodeProps(child)
          if (props) {
            codegenNode.props = context.hoist(props)
          }
        }
      }
    }
  // 如果节点类型为 TEXT_CALL，则同样进行检查，逻辑与前面一致
  } else if (child.type === NodeTypes.TEXT_CALL) {
    const contentType = getConstantType(child.content, context)
    if (contentType > 0) {
      if (contentType < ConstantTypes.CAN_STRINGIFY) {
        canStringify = false
      }
      if (contentType >= ConstantTypes.CAN_HOIST) {
        child.codegenNode = context.hoist(child.codegenNode)
        hasHoistedNode = true
      }
    }
  }

  // walk further
  /* 暂时忽略 */
}

```

循环体内的函数较长，所以我们先不关注底部 walk further 的部分，为了便于理解，我逐行添加了注释。

通过最外层 if 分支顶部的注释，我们可以知道只有简单的元素和文本类型是可以被提升的，所以会先判断该节点是否是一个元素类型。如果该节点是一个元素，那么会检查 walk 函数的 doNotHoistNode 参数确认该节点是否能被提升，如果 doNotHoistNode 不为真，则调用 getConstantType 函数获取当前节点的 constantType。

```javascript
export const enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_HOIST,
  CAN_STRINGIFY
}

```

这是 ConstantType 枚举的声明，通过这个枚举可以将静态类型分为 4 个等级，而静态类型更高等级的节点涵盖了更小值的节点是所有能力。例如当一个节点被标记了 CAN_STRINGIFY，意味着它能够被字符序列化，所以它永远也是一个可以被静态提升（CAN_HOIST）以及跳过 PATCH 检查的节点。

在搞明白了 ConstantType 类型后，再接着看后续的判断，获取了元素类型节点的静态类型后，会判断静态类型的值是否大于 NOT_CONSTANT，如果条件为 true，则说明该节点可能能被提升或字符序列化。接着往下判断该静态类型能否被字符序列化，如果不能则修改 canStringify 的标记。之后判断静态类型能否被提升，如果可以被提升，则将子节点的 codegenNode 对象的 patchFlag 属性标记为 PatchFlags.HOISTED，执行转换器上下文中的 context.hoist 操作，并修改 hasHoistedNode 的标记。

至此元素类型节点的提升判断完毕，我们有发现有一个 PatchFlags 标记的存在，大家只要知道 Patch Flag 是在编译过程中生成的一些优化记号就行。

后续的代码是在判断当该节点不是简单元素时，尝试提升该节点的 props 中的静态属性，以及当节点为文本类型时，确认是否需要提升。限于篇幅原因，请大家自行查看上方代码。

在前面我隐藏了一段 walk further 的逻辑，从注释中来理解，这段代码的作用是继续查看一些分支情况，看看是否还有可能进行静态提升，代码如下：

```javascript
  // walk further
  if (child.type === NodeTypes.ELEMENT) {
    // 如果子节点的 tagType 是组件，则继续遍历子节点
    // 以便判断插槽中的情况
    const isComponent = child.tagType === ElementTypes.COMPONENT
    if (isComponent) {
      context.scopes.vSlot++
    }
    walk(child, context)
    if (isComponent) {
      context.scopes.vSlot--
    }
  } else if (child.type === NodeTypes.FOR) {
    // 查看 v-for 类型的节点是否能够被提升
    // 但是如果 v-for 的节点中是只有一个子节点，则不能被提升
    walk(child, context, child.children.length === 1)
  } else if (child.type === NodeTypes.IF) {
    // 如果子节点是 v-if 类型，判断它所有的分支情况
    for (let i = 0; i < child.branches.length; i++) {
			// 如果只有一个分支条件，则不进行提升
      walk(
        child.branches[i],
        context,
        child.branches[i].children.length === 1
      )
    }
  }

```

walk futher 的部分会尝试判断元素为组件、v-for、v-if 的情况。再一次遍历组件的目的是为了检查其中的插槽是否能被静态提升。v-for 和 v-if 也是一样，检查 v-for 循环生成的节点以及 v-if 的分支条件能否被静态提升。但是这里需要注意，如果 v-for 是单一节点或者 v-if 的分支中只有一个分支判断那么均不会进行提升，因为它们会是一个 block 类型。
至此，walk 函数就给大家讲解完了。
