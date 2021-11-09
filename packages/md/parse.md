## parse解析流程
parse解析主要是通过正则表达式对各种标签进行解析，并处理各种属性与指令。该阶段会将模板解析成原始AST，此时的AST只是相当于对模板进行了傻瓜式翻译

## 1.模板解析入口

### 1.1 baseParse

解析阶段的总入口，整个解析过程最终会生成一个虚拟根节点，该节点并不代表真实存在的dom容器，只是一个wrapper，目的是适配vue3.0中的多根节点，也就是没有实际容器的fragment
```javascript
// 由组件模板解析生成抽象语法树 (AST)
export function baseParse(
  content: string,
  options: ParserOptions = {}
): RootNode {
  // 生成解析阶段的执行上下文，用于寄存解析过程中产生的状态
  const context = createParserContext(content, options)
  // 获取模板解析的起始位置
  const start = getCursor(context)
  // 将模板解析成AST节点，创建出AST根节点，并将生成的AST子代节点插入到根节点上
  return createRoot(
    parseChildren(context, TextModes.DATA, []), // 解析生成的子节点
    getSelection(context, start) // 获取成功解析为AST节点的子模板及其起始位置信息
  )
}

// 获取当前解析到的模板位置
function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}

// 根据传入的起始、结束位置获取两位置之间的模板字符串
function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position
): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}
```
### 1.2 createParserContext
创建解析过程的上下文对象，用于对过程中产生的状态进行集中统一的存储和管控

```javascript
// 创建解析器上下文
function createParserContext(
  content: string,
  rawOptions: ParserOptions
): ParserContext {
  // 生成带有默认值的解析器选项
  const options = extend({}, defaultParserOptions)
  for (const key in rawOptions) {
    // @ts-ignore
    options[key] = rawOptions[key] || defaultParserOptions[key]
  }
  return {
    options,
    column: 1, // 解析器当前解析到的模板列数
    line: 1, // 解析器当前解析到的模板行数
    offset: 0, // 解析器当前解析到的总字符偏移数
    originalSource: content, // 未做截断处理的初始模板
    source: content, // 当前未解析过的模板
    inPre: false,
    inVPre: false
  }
}
```
### 1.3 parseChildren
解析模板对应的子节点集，因为组件会存在多根节点，因此整个根级模板也会作为子节点被解析，然后再插入到特定的虚拟容器中。整个子节点的解析其实就是一个递归匹配和处理的过程，大致算法如下：

1、起始标签解析，解析出当前节点并入栈；

2、子代节点解析，遇到父节点 (祖先节点) 结束标签结束子节点解析，将子节点插入到对应的父节点上；

3、解析结束标签，当前节点解析完毕，出栈。

整个算法是非常清晰可控的，利用栈数据结构来维护解析过程中的嵌套节点结构，就和大多数xml模板引擎是类似的

