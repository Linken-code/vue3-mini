/*
 * @Author: Linken
 * @Date: 2021-10-29 21:20:52
 * @LastEditTime: 2021-12-15 23:52:18
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\runtime-core\src\apiCreateApp.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { createVNode } from './vnode'

export const createAppContext = () => {
  return {
    app: null as any,
    config: {
      isNativeTag: false,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      isCustomElement: false,
      errorHandler: undefined,
      warnHandler: undefined
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null)
  }
}

let uid = 0
export const createAppAPI = render => {
  return function createApp(rootComponent, rootProps = null) {
    // 创建vue应用上下文，上下文主要包括 应用本身，设置项，组件、指令注册仓库、混入
    const context = createAppContext()
    let isMounted = false
    const app = (context.app = {
      _uid: uid++,
      _props: rootProps, // 属性
      _component: rootComponent, // 组件
      _container: null,
      _context: context,
      _instance: null,

      get config() {
        return context.config
      },
      // 全局组件注册，入参为组件名、组件options
      component(name: string, component?): any {
        if (!component) {
          return context.components[name]
        }
        context.components[name] = component
        return app
      },

      // 应用挂载入口
      mount(rootContainer) {
        // 1.通过rootComponent 创建vnode
        // 2.调用render方法将vnode渲染到rootContainer中
        if (!isMounted) {
          // 创建 root vnode
          const vnode = createVNode(rootComponent, rootProps)
          // 缓存 context,存储应用上下文,首次挂载时设置
          vnode.appContext = context
          //渲染vnode
          render(vnode, rootContainer)
          // 标记应用已挂载
          isMounted = true
          // 缓存 rootContainer，记录根级dom容器
          app._container = rootContainer
          rootContainer.__vue_app__ = app

          return vnode.component!.proxy
        }
      },

      // 应用卸载主逻辑入口
      unmount() {
        if (isMounted) {
          render(null, app._container)
        }
      }
    })

    return app
  }
}
