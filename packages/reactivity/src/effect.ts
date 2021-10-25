//定义effect 收集依赖，更新视图

let uid = 0 //记录id
let activeEffect//保存当前的effect
const effectStack = []//定义一个栈
const createReactEffect = (fn, options) => {
	const effect = () => {//响应式的effect
		if (!effectStack.includes(effect)) {//如果effect没有加到effectStack
			try {
				effectStack.push(effect)//入栈
				activeEffect = effect
				fn()//执行用户的方法
			} finally {
				effectStack.pop() //出栈
				activeEffect = effectStack[effectStack.length - 1]
			}
		}

	}
	effect.id = uid++;//区别effect
	effect._isEffect = true;//区别effect是不是响应式的effect
	effect.raw = fn;//保存用户的方法
	effect.options = options;//保存用户的属性
	return effect
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