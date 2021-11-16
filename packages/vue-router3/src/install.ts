import Link from './components/link'
import View from './components/view'
let Vue
VueRouter.install = function (_vue) {
	Vue = _vue
	const isDef = (v) => v !== undefined
	Vue.mixin({
		setup() {
			if (this.$options.router) {//根实例
				Vue.prototype.$router = this.$options.router
			}
		},
		beforeCreate() {
			if (isDef(this.$options.router)) {
				this._routerRoot = this
				this._router = this.$options.router
				this._router.init(this)
				Vue.util.defineReactive(this, '_route', this._router.history.current)//响应式路由
			} else {
				this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
			}
		},
		destroy() {

		}
	})

	Object.defineProperty(Vue.prototype, '$route', {
		get() { return this._routerRoot._route }

	})

	Object.defineProperty(Vue.prototype, '$router', {
		get() { return this._routerRoot._router }

	})

	//全局组件
	//router-link
	Vue.component('router-link', Link)

	//router-view
	Vue.component('router-view', View)

}