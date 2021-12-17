import { isHTMLTag, isVoidTag, camelize, extend } from '@vue/shared'
import { NodeTypes, ElementTypes, createRoot } from './ast'

const defaultParserOptions = {
  delimiters: ['{{', '}}'],
  isHTMLTag,
  isVoidTag
}

export const baseParse = (content, options?) => {
  const context = createParseContext(content, options)
  const children = parseChildren(context)
  return createRoot(children)
}

const createParseContext = (content, rawOptions = {}) => {
  const options = extend(rawOptions, defaultParserOptions)

  return {
    options,
    source: content
  }
}

const parseChildren = context => {
  const nodes = []
  while (!isEnd(context)) {
    const s = context.source
    let node
    if (s.startsWith(context.options.delimiters[0])) {
      //parseInterpolation
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (/[a-z]/i.test(s[1])) {
        //parseElement
        node = parseElement(context)
      }
    } else {
      //parseText
      node = parseText(context)
    }
    nodes.push(node)
  }
  let removeWhiteSpace = false
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.type === NodeTypes.TEXT) {
      if (/[^\t\r\n\f ]/.test(node.content)) {
        //文本节点有字符
        node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
      } else {
        //文本节点全是空白
        const prev = nodes[i - 1]
        const next = nodes[i + 1]
        if (
          !prev ||
          !next ||
          (prev.type === NodeTypes.ELEMENT && next.type === NodeTypes.ELEMENT && /[\r\n]/.test(node.content))
        ) {
          //删除空白节点
          removeWhiteSpace = true
          node[i] = null
        } else {
          node.content = ''
        }
      }
    }
  }
  return removeWhiteSpace ? nodes.filter(Boolean) : nodes
}

const parseInterpolation = context => {
  const [open, close] = context.options.delimiters
  advanceBy(context, open.length)
  const closeIndex = context.source.indexOf(close, open.length)
  const content = parseTextData(context, closeIndex).trim()
  advanceBy(context, close.length)
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    // content: {
    //   type: NodeTypes.SIMPLE_EXPRESSION,
    //   isStatic: false,
    //   content
    // },
    content,
    isStatic: false
  }
}

const parseElement = context => {
  //start parseTag
  const element = parseTag(context)
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    return element
  }
  //parseChildren
  element.children = parseChildren(context)
  //end parseTag
  parseTag(context)
  return element
}

const parseTag = context => {
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceSpaces(context)
  const { props, directives } = parseAttributes(context)
  const tagType = isComponent(tag, context) ? ElementTypes.ELEMENT : ElementTypes.COMPONENT
  const isSelfClosing = context.source.startsWith('/>')
  advanceBy(context, isSelfClosing ? 2 : 1)
  return {
    type: NodeTypes.ELEMENT,
    tag, //标签名
    tagType, //是组件还是元素
    props, //属性节点数组
    directives, //指令数组
    isSelfClosing, //是否自闭合标签
    children: []
  }
}

const parseAttributes = context => {
  const props = []
  const directives = []
  while (context.source.length && !startsWith(context.source, '>') && !startsWith(context.source, '/>')) {
    let attr = parseAttribute(context)
    if (attr.type === NodeTypes.ATTRIBUTE && attr.value && attr.name === 'class') {
      attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim()
    }

    if (attr.type === NodeTypes.DIRECTIVE) {
      directives.push(attr)
    } else {
      props.push(attr)
    }
  }
  return { props, directives }
}

const parseAttribute = context => {
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  advanceBy(context, name.length)

  let value = undefined
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
    advanceSpaces(context)
  }

  //directives
  if (/^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name)!

    let isPropShorthand = startsWith(name, '.')
    let dirName =
      match[1] || (isPropShorthand || startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : 'slot')

    let arg
    if (match[2]) {
      const isSlot = dirName === 'slot'
      let content = match[2]
      let isStatic = true
      if (content.startsWith('[')) {
        isStatic = false

        if (!content.endsWith(']')) {
          content = content.slice(1)
        } else {
          content = content.slice(1, content.length - 1)
        }
      } else if (isSlot) {
        // #1241 special case for v-slot: vuetify relies extensively on slot
        // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
        // supports such usage so we are keeping it consistent with 2.x.
        content += match[3] || ''
      }

      arg = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: camelize(content),
        isStatic
      }
    }

    // if (name[0] === ':') {
    //   dirName = 'bind'
    //   content = name.slice(1)
    // } else if (name[0] === '@') {
    //   dirName = 'on'
    //   content = name.slice(1)
    // } else if (name.startsWith('v-')) {
    //   ;[dirName, content] = name.slice(2).split(':')
    // }
    //  arg: content && {
    //    type: NodeTypes.SIMPLE_EXPRESSION,
    //    content: camelize(content),
    //    isStatic: true
    //  }
    const modifiers = match[3] ? match[3].slice(1).split('.') : []
    if (isPropShorthand) modifiers.push('prop')

    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false
      },
      arg,
      modifiers
    }
  }

  //attributes
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content
    }
  }
}

const parseAttributeValue = context => {
  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  let content
  //有引号
  if (isQuoted) {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    content = parseTextData(context, endIndex)
    advanceBy(context, 1)
  }

  return {
    content
  }
}

const isComponent = (tag, context) => {
  return !context.options.isHTMLTag(tag)
}

//暂不支持文本节点中带'<'号
const parseText = context => {
  const endTokens = ['<', context.options.delimiters[0]]
  let endIndex = context.source.length

  for (let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content
  }
}

const parseTextData = (context, length) => {
  const text = context.source.slice(0, length)
  advanceBy(context, length)
  return text
}

const isEnd = context => {
  const s = context.source
  return startsWith(s, '</') || !s
}

const advanceBy = (context, numberOfChar) => {
  context.source = context.source.slice(numberOfChar)
}

const advanceSpaces = context => {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

const startsWith = (source: string, searchString: string) => {
  return source.startsWith(searchString)
}
