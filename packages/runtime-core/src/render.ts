import { apiCreateApp } from './apiCreateApp'

export const createRender = (renderOptionsDom) => {
	let render = (vnode, container) => {//渲染函数
		//组件初始化
	}
	return {
		createApp: apiCreateApp(render)//创建虚拟vnode
	}
}