import { compile, CompilerOptions } from '@vue/compiler-dom'
import { registerRuntimeCompiler, RenderFunction } from '@vue/runtime-dom'

function compileToFunction(
	template: string,
	options?: CompilerOptions
): RenderFunction {
	const { code } = compile(template, {
		hoistStatic: true,
		...options
	})
	return new Function(code)() as RenderFunction
}

registerRuntimeCompiler(compileToFunction)

export { compileToFunction as compile }

export * from '@vue/runtime-dom'
export * from '@vue/reactivity'