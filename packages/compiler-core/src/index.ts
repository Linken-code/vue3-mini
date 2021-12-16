/*
 * @Author: Linken
 * @Date: 2021-11-08 21:16:42
 * @LastEditTime: 2021-12-12 14:18:01
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\compiler-core\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
export { baseParse } from './parse'
export { baseCompile } from './compile'
export { generate, CodegenResult } from './codegen'

export * from './ast'
//console.log(baseParse(`<div class="foo" v-if="ok" >hello {{name}}</div>`));
