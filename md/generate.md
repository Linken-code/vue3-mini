## 代码生成器

在一起看 @vue/compiler-core 编译模块的时候，首次出现了代码生成器 —— generate 模块。今天我们要讲的就是generate 函数做了什么事情。

### 代码生成器是什么

代码生成器是什么？它有什么作用？在回答这些问题以前，我们还是要从编译流程中说起，在生成一个 Vue 对象的编译过程执行结束时，我们会从编译的结果中拿到一个名叫 code 的 string 类型的变量。而这个变量就是我们今天通篇会提及的代码字符串，Vue 会用这个生成的代码字符串，配合 Function 类的构造函数生成 render 渲染函数，最终用生成的渲染函数完成对应组件的渲染，在源码中是如下这样实现的。

```javascript
function compileToFunction(
  template: string | HTMLElement,
  options?: CompilerOptions
): RenderFunction {
  const key = template
 // 执行编译函数，并从结果中结构出代码字符串
  const { code } = compile(
    template,
    extend(
      {
        hoistStatic: true,
        onError: __DEV__ ? onError : undefined,
        onWarn: __DEV__ ? e => onError(e, true) : NOOP
      } as CompilerOptions,
      options
    )
  )

  // 通过 Function 构造方法，生成 render 函数
  const render = (__GLOBAL__
    ? new Function(code)()
    : new Function('Vue', code)(runtimeDom)) as RenderFunction

  ;(render as InternalRenderFunction)._rc = true

  // 返回生成的 render 函数，并缓存
  return (compileCache[key] = render)
}


```
那么接下来，就带大家直入代码生成器模块，从 generate 函数入手，查看生成器的工作方式。

### 代码生成上下文
generate 函数位于 packages/compiler-core/src/codegen.ts 的位置，我们先看一下它的函数签名。
```javascript
export function generate(
  ast: RootNode,
  options: CodegenOptions & {
    onContextCreated?: (context: CodegenContext) => void
  } = {}
): CodegenResult {
    const context = createCodegenContext(ast, options)
    /* 忽略后续逻辑 */
}

export interface CodegenResult {
  code: string
  preamble: string
  ast: RootNode
  map?: RawSourceMap
}

```
generate 函数，接收两个参数，分别是经过转换器处理的 ast 抽象语法树，以及 options 代码生成选项。最终返回一个 CodegenResult 类型的对象。

可以看到 CodegenResult 中包含了 code 代码字符串、ast 抽象语法树、可选的 sourceMap、以及代码字符串的前置部分 preamble。

而 generate 的函数，第一行就是生成一个上下文对象，这里为了语义上的更好理解，我们称这个 context 为代码生成器的上下文对象，简称生成器上下文。

生成器上下文中除了一些属性外，会留意到它有 5 个工具函数，这里重点看一下 push 函数。

讲解 push 之前，没看过代码的朋友可能会有点迷惑，一个向数组内添加元素的函数有什么好说的呢？但是此 push 非彼 push，先给大家看一下 push 的实现。
```javascript
push(code, node) {
  context.code += code
  if (!__BROWSER__ && context.map) {
    if (node) {
      let name
      /* 忽略逻辑 */
      addMapping(node.loc.start, name)
    }
    advancePositionWithMutation(context, code)
    if (node && node.loc !== locStub) {
      addMapping(node.loc.end)
    }
  }
}

```
看完上方 push 的实现，能够发现 push 并非是向数组中推送元素，而是拼接字符串，将传入的字符串拼接入上下文中的 code 属性中。并且会调用 addMapping 生成对应的 sourceMap。这个函数是作用很重要，当生成器处理完 ast 树中的每个节点时，都会调用 push，向之前已经生成好的代码字符串中去拼接新生成的字符串。直至最终，拿到完整的代码字符串，并作为结果返回。

context 中除了 push，还有 indent、deindent、newline 这些处理字符串位置的函数，分别的作用是缩进、回退缩进、插入新的一行。是用来辅助生成的代码字符串，格式化结构用的，让生成的代码字符串非常直观，就像在 ide 中敲入的一样。

### 执行流程

当生成器上下文创建好之后，generate 函数会接着向下执行，接下来我就和大家继续往下阅读，分析生成器的执行流程。在本节中我放入的代码全部都是 generate 函数体内的，所以为了更简短的篇幅，generate 的函数签名就不会再重复放入了。

#### 代码字符串 前置内容生成
```javascript
const hasHelpers = ast.helpers.length > 0 // 是否存在 helpers 辅助函数
const useWithBlock = !prefixIdentifiers && mode !== 'module' // 使用 with 扩展作用域
const genScopeId = !__BROWSER__ && scopeId != null && mode === 'module'

// 不在浏览器的环境且 mode 是 module
if (!__BROWSER__ && mode === 'module') {
  // 使用 ES module 标准的 import 来导入 helper 的辅助函数，处理生成代码的前置部分
  genModulePreamble(ast, preambleContext, genScopeId, isSetupInlined)
} else {
  // 否则生成的代码前置部分是一个单一的 const { helpers... } = Vue 处理代码前置部分
  genFunctionPreamble(ast, preambleContext)
}

```

