import { History } from './base'
import { handleScroll } from './html5'
import { pushState, replaceState, supportsPushState } from '../util/push-state'
export class HashHistory extends History {
	constructor(route, base, fallback) {
		super(route, base)
	}
	getCurrentLocation() {
		return getHash();
	}
	setupListeners() {
		window.addEventListener('hashchange', () => {
			this.transitionTo(getHash());
			//const current = location.hash.slice(1)
		})
	}

	push(location, onComplete?: Function, onAbort?: Function) {
		const { current } = this
		this.transitionTo(
			location,
			route => {
				pushHash(route.fullPath)
				//handleScroll(this.router, route, false)
				onComplete && onComplete(route)
			},
			onAbort
		)
	}

	replace(location, onComplete?: Function, onAbort?: Function) {
		const { current } = this
		this.transitionTo(
			location,
			route => {
				replaceHash(route.fullPath)
				//handleScroll(this.router, route, false)
				onComplete && onComplete(route)
			},
			onAbort
		)
	}

	go(n: number) { window.history.go(n) }

	ensureUrl(push) {
		const current = this.current.fullPath
		if (getHash() !== current) {
			push ? pushHash(current) : replaceHash(current)
		}
	}
}

const pushHash = (path) => {
	if (supportsPushState) {
		pushState(getUrl(path))
	} else {
		window.location.hash = path
	}
}

const replaceHash = (path) => {
	if (supportsPushState) {
		replaceState(getUrl(path))
	} else {
		window.location.replace(getUrl(path))
	}
}

const getUrl = (path) => {
	let href = window.location.href
	const i = href.indexOf('#')
	const base = i >= 0 ? href.slice(0, i) : href
	return `${base}#${path}`
}

export function getHash() {
	let href = window.location.href
	const index = href.indexOf('#');
	if (index < 0) return ''
	href = href.slice(index + 1)
	return href
}