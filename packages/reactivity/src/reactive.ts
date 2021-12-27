/*
 * @Author: Linken
 * @Date: 2021-10-24 20:41:53
 * @LastEditTime: 2021-12-27 20:48:14
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\reactivity\src\reactive.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { isObject } from '@vue/shared'
import { reactiveHandlers, shallowReactiveHandlers, readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'

const reactiveMap = new WeakMap() //key 必须是对象，自动垃圾回收，不会造成内存泄漏
const readonlyMap = new WeakMap()
//实现核心代理
const createReactObj = (target, isReadonly, baseHandlers) => {
  //判断target是否为对象, typeof 不是 object 类型的，直接返回
  if (!isObject(target)) {
    return target
  }
  if (target.__v_raw && !(isReadonly && target.__v_isReactive)) {
    return target
  }
  //判断是否只读,进行映射
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  //判断缓存中是否有这个对象
  const exisitProxy = proxyMap.get(target) //已经代理过了
  if (exisitProxy) {
    //如果已经存在 map 中了，就直接返回
    return exisitProxy
  }

  //进行代理
  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy) //缓存代理对象
  //返回代理对象
  return proxy
}

export const reactive = target => {
  if (target && target.__v_isReadonly) {
    return target
  }
  return createReactObj(target, false, reactiveHandlers)
}

export const shallowReactive = target => {
  return createReactObj(target, false, shallowReactiveHandlers)
}

export const readonly = target => {
  return createReactObj(target, true, readonlyHandlers)
}

export const shallowReadonly = target => {
  return createReactObj(target, true, shallowReadonlyHandlers)
}

export const toRaw = observed => {
  const raw = observed
  return raw
}

export function isReactive(value): boolean {
  if (isReadonly(value)) {
    return isReactive(value.__v_raw)
  }
  return !!(value && value.__v_isReactive)
}

export function isReadonly(value): boolean {
  return !!(value && value.__v_isReadonly)
}

export function isProxy(value): boolean {
  return isReactive(value) || isReadonly(value)
}
