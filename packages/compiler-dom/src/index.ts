/*
 * @Author: Linken
 * @Date: 2021-11-08 21:16:49
 * @LastEditTime: 2021-12-12 14:16:54
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\compiler-dom\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { baseCompile, baseParse, CodegenResult } from '@vue/compiler-core'

import { extend } from '@vue/shared'

export function compile(template: string, options = {}): CodegenResult {
  return baseCompile(template, options)
}

export function parse(template: string, options = {}) {
  return baseParse(template, extend({}, options))
}

export * from '@vue/compiler-core'
