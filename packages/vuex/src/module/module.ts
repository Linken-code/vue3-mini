import { forEachValue } from '../util'

export default class Module {
	public runtime
	public _rawModule
	public state
	public _children
	public mutations
	public actions
	constructor(rawModule, runtime) {
		this.runtime = runtime;
		this._rawModule = rawModule;
		this._children = rawModule.children
		const rawState = rawModule.state;
		this.mutations = rawModule.mutations
		this.actions = rawModule.actions
		this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
	}

	forEachGetter(fn) {
		if (this._rawModule.getters) {
			forEachValue(this._rawModule.getters, fn)
		}
	}

	forEachMutaion(fn) {
		if (this.mutations) {
			forEachValue(this.mutations, fn)
		}
	}

	forEachAction(fn) {
		if (this.actions) {
			forEachValue(this.actions, fn)
		}
	}

	forEachChild(fn) {
		forEachValue(this._children, fn)
	}


}