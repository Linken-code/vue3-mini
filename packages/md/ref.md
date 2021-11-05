## Ref实现原理

### reactive和ref的区别
- reactive和ref都是vue3中提供的响应式API，用于定义响应式数据的
- reactive通常用于定义对象数据类型，其本质是基于 Proxy 实现对象代理，所以reactive不能用于定义基本类型数据
- ref通常是用于定义基本数据类型，其本质是基于 Object.defineProperty() 重新定义属性的方式实现，vue3源码中是基于类的属性访问器实现(本质也是 defineProperty )

### 1.实现Ref和shallowRef
新建reactivity/src/ref.ts文件

定义ref的类型，在函数体内直接返回了 createRef 函数的返回值。
```javascript
export function ref<T extends object>(value: T): ToRef<T>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value)
}
```
从 ref api 的函数签名中，可以看到 ref 函数接收一个任意类型的值作为它的 value 参数，并返回一个 Ref 类型的值。

```javascript
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
  _shallow?: boolean
}
```
从返回值 Ref 的类型定义中看出，ref 的返回值中有一个 value 属性，以及有一个私有的 symbol key，还有一个标识是否为 shallowRef 的_shallow 布尔类型的属性。

createRef 的实现也很简单，入参为 rawValue 与 shallow，rawValue 记录的创建 ref 的原始值，而 shallow 则是表明是否为 shallowRef 的浅层响应式 api，否则返回一个新创建的 RefImpl 类的实例对象。

```javascript
function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
```

ref的本质是基于类的属性访问器实现的，可以将一个基本类型值进行包装

### RefImpl类
```javascript
// packages/reactivity/src/ref.ts
import { hasChanged, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { reactive } from "./reactive";
​
export function ref(value) { // value 是一个基本数据类型
    // 将 普通类型 变成一个 对象类型 
    return createRef(value);
}
​
export function shallowRef(value) { // shallowRef Api
    return createRef(value, true);
}
function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow)
}
​
const convert = (val) => isObject(val) ? reactive(val) : val; // 递归响应式
​
class RefImpl {
   private _value: T//私有变量

  public readonly __v_isRef = true; // 公共变量。产生的实例会被添加 __v_isRef 表示是一个 ref 属性

  constructor(private _rawValue: T, public readonly _shallow: boolean) {
    // 如果是 shallow 浅层响应，则直接将 _value 置为 _rawValue，否则通过 convert 处理 _rawValue
    this._value = _shallow ? _rawValue : convert(_rawValue)
  }
    // 类的属性访问器
    get value() { 
       // 读取 value 前，先通过 track 收集 value 依赖         
        track(toRaw(this), TrackOpTypes.GET, 'value')
         // 赋值到 _value 上
        return this._value;
    }
    set value(newVal) {
        if (hasChanged(toRaw(newVal), this._rawValue)) { // 判断新老值是否有变化
            this._rawValue = newVal; // 保存值
            this._value = this._shallow ? newVal : convert(newVal);
            // 通过 trigger 派发 value 更新
            trigger(this, TriggerOpTypes.SET, 'value', newVal);
        }
    }
}
```
在 RefImpl 类中，有一个私有变量 _value 用来存储 ref 的最新的值；公共的只读变量 __v_isRef 是用来标识该对象是一个 ref 响应式对象的标记与在讲述 reactive api 时的 ReactiveFlag 相同。

而在 RefImpl 的构造函数中，接受一个私有的 _rawValue 变量，存放 ref 的旧值；公共的 _shallow 变量是区分是否为浅层响应的。在构造函数内部，先判断 _shallow 是否为 true，如果是 shallowRef ，则直接将原始值赋值给 _value，否则会通过 convert 进行转换再赋值。

在 conver 函数的内部，其实就是判断传入的参数是否是一个对象，如果是一个对象则通过 reactive api 创建一个代理对象并返回，否则直接返回原参数。

当我们通过 ref.value 的形式读取该 ref 的值时，就会触发 value 的 getter 方法，在 getter 中会先通过 track 收集该 ref 对象的 value 的依赖，收集完毕后返回该 ref 的值。

当我们对 ref.value 进行修改时，又会触发 value 的 setter 方法，会将新旧 value 进行比较，如果值不同需要更新，则先更新新旧 value，之后通过 trigger 派发该 ref 对象的 value 属性的更新，让依赖该 ref 的副作用函数执行更新。

### 2.实现toRefs
将对象（数组）中的属性转换成ref属性，实现批量转化
```javascript
class ObjectRefImpl{
    public readonly __v_isRef = true
    constructor(private readonly _object, private readonly _key) {}
    get value(){
        return this._object[this._key]
    }
    set value(newVal){
        this._object[this._key] = newVal
    }
}
export function toRef(object,key){
    return new ObjectRefImpl(object,key);
}
export function toRefs(object) { // object可能是数组或对象
    const ret = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        ret[key] = toRef(object, key)
    }
    return ret;
}
```


