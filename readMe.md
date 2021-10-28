建立vue-mini文件夹
初始化项目yarn init -y，之后会有package.json文件，里面有初始化的json配置信息
{
    "name": "vue3-mini",
    "version": "1.0.0",
    "author": "Linken",
    "main": "index.js",
    "license": "MIT",
    "private": true,
}
然后添加workspaces, 规定我们的代码都在 packages目录下
{
    "workspaces":[ //工作的目录
    "packages/*"
  ],
}
然后这次的例子我们创建 两个文件夹 分别为 reactivity 和shared 实现vue3的这两个功能 。并且进入这两个文件夹 分别 初始化 yarn init -y
接下来 我们 要修改 reactivity 和shared 文件夹下的 package.json文件；
比如 reactivity 的初始化 文件
{
  "name": "reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT"
}
我们要把name 修改一下,为了打包的时候告诉rollup 这个包叫什么。
所有 vue的包都用 @vue/ 开头
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT"
}
还需要一个入口 ，main是给commonjs服务端用的(require)。如果我们要用 es6(import)，需要增加一个入口 module,入口文件为 打包后的 dist文件夹下的reactivity.esm-bundler.js 文件
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "module": "dist/reactivity.esm-bundler.js",
  "license": "MIT"
}
配置一个自定义 配置属性 buildOptions
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "module": "dist/reactivity.esm-bundler.js",
  "license": "MIT",
  "buildOptions": {
    "name": "VueReactivity", //打包成 全局模块 的命名 类似于暴露的方法挂载到window.VueReactivity上
    "formats": [    // 当前模块可以构建成哪些模块
      "cjs",  // commonjs
      "esm-bundler", // es6 module
      "global" // 全局 模块
    ]
  }
}
buildOptions中 name 是为了给打包为全局模块的命名， 类似于暴露的方法挂载到window.VueReactivity上
formats 是 告诉rollup 我需要打包出多少种模块
其中
cjs-->commonjs
esm-bundler --> es6 module
global --> 全局
shared模块我们不需要打包为全局. 其实这里的name:VueShared 没有用到
安装依赖
yarn add 
typescript 
rollup 
rollup-plugin-typescript2 
@rollup/plugin-node-resolve 
@rollup/plugin-json 
execa -D -W

-D表示开发者模式 -W表示监听
安装成功之后。我们去根 package.json中配置脚本
{
  "private": true,
  "workspaces":[
    "packages/*"
  ],
  "scripts": {
    "dev": "node scripts/dev.js",
    "build": "node scripts/build.js"
  },
  "name": "rollup-vue3",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT"
}
当运行命令 yarn dev 时 我们去scripts运行 dev.js (打包单个模块)
yarn build 时我们去scripts运行 build.js（打包packages下所有模块）
编写 build.js文件
新建script脚本文件夹放置npm运行脚本，脚本文件为build.js、dev.js
build.js里面首先获取 packages下所有的目录，并且过滤只要文件夹，
写上
const fs = require('fs')

//  读取packages文件夹下所有文件， 并且过滤 
const targets = fs.readdirSync('packages').filter(f => fs.statSync(`packages/${f}`).isDirectory())

console.log('targets', targets)
然后对目标一次进行并行打包
/**
 * 对目标进行依次打包，并且是并行打包
 * */
// 打包
function build(){}

// 循环目标 依次打包
function runParaller(targets, iteratorFn){

}
// 执行 
runParaller(targets, build)
对runParallel 进行一次打包返回Promise。在build中console看一下
// 打包 packages 下所有包

const fs = require('fs')

//  读取packages文件夹下所有文件， 并且过滤 
const targets = fs.readdirSync('packages').filter(f => fs.statSync(`packages/${f}`).isDirectory())

/**
 * 对目标进行依次打包，并且是并行打包
 * */
// 打包
async function build(target){
  console.log('target', target);
}

// 循环目标 依次打包
function runParallel(targets, iteratorFn){
  const res = [] // 保存打包结果
  // 遍历
  for(const item of targets){
    // 依次执行
    const p = iteratorFn(item)
    res.push(p)
  }
  return Promise.all(res)
}
// 执行 
runParallel(targets, build)
我们依次拿到了需要的包；

然后引入 execa 包 开启子进程

