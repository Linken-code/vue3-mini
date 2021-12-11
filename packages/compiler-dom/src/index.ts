/*
 * @Author: Linken
 * @Date: 2021-11-08 21:16:49
 * @LastEditTime: 2021-12-09 22:02:07
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\compiler-dom\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { baseCompile, baseParse ，noopDirectiveTransform} from '@vue/compiler-core'
import { parserOptions } from './parserOptions'
import { transformStyle } from './transforms/transformStyle'
import { transformVHtml } from './transforms/vHtml'
import { transformVText } from './transforms/vText'
import { transformModel } from './transforms/vModel'
import { transformOn } from './transforms/vOn'
import { transformShow } from './transforms/vShow'
import { extend } from '@vue/shared'

export const DOMDirectiveTransforms = {
  cloak: noopDirectiveTransform,
  html: transformVHtml,
  text: transformVText,
  model: transformModel, // override compiler-core
  on: transformOn, // override compiler-core
  show: transformShow
}

export function compile(template: string, options = {}) {
  return baseCompile(
    template,
    extend({}, parserOptions, options, {
      nodeTransforms: [
        // ignore <script> and <tag>
        // this is not put inside DOMNodeTransforms because that list is used
        // by compiler-ssr to generate vnode fallback branches
        ignoreSideEffectTags,
        ...DOMNodeTransforms,
        ...(options.nodeTransforms || [])
      ],
      directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {})
    })
  )
}

export function parse(template: string, options = {}) {
  return baseParse(template, extend({}, parserOptions, options))
}

export * from '@vue/compiler-core'