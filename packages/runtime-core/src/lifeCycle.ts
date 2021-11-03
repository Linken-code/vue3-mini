//生命周期
import { currentInstance, setCurrentInstance } from './component'
//枚举
const enum lifeCycle {
	BEFORE_MOUNT = 'bm',
	MOUNTED = 'm',
	BEFORE_UPDATE = 'bu',
	UPDATED = 'u',
}

const injectHook = (lifeCycle, hookFn, target) => {
	if (target) {
		const hooks = target[lifeCycle] || (target[lifeCycle] = []);// 将生命周期保存在实例上
		const wrappedHook = () => {
			setCurrentInstance(target); // 当生命周期调用时 保证currentInstance是正确的
			hookFn.call(target);
			setCurrentInstance(null);
		}
		hooks.push(wrappedHook);
	}
}

//创建生命周期,返回函数
const createHook = (lifeCycle) => {
	//1.回调函数，2.当前组件的实例,target用来表示他是哪个实例的钩子
	return (hookFn, target = currentInstance) => {
		//获取当前组件的实例
		injectHook(lifeCycle, hookFn, target)
	}
}

export const onBeforeMount = createHook(lifeCycle.BEFORE_MOUNT)
export const onMounted = createHook(lifeCycle.MOUNTED)
export const onBeforeUpdate = createHook(lifeCycle.BEFORE_UPDATE)
export const onUpdated = createHook(lifeCycle.UPDATED)