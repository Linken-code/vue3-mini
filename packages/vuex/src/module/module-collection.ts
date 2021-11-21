import Module from './module'
export default class ModuleCollection {
	public root
	constructor(rawRootModule) {
		this.register([], rawRootModule, false);
	}

	register(path, rawModule, runtime = true) {
		const newModule = new Module(rawModule, runtime);
		if (path.length === 0) {
			this.root = newModule;
		} else {
			const parent = this.get(path.slice(0, -1));
			parent.addChild(path[path.length - 1], newModule);
		}
	}

	get(path) {
		return path.reduce((module, key) => {
			return module.getChild(key)
		}, this.root)
	}

	getNamespace(path) {
		let module = this.root
		return path.reduce((namespace, key) => {
			module = module.getChild(key)
			return namespace + (module.namespaced ? key + "/" : '')
		}, '')
	}
}