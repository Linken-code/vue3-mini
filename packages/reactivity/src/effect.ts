//定义effect 收集依赖，更新视图
import { isArray, isInteger } from '@vue/shared/src'
import { TriggerTypes } from './operations'
let uid = 0 //记录id
let activeEffect//保存当前的effect
const effectStack = []//定义一个栈,解决effct嵌套问题
const createReactEffect = (fn, options) => {
	const effectFn = () => {//响应式的effect
		if (!effectStack.includes(effectFn)) {//如果effect没有加到effectStack
			try {
				effectStack.push(effectFn)//入栈
				activeEffect = effectFn
				return fn()//执行用户的方法
			} finally {
				effectStack.pop() //出栈
				activeEffect = effectStack[effectStack.length - 1]
			}
		}

	}
	effectFn.id = uid++;//区别effect
	effectFn._isEffect = true;//区别effect是不是响应式的effect
	effectFn.raw = fn;//保存用户的方法
	effectFn.options = options;//保存用户的属性
	return effectFn
}

export const effect = (fn, options: any = {}) => {
	const effect = createReactEffect(fn, options);
	//判断
	if (!options.lazy) {
		effect()
	}
	return effect;
};

//收集effect 在获取数据的时候触发get 
let targetMap = new WeakMap()//创建结构表
export const Track = (target, type, key) => {
	if (activeEffect === undefined) {
		return
	}
	//获取effect target:dep(map)
	let depMap = targetMap.get(target)
	if (!depMap) {//没有
		targetMap.set(target, (depMap = new Map))//添加值
	}
	let dep = depMap.get(key)//key:set[]
	if (!dep) {//没有属性
		depMap.set(key, (dep = new Set))
	}
	//有没有effect
	if (!dep.has(activeEffect)) {//没有则收集effect
		dep.add(activeEffect)
	}
}

let effectSet = new Set()//set可以去重
const add = (effectAdd) => {
	if (effectAdd) {
		effectAdd.forEach((item) => {
			effectSet.add(item)
		})
	}
}
//触发更新
export const Trigger = (target, type, key?, value?, oldValue?) => {
	//触发依赖
	const depMap = targetMap.get(target)
	//没有值
	if (!depMap) {
		return
	}
	//有值
	let effects = depMap.get(key)

	add(effects)
	//处理数组 修改数组长度(length===key)
	if (key === "length" && isArray(target)) {
		depMap.forEach((dep, key) => {
			//如果更改的长度小于收集的索引，那这个索引重新执行effect
			if (key === "length" || key >= value) {
				add(dep)
			} else {
				if (key != undefined) {
					add(depMap.get(key))
				}
				switch (type) {
					case TriggerTypes.ADD:
						if (isArray(target) && isInteger(key)) {
							add(depMap.get("length"))
						}
						break;
				}
			}
		})
	}
	//执行
	effectSet.forEach((effectFn: any) => {
		if (effectFn.options.sch) {
			effectFn.options.sch(effectFn) //computed的dirty=true
		} else {
			effectFn()
		}
	})
}