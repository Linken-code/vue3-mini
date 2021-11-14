# 初始化流程原理
## createApp的首次渲染

### 1.createApp入口
在 vue3 中，是通过createApp的方式进行创建新的 Vue 实例，所以我们可以直接顺着createApp往下看。
```javascript
// 从 createApp 开始
// vue3.0 中初始化应用
import { createApp } from 'vue'

const app = {
  template: '<div>hello world</div>'
}

const App = createApp(app)
// 把 app 组件挂载到 id 为 app 的 DOM 节点上
App.mount('#app')
```

#### createApp的渲染流程

用户调用的createApp函数就在这里被声明，用户调用的是 runtime-dom ，内部再调用 runtime-core，runtime-dom 是用来解决平台差异（浏览器）

新建 runtime-dom/src/index.ts文件
```javascript
// runtime-dom 操作节点、操作属性更新
import { createRenderer } from "@vue/runtime-core/src/index";
import { extend } from "@vue/shared/src";
import { nodeOps } from "./nodeOps";        // 对象
import { patchProp } from "./patchProp";    // 方法
​
// 渲染时用到的所有方法
const rendererOptions = extend({patchProp},nodeOps);
​
// vue中 runtime-core 提供了核心的方法，用来处理渲染的，他会使用runtime-dom 中的 api 进行渲染
export function createApp(rootComponent,rootProps = null){
    const app = createRenderer(rendererOptions).createApp(rootComponent,rootProps)
    let { mount } = app
    app.mount = function (container){
        // 清空容器
        container = document.querySelector(container);
        container.innerHTML = '';
        mount(container);   //函数劫持
        // 将组件渲染成DOM元素，进行挂载
    }
    return app;
}
​
// export * from '@vue/runtime-core' // 后续将 runtime-core 中的方法都在这里暴露
```

### 创建 app 对象
createApp的内部比较清晰，先是创建了 app 对象，之后是改写了 mount 方法， 最后返回了这个 app 实例。在这里可以发现，真正的 createApp 方法是在渲染器createRenderer属性上的。 在 vue3 中使用 monorepo 的方式对很多模块做了细粒度的包拆分，比如核心的响应式部分放在了 packages/reactivity 中，创建渲染器的 createRenderer 方法放在了 packages/runtime-core 中。 所以如果没有调用 createApp 这个方法，也就不会调用 createRenderer 方法，那么当前的 runtime-dom 这个包内是可以通过 tree shaking 去避免打包的时候把没有用到的 packages/runtime-core 也打进去。

原始createRenderer函数如下，在createRenderer函数中返回一个createApp()函数，通过柯里化最终返回了App实例
```javascript
// createRenderer 与平台无关所以定义在 runtime-core 中
function createRenderer(rendererOptions) {
    return {
        createApp(rootComponent, rootProps) { // 用户创建app的参数
            const app = {
                mount(container) { // 挂载的容器
                }
            }
            return app;
        }
    }
}
```

#### 完整createRenderer函数

新建runtime-core/src/renderer.ts文件

```javascript
import { createAppAPI } from "./apiCreateApp"
​
export function createRenderer(rendererOptions) { // 渲染时所到的api
    const render = (vnode,container) =>{ // 核心渲染方法
        // 将虚拟节点转化成真实节点插入到容器中
    }
    return {
        createApp:createAppAPI(render)
    }
}
```
这个 createAppAPI 才是我们最终在应用层时调用的。 首先他是返回了一个函数，这样做的好处是通过闭包把 render 方法保留下来供内部来使用。 最后他创建传入的 app 实例，然后返回，我们可以看到这里有一个 mount 方法，但是这个 mount 方法还不能使用，vue 会在之后对这个 mount 方法进行改写，之后才会进入真正的 mount。

新建runtime-core/src/apiCreateApp.ts文件

```javascript
// runtime-code/src/apiCreateApp.ts
import { createVNode } from "./vnode";
export function createAppAPI(render) {
  // 这里返回了一个函数，使用闭包可以在下面 mount 的使用调用 render 方法
  return function createApp(rootComponent, rootProps = null) {
    const context = createAppContext()
    let isMounted = false
    const app = {
      _component: rootComponent,// 组件
      _props: rootProps,// 属性
      _container: null,
      _context: context,
      mount (rootContainer) {
        if (!isMounted) {
          // 创建 root vnode
          const vnode = createVNode(rootComponent, rootProps)		
          // 缓存 context，首次挂载时设置
          vnode.appContext = context
          //执行render渲染vnode
					render(vnode,rootContainer);

          isMounted = true
          // 缓存 rootContainer
          app._container = rootContainer
          rootContainer.__vue_app__= app
          return vnode.component.proxy
        }
      }
      // ... 
    }
    return app
  }
}
```
mount 方法内部的流程也比较清晰，首先是创建 vnode，之后是渲染 vnode，并将其挂载到 rootContainer 上。

### 在runtime-dom/src/index.ts文件中重写 app.mount 方法, 进入真正的 mount

到这里进入改写 mount 方法的逻辑，这里的重写其实也是与平台相关的，在浏览器环境下，会先去获取正确的 DOM 容器节点，判断一切都合法之后，才会调用 mount 方法进入真正的渲染流程中。

```javascript
// 返回挂载的DOM节点
app.mount = (containerOrSelector) => {
  // 获取 DOM 容器节点
  const container = normalizeContainer(containerOrSelector)
  // 不是合法的 DOM 节点 return
  if (!container) return
  // 获取定义的 Vue app 对象, 之前的 rootComponent
  const component = app._component
  // 如果不是函数、没有 render 方法、没有 template 使用 DOM 元素内的 innerHTML 作为内容
  if (!isFunction(component) && !component.render && !component.template) {
    component.template = container.innerHTML
  }
  // clear content before mounting
  container.innerHTML = ''
  // 真正的挂载
  const proxy = mount(container)
  container.removeAttribute('v-cloak')
  container.setAttribute('data-v-app', '')
  // ...
  return proxy 
}
```
上面代码createApp就是咱们在创建应用时调用的方法

- ensureRenderer是一个单例模式的函数，会返回一个renderer，如果无renderer则会调用createRenderer进行获取renderer，获得了一个app实例；
- dev环境下注册一个方法：isNativeTag，挂载到app.config下面；
- 获取到实例的mount方法，并保存下来；
- 重写实例的mount方法；
- 1.调用normalizeContainer获取根元素容器；
- 2.判断template，获取需要渲染的模板；
- 3.把容器的innerHTML置空；
- 4.调用上面实例的mount方法；
- 5.删除v-cloak属性，添加data-v-app属性；
- 6.返回mount后的代理；
返回实例；
