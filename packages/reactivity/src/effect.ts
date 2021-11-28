//定义effect 收集依赖，更新视图
import { isArray, isInteger, IsDEV, isMap, extend } from '@vue/shared/src'
import { TriggerTypes } from './operations'
import {
	createDep,
	Dep,
	finalizeDepMarkers,
	initDepMarkers,
	newTracked,
	wasTracked
} from './dep'

// 3.0
//let uid = 0 //记录id
let activeEffect: ReactiveEffect | undefined//保存当前的effect
//3.0
// const createReactEffect = (fn, options) => {
// 	const effectFn = () => {//响应式的effect
// 		if (!effectStack.includes(effectFn)) {//如果effect没有加到effectStack
// 			// 清理上一次的缓存
// 			cleanup(effectFn)
// 			try {
// 				effectStack.push(effectFn)//入栈
// 				activeEffect = effectFn
// 				return fn()//执行用户的方法
// 			} finally {
// 				effectStack.pop() //出栈
// 				activeEffect = effectStack[effectStack.length - 1]
// 			}
// 		}
// 	}
// 	effectFn.id = uid++;//区别effect
// 	effectFn._isEffect = true;//区别effect是不是响应式的effect
// 	effectFn.raw = fn;//保存用户的方法
// 	effectFn.options = options;//保存用户的属性
// 	return effectFn
// }

// 临时存储响应式函数,解决effct嵌套问题
const effectStack: ReactiveEffect[] = []
// 依赖收集栈
const trackStack: boolean[] = []
// 最大嵌套深度
const maxMarkerBits = 30
// effect层级
let effectTrackDepth = 0
// 位标记
export let trackOpBit = 1
let shouldTrack = true
//创建结构表,依赖统一管理 { target => key => dep }
let targetMap = new WeakMap()

export function pauseTracking() {
	trackStack.push(shouldTrack)
	shouldTrack = false
}

export function enableTracking() {
	trackStack.push(shouldTrack)
	shouldTrack = true
}

export function resetTracking() {
	const last = trackStack.pop()
	shouldTrack = last === undefined ? true : last
}

export const isTracking = () => {
	return shouldTrack && activeEffect !== undefined
}

export const stop = (runner) => {
	runner.effect.stop()
}

// 重置依赖
const cleanupEffect = (effect) => {
	const { deps } = effect
	if (deps.length) {
		for (let i = 0; i < deps.length; i++) {
			deps[i].delete(effect)
		}
		deps.length = 0
	}
}

export class ReactiveEffect<T = any>{
	active = true
	deps: Dep[] = []
	computed?: boolean
	allowRecurse?: boolean
	onStop?: () => void
	// dev only
	onTrack?: (event) => void
	// dev only
	onTrigger?: (event) => void
	constructor(
		public fn: () => T,
		public scheduler = null,
		scope = null
	) {
		// effectScope 相关处理，在另一个文件，这里不过多展开
		//recordEffectScope(this, scope)
	}
	run() {
		if (!this.active) {
			return this.fn
		}
		// 如果栈中没有当前的 effect
		if (!effectStack.includes(this)) {
			try {
				// activeEffect 表示当前依赖收集系统正在处理的 effect
				// 先把当前 effect 设置为全局激活的 effect，在 getter 中会收集 activeEffect 持有的 effect
				// 然后入栈
				effectStack.push((activeEffect = this))
				// 恢复依赖收集，因为在setup 函数自行期间，会暂停依赖收集
				enableTracking()
				// 记录递归深度位数
				trackOpBit = 1 << ++effectTrackDepth
				// 如果 effect 嵌套层数没有超过 30 层，一般超不了
				if (effectTrackDepth <= maxMarkerBits) {
					// 给依赖打标记，就是遍历 _effect 实例中的 deps 属性，给每个 dep 的 w 属性标记为 trackOpBit 的值
					initDepMarkers(this)
				} else {
					// 超过就 清除当前 effect 相关依赖 通常情况下不会
					cleanupEffect(this)
				}
				// 在执行 effect 函数，比如访问 target[key]，会触发 getter
				return this.fn()
			} finally {
				if (effectTrackDepth <= maxMarkerBits) {
					// 完成依赖标记
					finalizeDepMarkers(this)
				}
				// 恢复到上一级
				trackOpBit = 1 << --effectTrackDepth
				// 重置依赖收集状态
				resetTracking()
				// 出栈
				effectStack.pop()
				// 获取栈长度
				const n = effectStack.length
				// 将当前 activeEffect 指向栈最后一个 effect
				activeEffect = n > 0 ? effectStack[n - 1] : undefined
			}
		}
	}
	stop() {
		if (this.active) {
			cleanupEffect(this)
			if (this.onStop) {
				this.onStop()
			}
			this.active = false
		}
	}
}