由于rollup执行的配置文件为 rollup.config.js，所有我们创建一个rollup.config.js来配置rollup执行时候的参数

首先我们需要拿到 --environment传入的环境变量，我们先再rollup.config.js中console.log(process.env.TARGET) 一下，获取环境变量中的target属性 去获取 对应模块中的package.json
// rollup 配置

import path from 'path'

console.log('___________________', process.env.TARGET);
// 根据环境变量中 target 属性，获取对应模块中的 package.json
if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.')}

// 获取packages 目录
const packagesDir = path.resolve(__dirname, 'packages')

// 获取要打包的某个包 (打包的基本目录)
const packageDir = path.resolve(packagesDir, process.env.TARGET)

// 获取 对应打包目录 下的文件（这里用来取 package.json文件）
const resolve = p => path.resolve(packageDir, p)

// 获取package.json文件
const pkg = require(resolve(`package.json`))

// 获取 package.json文件中我们自定义的属性 buildOptions
const packageOptions = pkg.buildOptions || {}

// 获取我们 文件名
const name = packageOptions.filename || path.basename(packageDir)

之后我们需要 对打包类型 做一个映射表 ，根据package.json中的 formats 来格式化 需要打包的内容

//  对打包类型 做一个映射表 ，根据package.json中的 formats 来格式化 需要打包的内容
const outputConfigs = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`), // 打包后的文件 
    format: `es` // 采用的 格式
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife` // 立即执行函数
  }
}

好了， 有了映射表，我们来取package.json中 formats参数
// 获取 package.json中 formats
const defaultFormats = ['esm-bundler', 'cjs'] // 默认formats 配置
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',') // 环境变量中获取fromats配置
// 首先取 build.js中环境变量 formats 否则 到package.json中取  都没有取默认配置formats
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats

比如 reactivity中package.json中的 formats
formats:[
      "cjs", 
      "esm-bundler", 
      "global" 
    ]
然后我们 把formats 循环调用 createConfig函数处理
// 循环调用 createConfig 处理 formats (比如： formats=['cjs', 'esm-bundler', 'global'])
const packageConfigs = packageFormats.map(format => createConfig(format, outputConfigs[format]))


function createConfig(format, output) {

}

