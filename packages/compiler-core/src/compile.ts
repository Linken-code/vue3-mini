/*
 * @Author: Linken
 * @Date: 2021-11-11 19:56:30
 * @LastEditTime: 2021-12-17 22:45:01
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\compiler-core\src\compile.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { baseParse } from './parse'
import { generate, CodegenResult } from './codegen'
import { isString } from '@vue/shared'
export const baseCompile = (template, options): CodegenResult => {
  const ast = isString(template) ? baseParse(template, options) : template
  // const ast = baseParse(template)
  const { code } = generate(ast)

  // return generate(
  //   ast,
  //   extend({}, options, {
  //     prefixIdentifiers
  //   })
  // )

  return {
    ast,
    code
  }
}
