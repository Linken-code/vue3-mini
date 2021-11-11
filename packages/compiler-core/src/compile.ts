import { baseParse } from "./parse"
import { generate } from './codegen'

export const baseCompile = (template) => {
	const ast = baseParse(template)
	const code = generate(ast)
	return {
		ast,
		render: code.render
	}
}