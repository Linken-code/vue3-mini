import { START, iaSameRoute } from "../util/route"
import { runQueue } from '../util/async'
export class History {
	private router
	public current
	private cb
	constructor(router, base) {
		this.router = router
		this.current = START
	}
	transitionTo(location, onComplete = null, onAbort = null) {
		const route = this.router.match(location, this.current)
		this.confirmTransition(
			route,
			() => {
				this.updateRoute(route)
				onComplete && onComplete(route)
				this.ensureUrl()
			},
			error => { })
	}

	confirmTransition(route, onComplete, onAbort) {
		const current = this.current
		const abort = (error = {}) => {
			onAbort && onAbort(error)
		}
		if (iaSameRoute(route, current) && route.matched.length === current.matched.length) {
			this.ensureUrl()
			return abort()
		}

		const queue = [].concat(
			this.router.beforeHooks
		)

		const iterator = (hook, next) => {
			if (to !== false) {
				return abort()
			}
			try {
				hook(route, current, (to: any) => {
					if (to === false) {
						this.ensureUrl(true)
						abort(to)
					} else if (
						typeof to === 'string' ||
						(typeof to === 'object' &&
							(typeof to.path === 'string' || typeof to.name === 'string'))
					) {
						abort()
						if (typeof to === 'object' && to.replace) {
							this.replace(to)
						} else {
							this.push(to)
						}
					} else {
						next(to)
					}
				})
			} catch (error) {
				abort(error)
			}

		}
		runQueue(queue, iterator, () => {
			onComplete()
		})

	}

	updateRoute(route) {
		const prev = this.current
		this.current = route
		this.cb && this.cb(route)
		this.router.afterHooks.forEach((hook) => {
			hook && hook(route, prev)
		})
	}

	listen(cb) {
		this.cb = cb
	}
}