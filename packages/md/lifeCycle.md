## 生命周期实现原理

### 生命周期类型
```javascript
// runtime-core/component.ts
export const enum LifecycleHooks {
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm',
    BEFORE_UPDATE = 'bu',
    UPDATED = 'u',
    // ...
}
```
### createHook & injectHook
```javascript
import { currentInstance, LifecycleHooks, setCurrentInstance } from "./component"
export function injectHook(type, hook, target) {    // 通过闭包保存了当前实例
    if (target) {
        const hooks = target[type] || (target[type] = []); // 将生命周期保存在实例上
        const wrappedHook = () =>{
            setCurrentInstance(target); // 当生命周期调用时 保证currentInstance是正确的
            hook.call(target); 
            setCurrentInstance(null);
        }
        hooks.push(wrappedHook);
    }
}
​
export const createHook = (lifecycle) => (hook, target = currentInstance) => {  // target用来表示他是哪个实例的钩子
    injectHook(lifecycle, hook, target) // 给当前实例 增加 对应的生命周期 即可
}
​
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
```

### 生命周期调用

### invokeArrayFns调用钩子
```javascript
// shared.ts 
export const invokeArrayFns = (fns, arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
```
### 挂载和更新时调用钩子
```javascript
instance.update = effect(function componentEffect() {
    if (!instance.isMounted) {
​
        const {bm, m , parent} = instance;
​
        if(bm){ // beforeMount
            invokeArrayFns(bm);
        }
​
        const proxyToUse = instance.proxy;
        const subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse));
        patch(null, subTree, container);
        initialVNode.el = subTree.el; // 组件的el和子树的el是同一个
        instance.isMounted = true; // 组件已经挂载完毕
​
        if(m){ // mounted
            queuePostFlushCb(m) // 不能直接 invokeArrayFns(m);
        }
    } else {
        const prevTree = instance.subTree;
        const proxyToUse = instance.proxy;
​
        const {bu,u} = instance;
​
        if(bu){ // beforeUpdate
            invokeArrayFns(bu);
        }
​
        const nextTree = instance.render.call(proxyToUse, proxyToUse); 
​
        if(u){ // updated
            queuePostFlushCb(u);    // 不能直接 invokeArrayFns(u);
        }
        instance.subTree = nextTree
​
        patch(prevTree, nextTree, container);
    }
}, {
    scheduler: queueJob
})
```

### 在渲染完成后执行钩子
组件挂载和更新是异步的，直接调用invokeArrayFns的结果不准确，所以对于mounted、updated操作要特殊处理

```javascript
export function queuePostFlushCb(cb) { //  cb 可能是一个数组
    queueCb(cb, pendingPostFlushCbs)
}
function queueCb(cb, pendingQueue) {
    if(!isArray(cb)){
        pendingQueue.push(cb);
    }else{
        pendingQueue.push(...cb);
    }
    queueFlush();
}
```