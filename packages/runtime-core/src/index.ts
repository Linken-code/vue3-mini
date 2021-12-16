/*
 * @Author: Linken
 * @Date: 2021-10-28 22:57:55
 * @LastEditTime: 2021-12-12 14:05:31
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\runtime-core\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
export {
  // core
  computed,
  reactive,
  ref,
  readonly,
  // utilities
  toRef,
  toRefs,
  // advanced
  shallowReactive,
  shallowReadonly,
  // effect
  effect // effect scope
} from '@vue/reactivity'
export { watch, watchEffect } from './apiWatch'
// lifeCycle Renderer API ---------------------------------------------------------
export { onBeforeMount, onMounted, onBeforeUpdate, onUpdated } from './lifeCycle'
export { queueJob, nextTick } from './scheduler'
// Advanced API ----------------------------------------------------------------
export { getCurrentInstance } from './component'
export { registerRuntimeCompiler } from './component'
// For raw render function users
export { h } from './h'
// Advanced render function utilities
export { createVNode, isVNode } from './vnode'
// VNode types
export { Fragment, Text } from './vnode'
// Custom Renderer API ---------------------------------------------------------
export { createRenderer } from './render'
// helpers  API ---------------------------------------------------------
export { renderList } from './helpers/renderList'
export { resolveComponent } from './helpers/resolveAssets'
export { camelize, capitalize } from '@vue/shared'
