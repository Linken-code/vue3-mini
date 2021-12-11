import { ShapeFlags, isFunction, isObject } from '@vue/shared/src'
import { componentPublicInstance } from './componentPublicInstance'
import { baseCompile } from '@vue/compiler-core'
import { createAppContext } from './apiCreateApp'
import { shallowReactive } from '@vue/reactivity'
export let currentInstance = null

const emptyAppContext = createAppContext()
let uid = 0
//创建组件实例
export const createComponentInstance = (vnode, parent) => {
  const type = vnode.type
  const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance = {
    // 组件实例
    uid: uid++,
    __v_isVNode: true,
    vnode, // 组件对应的虚拟节点
    type, // 组件对象
    parent,
    appContext,
    next: null,
    subTree: null, // 组件要渲染的子元素
    update: null!,
    render: null,
    proxy: null, //
    exposed: null,

    components: null, //
    emit: null, //

    ctx: {}, // 组件的上下文
    props: {}, // 组件的属性
    attrs: {}, // 元素本身的属性
    slots: {}, // 组件的插槽
    refs: {},

    setupState: {}, // 组件setup的返回值
    setupContext: null,
    isMounted: false, // 组件是否被挂载？

    //生命周期
    bc: null, //
    m: null, //
    bu: null, //
    u: null, //
    um: null //
  }
  instance.ctx = { _: instance }

  return instance
}

const setupStatefulComponent = instance => {
  // 1. 获取组件的类型，拿到组件的 setup 方法
  const Component = instance.type
  // 2. 代理  传递给 render 函数的参数
  instance.proxy = new Proxy(instance.ctx, componentPublicInstance as any)
  const { setup } = Component
  //判断组件是否有setup
  if (setup) {
    // 有 setup 再创建执行上下文的实例
    let setupContext = createSetupContext(instance)
    currentInstance = instance
    const setupResult = setup(instance.props, setupContext)
    //setup执行完毕
    currentInstance = null
    // instance 中 props attrs slots emit expose 会被提取出来，因为开发过程中会使用这些属性
    handleSetupResult(instance, setupResult)
  } else {
    finishComponentSetup(instance) // 完成组件的启动
  }
}

//处理setup返回值
const handleSetupResult = (instance, setupResult) => {
  if (isFunction(setupResult)) {
    //setup返回的函数保存到实例
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    //setup返回的对象保存到实例
    instance.setupState = setupResult
  }
  finishComponentSetup(instance)
}

const createSetupContext = instance => {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: () => {},
    expose: () => {}
  }
}

//处理render
const finishComponentSetup = instance => {
  let Component = instance.type

  if (!instance.render) {
    // 对template 模板编译产生render函数
    if (!Component.render && Component.template) {
      // 编译 将结果 赋予给 Component.template
      let { template } = Component
      if (template[0] === '#') {
        const el = document.querySelector(template)
        template = el ? el.innerHTML : ''
      }
      //const code = baseCompile(template)
      Component.render = baseCompile(template)
      //Component.render = new Function('ctx', code)
    }
    instance.render = Component.render
  }
}

//初始化组件，解析数据到组件实例,拓展instance
export const setupComponent = instance => {
  //设置值
  const { props, children, shapeFlag } = instance.vnode
  // 需要先看一下当前组件是不是有状态的组件，函数组件
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  initProps(instance, props, isStateful)
  instance.children = children // 2.初始化插槽 initSlot()
  // initSlots(instance, children)

  // 调用 当前实例的setup 方法，用setup的返回值填充 setupState 和对应的 render 方法
  const setupResult = isStateful ? setupStatefulComponent(instance) : undefined
  return setupResult
}

export const initProps = (instance, rawProps, isStateful) => {
  const props = {}
  const attrs = {}
  // setFullProps(instance, rawProps, props, attrs)
  for (const key in rawProps) {
    if (instance.type.props?.includes(key)) {
      props[key] = rawProps[key]
    } else {
      attrs[key] = rawProps[key]
    }
  }
  if (isStateful) {
    // 1.初始化属性 initProps()
    instance.props = shallowReactive(props)
  } else {
    if (!instance.type.props) {
      // functional w/ optional props, props === attrs
      instance.props = attrs
    } else {
      // functional w/ declared props
      instance.props = props
    }
  }
  instance.attrs = attrs
}

// const setFullProps = (instance, rawProps, props, attrs) => {}

// const initSlots = (instance, children) => {
//   if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
//     const type = children._
//     if (type) {
//       // users can get the shallow readonly version of the slots object through `this.$slots`,
//       // we should avoid the proxy object polluting the slots of the internal instance
//       instance.slots = toRaw(children)
//     } else {
//       normalizeObjectSlots(children , (instance.slots = {}), instance)
//     }
//   } else {
//     instance.slots = {}
//     if (children) {
//       normalizeVNodeSlots(instance, children)
//     }
//   }

// }

export const setCurrentInstance = target => {
  return (currentInstance = target)
}
export const getCurrentInstance = () => {
  return currentInstance
}
