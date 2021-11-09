## 编译系统

编译系统 (compiler) 内部虽然很复杂，但是它要做的事情对于外部来说其实很简单明确，就是要通过开发者写的组件模板 (template) 生成编译后的render函数，某种意义上compiler可以理解为是一个“纯函数”，输入是 template 输出是 render function。

### 1.编译流程
![avatar](./images/compile-dom.png)

如上图所示，整个编译系统分为三个阶段：
1.parse: 解析阶段，将模板解析成原始AST，此时的AST只是相当于对模板进行了傻瓜式翻译，并没有实际的可用性
2.transform: 转换阶段，将原始AST通过各转换插件转换出可用于渲染的目标AST，同时为各节点创建代码生成器，同时注入运行时优化信息
3.generate: 生成阶段，通过代码生成器生成最终的可运行代码段和其他运行时信息

### 2.编译系统入口
baseCompile是整个底层核心编译系统的总入口，虽然内部处理逻辑比较复杂，但是它的职责是很纯粹的，就是把输入模板编译成运行时产物 (主要是渲染代码段)

可能有的人会有疑问了，既然编译器是需要生成可运行产物，那么为什么不一次到位，直接生成vnode岂不是更好，何必要每次执行render函数再生成vnode呢？不要忘了，我们在运行时是会发生re-render的，如果编译生成的产物是最终的vnode，那么这个vnode将无法做到动态化，当框架发生重渲染时，vnode无法感知到最新的动态数据，所以vnode每次重新渲染拿到的状态还是旧的。因此我们需要一个运行时的动态化执行器，保证我们每次重新渲染都能获取到最新的动态数据以保证虚拟dom对视图抽象的准确性，render函数本质上就是一个函数执行器，它恰好满足“动态执行器”这个特性

下面是源码入口

```javascript
export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'
  /* istanbul ignore if */
  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
    }
  }

  const prefixIdentifiers =
    !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode)
  if (!prefixIdentifiers && options.cacheHandlers) {
    onError(createCompilerError(ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED))
  }
  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  // 1. 由模板解析出 dom 结构的抽象语法树
  const ast = isString(template) ? baseParse(template, options) : template
  // 生成平台无关的通用转换器合集，比如v-if、v-for这些指令在各平台都有，其转换器也通用
  const [nodeTransforms, directiveTransforms/* 指令转换器 */] = getBaseTransformPreset(
    prefixIdentifiers
  )
  // 2. 对 dom 抽象语法树进行转换处理，将转换生成的关键信息挂载到对应的ast节点上，
  // 并生成节点对应 codegenNode，用来在 generate 阶段生成 VNODE_CALL 代码段
  transform(
    ast,
    // 合并通用转换器和上层高阶编译器自定义的外部转换器
    extend({}, options, {
      prefixIdentifiers,
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []) // user transforms
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {} // user transforms
      )
    })
  )

  // 3. 生成”目标语言“，即 vue 运行时可运行的 render function 及其他运行时信息
  return generate(
    ast,
    extend({}, options, {
      prefixIdentifiers
    })
  )
}

// 获取基础预置的 transformer 插件集
export function getBaseTransformPreset(
  prefixIdentifiers?: boolean
): TransformPreset {
  return [
    // 生成目标节点结构的转换插件
    [
      transformOnce,
      transformIf,
      transformFor,
      ...(!__BROWSER__ && prefixIdentifiers
        ? [
            // order is important
            trackVForSlotScopes,
            transformExpression
          ]
        : __BROWSER__ && __DEV__
          ? [transformExpression]
          : []),
      transformSlotOutlet,
      transformElement,
      trackSlotScopes,
      transformText
    ],
    // 指令转换插件
    {
      on: transformOn,
      bind: transformBind,
      model: transformModel
    }
  ]
}
```