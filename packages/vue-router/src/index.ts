import { install } from './install'
import { createMatcher } from './create-matcher'
import { supportsPushState } from '.util/push-state'
import { HashHistory } from './history/hash'
import { HTML5history } from './history/html5'
import { inBrowser } from '.util/dom'
class VueRouter {
	public options
	public mode
	public matcher
	public app
	public apps
	public fallback
	public history
	public beforeHooks
	public afterHooks
	constructor(options: any = {}) {
		this.app = null
		this.apps = []
		this.beforeHooks = []
		this.afterHooks = []
		this.options = options
		this.matcher = createMatcher(options.routes || [], this)
		let mode = options.mode || 'hash'
		this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
		if (this.fallback) {
			mode = 'hash'
		}
		this.mode = mode

		switch (this.mode) {
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

	}
	match(raw, current, redirect) {
		return this.matcher.match(raw, current, redirect)
	}

	push(location, onComplete?: Function, onAbort?: Function) {
		if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
			return new Promise((resole, reject) => {
				this.history.push(location, resole, reject)
			})
		} else {
			this.history.push(location, onComplete, onAbort)
		}
	}

	replace(location, onComplete?: Function, onAbort?: Function) {
		if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
			return new Promise((resole, reject) => {
				this.history.replace(location, resole, reject)
			})
		} else {
			this.history.replace(location, onComplete, onAbort)
		}
	}

	go(n: number) { this.history.go(n) }
	back() { this.history.go(-1) }
	forward() { this.history.go(1) }

	beforeEach(fn) {
		return registerhook(this.beforeHooks, fn)
	}

	afterEach(fn) {
		return registerhook(this.afterHooks, fn)
	}
}

const registerhook = (list, fn) => {
	list.push(fn)
	return () => {
		const i = list.indexOf(fn)
		if (i > -1) list.splice(i, 1)
	}
}

VueRouter.install = install
export default VueRouter;


if (inBrowser && window.Vue) {
	window.Vue.use(VueRouter)
}

