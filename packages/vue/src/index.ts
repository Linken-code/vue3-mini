import { Fragment } from './../../runtime-core/src/vnode'
/*
 * @Author: Linken
 * @Date: 2021-11-11 22:55:38
 * @LastEditTime: 2021-12-17 23:10:09
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\vue\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { compile } from '@vue/compiler-dom'
import { registerRuntimeCompiler } from '@vue/runtime-dom'
import * as runtimeDom from '@vue/runtime-dom'

function compileToFunction(template: string, options?) {
  if (template[0] === '#') {
    const el = document.querySelector(template)
    template = el ? el.innerHTML : ``
  }

  const { code } = compile(template, {
    hoistStatic: true,
    ...options
  })
  const result = `with(ctx){
     const { h, Text, Fragment, renderList, resolveComponent } = VueMini
    return  ${code}  
  }`

  const render = new Function('ctx', result)
  //   const render = (__GLOBAL__ ? new Function(code)() : new Function('Vue', code)(runtimeDom)) as RenderFunction
  return render
}

registerRuntimeCompiler(compileToFunction)

export { compileToFunction as compile }

export * from '@vue/runtime-dom'
export * from '@vue/reactivity'
