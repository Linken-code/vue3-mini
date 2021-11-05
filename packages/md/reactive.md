##  实现vue3的reactive
我们传入一个对象object, 在访问object.a的时候会触发get方法， 给object.a = 2 赋值的时候会触发 set方法vue2 Object.defineProperty与 vue3 proxy 对比

1、Object.defineProperty的第一个缺陷,无法监听数组变化（vue2改写了数组的七个方法 push,pop等）

2、bject.defineProperty的第二个缺陷,只能劫持对象的属性,因此我们需要对每个对象的每个属性进行遍历（深度遍历）

3、Proxy可以直接监听对象而非属性，并返回一个新对象

4、Proxy可以直接监听数组的变化

### 1.响应式API

vue3中最核心的就是基于Proxy实现的响应式API（用于代理对象类型）
- reactive：vue3中能够将对象变成响应式的API，不管对象有多少层
- shallowReactive：vue3中能够将对象变成响应式的API，只代理最外层对象
- readonly：将对象属性变为只读，且不管对象有多少层
- shallowReadonly：将对象属性变为只读，但是只代理最外层

### reactive.ts
在reactive文件夹，新建reactvity/src/reactive.ts，入口文件为reactvity/src/index.ts，在入口文件引入reactive文件中的reative、shallowReactive等函数

```javascript
// reactvity/src/index.ts
export {
    reactive,
    readonly,
    shallowReactive,
    shallowReadonly
} from './reactive'
```
在reactive.ts中引入不同的拦截函数，
```javascript
import {isObject} from '@vue/shared/src'
import {
    mutableHandlers,
    readonlyHandlers,
    shallowReactiveHandlers,
    shallowReadonlyHandlers
} from "./baseHandlers";  // 不同的拦截函数
​
// 是不是仅读，是不是深度，基于柯里化编程实现
export function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers)
}
​
export function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers)
}
​
export function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers)
}
​
export function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers)
}
​
// createReactiveObject 创建响应式对象
function createReactiveObject(target, isReadonly, baseHandlers) {}
```
从源码中可以看出，reactive、shallowReactive、readonly、shallowReadonly等函数均通过createReactiveObject柯里化实现响应、只读、浅响应等功能。接下来，对createReactiveObject源码进行解剖
### createReactiveObject 函数的实现
```javascript
/**
 * createReactiveObject 创建响应式对象
 * @param target 拦截的目标
 * @param isReadonly 是不是仅读属性
 * @param baseHandlers 对应的拦截函数
 */
​
const reactiveMap = new WeakMap();  // 会自动垃圾回收，不会造成内存泄露，存储的key只能是对象
const readonlyMap = new WeakMap();
export function createReactiveObject(target,isReadonly,baseHandler){
    // 如果目标不是对象，没法拦截，reactive 这个 API 只能拦截对象类型
    if(!isObject(target)){
        return target;
    }
    // 如果某个对象已经被代理过了，就不要再代理了，也可能一个对象被代理是深度的，又被仅读代理了
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target);
    if(existProxy){
        return existProxy;  // 如果已经被代理了，直接返回即可
    }
    // 如果没有被代理，则基于 Proxy 实现对象代理
    const proxy = new Proxy(target,baseHandler);
    proxyMap.set(target,proxy);  // 将要代理的对象，和对应代理结果缓存起来
    return proxy;
}
```
 在createReactiveObject中对目标进行简单判断，是否为对象、只读等，然后进行proxy代理。同时用WeakMap()把代理结果缓存起来，也通过proxyMap.get(target)获取缓存的对象，判断是否已经代理过。

### 拦截函数baseHandler.ts
baseHandler.ts中主要实现了拦截器的逻辑(getter、setter)

```javascript
import { isObject } from "@vue/shared";
import { reactive, readonly } from "./reactive";
​
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true)
​
const set = createSetter();
const shallowSet = createSetter(true);
​
/** createGetter 拦截获取功能
 * @param isReadonly 是不是仅读
 * @param shallow 是不是浅响应
 */
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        // 后续Object上的方法会被迁移到 Reflect上
        // 以前target[key] = value 方式设置值可能会失败，不会报异常，也没有返回标识
        // Reflect 方法是具备返回值的
        const res = Reflect.get(target, key, receiver); // target[key]
​
        if (!isReadonly) { // 如果是仅读的无需收集依赖，等数据变化后更新对应视图
            console.log('依赖收集')
        }
​
        if (shallow) { // 浅无需返回代理
            return res
        }
​
        if (isObject(res)) { // 取值时递归代理 vue2 是直接递归，vue3是取值时才代理，所以vue3的代理模式是懒代理
            return isReadonly ? readonly(res) : reactive(res)
        }
        return res;
    }
}
​
function createSetter(shallow = false) {     // 拦截设置功能
    return function set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        return result;
    }
}
​
export const mutableHandlers = {
    get,
    set
};
export const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true;
    }
};
export const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
export const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true;
    }
};
```

