import { hasOwn } from '@vue/shared/src';
export const componentPublicInstance = {
	get: ({ _: instance }, key: any) => {
		const { props, setupState } = instance
		if (key[0] === '$') {//以属性$开头不能获取
			return
		}
		if (hasOwn(props, key)) {
			return props[key]
		} else if (hasOwn(setupState, key)) {
			return setupState[key]
		}
	},
	set: ({ _: instance }, key: any, value: any) => {
		const { props, setupState } = instance
		if (hasOwn(props, key)) {
			props[key] = value
		} else if (hasOwn(setupState, key)) {
			setupState[key] = value
		}
	},
}