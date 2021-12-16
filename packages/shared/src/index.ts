/*
 * @Author: Linken
 * @Date: 2021-10-24 10:42:03
 * @LastEditTime: 2021-12-12 23:11:15
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\shared\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
//公共方法
//export const IsDEV = process.env.NODE_ENV !== 'production';

import { makeMap } from './makeMap'

export { makeMap }
export * from './patchFlags'
export * from './shapeFlags'
export * from './domTagConfig'
export * from './domAttrConfig'

export const IsDEV = false
export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'
const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)
export const extend = Object.assign
export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string => objectToString.call(value)
export const isMap = (val: unknown): val is Map<any, any> => toTypeString(val) === '[object Map]'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isInteger = key => parseInt(key) + '' === key
export const isArray = Array.isArray
export const isFunction = (val: unknown): val is Function => typeof val === 'function'
export const isNumber = (val: unknown): val is Number => typeof val === 'number'
export const isSameVNodeType = (n1, n2) => {
  // 判断是否为同一虚拟节点
  return n1.type == n2.type && n1.key === n2.key
}

export const isReactive = target => {
  return !!(target && target._isReactive)
}
export const isRef = target => {
  return !!(target && target._v_isRef)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChange = (value, oldValue) => value !== oldValue

export const invokeArrayFns = (fns, arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as any
}

const camelizeRE = /-(\w)/g
/**
 * @private
 */
export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

/**
 * @private
 */
export const capitalize = cacheStringFunction((str: string) => str.charAt(0).toUpperCase() + str.slice(1))
