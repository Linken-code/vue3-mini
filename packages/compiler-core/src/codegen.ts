import { NodeTypes } from "./ast"
import { capitalize } from "@vue/shared/src"
export const generate = (ast) => {
	const code = traverseNode(ast)
	return {
		render: `with(this){return ${code}}`,
	}
}

const traverseNode = (node) => {
	switch (node.type) {
		case NodeTypes.ROOT:
			if (node.children.length === 1) {
				return traverseNode(node.children[0])
			}
			const result = traverseChildren(node)
			return result
		case NodeTypes.ELEMENT:
			return createElementNode(node)
		case NodeTypes.INTERPOLATION:
			return createTextNode(node.content)
		case NodeTypes.TEXT:
			return createTextNode(node)

	}
}

const createElementNode = (node) => {
	const { children } = node
	const tag = JSON.stringify(node.tag)
	const propArray = createPropArray(node)
	const propStr = propArray.length ? `{${propArray.join(',')}}` : 'null'

	if (!children) {
		return `h(${tag})`
	}
	let childrenStr = traverseChildren(node)
	return `h(${tag},${propStr},${childrenStr})`
}

const createPropArray = (node) => {
	const { props, directives } = node
	return [
		...props.map((prop) => `${prop.name}:${createText(prop.value)}`),
		...directives.map((dir) => {
			switch (dir.name) {
				case 'bind':
					return `${dir.arg.content}: ${createText(dir.exp)}`
				case 'on':
					const eventName = `on${capitalize(dir.arg.content)}`
					let exp = dir.exp.content
					//通过判断是否括号结尾，并且不包含"=>"
					if (/\([^)]*?\)$/.test(exp) && !exp.includes("=>")) {
						exp = `$event=>(${exp})`
					}
					return `${eventName}:${dir.exp.content}`
				case 'html':
					return `innerHTML: ${createText(dir.exp)}`
				default:
					return `${dir.name}: ${createText(dir.exp)}`
			}
		})
	]
}

const traverseChildren = (node) => {
	const { children } = node
	if (children.length === 1) {
		const child = children[0]
		if (child.type === NodeTypes.TEXT) {
			return createText(child)
		} else if (child.type === NodeTypes.INTERPOLATION) {
			return createText(child.content)
		}
	}
	const result = []
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		result.push(traverseNode(child))
	}
	return `[${result.join(',')}]`
}

const createTextNode = (node) => {
	const child = createText(node)
	return `h(Text,null,${child})`
}

const createText = ({ isStatic = true, content = '' } = {}) => {
	return isStatic ? JSON.stringify(content) : content
}