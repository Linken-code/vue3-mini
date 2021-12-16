/*
 * @Author: Linken
 * @Date: 2021-10-24 10:41:49
 * @LastEditTime: 2021-12-12 16:24:08
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\reactivity\src\index.ts
 * 仿写vue3源码，实现vue3-mini
 */
//导出方法
export { reactive, shallowReactive, readonly, shallowReadonly } from './reactive'

export { effect, stop, Trigger, Track, enableTracking, pauseTracking, resetTracking, ReactiveEffect } from './effect'

export { ref, shallowRef, isRef, toRef, toRefs, unref, proxyRefs } from './ref'

export { computed } from './computed'
export { TrackOpType, TriggerTypes } from './operations'
