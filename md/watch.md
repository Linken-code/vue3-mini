## watch 的实现原理

### 1. watchEffect 函数

```javascript
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options)
}

```

```javascript
export type WatchEffect = (onInvalidate: InvalidateCbRegistrator) => void

export interface WatchOptionsBase {
  flush?: 'pre' | 'post' | 'sync'
  onTrack?: ReactiveEffectOptions['onTrack']
  onTrigger?: ReactiveEffectOptions['onTrigger']
}

export type WatchStopHandle = () => void
```
- 第一个参数 effect，接收函数类型的变量，并且在这个函数中会传入 onInvalidate 参数，用以清除副作用。

- 第二个参数 options 是一个对象，在这个对象中有三个属性，你可以修改 flush 来改变副作用的刷新时机，默认为 pre，当修改为 post 时，就可以在组件更新后触发这个副作用侦听器，改同 sync 会强制同步触发。而 onTrack 和 onTrigger 选项可以用于调试侦听器的行为，并且两个参数只能在开发模式下工作。

- 参数传入后，函数会执行并返回 doWatch 函数的返回值。

### 2. watch函数
这个独立出来的 watch api 与组件中的 watch option 是完全等同的，watch 需要侦听特定的数据源，并在回调函数中执行副作用。默认情况下这个侦听是惰性的，即只有当被侦听的源发生变化时才执行回调。

与 watchEffect 相比，watch 有以下不同：

- 懒性执行副作用
- 更具体地说明说明状态应该处罚侦听器重新运行
- 能够访问侦听状态变化前后的值

