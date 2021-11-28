import { NodeTypes, ElementTypes } from "./ast"
import { capitalize } from "@vue/shared/src"
export const generate = (ast) => {
	const code = traverseNode(ast)
	return {
		render: `with(this){return ${code}}`,
	}
}

const traverseNode = (node, parent?) => {
	switch (node.type) {
		case NodeTypes.ROOT:
			if (node.children.length === 1) {
				return traverseNode(node.children[0], node)
			}
			const result = traverseChildren(node)
			return result
		case NodeTypes.ELEMENT:
			return resolveElementASTNode(node, parent)
		case NodeTypes.INTERPOLATION:
			return createTextNode(node.content)
		case NodeTypes.TEXT:
			return createTextNode(node)
	}
}

//处理特殊指令
const resolveElementASTNode = (node, parent) => {
	const ifNode = pluck(node.directives, 'if') || pluck(node.directives, 'else-if')

	//处理v-if||v-else-if
	if (ifNode) {
		let consequent = resolveElementASTNode(node, parent)
		let alternate
		const { children } = parent

		let i = children.findIndex((child) => child === node) + 1
		for (; i < children.length; i++) {
			const sibling = children[i]
			if (sibling.type === NodeTypes.TEXT && !sibling.content.trim()) {
				children.splice(i, 1)
				i--;
				continue
			}
			if (sibling.type === NodeTypes.ELEMENT) {
				if (
					pluck(sibling.directives, 'else') ||
					pluck(sibling.directives, 'else-if', false)
				) {
					alternate = resolveElementASTNode(sibling, parent)
					children.splice(i, 1)
				}
			}
			break
		}
		const { exp } = ifNode
		return `${exp.content}?${consequent}:${alternate || createTextNode()}`
	}


	const forNode = pluck(node.directives, 'for')
	//处理v-for (item,index) in items
	if (forNode) {
		//renderList(item,(item,index) => {h('div',null,item+index)})
		const { exp } = forNode
		const [args, source] = exp.content.split(/\sin\s|\sof\s/)
		return `h(Fragment,nul,renderList(${source.trim()},${args.trim()}=>${resolveElementASTNode(node, parent)}))`
	}
	return createElementNode(node)
}

const pluck = (directives, name, remove = true) => {
	const index = directives.findIndex(dir => dir.name === name)
	const dir = directives[index]
	if (index > -1 && remove) {
		directives.splice(index, 1)
	}
	return dir
}
const createElementNode = (node) => {
	const { children, tagType } = node
	const tag = tagType === ElementTypes.ELEMENT
		? JSON.stringify(node.tag)
		: `resolveComponent("${node.tag}")`

	const vModel = pluck(node.directives, 'model')
	if (vModel) {
		node.directives.push(
			{
				type: NodeTypes.DIRECTIVE,
				name: "bind",
				exp: vModel.exp,
				arg: {
					type: NodeTypes.SIMPLE_EXPRESSION,
					content: 'value',
					isStatic: true,
				}
			},
			{
				type: NodeTypes.DIRECTIVE,
				name: 'on',
				exp: {
					type: NodeTypes.SIMPLE_EXPRESSION,
					content: `($event) => ${vModel.exp.content}= $event.target.value`,
					isStatic: false,
				},
				arg: {
					type: NodeTypes.SIMPLE_EXPRESSION,
					content: 'input',
					isStatic: true,
				}
			})
	}
	const propArray = createPropArray(node)
	const propStr = propArray.length ? `{ ${propArray.join(',')}} ` : 'null'

	if (!children) {
		return `h(${tag})`
	}
	let childrenStr = traverseChildren(node)
	return `h(${tag}, ${propStr}, ${childrenStr})`
}

const createPropArray = (node) => {
	const { props, directives } = node
	return [
		...props.map((prop) => `${prop.name}:${createText(prop.value)} `),
		...directives.map((dir) => {
			switch (dir.name) {
				case 'bind':
					return `${dir.arg.content}: ${createText(dir.exp)} `
				case 'on':
					const eventName = `on${capitalize(dir.arg.content)} `
					let exp = dir.exp.content
					//通过判断是否括号结尾，并且不包含"=>"
					if (/\([^)]*?\)$/.test(exp) && !exp.includes("=>")) {
						exp = `$event => (${exp})`
					}
					return `${eventName}:${dir.exp.content} `
				case 'html':
					return `innerHTML: ${createText(dir.exp)} `
				default:
					return `${dir.name}: ${createText(dir.exp)} `
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
		result.push(traverseNode(child, node))
	}
	return `[${result.join(',')}]`
}

const createTextNode = (node = {}) => {
	const child = createText(node)
	return `h(Text, null, ${child})`
}

const createText = ({ isStatic = true, content = '' } = {}) => {
	return isStatic ? JSON.stringify(content) : content
}