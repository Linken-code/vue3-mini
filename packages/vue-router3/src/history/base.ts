import { START } from "../util/route"

export class History {
	private router
	private current
	private cb
	constructor(router, base) {
		this.router = router
		this.current = START
	}
	transitionTo(location, onComplete, onAbort) {
		const route = this.router.match(location, this.current)
		this.confirmTransition(
			route,
			() => {
				this.updateRoute(route)
				onComplete && onComplete(route)
			},
			error => { })
	}

	confirmTransition(route, onComplete, onAbort) {
		onComplete()
	}

	updateRoute(route) {
		this.current = route
		this.cb && this.cb(route)
	}

	listen(cb) {
		this.cb = cb
	}
}