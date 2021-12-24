/*
 * @Author: Linken
 * @Date: 2021-11-21 14:38:44
 * @LastEditTime: 2021-12-24 21:16:48
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\vuex-mini\src\store.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { reactive } from 'VueMini'
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
  module.forEachMutation((key, value) => {
    mutations[key] = data => {
      value(state, data)
    }
  })
}

const actionsModule = (actions, state, module) => {
  module.forEachAction((key, value) => {
    actions[key] = data => {
      value(state, data)
    }
  })
}

const install = (app, key) => {
  if (Vue && app === Vue) {
    console.error('vuex already installed!')
    return
  }
  app.config.globalProperties.$store = this
  app.provide(key || 'store', this)
  Vue = app
  applyMixin(Vue)
}
