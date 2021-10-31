
####   实现ref
当我们有一个独立的原始值，例如一个字符串，我们想让它变成响应式的时候可以通过创建一个对象，将这个字符串以键值对的形式放入对象中，然后传递给 reactive。

而 Vue 为我们提供了一个更容易的方式，通过 ref 来完成。ref 会返回一个可变的响应式对象，该对象作为一个响应式的引用维护着它内部的值，这就是 ref 名称的来源。

该对象只包含一个名为 value 的 property。
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

函数体内直接返回了 createRef 函数的返回值。
```javascript
function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
```
createRef 的实现也很简单，入参为 rawValue 与 shallow，rawValue 记录的创建 ref 的原始值，而 shallow 则是表明是否为 shallowRef 的浅层响应式 api。

函数的逻辑为先使用 isRef 判断是否为 rawValue，如果是的话则直接返回这个 ref 对象。

否则返回一个新创建的 RefImpl 类的实例对象。

####  RefImp类
```javascript
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
```
在 RefImpl 类中，有一个私有变量 _value 用来存储 ref 的最新的值；公共的只读变量 __v_isRef 是用来标识该对象是一个 ref 响应式对象的标记与在讲述 reactive api 时的 ReactiveFlag 相同。

而在 RefImpl 的构造函数中，接受一个私有的 _rawValue 变量，存放 ref 的旧值；公共的 _shallow 变量是区分是否为浅层响应的。在构造函数内部，先判断 _shallow 是否为 true，如果是 shallowRef ，则直接将原始值赋值给 _value，否则会通过 convert 进行转换再赋值。

在 conver 函数的内部，其实就是判断传入的参数是否是一个对象，如果是一个对象则通过 reactive api 创建一个代理对象并返回，否则直接返回原参数。

当我们通过 ref.value 的形式读取该 ref 的值时，就会触发 value 的 getter 方法，在 getter 中会先通过 track 收集该 ref 对象的 value 的依赖，收集完毕后返回该 ref 的值。

当我们对 ref.value 进行修改时，又会触发 value 的 setter 方法，会将新旧 value 进行比较，如果值不同需要更新，则先更新新旧 value，之后通过 trigger 派发该 ref 对象的 value 属性的更新，让依赖该 ref 的副作用函数执行更新。

#### 实现computed
在文档中关于 computed api 是这样介绍的：接受一个 getter 函数，并以 getter 函数的返回值返回一个不可变的响应式 ref 对象。或者它也可以使用具有 get 和 set 函数的对象来创建一个可写的 ref 对象。