// 导出配置变量
export default packageConfigs
好，我们来处理createConfig 文件。
format比如就是global： 那么 output就是 映射表中的{ file: resolve(`dist/${name}.global.js`), format: `iife` // 立即执行函数 }

处理createConfig函数

function createConfig(format, output) {

  // 如果是全局模式  需要 配置名字
  const isGlobalBuild = /global/.test(format)
  if (isGlobalBuild) {
    output.name = packageOptions.name
  }
 
  // 生成sourcemap文件
  output.sourcemap = !!process.env.SOURCE_MAP

  // 生成roullup 配置
  return {
    input: resolve('src/index.ts'), // 入口
    output, //出口 就是上面的output
    plugins: [ // 插件  从上到下 
      json(), // import json from '@rollup/plugin-json'
      ts(), // import ts from 'rollup-plugin-typescript2'
      resolvePlugin(), //import resolvePlugin from '@rollup/plugin-node-resolve'
    ]
  }
}

对应 ts处理，我们需要一个 ts配置文件
来到根目录 运行 npx tsc --init 生成配置文件

生成 tsconfig.json 文件后，我们把默认配置项 target 和module 都改为 esnext (最新 JavaScript / ECMAScript 特性https://esnext.justjavac.com/)

然后 回到 createConfig 函数,修改 返回生成 rollup配置中的 ts()
function createConfig(format, output) {

  // 如果是全局模式  需要 配置名字
  const isGlobalBuild = /global/.test(format)
  if (isGlobalBuild) {
    output.name = packageOptions.name
  }

  // 生成sourcemap文件
  output.sourcemap = !!process.env.SOURCE_MAP

  // 生成roullup 配置
  return {
    input: resolve('src/index.ts'), // 入口
    output, //出口 就是上面的output
    plugins: [ // 插件  从上到下 
      json(), // import json from '@rollup/plugin-json'
      ts({ // import ts from 'rollup-plugin-typescript2'
        tsconfig: path.resolve(__dirname, 'tsconfig.json')
      }), 
      resolvePlugin(), //import resolvePlugin from '@rollup/plugin-node-resolve'
    ]
  }
}
继续 终端运行 命令 yarn build打包

打包成功。 由于shared没有配置golbal.所有 没有打包出global.js文件；
而且 reactivity.global.js中 全局变量也是我们 在package.json 的buildOptions总配置的
cjs.js 会采用commonjs的方法
esm-bundler.js 会采用es6的方法
接下来我们处理dev.js 打包单个 文件。而不是build.js打包所有。
首先我们安装 yarn add minimist -D -W 来处理我们运行 yarn dev 时 传递的参数
比如我们运行 yarn dev --test=123;
我们再dev.js中就可以 获取到 {test:123}

dev.js写上
const execa = require('execa')// 开启子进程 打包， 最终还是rollup来打包的

// 获取 yarn dev --target=xxx 比如 yarn dev --target=reactivity 可以 执行 reactivity打包
const args = require('minimist')(process.argv.slice(2))
const target = args.target

build(target)
/**
 * 对目标进行依次打包，并且是并行打包
 * */
// 打包
async function build(target) {
  // 第一参数 是命令
  // 第二个参数 是rollup 运行时的执行的参数  
  //          -c 采用配置文件 
  //          --environment 设置环境变量 
  //          `TARGET:${target}` 环境变量 里面设置的对象。在rollup 配置文件执行时，可以获取到
  //          SOURCE_MAP 是否生成 sourceMap文件
  // 第三个参数 execa 执行的参数  stdio: 'inherit' 子进程打包的信息 共享给父进程
  await execa('rollup', ['-c', '--environment', [`TARGET:${target}`, `SOURCE_MAP:ture`].join(',')], { stdio: 'inherit' })
}

可以看到此时，就单独完成了reactivity 的打包
我们还能去 dev.js中 一直监听文件打包 增加 -w
 await execa("rollup", ['-cw', '--environment', `TARGET:${target}`], { stdio: "inherit" }) //子进程的输出在父包中输出

现在打包好， 但是还有点问题。
我们 yarn install 在node_modules 下会生成一个 @vue 文件夹 下面的
reactivity 和 shared会生成一个软链接，链接到我们写的packages文件夹下的真实文件;

比如： 如果我们要在reactivit中 用 @vue下的shared文件，可以看到 '@vue/shared' 报错，找不到这个模块
我们需要到tsconfig.json中 增加配置
    // 解析规则为  node 
    "moduleResolution": "node",
    // 做一个映射表  依赖于 baseUrl配置
    "paths":{
      "@vue/*": [
        "packages/*/src"
      ]
    }, 
    // 基本目录
    "baseUrl": "./", 

    然后 把 reactivity/src/index.ts重新打开一下
    不报错了。我们 点击 安装command 鼠标左键点击 '@vue/shared' 也会跳转到 /packages/shared/src/index.ts 中


实现vue3的reactive
我们传入一个对象object, 在访问object.a的时候会触发get方法， 给object.a = 2 赋值的时候会触发 set方法  
vue2 Object.defineProperty与 vue3 proxy 对比

1、Object.defineProperty的第一个缺陷,无法监听数组变化（vue2改写了数组的七个方法 push,pop等）

2、bject.defineProperty的第二个缺陷,只能劫持对象的属性,因此我们需要对每个对象的每个属性进行遍历（深度遍历）

3、Proxy可以直接监听对象而非属性，并返回一个新对象

4、Proxy可以直接监听数组的变化

reactive 传入一个对象，在get、set的时候都要调用getDep获取当前的dep。（如果不存在就会调用 Dep类然后保存起来）
function reactive (raw) {
  return new Proxy(raw, {
    get (target, key) {
      console.log('触发get钩子', key);
      // key 对应一个 dep
      // dep  存储在 哪里  

      const dep = getDep(target, key)

      // dep 收集依赖
      dep.depend()

      // return target[key]  Object 的一些明显属于语言内部的方法移植到了 Reflect 对象上
      return Reflect.get(target, key)
    },
    set (target, key, value) {
      console.log('触发set钩子');
      // 触发依赖
      const dep = getDep(target, key)

      const result = Reflect.set(target, key, value)

      dep.notice();

      // 为什么要return 数组是需要返回值的
      return result
    }
  })
}
实现getDep方法
// 一个全局的Map保存 dep
const targetMap = new Map()

function getDep (target, key) {
  let depsMap = targetMap.get(target)

  // 如果不存在 target对象的Map那么保存起来
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)

  // 如果不存在 key对应的dep, 也保存起来
  if (!dep) {
    dep = new Dep()
    depsMap.set(key, dep)
  }
  // 方法dep
  return dep
}

我理解的是proxy 中 Reflect.get,Reflect.set在实现原来对象的方法的同时，dep.depend，dep.notice 也同时完成了自己想要的动态响应需求。
只要用proxy代理的对象之后，对象的值的方法和触发都会进入get或者set方法中，那么就会触发我们的依赖收集和触发

精简vue3实现响应式

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



ref
当我们有一个独立的原始值，例如一个字符串，我们想让它变成响应式的时候可以通过创建一个对象，将这个字符串以键值对的形式放入对象中，然后传递给 reactive。而 Vue 为我们提供了一个更容易的方式，通过 ref 来完成。ref 会返回一个可变的响应式对象，该对象作为一个响应式的引用维护着它内部的值，这就是 ref 名称的来源。该对象只包含一个名为 value 的 property。

export function ref<T extends object>(value: T): ToRef<T>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value)
}
从 ref api 的函数签名中，可以看到 ref 函数接收一个任意类型的值作为它的 value 参数，并返回一个 Ref 类型的值。
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
  _shallow?: boolean
}
从返回值 Ref 的类型定义中看出，ref 的返回值中有一个 value 属性，以及有一个私有的 symbol key，还有一个标识是否为 shallowRef 的_shallow 布尔类型的属性。