```javascript
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[] // 解析标签会将节点入栈，整个元素解析完毕后节点会出栈
): TemplateChildNode[] {
  // 获取栈顶节点 (父节点) ，父节点先解析，因此会在栈的上游，比如<div><span></span></div>，节点栈中一定
  // 是div先入栈，解析div的子节点时，span再入栈，因此栈顶节点一定是当前解析子节点的父节点
  const parent = last(ancestors)
  // 获取栈顶节点的命名空间，如果为空栈，说明当前解析的子节点 (们) 是根节点
  const ns = parent ? parent.ns : Namespaces.HTML
  const nodes: TemplateChildNode[] = []

  // 解析模板直到当前children对应的子模板结束，比如 `<div><span>test</span></div>` ，假如我们要
  // 解析的children为 `<span>test</span>`，那么当我们解析过程中检测到解析器指针走过</span>时，代表
  // span对应的子节点已经解析完毕了，退出当前子节点解析即可
  while (!isEnd(context, mode, ancestors)) {
    __TEST__ && assert(context.source.length > 0)
    const s = context.source
    let node: TemplateChildNode | TemplateChildNode[] | undefined = undefined

    // DATA、RCDATA表示有渲染实体的节点类型，也就是我们最常见的一类dom节点，比如 `div`
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
        // 1. 解析插值节点，模板以 '{{' 开头
        node = parseInterpolation(context, mode)
      } else if (mode === TextModes.DATA && s[0] === '<') {
        // 2. 模板以 '<' 开头
        // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
        if (s.length === 1) {
          // ① 到 `<` 模板就结束，解析报错
          emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 1)
        } else if (s[1] === '!') {
          // ② 标签为 `<!***>` 的所有case解析
          // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
          if (startsWith(s, '<!--')) {
            // 模板以 '<!--' 开头，解析注释节点
            node = parseComment(context)
          } else if (startsWith(s, '<!DOCTYPE')) {
            // 模板以 '<!DOCTYPE' 开头，解析 <!DOCTYPE >节点
            node = parseBogusComment(context)
          } else if (startsWith(s, '<![CDATA[')) {
            // 模板以 '<![CDATA[' 开头，解析纯文本节点，<![CDATA[*]]> 用于渲染纯文本，和 &it 这
            // 种转义字符作用类似。* 部分为需要渲染的目标文本内容，可以使用 <![CDATA[]]> 来包含不被
            // xml解析器解析的内容。
            // <![CDATA[*]]> 节点不能渲染到HTML内容中，如果父节点命名空间是 `HTML`，做相应的错误提示
            if (ns !== Namespaces.HTML) {
              node = parseCDATA(context, ancestors)
            } else {
              emitError(context, ErrorCodes.CDATA_IN_HTML_CONTENT)
              node = parseBogusComment(context)
            }
          } else {
            // 标签解析错误
            emitError(context, ErrorCodes.INCORRECTLY_OPENED_COMMENT)
            node = parseBogusComment(context)
          }
        } else if (s[1] === '/') {
          // ③ 解析 `</` 开头的结束标签
          // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
          if (s.length === 2) {
            // 标签未完整结束
            emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 2)
          } else if (s[2] === '>') {
            // 结束标签无标签名
            emitError(context, ErrorCodes.MISSING_END_TAG_NAME, 2)
            advanceBy(context, 3)
            continue
          } else if (/[a-z]/i.test(s[2])) {
            // 如果结束标签是 a-z单字母组成的，为非法结束标签
            emitError(context, ErrorCodes.X_INVALID_END_TAG)
            // 解析结束标签
            parseTag(context, TagType.End, parent)
            continue
          } else {
            // 无效标签名
            emitError(
              context,
              ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME,
              2
            )
            node = parseBogusComment(context)
          }
        } else if (/[a-z]/i.test(s[1])) {
          // ④ 模板以 `<字母` 开头，表明是常规标签，解析该标签对应的完整element，比如要解析 span
          // 元素，parseElement 对应子模板为 `<span>test</span>`
          node = parseElement(context, ancestors)
        } else if (s[1] === '?') {
          // ⑤ 模板以 `<?` 开头，解析错误
          emitError(
            context,
            ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME,
            1
          )
          // 生成伪造节点
          node = parseBogusComment(context)
        } else {
          // ⑥ 其他错误
          emitError(context, ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME, 1)
        }
      }
    }

    // 未解析出 AST 节点，需要对解析做兜底，如果没有解析出任何有效 AST 节点，则解析出兜底文本节点
    // 这也就是为什么当我们在组件里定义一段非有效模板时，有时还是会渲染出内容，因为 vue 的模板引擎
    // 将模板解析成了纯文本节点
    if (!node) {
      node = parseText(context, mode)
    }

    // 将解析出的子 AST 节点 push 入节点数组
    if (isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        pushNode(nodes, node[i])
      }
    } else {
      pushNode(nodes, node)
    }
  }

  // Whitespace management for more efficient output
  // (same as v2 whitespace: 'condense')
  let removedWhitespace = false
  if (mode !== TextModes.RAWTEXT) {
    // 父节点不是纯文本节点
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      // 对文本类型节点内容中的空白字符做压缩
      if (!context.inPre && node.type === NodeTypes.TEXT) {
        if (!/[^\t\r\n\f ]/.test(node.content)) {
          // 当前文本节点内容仅包含 `\t\r\n\f` 这类空白字符
          const prev = nodes[i - 1]
          const next = nodes[i + 1]
          // If:
          // - the whitespace is the first or last node, or:
          // - the whitespace is adjacent to a comment, or:
          // - the whitespace is between two elements AND contains newline
          // Then the whitespace is ignored.
          if (
            !prev ||
            !next ||
            prev.type === NodeTypes.COMMENT ||
            next.type === NodeTypes.COMMENT ||
            (prev.type === NodeTypes.ELEMENT &&
              next.type === NodeTypes.ELEMENT &&
              /[\r\n]/.test(node.content))
          ) {
            removedWhitespace = true
            nodes[i] = null as any
          } else {
            // Otherwise, condensed consecutive whitespace inside the text
            // down to a single space
            node.content = ' '
          }
        } else {
          // 文本节点内容匹配到了除 `\t\r\n\f` 外的其他任意字符，将文本内容中的空白字符
          // 替换为单个空格
          node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
        }
      }
      // 生产环境下且 parser 选项未开启注释节点开关时，将子节点数组中的注释节点置为null
      // 使得生产环境下默认不渲染注释节点
      if (
        !__DEV__ &&
        node.type === NodeTypes.COMMENT &&
        !context.options.comments
      ) {
        removedWhitespace = true
        nodes[i] = null as any
      }
    }
    if (context.inPre && parent && context.options.isPreTag(parent.tag)) {
      // remove leading newline per html spec
      // https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
      const first = nodes[0]
      if (first && first.type === NodeTypes.TEXT) {
        first.content = first.content.replace(/^\r?\n/, '')
      }
    }
  }

  // 经过空白字符压缩后的节点有可能变为 null，需要过滤出非空节点，作为最终解析出的 AST 子节点
  return removedWhitespace ? nodes.filter(Boolean) : nodes
}
```

