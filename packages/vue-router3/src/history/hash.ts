import { History } from './base'

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
			const current = location.hash.slice(1)
		})
	}
}

export function getHash() {
	let href = window.location.href
	const index = href.indexOf('#');
	href = href.slice(index + 1)
	return href
}