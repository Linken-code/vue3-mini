/*
 * @Author: Linken
 * @Date: 2021-10-28 23:11:21
 * @LastEditTime: 2021-12-12 23:31:35
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\runtime-dom\src\nodeOps.ts
 * 仿写vue3源码，实现vue3-mini
 */
//操作节点
export const nodeOps = {
  insertElement: (child, parent, anchor = null) => {
    // 增加
    parent.insertBefore(child, anchor || null)
  },
  removeElement: child => {
    // 删除
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  // 创建元素
  createElement: tag => document.createElement(tag),
  // 创建文本
  createText: text => document.createTextNode(text),
  // 创建注释
  createComment: text => document.createComment(text),
  // 设置元素内容
  setElementText: (el, text) => {
    el.textContent = text
  },
  // 设置文本内容
  setText: (node, text) => {
    node.nodeValue = text
  },
  parentNode: node => node.parentNode, // 获取父节点
  nextSibling: node => node.nextSibling, // 获取下个兄弟
  queryElement: selector => document.querySelector(selector)
}