函数体内直接返回了 createRef 函数的返回值。
function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
createRef 的实现也很简单，入参为 rawValue 与 shallow，rawValue 记录的创建 ref 的原始值，而 shallow 则是表明是否为 shallowRef 的浅层响应式 api。
函数的逻辑为先使用 isRef 判断是否为 rawValue，如果是的话则直接返回这个 ref 对象。

否则返回一个新创建的 RefImpl 类的实例对象。

RefImp类
class RefImpl<T> {
  private _value: T

  public readonly __v_isRef = true

  constructor(private _rawValue: T, public readonly _shallow: boolean) {
    // 如果是 shallow 浅层响应，则直接将 _value 置为 _rawValue，否则通过 convert 处理 _rawValue
    this._value = _shallow ? _rawValue : convert(_rawValue)
  }

  get value() {
    // 读取 value 前，先通过 track 收集 value 依赖
    track(toRaw(this), TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newVal) {
    // 如果需要更新
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      // 更新 _rawValue 与 _value
      this._rawValue = newVal
      this._value = this._shallow ? newVal : convert(newVal)
      // 通过 trigger 派发 value 更新
      trigger(toRaw(this), TriggerOpTypes.SET, 'value', newVal)
    }
  }
}

在 RefImpl 类中，有一个私有变量 _value 用来存储 ref 的最新的值；公共的只读变量 __v_isRef 是用来标识该对象是一个 ref 响应式对象的标记与在讲述 reactive api 时的 ReactiveFlag 相同。

而在 RefImpl 的构造函数中，接受一个私有的 _rawValue 变量，存放 ref 的旧值；公共的 _shallow 变量是区分是否为浅层响应的。在构造函数内部，先判断 _shallow 是否为 true，如果是 shallowRef ，则直接将原始值赋值给 _value，否则会通过 convert 进行转换再赋值。

在 conver 函数的内部，其实就是判断传入的参数是否是一个对象，如果是一个对象则通过 reactive api 创建一个代理对象并返回，否则直接返回原参数。

当我们通过 ref.value 的形式读取该 ref 的值时，就会触发 value 的 getter 方法，在 getter 中会先通过 track 收集该 ref 对象的 value 的依赖，收集完毕后返回该 ref 的值。

当我们对 ref.value 进行修改时，又会触发 value 的 setter 方法，会将新旧 value 进行比较，如果值不同需要更新，则先更新新旧 value，之后通过 trigger 派发该 ref 对象的 value 属性的更新，让依赖该 ref 的副作用函数执行更新。

