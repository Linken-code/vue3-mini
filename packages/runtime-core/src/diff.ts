import { isSameVNodeType } from "@vue/shared/src"
import { patch } from "./patch";
export const patchKeydChildren = (c1, c2, container, anchor) => {
	let i = 0;
	const l2 = c2.length;
	let e1 = c1.length - 1;
	let e2 = l2 - 1;
	// 1. sync from start
	while (i <= e1 && i <= e2) {  // 从头向后比较
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
	while (i <= e1 && i <= e2) {    // 从后向前比较
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
			unmount(c1[i], parentComponent, parentSuspense, true)
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
				hostInsert(nextChild.el, container, anchor);
			}
		}
	}
}