watch 接收 3 个参数，source 侦听的数据源，cb 回调函数，options 侦听选项
```javascript
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  if (__DEV__ && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
        `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
        `supports \`watch(source, cb, options?) signature.`
    )
  }
  return doWatch(source as any, cb, options)
}
```
#### source 参数
```javascript
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T)
type MultiWatchSources = (WatchSource<unknown> | object)[]
```
从两个类型定义看出，数据源支持传入单个的 Ref、Computed 响应式对象，或者传入一个返回相同泛型类型的函数，以及 source 支持传入数组，以便能同时监听多个数据源。

#### cb 参数
```javascript
export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onInvalidate: InvalidateCbRegistrator
) => any
```
在这个最通用的声明中，cb 的类型是 any，但是其实 cb 这个回调函数也有他自己的类型：
在回调函数中，会提供最新的 value、旧 value，以及 onInvalidate 函数用以清除副作用

#### options
```javascript
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  deep?: boolean
}
```
可以看到 options 的类型 WatchOptions 继承了 WatchOptionsBase，这也就是 watch 除了 immediate 和 deep 这两个特有的参数外，还可以传递 WatchOptionsBase 中的所有参数以控制副作用执行的行为。

分析完参数后，可以看到函数体内的逻辑与 watchEffect 几乎一致，但是多了在开发环境下检测回调函数是否是函数类型，如果回调函数不是函数，就会报警。

执行 doWatch 时的传参与 watchEffect 相比，多了第二个参数回调函数。

### 3. doWatch
不管是 watchEffect、watch 还是组件内的 watch 选项，在执行时最终调用的都是 doWatch 中的逻辑

```javascript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ,
  instance = currentInstance
): WatchStopHandle
```
这个函数签名与 watch 基本一致，多了一个 instance 的参数，默认值为 currentInstance，currentInstance 是当前调用组件暴露出来的一个变量，方便该侦听器找到自己对应的组件。

而 source 在这里的类型就比较清晰，支持单个的 source 或者数组，也只是一个普通对象。

接着会创建三个变量，getter 最终会当做副作用的函数参数传入，forceTrigger 标识是否需要强制更新，isMultiSource 标记传入的是单个数据源还是以数组形式传入的多个数据源。


```javascript
let getter: () => any
let forceTrigger = false
let isMultiSource = false
```

然后会开始判断 source 的类型，根据不同的类型重置这三个参数的值。

1、ref 类型
- 访问 getter 函数会获取到 source.value 值，直接解包。
- forceTrigger 标记会根据是否是 shallowRef 来设置。

2、reactive 类型

- 访问 getter 函数直接返回 source，因为 reactive 的值不需要解包获取。
- 由于 reactive 中往往有多个属性，所以会将 deep 设置为 true，这里可以看出从外部给 reactive 设置 deep 是无效的。

3、数组 array 类型

- 将 isMultiSource 设置为 true。
- forceTrigger 会根据数组中是否存在 reactive 响应式对象来判断。
- getter 是一个数组形式，是 source 内各个元素的单个 getter 结果。

4、source 是函数 function 类型

- 如果有回调函数
- getter 就是 source 函数执行的结果，这种情况一般是 watch api 中的数据源以函数的形式传入。
- 如果没有回调函数，那么此时就是 watchEffect api 的场景了。
- 此时会为 watchEffect 设置 getter 函数，getter 函数逻辑如下：
- 如果组件实例已经卸载，则不执行，直接返回
- 否则执行 cleanup 清除依赖
- 执行 source 函数

5、如果 source 不是以上的情况，则将 getter 设置为空函数，并且报出 source 不合法的警告⚠️。

```javascript
if (isRef(source)) { // ref 类型的数据源，更新 getter 与 forceTrigger
  getter = () => (source as Ref).value
  forceTrigger = !!(source as Ref)._shallow
} else if (isReactive(source)) { // reactive 类型的数据源，更新 getter 与 deep
  getter = () => source
  deep = true
} else if (isArray(source)) { // 多个数据源，更新 isMultiSource、forceTrigger、getter
  isMultiSource = true
  forceTrigger = source.some(isReactive)
  // getter 会以数组形式返回数组中数据源的值
  getter = () =>
    source.map(s => {
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        return traverse(s)
      } else if (isFunction(s)) {
        return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER)
      } else {
        __DEV__ && warnInvalidSource(s)
      }
    })
} else if (isFunction(source)) { // 数据源是函数的情况
  if (cb) {
    // 如果有回调，则更新 getter，让数据源作为 getter 函数
    getter = () =>
      callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
  } else {
    // 没有回调即为 watchEffect 场景
    getter = () => {
      if (instance && instance.isUnmounted) {
        return
      }
      if (cleanup) {
        cleanup()
      }
      return callWithAsyncErrorHandling(
        source,
        instance,
        ErrorCodes.WATCH_CALLBACK,
        [onInvalidate]
      )
    }
  }
} else {
  // 其余情况 getter 为空函数，并发出警告
  getter = NOOP
  __DEV__ && warnInvalidSource(source)
}
```

接着会处理 watch 中的场景，当有回调，并且 deep 选项为 true 时，将使用 traverse 来包裹 getter 函数，对数据源中的每个属性递归遍历进行监听。

```javascript
if (cb && deep) {
  const baseGetter = getter
  getter = () => traverse(baseGetter())
}
```

之后会声明 cleanup 和 onInvalidate 函数，并在 onInvalidate 函数的执行过程中给 cleanup 函数赋值，当副作用函数执行一些异步的副作用，这些响应需要在其失效时清除，所以侦听副作用传入的函数可以接收一个 onInvalidate 函数作为入参，用来注册清理失效时的回调。当以下情况发生时，这个失效回调会被触发：

- 副作用即将重新执行时。
- 侦听器被停止（如果在 setup() 或生命周期钩子函数中使用了 watchEffect，则在组件卸载时）。

```javascript
let cleanup: () => void
let onInvalidate: InvalidateCbRegistrator = (fn: () => void) => {
  cleanup = runner.options.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
  }
}
```
接着会初始化 oldValue 并赋值。

然后声明一个 job 函数，这个函数最终会作为调度器中的回调函数传入，由于是一个闭包形式依赖外部作用域中的许多变量，所以会放在后面讲，避免出现还未声明的变量造成理解困难。

根据是否有回调函数，设置 job 的 allowRecurse 属性，这个设置很重要，能够让 job 作为一个观察者的回调这样调度器就能知道它允许调用自身。

接着声明一个 scheduler 的调度器对象，根据 flush 的传参来确定调度器的执行时机。

- 当 flush 为 sync 同步时，直接将 job 赋值给 scheduler，这样这个调度器函数就会直接执行。
- 当 flush 为 post 需要延迟执行时，将 job 传入 queuePostRenderEffect 中，这样 job 会被添加进一个延迟执行的队列中，这个队列会在组件被挂载后、更新的生命周期中执行。
- 最后是 flush 为默认的 pre 优先执行的情况，这是调度器会区分组件是否已经挂载，副作用第一次调用时必须是在组件挂载之前，而挂载后则会被推入一个优先执行时机的队列中。
这一部分逻辑的源码如下：

```javascript
// 初始化 oldValue
let oldValue = isMultiSource ? [] : INITIAL_WATCHER_VALUE
const job: SchedulerJob = () => { /*暂时忽略逻辑*/ } // 声明一个 job 调度器任务，暂时不关注内部逻辑

// 重要：让调度器任务作为侦听器的回调以至于调度器能知道它可以被允许自己派发更新
job.allowRecurse = !!cb