computed
在文档中关于 computed api 是这样介绍的：接受一个 getter 函数，并以 getter 函数的返回值返回一个不可变的响应式 ref 对象。或者它也可以使用具有 get 和 set 函数的对象来创建一个可写的 ref 对象。
computed 函数
根据这个 api 的描述，显而易见的能够知道 computed 接受一个函数或是对象类型的参数，所以我们先从它的函数签名看起。
export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
export function computed<T>(
  options: WritableComputedOptions<T>
): WritableComputedRef<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
)

在 computed 函数的重载中，代码第一行接收 getter 类型的参数，并返回 ComputedRef 类型的函数签名是文档中描述的第一种情况，接受 getter 函数，并以 getter 函数的返回值返回一个不可变的响应式 ref 对象。

而在第二行代码中，computed 函数接受一个 options 对象，并返回一个可写的 ComputedRef 类型，是文档的第二种情况，创建一个可写的 ref 对象。

第三行代码，则是这个函数重载的最宽泛情况，参数名已经提现了这一点：getterOrOptions。

一起看一下 computed api 中相关的类型定义：
export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T
}

export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}

export type ComputedGetter<T> = (ctx?: any) => T
export type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

从类型定义中得知：WritableComputedRef 以及 ComputedRef 都是扩展自 Ref 类型的，这也就理解了文档中为什么说 computed 返回的是一个 ref 类型的响应式对象。

接下来看一下 computed api 的函数体内的完整逻辑：
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  // 如果 参数 getterOrOptions 是一个函数
  if (isFunction(getterOrOptions)) {
    // 那么这个函数必然就是 getter，将函数赋值给 getter
    getter = getterOrOptions
    // 这种场景下如果在 DEV 环境下访问 setter 则报出警告
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    // 这个判断里，说明参数是一个 options，则取 get、set 赋值即可
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(
    getter,
    setter,
    isFunction(getterOrOptions) || !getterOrOptions.set
  ) as any
}
在 computed api 中，首先会判断传入的参数是一个 getter 函数还是 options 对象，如果是函数的话则这个函数只能是 getter 函数无疑，此时将 getter 赋值，并且在 DEV 环境中访问 setter 不会成功，同时会报出警告。如果传入是不是函数，computed 就会将它作为一个带有 get、set 属性的对象处理，将对象中的 get、set 赋值给对应的 getter、setter。最后在处理完成后，会返回一个 ComputedRefImpl 类的实例对象，computed api 就处理完成。

ComputedRefImpl 类
这个类与我们之前介绍的 RefImpl Class 类似，但构造函数中的逻辑有点区别。

先看类中的成员变量：
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true

  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean
}
跟 RefImpl 类相比，增加了 _dirty 私有成员变量，一个 effect 的只读副作用函数变量，以及增加了一个 __v_isReadonly 标记。

接着看一下构造函数中的逻辑：
constructor(
  getter: ComputedGetter<T>,
  private readonly _setter: ComputedSetter<T>,
  isReadonly: boolean
) {
  this.effect = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (!this._dirty) {
        this._dirty = true
        trigger(toRaw(this), TriggerOpTypes.SET, 'value')
      }
    }
  })

  this[ReactiveFlags.IS_READONLY] = isReadonly
}

构造函数中，会为 getter 创建一个副作用函数，并且在副作用选项中设置为延迟执行，并且增加了调度器。在调度器中会判断 this._dirty 标记是否为 false，如果是的话，将 this._dirty 置为 true，并且利用 trigger 派发更新。

get value() {
  // 这个 computed ref 有可能是被其他代理对象包裹的
  const self = toRaw(this)
  if (self._dirty) {
    // getter 时执行副作用函数，派发更新，这样能更新依赖的值
    self._value = this.effect()
    self._dirty = false
  }
  // 调用 track 收集依赖
  track(self, TrackOpTypes.GET, 'value')
  // 返回最新的值
  return self._value
}

set value(newValue: T) {
  // 执行 setter 函数
  this._setter(newValue)
}
在 computed 中，通过 getter 函数获取值时，会先执行副作用函数，并将副作用函数的返回值赋值给 _value，并将 _dirty 的值赋值给 false，这就可以保证如果 computed 中的依赖没有发生变化，则副作用函数不会再次执行，那么在 getter 时获取到的 _dirty 始终是 false，也不需要再次执行副作用函数，节约开销。之后通过 track 收集依赖，并返回 _value 的值。

而在 setter 中，只是执行我们传入的 setter 逻辑，至此 computed api 的实现也已经讲解完毕了。
