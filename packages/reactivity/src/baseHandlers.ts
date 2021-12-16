/*
 * @Author: Linken
 * @Date: 2021-10-24 21:23:28
 * @LastEditTime: 2021-12-12 16:14:28
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\reactivity\src\baseHandlers.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { reactive, readonly } from './reactive'
import { isObject, hasOwn, isInteger, isArray, hasChange } from '@vue/shared/src'
import { Track, Trigger } from './effect'
import { TrackOpType, TriggerTypes } from './operations'
//getter
const createGetter = (isReadonly = false, shallow = false) => {
  return (target, key, receiver) => {
    //反射
    const res = Reflect.get(target, key, receiver)
    //不是只读类型的 target 就收集依赖。因为只读类型不会变化，无法触发 setter，也就会触发更新
    if (!isReadonly) {
      // 收集依赖，存储到对应的全局仓库中
      Track(target, TrackOpType.GET, key)
    }

    //浅层,不做递归转化，就是说对象有属性值还是对象的话不递归调用 reactive()
    if (shallow) {
      return res
    }

    //由于 proxy 只能代理一层,如果子元素是对象,需要递归继续代理,称为懒代理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}
//get params 1、true只读readonly 2、true浅层shallow
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

//setter
const createSetter = (shallow = false) => {
  return (target, key, value, receiver) => {
    //获取之前的值
    const oldValue = target[key]
    //判断是否有值
    let hasKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key)
    //赋值，相当于 target[key] = value
    const result = Reflect.set(target, key, value, receiver)
    if (!hasKey) {
      // 如果target没有 key，表示新增
      //新增
      Trigger(target, TriggerTypes.ADD, key, value)
    } else {
      //修改
      //判断新值和原来是否相同
      if (hasChange(value, oldValue)) {
        // 如果新旧值不相等
        Trigger(target, TriggerTypes.SET, key, value, oldValue)
      }
    }
    //触发更新
    return result
  }
}
//set params1、true浅层
const set = createSetter()
const shallowSet = createSetter(true)

//暴露方法
export const reactiveHandlers = {
  get,
  set
}
export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet
}
export const readonlyHandlers = {
  get: readonlyGet,
  set: (target, key, value) => {
    console.log(`set on key ${key} is failed!`)
  }
}
export const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set: (target, key, value) => {
    console.log(`set on key ${key} is failed!`)
  }
}