在创建完上下文，从上下文中解构完一些对象后，会生成代码字符串的前置部分，这里有个关键判断是 mode 属性，根据 mode 属性来判断使用何种方式引入 helpers 辅助函数的声明。

mode 有两个选项，`'module'` 或 `'function'`。当传入的参数是 module 时，会通过 ES module 的 import 来导入 ast 中的 helpers 辅助函数，并用 export 默认导出 render 函数。当传入的参数是 function 时，就会生成一个单一的 ` const { helpers... } = Vue` 声明，并且 return 返回 render 函数，而不是通过 export 导出。下面的代码框注中我放入了两种模式生成的代码前置部分的区别。

```javascript
// mode === 'module' 生成的前置部分
'import { createVNode as _createVNode, resolveDirective as _resolveDirective } from "vue"

export '

// mode === 'function' 生成的前置部分
'const { createVNode: _createVNode, resolveDirective: _resolveDirective } = Vue

return '

```
要注意以上代码仅仅是代码前置部分，咱们还没有开始解析其他资源和节点，所以仅仅是到了 export 或者 return 就戛然而止了。在明白了前置部分的区别后，我们接着往下看代码。

### 生成 render 函数签名
接下来生成器会开始生成 render 函数的函数体，首先从函数名、以及给 render 函数的传参开始。当确定了函数签名后，如果 mode 是 function 的情况，生成器会使用 with 来扩展作用域，最后生成的模样在第一篇编译流程中也已经展示过。

首先会根据是否是服务端渲染，ssr 的标记来确定函数名 functionName 以及要传入函数的参数 args，并且在函数签名部分会判断是否是 TypeScript 的环境，如果是 TypeScript 的话，会给参数标记为 any 类型。

之后会判断是通过箭头函数还是函数声明来创建函数。

在函数创建好后，函数体内会判断是否需要通过 with 来扩展作用域，并且此时如果有 helpers 辅助函数，也会解构在 with 的块级作用域内，解构以后也会重命名变量，防止与用户的变量名冲突。

