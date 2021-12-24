/*
 * @Author: Linken
 * @Date: 2021-11-21 14:08:32
 * @LastEditTime: 2021-12-24 21:13:09
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\vuex\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { Store } from './store'

import { inject } from 'vue'

export const createStore = options => {
  return new Store(options)
}

export const useStore = (key = null) => {
  return inject(key || 'store')
}