//收集effect 在获取数据的时候触发get 
// targetMap 为依赖管理中心，用于存储响应式函数、目标对象、键之间的映射关系
// 相当于这样
// targetMap(weakmap)={
//    target1(map):{
//      key1(dep):[effect1,effect2]
//      key2(dep):[effect1,effect2]
//    }
// }
// 给每个 target 创建一个 map，每个 key 对应着一个 dep
// 用 dep 来收集依赖函数，监听 key 值变化，触发 dep 中的依赖函数
export const Track = (target, type, key) => {
	// 如果当前没有激活 effect，就不用收集
	if (!isTracking()) {
		return
	}
	//获取effect target:dep(map)
	let depsMap = targetMap.get(target)
	if (!depsMap) {//没有
		targetMap.set(target, (depsMap = new Map))//添加值
	}
	let dep = depsMap.get(key)//key:set[]
	if (!dep) {//没有属性
		//3.0
		//depsMap.set(key, (dep = new Set))
		//3.2
		depsMap.set(key, (dep = createDep()))
	}
	//3.0 有没有effect
	// if (!dep.has(activeEffect)) {//没有则收集effect
	// 	dep.add(activeEffect)
	// }
	//3.2
	// 开发环境和非开发环境
	const eventInfo = IsDEV
		? { effect: activeEffect, target, type, key }
		: undefined
	trackEffects(dep, eventInfo)
}

export const trackEffects = (dep, debuggerEventExtraInfo?) => {
	let shouldTrack = false
	// 如果 effect 嵌套层数没有超过 30 层，上面说过了
	if (effectTrackDepth <= maxMarkerBits) {
		if (!newTracked(dep)) {
			// 标记新依赖
			dep.n |= trackOpBit
			// 已经被收集的依赖不需要重复收集
			shouldTrack = !wasTracked(dep)
		}
	} else {
		// 超过了 就切换清除依赖模式
		shouldTrack = !dep.has(activeEffect!)
	}
	// 如果可以收集
	if (shouldTrack) {
		// 收集当前激活的 effect 作为依赖
		dep.add(activeEffect!)
		// 当前激活的 effect 收集 dep 集合
		activeEffect!.deps.push(dep)
		// 开发环境下触发 onTrack 事件
		if (IsDEV && activeEffect!.onTrack) {
			activeEffect!.onTrack(
				Object.assign(
					{
						effect: activeEffect!
					},
					debuggerEventExtraInfo
				)
			)
		}
	}
}

