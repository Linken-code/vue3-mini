import { apiCreateApp } from './apiCreateApp'
import { patch } from './patch'
export const createRender = (renderOptionsDom) => { //渲染vnode=>render,渲染时所到的api
	const render = (vnode, container) => {//渲染函数
		//组件初始化
		//渲染
		patch(null, vnode, container)//1.旧节点2.新节点3.位置
	}
	return {
		createApp: apiCreateApp(render)//创建虚拟vnode
	}
}
// createRenderer 与平台无关所以定义在 runtime-core 中
// function createRender(rendererOptions) {
// 	return {
// 		createApp(rootComponent, rootProps) { // 用户创建app的参数
// 			const app = {
// 				mount(container) { // 挂载的容器
// 				}
// 			}
// 			return app;
// 		}
// 	}
// }