let scheduler: ReactiveEffectOptions['scheduler'] // 声明一个调度器
if (flush === 'sync') {
  scheduler = job as any // 这个调度器函数会立即被执行
} else if (flush === 'post') {
  // 调度器会将任务推入一个延迟执行的队列中
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
} else {
    // 默认情况 'pre'
  scheduler = () => {
    if (!instance || instance.isMounted) {
      queuePreFlushCb(job)
    } else {
      // 在 pre 选型中，第一次调用必须发生在组件挂载之前
      // 所以这次调用是同步的
      job()
    }
  }
}
```
在处理完以上的调度器部分后，会开始创建副作用。

首先声明一个 runner 变量，它创建一个副作用并将之前处理好的 getter 函数作为副作用函数传入，并在副作用选项中设置了延迟调用，以及设置了对应的调度器。

并通过 recordInstanceBoundEffect 函数将该副作用函数加入组件实例的的 effects 属性中，好让组件在卸载时能够主动得停止这些副作用函数的执行。

接着会开始处理首次执行副作用函数。

- 如果 watch 有回调函数
- 如果 watch 设置了 immediate 选项，则立即执行 job 调度器任务。
- 否则首次执行 runner 副作用，并将返回值赋值给 oldValue。
- 如果 flush 的刷新时机是 post，则将 runner 放入延迟时机的队列中，等待组件挂载后执行。
- 其余情况都直接首次执行 runner 副作用。

最后 doWatch 函数会返回一个函数，这个函数的作用是停止侦听，所以大家在使用时可以显式的为 watch、watchEffect 调用返回值以停止侦听。
```javascript
// 创建 runner 副作用
const runner = effect(getter, {
  lazy: true,
  onTrack,
  onTrigger,
  scheduler
})

// 将 runner 添加进 instance.effects 数组中
recordInstanceBoundEffect(runner, instance)

// 初始化调用副作用
if (cb) {
  if (immediate) {
    job() // 有回调函数且是 imeediate 选项的立即执行调度器任务
  } else {
    oldValue = runner() // 否则执行一次 runner，并将返回值赋值给 oldValue
  }
} else if (flush === 'post') {
    // 如果调用时机为 post，则推入延迟执行队列
  queuePostRenderEffect(runner, instance && instance.suspense)
} else {
  // 其余情况立即首次执行副作用
  runner()
}

// 返回一个函数，用以显式的结束侦听
return () => {
  stop(runner)
  if (instance) {
    remove(instance.effects!, runner)
  }
}
```

doWatch 函数到这里就全部运行完毕了，现在所有的变量已经声明完毕，尤其是最后声明的 runner 副作用。我们可以回过头看看被调用了多次的 job 中究竟做了什么。

调度器任务中做的事情逻辑比较清晰，首先会判断 runner 副作用是否被停用，如果已经被停用则立即返回，不再执行后续逻辑。

之后区分场景，通过是否存在回调函数判断是 watch api 调用还是 watchEffect api 调用。

如果是 watch api 调用，则会执行 runner 副作用，将其返回值赋值给 newValue，作为最新的值。如果是 deep 需要深度侦听，或者是 forceTrigger 需要强制更新，或者新旧值发生了改变，这三种情况都需要触发 cb 回调，通知侦听器发生了变化。在调用侦听器之前会先通过 cleanup 清除副作用，接着触发 cb 回调，将 newValue、oldValue、onInvalidate 三个参数传入回调。在回调触发后再去更新 oldValue 的值。

而如果没有 cb 回调函数，即为 watchEffect 的场景，此时调度器任务仅仅需要执行 runner 副作用函数就好。

job 调度器任务中的具体代码逻辑如下：
```javascript
const job: SchedulerJob = () => {
  if (!runner.active) { // 如果副作用以停用则直接返回
    return
  }
  if (cb) {
    // watch(source, cb) 场景
    // 调用 runner 副作用获取最新的值 newValue
    const newValue = runner()
    // 如果是 deep 或 forceTrigger 或有值更新
    if (
      deep ||
      forceTrigger ||
      (isMultiSource
        ? (newValue as any[]).some((v, i) =>
            hasChanged(v, (oldValue as any[])[i])
          )
        : hasChanged(newValue, oldValue))
    ) {
      // 当回调再次执行前先清除副作用
      if (cleanup) {
        cleanup()
      }
      // 触发 watch api 的回调，并将 newValue、oldValue、onInvalidate 传入
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
        newValue,
        // 首次调用时，将 oldValue 的值设置为 undefined
        oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
        onInvalidate
      ])
      oldValue = newValue // 触发回调后，更新 oldValue
    }
  } else {
    // watchEffect 的场景，直接执行 runner
    runner()
  }
}
```