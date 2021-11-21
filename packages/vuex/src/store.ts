import { reactive } from 'vue'
import applyMixin from './mixin'
import ModuleCollection from './module/module-collection'
let Vue
export class Store {
	public vm
	public modules
	public mutations
	public actions
	constructor(options = {}) {
		if (!Vue && typeof window !== 'undefined' && window.Vue) {
			install(window.Vue, 'store')
		}
		this.modules = new ModuleCollection(options)

		const state = this.modules.root.state
		//const { mutations, actions } = this.modules.root
		this.mutations = {}
		this.actions = {}
		installModule(this, state, [], this.modules.root)

		restStoreVM(this, state)

		commitModule(this.mutations, state, module)
		actionsModule(this.actions, state, module)
	}

	get state() {
		return this.vm.state
	}


	commit = (key, data) => {
		this.mutations[key](data)
	}

	dispatch = (key, data) => {
		this.actions[key](data)
	}

}

const installModule = (store, state, path, module) => {
	const isRoot = !path.length
	const Namespaces = store.modules.getNamespace(path)
	module.forEachGetter((getter, value) => {
		value(state)
	})
}


const restStoreVM = (store, state) => {
	store.vm = reactive(state)
}

const commitModule = (mutations, state, module) => {
	module.forEachMutaion((key, value) => {
		mutations[key] = (data) => {
			value(state, data)
		}
	})
}

const actionsModule = (actions, state, module) => {
	module.forEachAction((key, value) => {
		actions[key] = (data) => {
			value(state, data)
		}
	})
}


const install = (app, key) => {
	if (Vue && app === Vue) {
		console.error("vuex already installed!");
		return
	}
	app.config.globalProperties.$store = this
	app.provide(key || "store", this)
	Vue = app
	applyMixin(Vue)
}