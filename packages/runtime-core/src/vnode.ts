import { isString, isObject, isArray, ShapeFlags, isFunction } from '@vue/shared'
//判断是否为虚拟dom
export const isVNode = value => {
  return value ? value.__v_isVNode === true : false
}
export const Text = Symbol('Text')
export const Fragment = Symbol('Fragment')
export const Comment = Symbol('Comment')
export const Static = Symbol('Static')

export const isSameVnode = (n1, n2) => {
  return n1.type === n2.type && n1.key === n2.key
}

export function createTextVNode(text: string = ' ', flag: number = 0) {
  return createVNode(Text, null, text, flag)
}

export function normalizeVNode(child) {
  if (child == null || typeof child === 'boolean') {
    // empty placeholder
    return createVNode(Comment)
  } else if (isArray(child)) {
    // fragment
    return createVNode(
      Fragment,
      null,
      // #3666, avoid reference pollution when reusing vnode
      // child.slice()
      child
    )
  } else if (isObject(child)) {
    // already vnode, this should be the most common since compiled templates
    // always produce all-vnode children arrays
    return child
  } else {
    // strings and numbers
    return createVNode(Text, null, child.toString())
  }
}

//子节点标识h('div',{style:{color:red}},[])
const normalizeChildren = (vnode, children) => {
  let type = 0
  const { shapeFlag } = vnode
  if (children === null) {
    children === null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (isString(children)) {
    if (shapeFlag & ShapeFlags.TELEPORT) {
      type = ShapeFlags.ARRAY_CHILDREN
      children = [createTextVNode(children as string)]
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
  }
  vnode.shapeFlag = vnode.shapeFlag | type //00000100|0000100=00001100合并
  vnode.children = children
}
export const NULL_DYNAMIC_COMPONENT = Symbol()
//创建vnode 与h函数相同
export const createVNode = (type, props?, children?, patchFlag: number = 0) => {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    type = Comment
  }
  //  else if (type === Text) {
  // 	shapeFlag = ShapeFlags.TEXT_CHILDREN
  // } else if (type === Fragment) {
  // 	shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  // } else {
  // 	shapeFlag = ShapeFlags.COMPONENT
  // }

  //3.2
  // const shapeFlag = isString(type)
  //   ? ShapeFlags.ELEMENT
  //   : __FEATURE_SUSPENSE__ && isSuspense(type)
  //   ? ShapeFlags.SUSPENSE
  //   : isTeleport(type)
  //   ? ShapeFlags.TELEPORT
  //   : isObject(type)
  //   ? ShapeFlags.STATEFUL_COMPONENT
  //   : isFunction(type)
  //   ? ShapeFlags.FUNCTIONAL_COMPONENT
  //   : 0
  let shapeFlag = 0
  if (type === Text) {
    shapeFlag = ShapeFlags.TEXT_CHILDREN
  } else if (type === Fragment) {
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (isString(type)) {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(type)) {
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  } else {
    shapeFlag = 0
  }

  const vnode = createBaseVNode(type, props, children, patchFlag, shapeFlag)
  if (isVNode(type)) {
    if (children) {
      // 处理 children 子节点
      normalizeChildren(vnode, children)
    }
    return vnode
  }
  return vnode
}

const createBaseVNode = (
  type,
  props = null,
  children: unknown = null,
  patchFlag = 0,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT
) => {
  const vnode = {
    _v_isVNode: true, //是vnode节点
    type,
    props,
    key: props && props.key, //diff用来对比
    children,
    component: null,
    el: null, //虚拟dom元素
    anchor: null,
    patchFlag,
    shapeFlag, //类型标识
    appContext: null
  }
  if (children) {
    vnode.shapeFlag |= isString(children) ? ShapeFlags.TEXT_CHILDREN : ShapeFlags.ARRAY_CHILDREN
  }
  return vnode
}
