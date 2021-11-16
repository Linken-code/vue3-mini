import { install } from './install'
import { createMatcher } from './create-matcher'
import { supportsPushState } from '.util/push-state'
import { HashHistory } from './history/hash'
import { HTML5history } from './history/html5'
import { inBrowser } from '.util/dom'
class VueRouter {
	private options
	private current
	private routes
	private mode
	private matcher
	private app
	private apps
	private fallback
	private history
	constructor(options: any = {}) {
		this.app = null
		this.apps = []
		this.options = options
		this.matcher = createMatcher(options.routes || [], this)
		let mode = options.mode || 'hash'
		this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
		if (this.fallback) {
			mode = 'hash'
		}
		this.mode = mode

		switch (mode) {
			case 'hash':
				this.history = new HashHistory(this, options.base, this.fallback)
				break;
			case 'history':
				this.history = new HTML5history(this, options.base, this.fallback)
				break;
			case 'abstract':
				this.history = new AbstractHistory(this, options.base)
				break;
		}
	}

	init(app) {
		this.apps.push(app)
		this.app = app
		const history = this.history
		if (history instanceof HTML5history) {
			history.transitionTo(history.getCurrentLocation())
		} else if (history instanceof HashHistory) {
			const setupHashListener = () => {
				history.setupListeners()
			}
			history.transitionTo(history.getCurrentLocation(), setupHashListener, setupHashListener)
		}


		history.listen((route) => {
			this.apps.forEach((app) => {
				app._route = route
			})
		})

		match(raw, current, redirect) {
			return this.matcher.match(raw, current, redirect)
		}
	}


}
VueRouter.install = install
export default VueRouter;


if (inBrowser && window.Vue) {
	window.Vue.use(VueRouter)
}

