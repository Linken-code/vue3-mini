import { apiCreateApp } from './apiCreateApp'
import { patch } from './patch'
export const createRender = (renderOptionsDom) => { //渲染vnode=>render

	let render = (vnode, container) => {//渲染函数
		//组件初始化
		//渲染
		patch(null, vnode, container)//1.旧节点2.新节点3.位置
	}
	return {
		createApp: apiCreateApp(render)//创建虚拟vnode
	}
}