只要用proxy代理的对象之后，对象的值的方法和触发都会进入get或者set方法中，那么就会触发我们的依赖收集和触发更新，依赖收集和触发更新也可以独立作为effect副作用函数，详细解析请另看effect依赖收集原理

### 下面是精简版响应式

精简vue3实现响应式
```javascript
let targetMap = new WeakMap()
let effectStack = [] //存储 effect 副作用

// 拦截的 get set
const baseHandler = {
  get (target, key) {
    const ret = target[key]// Reflect.get(target, key)

    // 收集依赖 到全局map targetMap
    track(target, key)

    return ret // 如果有递归  typeof ret === 'object' ? reactive(ret): ret;
  },
  set (target, key, value) {
    // 获取 新老值
    const info = { oldValue: target[key], newValue: value }

    target[key] = value // Reflect.set(target, key, value)

    // 拿到收集的 effect ，并执行
    trigger(target, key, info)
  }
}

function reactive (target) {
  const observed = new Proxy(target, baseHandler)
  return observed
}


// 收集依赖
function track (target, key) {
  //初始化
  const effect = effectStack[effectStack.length - 1]

  if (effect) {
    // 初始化
    let depsMap = targetMap.get(target)
    if (depsMap === undefined) {
      depsMap = new Map()
      targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (dep === undefined) {
      dep = new Set() // 防止 重复
      depsMap.set(key, dep)
    }

    // 收集
    if (!dep.has(effect)) {
      dep.add(effect) // 把effect 放到dep 里面 封存
      effect.deps.push(dep) // 双向缓存
    }
  }
}

// 触发依赖
function trigger (target, key, info) {
  let depsMap = targetMap.get(target)
  // 如果没有副作用
  if (depsMap === undefined) {
    return
  }

  const effects = new Set()

  const computeds = new Set() // 一个特殊的effect  懒执行

  // 存储
  if (key) {
    let deps = depsMap.get(key)
    // 可能有多个副作用 effect
    deps.forEach(effect => {
      // 如果有计算 属性
      if (effect.computed) {
        computeds.add(effect)
      } else {
        effects.add(effect)
      }
    })
  }

  //  执行
  effects.forEach(effect => effect())
  computeds.forEach(computed => computed())
}


function computed (fn) {
  const runner = effect(fn, { computed: true, lazy: true }) // 懒执行，开始的时候不用初始执行
  
  return {
    effect: runner,
    get value () {
      return runner()
    }
  }
}

function effect (fn, options = {}) {
  let e = createReactiveEffect(fn, options)
  // 不是懒执行 那么初始化就执行一次
  if (!options.lazy) {
    e()
  }
  return e
}

function createReactiveEffect (fn, options) {
  const effect = function effect(...args){
    return run(effect, fn, args)
  }

  // 函数上挂载 属性
  effect.deps = []
  effect.computed = options.computed
  effect.lazy = options.lazy

  return effect
}

// 真正执行  调度
function run(effect, fn, args){
  //  不存在
  if(effectStack.indexOf(effect) === -1){
    try{
      //  把副作用 存储到 effectStack 中
      effectStack.push(effect)
      return fn(...args)
    }finally{
      //  最后 把执行后的副作用  pop掉
      effectStack.pop()
    }    
  }
}


module.exports = {effect , reactive, computed}

computed 不会一上来就执行 副作用 ，要等到 调用获取返回值的时候才会执行

const {effect , reactive, computed} = require('./core/reactivity4/index.js')

let a = reactive({ value: 2 })
let b;

// 不会执行副作用  只有等 访问的时候 执行track 和trigger
const comp = computed(() => a.value * 100)
// const c = a.value *2
// const comp = { value: a.value * 100 }

// 执行副作用  就会触发 track 访问 收集依赖， 改变的时候 就会触发依赖
effect(() => {
  b = a.value + 10
  console.log('b', b);
  console.log('comp', comp.value);
})


// console.log('comp1', comp.value); // 200
// console.log('c', c); // 4
a.value = 20
// console.log('comp1', comp.value); // 2000
// console.log('c', c); // 4

```