//触发更新
export const Trigger = (
	target: object,
	type,
	key?: unknown,
	newValue?: unknown,
	oldValue?: unknown,) => {
	// 从依赖管理中心中获取依赖
	const depsMap = targetMap.get(target)
	//如果这个属性没有收集过effect，不需要做任何操作
	if (!depsMap) {
		return
	}
	let deps: (Dep | undefined)[] = []
	// 触发trigger 的时候传进来的类型是清除类型
	if (type === TriggerTypes.CLEAR) {
		// 往队列中添加关联的所有依赖，准备清除
		deps = [...depsMap.values()]
	} else if (key === "length" && isArray(target)) {
		// 如果是数组类型的，并且是数组的 length 改变时
		depsMap.forEach((dep, key) => {
			// 如果数组长度变短时，需要做已删除数组元素的 effects 和 trigger
			// 也就是索引号 >= 数组最新的length的元素们对应的 effects，要将它们添加进队列准备清除
			if (key === "length" || key >= newValue) {
				deps.push(dep)
			}
		})
	} else {
		//可能是对象
		// 如果 key 不是 undefined，就添加对应依赖到队列，比如新增、修改、删除
		if (key != undefined) {//修改
			deps.push(depsMap.get(key))
		}
		switch (type) {
			case TriggerTypes.ADD:// 新增
				if (!isArray(target)) {
					deps.push(depsMap.get("iterate"))
					if (isMap(target)) {
						deps.push(depsMap.get("Map key iterate"))
					}
				} else if (isInteger(key)) {
					// new index added to array -> length changes
					deps.push(depsMap.get('length'))
				}
				break
			case TriggerTypes.DELETE:// 删除
				if (!isArray(target)) {
					deps.push(depsMap.get("iterate"))
					if (isMap(target)) {
						deps.push(depsMap.get("Map key iterate"))
					}
				}
				break
			case TriggerTypes.SET:// 修改
				if (isMap(target)) {
					deps.push(depsMap.get("iterate"))
				}
				break
		}
	}
	//3.2
	// 到这里就拿到了 targetMap[target][key]，并存到 deps 里
	// 接着是要将对应的 effect 取出，调用 triggerEffects 执行		
	// 判断开发环境，传入eventInfo
	const eventInfo = IsDEV
		? { target, type, key, newValue, oldValue }
		: undefined

	if (deps.length === 1) {
		if (deps[0]) {
			if (IsDEV) {
				triggerEffects(deps[0], eventInfo)
			} else {
				triggerEffects(deps[0])
			}
		}
	} else {
		const effects: ReactiveEffect[] = []
		for (const dep of deps) {
			if (dep) {
				effects.push(...dep)
			}
		}
		if (IsDEV) {
			triggerEffects(createDep(effects), eventInfo)
		} else {
			triggerEffects(createDep(effects))
		}
		//3.0执行
		// effectSet.forEach((effectFn: any) => {
		// 	if (effectFn.options.sch) {
		// 		effectFn.options.sch(effectFn) //computed的dirty=true
		// 	} else {
		// 		effectFn()
		// 	}
		// })
	}
}

export const triggerEffects = (dep, debuggerEventExtraInfo?) => {
	// 遍历 effect 的集合函数
	for (const effect of isArray(dep) ? dep : [...dep]) {
		/** 
		 这里判断 effect !== activeEffect的原因是：不能和当前effect 相同
		 比如：count.value++，如果这是个effect，会触发getter，track收集了当前激活的 effect，
		 然后count.value = count.value+1 会触发setter，执行trigger，
		 就会陷入一个死循环，所以要过滤当前的 effect
	 */
		if (effect !== activeEffect || effect.allowRecurse) {
			if (IsDEV && effect.onTrigger) {
				effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
			}
			// 如果 scheduler 就执行，计算属性有 scheduler
			if (effect.scheduler) {
				effect.scheduler()
			} else {
				// 执行 effect 函数
				effect.run()
			}
		}
	}
}

export const effect = (fn, options: any = {}) => {
	//3.0 const effect = createReactEffect(fn, options);
	//3.2 创建 effect
	if (fn.effect) {
		fn = fn.effect.fn
	}
	const _effect = new ReactiveEffect(fn)
	if (options) {
		extend(_effect, options)
		//if (options.scope) recordEffectScope(_effect, options.scope)
	}
	//如果 lazy 不为真就直接执行一次 effect。计算属性的 lazy 为 true
	if (!options || !options.lazy) {
		_effect.run()
	}
	// 返回
	//3.0 return effect
	//3.2
	const runner = _effect.run.bind(_effect)
	runner.effect = _effect
	return runner
};