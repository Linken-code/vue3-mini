## 依赖收集实现原理

### 依赖收集
 - effect：只有在effect函数中的响应式属性才会被收集依赖
 - track：track函数会让当前属性收集effect
 - trigger：找到属性对应的effect，并执行

 ### effect副作用函数
 vue包虽然是所有模块的整合，但是在vue中我们是拿不到effect这个方法的。也就是说，reactivity中虽然有effect方法，但是它并没有暴露给vue，所以我们只能通过响应式reactivity拿到effect函数

 ### effect函数存在的问题
 问题 1：函数栈执行存在的问题
 ```javascript
 const state =reactive({name:'zf',age:12,address:'回龙观'})
effect(()=>{ // effect1      
    console.log(state.name); // 收集effect1          
    effect(()=>{ // effect2 
        console.log(state.age); // 收集effect2
    });
    console.log(state.address); // 收集effect2  期望收集effect1
})
 ```
 问题 2：防止重复收集
```javascript
 effect(()=>{
    state.age++
})
 ```

 ### 实现effect函数
 ```javascript
 export function effect(fn, options: any = {}) {
    // 创建响应式effect
    const effect = createReactiveEffect(fn, options);
    // 默认会让effect先执行一次
    if (!options.lazy) {
        effect();
    }
    return effect
}
​
let uid = 0;
let activeEffect;   // 存储当前的effect
const effectStack = []; // 问题 1
function createReactiveEffect(fn,options){
    const effect = function reactiveEffect(){
        if(!effectStack.includes(effect)){  // 问题 2 保证effect没有加入 effectStack 中 
            try{
                effectStack.push(effect);
                activeEffect = effect;
                return fn(); // 函数执行时会取值，会执行get方法
            }finally{
                effectStack.pop()
                activeEffect = effectStack[effectStack.length -1];
            }
        }
    }
    effect.id = uid++;        // 制作一个effect标识，用于区分effect
    effect._isEffect = true;  // 用于标识这个响应式effect
    effect.raw = fn;          // 保留effect对应的原函数
    effect.options = options; // 在effect上保存用户的属性
​
    return effect;
}
```

### track依赖收集
operators.ts
operators.ts的主要作用是提供TrackOpTypes和TriggerOpTypes两个枚举类型，供其他模块使用
 ```javascript
// reactivity/src/operators.ts
export const enum TrackOptypes {
    GET
}
export const enum TriggerOrTypes {
    ADD,
    SET
}
 ```
### track函数的实现

track 让某个对象中的属性，收集当前它对应的 effect 函数
```javascript
// reactivity/src/effect.ts
const targetMap = new WeakMap();
// track 让某个对象中的属性，收集当前它对应的 effect 函数
export function track(target,type,key){ // 可以拿到当前的effect
    // activeEffect : 当前正在运行的effect
    if(activeEffect === undefined){ // 此属性不用被收集依赖，因为没有在effect中使用
        return;
    }
    let depsMap = targetMap.get(target);
    if(!depsMap){
        targetMap.set(target,(depsMap = new Map));
    }
    let dep = depsMap.get(key);
    if(!dep){
        depsMap.set(key,(dep = new Set));
    }
    if(!dep.has(activeEffect)){
        dep.add(activeEffect);
    }
}
```
在getter中收集依赖
```javascript
// reactivity/src/baseHandler.ts
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        // ...
        if (!isReadonly) { // effect函数执行时，进行取值操作，让属性记住对应的effect函数
            track(target, TrackOpTypes.GET, key);
        }
    }
}
```
### trigger 触发更新
trigger 找属性对应的 effect 让其执行 （数组，对象）
```javascript
export function trigger(target,type,key?,newValue?,oldValue?){
    
    // 如果这个属性，没有收集过effect，那不需要做任何操作
    const depsMap = targetMap.get(target);
    if(!depsMap) return;
​
    // 需要将所有要执行的 effect 全部存到一个新的集合中，最终一起执行
    const effects = new Set();  // 这里对 effect 去重了
    const add = (effectToAdd) =>{
        if(effectToAdd){
            effectToAdd.forEach(effect => effects.add(effect))
        }
    }
​
    // 1.看修改的是不是，数组的长度，因为改数组的长度影响比较大
    if(key === 'length' && isArray(target)){
        // 如果对应的长度有依赖收集，则更新
        depsMap.forEach((dep,key) => {
            if(key === 'length' || key > newValue){ // 如果更改的长度小于收集的索引，那么这个索引也需要触发effect重新执行
                add(dep)
            }
        });
    }else{
        // 可能是对象
        if(key !== undefined){  // 这里是修改，不是新增
            add(depsMap.get(key));  // 如果是新增
        }
        // 如果修改数组中的某一个索引怎么办
        switch(type){   // 如果添加了一个索引，就触发长度的更新
            case TriggerOrTypes.ADD:
                if(isArray(target) && isIntegerKey(key)){
                    add(depsMap.get('length'));
                }
        }
​
    }
    effects.forEach((effect:any)=>{
        if(effect.options.scheduler){
            effect.options.scheduler(effect);
        }else{
            effect()
        }
    })
}
​
// {name:'lucky', age:22}  name => [effect,effect]
// weakMap key => {name:'lucky', age:22} value (map) => {name => Set, age => Set}
```