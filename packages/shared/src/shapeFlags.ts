export const enum ShapeFlags {
	ELEMENT = 1,//元素00000001
	FUNCTIONAL_COMPONENT = 1 << 1,//函数式组件00000010
	STATEFUL_COMPONENT = 1 << 2,//组件
	TEXT_CHILDREN = 1 << 3,//文本	
	ARRAY_CHILDREN = 1 << 4,//数组
	SLOTS_CHILDREN = 1 << 5,//插槽
	TELEPORT = 1 << 6,
	SUSPENSE = 1 << 7,
	COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
	COMPONENT_KEPT_ALIVE = 1 << 9,//组件keep-alive
	COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT//组件
}
//1<<1表示向左移动1位 00000010
//1<<2表示向左移动2位 00000100
//依此类推,判断类型
// 位运算是类型处理和权限校验的最佳实践
//  00000001 & 00000001 => 00000001
//  未知组件 & ShapeFlags.ELEMENT => 00000001  只要 & 出来的结果不是0，就说明他是元素组件
// if (xxx & ShapeFlags.ELEMENT) {
// 	处理 element
// }

//  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
//  00000100 | 00000010 => 00000110 
// if (xxx & ShapeFlags.COMPONENT) {
// 	 只要 & 出来结果不为 0 ，就既可能是 状态组件 ，又可能是 函数组件
// }