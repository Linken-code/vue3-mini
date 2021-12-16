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