## 2.接下来我们看下几种特殊类型节点的解析过程：

### 2.1 parseInterpolation
插值节点的解析，e.g. `<div>{{ text }}</div>`

```javascript
// 解析插值节点
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {
  // `{{`、`}}`
  const [open, close] = context.options.delimiters
  // 查找模板中 `{{` 之后的第一个 `}}` 的索引
  const closeIndex = context.source.indexOf(close, open.length)
  // 未查找到 `}}`，报无插值结束标记的错误
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }

  const start = getCursor(context)
  // 解析指针推进，指到 `{{` 后的位置
  advanceBy(context, open.length)
  // `{{` 与 `}}` 之间子模板起始、结束位置 
  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  // 插值内容 string 长度
  const rawContentLength = closeIndex - open.length
  // 截取未处理过的原始插值内容 string
  const rawContent = context.source.slice(0, rawContentLength)
  // 对插值内容中的空白字符进行压缩，并按照插值内容推进解析器指
  const preTrimContent = parseTextData(context, rawContentLength, mode)
  // 插值内容两头空白内容裁剪
  const content = preTrimContent.trim()
  // startOffset 表示 `{{` 后到裁剪插值内容头部的位数
  const startOffset = preTrimContent.indexOf(content)
  if (startOffset > 0) {
    // 更新 innerStart 位置信息，使其指向裁剪后插值内容在模板中所处的位置
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  // endOffset `{{` 后到裁剪后插值内容尾部的位数
  const endOffset =
    rawContentLength - (preTrimContent.length - content.length - startOffset)
  // 更新 innerEnd 位置信息，使其指向裁剪后插值内容尾部
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  // 解析指针推进到 `}}` 之后
  advanceBy(context, close.length)

  // 创建插值节点的 AST 节点
  return {
    type: NodeTypes.INTERPOLATION,
    // 插值节点内容为简单表达式
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      // Set `isConstant` to false by default and will decide in transformExpression
      constType: ConstantTypes.NOT_CONSTANT,
      content,
      // 插值对应的简单表达式是处理后的内容，因此对应的子模板位置信息为裁剪头尾位置指针
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
```
### 2.2 parseComment
注释节点的解析

```javascript
// 解析注释节点
function parseComment(context: ParserContext): CommentNode {
  const start = getCursor(context)
  let content: string

  // 匹配模板中的 `--!>` 或 `-->`
  const match = /--(\!)?>/.exec(context.source)
  if (!match) {
    // ① 模板中无注释节点对应的结束标志，直接将解析器指针推进到模板末尾，并报错
    content = context.source.slice(4)
    advanceBy(context, context.source.length)
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    // ② 模板中匹配到了注释节点结束标志
    if (match.index <= 3) {
      // 空注释节点
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }
    if (match[1]) {
      // 结束标志为 `--!>`，正则匹配到了分组信息 (!)，报错
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }
    // 截取出注释节点中的内容
    content = context.source.slice(4, match.index)

    // 检测当前解析的注释节点中是否包含嵌套注释节点标签，查找注释节点对应子模板中的 `<!--`
    // 如果遇到则报嵌套节点的错误，但是依旧能够解析出有效注释节点，将最靠前的 `<!--` 和
    // `-->` 之间的内容作为最终的注释节点
    // e.g. <!-- <!-- comment --> 解析出来的注释节点内容是 ` <!-- comment `，但是
    // 解析器会报注释节点嵌套的问题
    // 截取 `<!-- ***`
    const s = context.source.slice(0, match.index)
    let prevIndex = 1,
      nestedIndex = 0
    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
      advanceBy(context, nestedIndex - prevIndex + 1)
      if (nestedIndex + 4 < s.length) {
        // 嵌套 `<!--` 与 `-->` 相撞，报嵌套注释节点的错误
        emitError(context, ErrorCodes.NESTED_COMMENT)
      }
      // 记录上一次的嵌套 `<!--` 标签索引，作为下一次循环时查询嵌套 `<!--` 标签的起始位置
      prevIndex = nestedIndex + 1
    }
    // 此时解析器指针指到了最后面的嵌套 `<!--` 标签处，将解析器指针继续推进到注释节点结束的位置
    advanceBy(context, match.index + match[0].length - prevIndex + 1)
  }

  // 生成 AST 注释节点
  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
```
### 2.3 parseElement
解析 element，即正常的dom节点，dom节点由开始标签、子节点、结束标签三部分构成，因此解析也是按照这三个部分去依次进行解析


```javascript
function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | undefined {
  // Start tag.
  const wasInPre = context.inPre
  const wasInVPre = context.inVPre
  // 父节点
  const parent = last(ancestors)
  // 解析开始标签，生成 element AST 节点
  const element = parseTag(context, TagType.Start, parent)
  const isPreBoundary = context.inPre && !wasInPre
  const isVPreBoundary = context.inVPre && !wasInVPre

  // 如果标签是自我闭合 (`<input />`) 或者空标签，不需要解析其子代节点，直接返回 element
  // 闭合标签由于没有子节点，所以不需要 parseChildren，同时也不需要将 elemnet 入栈
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    return element
  }

  // 当前解析的 element 入栈
  ancestors.push(element)
  // 获取节点模式
  const mode = context.options.getTextMode(element, parent)
  // 解析 element 对应的子节点
  const children = parseChildren(context, mode, ancestors)
  // 解析完子节点后指针位于 element 的结束标签前，此时表明整个 element 已经解析完毕，
  // element 此时位于栈顶，出栈
  ancestors.pop()

  // 将解析出的子节点挂载到 element 上
  element.children = children

  // 结束标签解析
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 如果当前是结束标签且和当前栈顶 element 一致，表明节点闭合，则解析结束标签
    parseTag(context, TagType.End, parent)
  } else {
    // 报丢失结束标签的错误
    emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      const first = children[0]
      if (first && startsWith(first.loc.source, '<!--')) {
        emitError(context, ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT)
      }
    }
  }

  // 获取当前 element 对应的原始子模板
  element.loc = getSelection(context, element.loc.start)

  if (isPreBoundary) {
    context.inPre = false
  }
  if (isVPreBoundary) {
    context.inVPre = false
  }
  // 返回最终的 element AST 解析结果
  return element
}

```
### 2.4 parseTag
标签解析，开始标签会解析出对应的节点，但是仅仅是节点本身，只包含属性信息，不会包含子代节点信息

```javascript
// 解析元素标签 (E.g. `<div id=a>`)，有两种类型的标签 (开始标签 & 结束标签)
function parseTag(
  context: ParserContext,
  type: TagType,
  parent: ElementNode | undefined
): ElementNode {
  // 1. 开始标签解析
  const start = getCursor(context)
  // 匹配到起始 | 结束标签的分组信息，分组信息为匹配到的标签名 (括号里的内容就是标签分组)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  // 匹配到的标签名
  const tag = match[1]
  // 根据当前标签名和父节点信息，决定当前节点的命名空间
  const ns = context.options.getNamespace(tag, parent)

  // 将解析器指针推进到标签名后
  advanceBy(context, match[0].length)
  // 推进跳过空白字符，便于属性解析
  advanceSpaces(context)

  // 当前指针位于属性开始处，记录此时的位置和剩余模板，方便在 `v-pre` 指令时进行属性的重新解析
  const cursor = getCursor(context)
  const currentSource = context.source

  // 解析标签的属性
  let props = parseAttributes(context, type)

  // 检查是否是 <pre> 标签
  if (context.options.isPreTag(tag)) {
    context.inPre = true
  }

  // 检查是否有 `v-pre` 指令
  if (
    !context.inVPre &&
    props.some(p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre')
  ) {
    // 当前标签包含 `v-pre` 指令，将 inVPre 状态置为 true
    context.inVPre = true
    // 将解析器指针和未解析子模板重置回属性开始处，进行属性的再次解析
    extend(context, cursor)
    context.source = currentSource
    // 重新解析标签属性并过滤掉 `v-pre` 属性本身
    props = parseAttributes(context, type).filter(p => p.name !== 'v-pre')
  }

  // 2. 结束标签解析
  let isSelfClosing = false
  if (context.source.length === 0) {
    // 标签结束错误
    emitError(context, ErrorCodes.EOF_IN_TAG)
  } else {
    // 此时解析完开始标签及其属性，指针位于属性后，如果继续解析是 `/>`，说明标签为自我闭合标签
    isSelfClosing = startsWith(context.source, '/>')
    if (type === TagType.End && isSelfClosing) {
      emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
    }
    // 解析器指针推进到结束标签后
    advanceBy(context, isSelfClosing ? 2 : 1)
  }

  // 3. 确定标签类型
  // ELEMENT: dom 原生
  // COMPONENT: 自定义组件
  // SLOT: 插槽
  // TEMPLATE: 自定义模板
  let tagType = ElementTypes.ELEMENT
  // 上游解析器自定义传入的配置项，具有平台特异性，具体可以查看各
  // parser 对应的 parserOptions.ts 文件源码
  const options = context.options
  if (!context.inVPre && !options.isCustomElement(tag)) {
    // 标签为非自定义元素
    const hasVIs = props.some(
      p => p.type === NodeTypes.DIRECTIVE && p.name === 'is'
    )
    if (options.isNativeTag && !hasVIs) {
      // 不是 dom 原生标签，则标记为自定义组件类型
      if (!options.isNativeTag(tag)) tagType = ElementTypes.COMPONENT
    } else if (
      hasVIs ||
      // 内置组件 Teleport、KeepAlive、Suspense、BaseTransition
      isCoreComponent(tag) ||
      // Transition、TransitionGroup
      (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
      // 标签大写字母开头
      /^[A-Z]/.test(tag) ||
      tag === 'component'
    ) {
      // 标签为组件类型
      tagType = ElementTypes.COMPONENT
    }

    if (tag === 'slot') {
      // 插槽类型标签
      tagType = ElementTypes.SLOT
    } else if (
      tag === 'template' &&
      props.some(p => {
        return (
          p.type === NodeTypes.DIRECTIVE && isSpecialTemplateDirective(p.name)
        )
      })
    ) {
      // 模板类型标签
      tagType = ElementTypes.TEMPLATE
    }
  }

  // 解析出当前标签对应的 element 节点 (仅标签元素本社，子节点另做解析再插入)
  return {
    type: NodeTypes.ELEMENT,
    ns,
    tag,
    tagType, // 区分标签类型，dom原生 | 自定义组件 ...
    props,
    isSelfClosing, // 标签是否自我闭合，自我闭合节点无需入栈
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined // to be created during transform phase
  }
}

```
### 2.5 parseAttributes

解析标签中的属性，标签中的每个属性都会被解析成普通属性节点或指令节点。属性节点其实就是对属性的一种抽象表述

```javascript
// 标签属性解析
function parseAttributes(
  context: ParserContext,
  type: TagType
): (AttributeNode | DirectiveNode)[] {
  const props = []
  const attributeNames = new Set<string>()
  // 向前解析标签属性，直到遇到 `>` | `/>`，表示标签到达末端，所有属性解析完毕
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    if (startsWith(context.source, '/')) {
      // 解析遇到 `/` 报错
      emitError(context, ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG)
      advanceBy(context, 1)
      advanceSpaces(context)
      continue
    }
    if (type === TagType.End) {
      // 结束标签解析出属性报错
      emitError(context, ErrorCodes.END_TAG_WITH_ATTRIBUTES)
    }

    // 单个属性解析
    const attr = parseAttribute(context, attributeNames)
    if (type === TagType.Start) {
      // 开始标签则将解析出的属性 push 进收集数组
      props.push(attr)
    }

    if (/^[^\t\r\n\f />]/.test(context.source)) {
      // 属性间没有空白字符间隔，报错
      emitError(context, ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES)
    }
    // 推进属性间空白字符
    advanceSpaces(context)
  }
  return props
}

// 单个属性解析
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string> // 属性名集合
): AttributeNode | DirectiveNode /* 返回 普通属性节点 | 指令属性节点 */ {
  // 1. 属性名解析
  const start = getCursor(context)
  // 匹配属性名
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  // 属性名
  const name = match[0]

  if (nameSet.has(name)) {
    // 重复属性报错
    emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
  }
  // 收集属性名
  nameSet.add(name)

  if (name[0] === '=') {
    // 属性名开头是 `=`，报错
    emitError(context, ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME)
  }
  {
    // 属性名中包含 `" | ' | <`，报错
    const pattern = /["'<]/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(name))) {
      emitError(
        context,
        ErrorCodes.UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME,
        m.index
      )
    }
  }

  // 解析器指针推进到属性名后
  advanceBy(context, name.length)

  // 2. 属性值解析
  let value: AttributeValue = undefined

  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    // 指针越过空白字符推进到属性值前
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    // 解析属性值
    value = parseAttributeValue(context)
    if (!value) {
      // 无属性值，报错
      emitError(context, ErrorCodes.MISSING_ATTRIBUTE_VALUE)
    }
  }
  // 当前属性对应的子模板及位置信息
  const loc = getSelection(context, start)

  // ① 指令类型属性节点解析
  if (!context.inVPre && /^(v-|:|@|#)/.test(name)) {
    // v-(属性名称):|@|#(属性参数)="(属性值)"
    const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
      name
    )!

    // 指令名称: if | for | on | bind | slot ...
    // 即 `v-` 后的属性名称部分
    const dirName =
      match[1] ||
      (startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : 'slot')

    // 指令参数: : | @ | # 后部分
    let arg: ExpressionNode | undefined

    if (match[2]) {
      const isSlot = dirName === 'slot'
      // 属性参数偏移值
      const startOffset = name.indexOf(match[2])
      const loc = getSelection(
        context,
        getNewPosition(context, start, startOffset),
        getNewPosition(
          context,
          start,
          startOffset + match[2].length + ((isSlot && match[3]) || '').length
        )
      )
      let content = match[2]
      let isStatic = true

      if (content.startsWith('[')) {
        // e.g. v-bind:[arg]，动态参数指令
        isStatic = false

        if (!content.endsWith(']')) {
          // 动态参数无结束标志，报错
          emitError(
            context,
            ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END
          )
        }

        // 截取 `[` 与 `]` 之间的动态参数内容
        content = content.substr(1, content.length - 2)
      } else if (isSlot) {
        // #1241 special case for v-slot: vuetify relies extensively on slot
        // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
        // supports such usage so we are keeping it consistent with 2.x.

        // match[3] 是指令修饰符
        content += match[3] || ''
      }

      // 指令参数表达式节点
      arg = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        constType: isStatic
          ? ConstantTypes.CAN_STRINGIFY
          : ConstantTypes.NOT_CONSTANT,
        loc
      }
    }

    // 更新引号包裹属性的位置及子模板信息
    if (value && value.isQuoted) {
      const valueLoc = value.loc
      valueLoc.start.offset++
      valueLoc.start.column++
      valueLoc.end = advancePositionWithClone(valueLoc.start, value.content)
      valueLoc.source = valueLoc.source.slice(1, -1)
    }

    // 指令类型属性节点
    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName, // 指令名
      // 指令值表达式对象
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content, // 值内容 (运行时变量)
        isStatic: false, // 非静态，运行时的动态值
        // Treat as non-constant by default. This can be potentially set to
        // other values by `transformExpression` to make it eligible for hoisting.
        constType: ConstantTypes.NOT_CONSTANT,
        loc: value.loc
      },
      arg, // 指令参数表达式对象
      modifiers: match[3] ? match[3].substr(1).split('.') : [], // 指令修饰符 (`.` 隔开)
      loc // 指令对应位置及子模板信息
    }
  }

  // ② 非指令型普通属性节点
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc
  }
}
```

### 总结
本节主要是对编译系统的 parse 阶段进行了源码分析，parse 阶段会将原始的 html 模板解析成对应的抽象语法树 (AST)，该 AST 为对模板的原始信息抽象表述，作为 transform 阶段进行信息形态转换的基础容器