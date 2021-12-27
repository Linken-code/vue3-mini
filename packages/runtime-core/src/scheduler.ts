/*
 * @Author: Linken
 * @Date: 2021-11-08 19:18:07
 * @LastEditTime: 2021-12-12 16:48:23
 * @LastEditors: Linken
 * @Description: 学习vue3源码
 * @FilePath: \vue3-mini\packages\runtime-core\src\scheduler.ts
 * 仿写vue3源码，实现vue3-mini
 */
import { isArray } from '@vue/shared'
const queue = []
let isFlushing = false
let currentFlushPromise = null
const resolvedPromise = Promise.resolve()
const pendingPostFlushCbs = []
let activePostFlushCbs = null
let postFlushIndex = 0
let flushIndex = 0
export const queueJob = job => {
  if (!queue.length || !queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

const queueFlush = () => {
  if (!isFlushing) {
    isFlushing = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

const flushJobs = () => {
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i]
      job()
    }
  } finally {
    isFlushing = false
    queue.length = 0
    currentFlushPromise = null
  }
}

export const nextTick = (fn?) => {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}

export const queuePostFlushCb = cb => {
  //  cb 可能是一个数组
  queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex)
}

export function invalidateJob(job) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}

const queueCb = (cb?, activeQueue?, pendingQueue?, index?: number) => {
  if (!isArray(cb)) {
    if (!activeQueue || !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
      pendingQueue.push(cb)
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingQueue.push(...cb)
  }
  queueFlush()
}