具体的代码逻辑在下方。
```javascript
// 生成后的函数名
const functionName = ssr ? `ssrRender` : `render`
// 函数的传参
const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache']
/* 忽略逻辑 */

// 函数签名，是 TypeScript 的话标记为 any 类型
const signature =
  !__BROWSER__ && options.isTS
    ? args.map(arg => `${arg}: any`).join(',')
    : args.join(', ')

/* 忽略逻辑 */

// 使用箭头函数还是函数声明来创建渲染函数
if (isSetupInlined || genScopeId) {
  push(`(${signature}) => {`)
} else {
  push(`function ${functionName}(${signature}) {`)
}
indent()

// 使用 with 扩展作用域 
if (useWithBlock) {
  push(`with (_ctx) {`)
  indent()
  // 在 function mode 中，const 声明应该在代码块中，
  // 并且应该重命名解构的变量，防止变量名和用户的变量名冲突
  if (hasHelpers) {
    push(
      `const { ${ast.helpers
        .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
        .join(', ')} } = _Vue`
    )
    push(`\n`)
    newline()
  }
}

```

### 资源的分解声明

在看到“资源的分解声明”这个小标题之前，我们先需要搞明白生成器把什么定义成资源。生成器将 AST 抽象语法树中解析出的 components 组件，directives 指令，temps 临时变量，以及上个月尤大又在 Vue3 中兼容了 Vue2 filters 过滤器这四样类型当做资源。

在 render 函数中，该部分的处理会将上述资源都提前声明出来，将 AST 树中解析出的资源 id 传入每个资源对应的处理函数，并生成对应的资源变量。
```javascript
// 如果 ast 中有组件，解析组件
if (ast.components.length) {
  genAssets(ast.components, 'component', context)
  if (ast.directives.length || ast.temps > 0) {
    newline()
  }
}
/* 省略 指令和过滤器，逻辑与组件一致 */
if (ast.temps > 0) {
  push(`let `)
  for (let i = 0; i < ast.temps; i++) {
    push(`${i > 0 ? `, ` : ``}_temp${i}`) // 通过 let 声明变量
  }
}

```
在上面源码中，我放入了两个典型代表，components 以及 temps。举个例子，给大家看看生成代码后的结果。
```javascript
components: [`Foo`, `bar-baz`, `barbaz`, `Qux__self`],
directives: [`my_dir_0`, `my_dir_1`],
temps: 3

```

假设在 AST 中有如下资源，4 个组件，ID 分别为 Foo、bar-baz、barbaz、Qux__self。2 个指令，ID 分别为 my_dir_0, my_dir_1，以及有 3 个临时变量。这些资源被解析后生成如下所示的代码字符串。
```javascript
const _component_Foo = _resolveComponent("Foo")
const _component_bar_baz = _resolveComponent("bar-baz")
const _component_barbaz = _resolveComponent("barbaz")
const _component_Qux = _resolveComponent("Qux", true)
const _directive_my_dir_0 = _resolveDirective("my_dir_0")
const _directive_my_dir_1 = _resolveDirective("my_dir_1")
let _temp0, _temp1, _temp2

```
不必去纠结 resolve 函数中做了什么事情，我们只需要知道代码生成器会生成怎样的代码即可。

所以从结果去倒推 genAssets 函数做过的事情，就是根据资源类型 + 资源 ID 当做变量名，并将资源ID传入类型对应的 resolve 函数，并将结果赋值给声明的变量。

而 temps 的处理在上方源码已经写的很清楚了。

### 返回结果
在生成 render 函数体，处理完资源后，生成器会开始最关键一步——生成节点对应的代码字符串，在处理完所有节点后，会将生成的结果返回。由于节点的重要性，我们选择将此部分放在后面单独说。至此代码字符串生成完毕，最终会返回一个 CodegenResult 类型的对象。

### 生成节点
```javascript
if (ast.codegenNode) {
  genNode(ast.codegenNode, context)
}

```

当生成器判断 ast 中有 codegenNode 的节点属性后，会调用 genNode 来生成节点对应的代码字符串。接下来我们就来详细看一下 genNode 函数。
```javascript
function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  // 如果是字符串，直接 push 入代码字符串
  if (isString(node)) {
    context.push(node)
    return
  }
  // 如果 node 是 symbol 类型，传入辅助函数生成的代码字符串
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  // 判断 node 类型
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode!, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    /* 忽略剩余 case 分支 */
  }
}

```
genNode 函数会先判断节点的类型，对于字符串或 symbol 类型的节点，会直接拼接进代码字符串中，之后通过一个 Switch-Case 条件分支判断 node 节点的类型。而由于判断条件很多，这里会忽略大部分条件，只举几个典型的类型来分析。

首先是第一个 case，当遇到 Element、IF 或 FOR 类型的节点类型时，会递归的调用 genNode，继续去生成这三种节点类型的子节点，这样能够保证遍历的完整性。

而当节点是一个文本类型时，会调用 genText 函数，直接将文本通过 JSON.stringify 序列化拼接进代码字符串中。

当节点是一个简单表达式时，会判断该表达式是否是静态的，如果是静态的，则通过 JSON 字符串序列化后拼入代码字符串，否则直接拼接表达式对应的 content。

通过这三个节点的分析，我们能知道其实生成器是根据不同节点的类型，push 进不同的代码字符串，而对于存在子节点的节点，又回去递归遍历，确保每个节点都能生成对应的代码字符串。

### 处理静态提升
在讲述生成器生成代码前置部分时，看源码会发现根据 mode 类型，调用了 genModulePreamble 或 genFunctionPreamble 函数。而在这两个函数中，都有一行相同的代码：  `genHoists(ast.hoists, context)`。

这个函数就是用来处理静态提升的，在上一篇文章中，我给大家介绍了静态提升，并举了例子，说明静态提升会提前将静态节点提取出来，生成对应的序列化字符串。而今天我准备接上一篇文章的内容，再跟大家一起探究生成器是怎么处理静态提升的。

```javascript
function genHoists(hoists: (JSChildNode | null)[], context: CodegenContext) {
  if (!hoists.length) {
    return
  }
  context.pure = true
  const { push, newline, helper, scopeId, mode } = context
  newline()

  hoists.forEach((exp, i) => {
    if (exp) {
      push(`const _hoisted_${i + 1} = `)
      genNode(exp, context)
      newline()
    }
  })

  context.pure = false
}

```

这里我直接放上了生成静态提升的 genHoists 代码，逐步分析逻辑。首先呢，函数接受 ast 树中 hoists 的属性的入参，是一组节点类型的集合的数组，并接受生成器上下文，一共有两个参数。

如果 hoists 数组中没有元素，说明不存在需要静态提升的节点，那直接返回即可。

否则就是存在需要提升的节点，那么将上下文的 pure 标记置为 true。

之后 forEach 遍历 hoists 数组，并且根据数组的 index 生成静态提升的变量名` _hoisted_${index + 1}`，之后调用 genNode 函数，生成静态提升节点的代码字符串，赋值给之前声明的变量` _hoisted_${index + 1}`。

在遍历完所有的需要提升的变量后，将 pure 标记置为 false。

而这里 pure 标记的作用，就是在某些节点类型生成字符串前，添加` /*#__PURE__*/ `注释前缀，表明该节点是静态节点。
