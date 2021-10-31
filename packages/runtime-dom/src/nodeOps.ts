//操作节点
export const nodeOps = {

	//创建元素
	createElement: (Element) => document.createElement(Element),

	//删除元素
	removeElement: (child) => {
		const parent = child.parentNode;
		if (parent) {
			parent.removeChild(child);
		}
	},

	//插入元素
	insertElement: (child, parent, anchor = null) => {
		parent.insertBefore(child, anchor)
	},

	//选择元素
	qureyElement: select => document.querySelector(select),

	//设置元素文本
	setElementText: (element, text) => element.textContent = text,

	//创建文本
	createText: (text) => document.createTextNode(text),

	//设置文本
	setText: (node, text) => node.nodeValue = text

}