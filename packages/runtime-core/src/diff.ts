import { isSameVNodeType } from "@vue/shared/src"
import { patch, unmount } from "./patch";
import { rendererOptions } from '@vue/runtime-dom/src'
//元素操作方法
const {
	//创建元素
	createElement,

	//删除元素
	removeElement,

	//插入元素
	insertElement,

	//选择元素
	qureyElement,

	//设置元素
	setElementText,

	//创建文本
	createText,

	//设置文本
	setText,

	//设置属性
	patchProps
} = rendererOptions
export const patchKeydChildren = (c1, c2, container, anchor = null) => {
	let i = 0;
	const l2 = c2.length;
	let e1 = c1.length - 1;
	let e2 = l2 - 1;
	// 1. sync from start
	while (i <= e1 && i <= e2) {  // 从左向右比较
		const n1 = c1[i];
		const n2 = c2[i];
		if (isSameVNodeType(n1, n2)) { // 相同就 patch
			patch(n1, n2, container, null)
		} else {  // 不相同就跳出循环
			break;
		}
		i++;
	}

	// 2. sync from end
	while (i <= e1 && i <= e2) {    // 从右向左比较
		const n1 = c1[e1];
		const n2 = c2[e2];
		if (isSameVNodeType(n1, n2)) {
			patch(n1, n2, container, null);
		} else {
			break;
		}
		e1--;
		e2--;
	}
	// 3. common sequence + mount
	if (i > e1) { // 说明有新增 
		if (i <= e2) { // 表示有新增的部分
			// 先根据e2 取他的下一个元素  和 数组长度进行比较
			const nextPos = e2 + 1;
			const anchor = nextPos < c2.length ? c2[nextPos].el : null;
			while (i <= e2) {
				patch(null, c2[i], container, anchor);
				i++;
			}
		}
	} else if (i > e2) {
		// 4. common sequence + unmount
		while (i <= e1) {
			unmount(c1[i])
			i++
		}
	} else {
		// 5. unknow squence
		// 5.1 构建映射表 map
		const s1 = i;
		const s2 = i;
		const keyToNewIndexMap = new Map();
		for (let i = s2; i <= e2; i++) {
			const nextChild = c2[i];
			keyToNewIndexMap.set(nextChild.key, i);
		}
		// 5.2 去老的里面查有没有可以复用的
		const toBePatched = e2 - s2 + 1;
		const newIndexToOldMapIndex = new Array(toBePatched).fill(0);
		for (let i = s1; i <= e1; i++) {
			const prevChild = c1[i];
			let newIndex = keyToNewIndexMap.get(prevChild.key); // 获取新的索引
			if (newIndex == undefined) {
				unmount(prevChild); // 老的有 新的没有直接删除
			} else {
				newIndexToOldMapIndex[newIndex - s2] = i + 1;
				patch(prevChild, c2[newIndex], container);
			}
		}
		// 5.3 移动和挂载
		for (let i = toBePatched - 1; i >= 0; i--) {
			const nextIndex = s2 + i; // [ecdh]   找到h的索引 
			const nextChild = c2[nextIndex]; // 找到 h
			let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 找到当前元素的下一个元素
			if (newIndexToOldMapIndex[i] == 0) { // 这是一个新元素 直接创建插入到 当前元素的下一个即可
				patch(null, nextChild, container, anchor)
			} else {
				// 根据参照物 将节点直接移动过去  所有节点都要移动 （但是有些节点可以不动）
				insertElement(nextChild.el, container, anchor);
			}
		}
	}
}

//实现最长递增子序列算法
const getSequence = (arr) => { // 最终的结果是索引 
	const len = arr.length;
	const result = [0]; // 索引  递增的序列 用二分查找性能高
	const p = arr.slice(0); // 里面内容无所谓 和 原本的数组相同 用来存放索引
	let start;
	let end;
	let middle;
	for (let i = 0; i < len; i++) { // O(n)
		const arrI = arr[i];
		if (arrI !== 0) {
			let resultLastIndex = result[result.length - 1];
			// 取到索引对应的值
			if (arr[resultLastIndex] < arrI) {
				p[i] = resultLastIndex; // 标记当前前一个对应的索引
				result.push(i);
				// 当前的值 比上一个人大 ，直接push ，并且让这个人得记录他的前一个
				continue
			}
			// 二分查找 找到比当前值大的那一个
			start = 0;
			end = result.length - 1;
			while (start < end) { // 重合就说明找到了 对应的值  // O(logn)
				middle = ((start + end) / 2) | 0; // 找到中间位置的前一个
				if (arr[result[middle]] < arrI) {
					start = middle + 1
				} else {
					end = middle
				} // 找到结果集中，比当前这一项大的数
			}
			if (arrI < arr[result[start]]) { // 如果相同 或者 比当前的还大就不换了
				if (start > 0) { // 才需要替换
					p[i] = result[start - 1]; // 要将他替换的前一个记住
				}
				result[start] = i;
			}
		}
	}
	let len1 = result.length // 总长度
	let last = result[len1 - 1] // 找到了最后一项
	while (len1-- > 0) { // 根据前驱节点一个个向前查找
		result[len1] = last
		last = p[last]
	}
	return result;
}
