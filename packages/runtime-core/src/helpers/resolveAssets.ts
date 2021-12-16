/*
 * @Author: Linken
 * @Date: 2021-11-28 14:33:16
 * @LastEditTime: 2021-12-16 00:40:02
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\runtime-core\src\helpers\resolveAssets.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { currentInstance, getComponentName } from '../component'
import { camelize, capitalize } from '@vue/shared'
let components
export const COMPONENTS = 'components'
export const resolveComponent = (name: string) => {
  return resolveAsset(COMPONENTS, name) || name
  //  return components && (components[name] || camelize(name) || capitalize(camelize(name)))
}

function resolveAsset(type, name: string) {
  const instance = currentInstance
  if (instance) {
    const Component = instance.type
    // explicit self name has highest priority
    if (type === COMPONENTS) {
      const selfName = getComponentName(Component)
      if (selfName && (selfName === name || selfName === camelize(name) || selfName === capitalize(camelize(name)))) {
        return Component
      }
    }
  }
}
