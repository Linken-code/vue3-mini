/*
 * @Author: Linken
 * @Date: 2021-11-09 19:23:14
 * @LastEditTime: 2021-12-09 21:48:47
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\compiler-core\src\ast.ts
 * 仿写vue3源码，实现vue3-mini
 */
export const enum NodeTypes {
  ROOT, //根节点
  ELEMENT, //元素节点
  TEXT, //文本节点
  COMMENT, //注释
  SIMPLE_EXPRESSION, //表达式节点
  INTERPOLATION, //插值节点
  ATTRIBUTE, //属性节点
  DIRECTIVE, //指令节点
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT
}

export const enum ElementTypes {
  ELEMENT, //元素
  COMPONENT, //组件
  SLOT, //插槽
  TEMPLATE //template模板
}

export const createRoot = children => {
  return {
    type: NodeTypes.ROOT,
    children
  }
}
