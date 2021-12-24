/*
 * @Author: Linken
 * @Date: 2021-11-21 15:33:49
 * @LastEditTime: 2021-12-24 21:11:38
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\vuex\src\module\module.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { forEachValue } from '../util'

export default class Module {
  public runtime
  public _rawModule
  public state
  public _children
  public mutations
  public actions
  constructor(rawModule, runtime) {
    this.runtime = runtime
    this._rawModule = rawModule
    this._children = rawModule.children
    const rawState = rawModule.state
    this.mutations = rawModule.mutations
    this.actions = rawModule.actions
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }

  forEachGetter(fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }

  forEachMutation(fn) {
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
