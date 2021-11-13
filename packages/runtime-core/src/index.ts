import { createRender } from './render'
import { h } from './h'
export { renderList } from './helpers/renderList'
export { queueJob, nextTick } from './scheduler'
export * from '@vue/reactivity'
export * from '@vue/runtime-core'
// `render` 是底层 API
// `createApp` 会产生一个 app 实例，该实例拥有全局的可配置上下文
export { createRender, h }
