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