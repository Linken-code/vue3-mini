## 实现computed
在文档中关于 computed api 是这样介绍的：接受一个 getter 函数，并以 getter 函数的返回值返回一个不可变的响应式 ref 对象。或者它也可以使用具有 get 和 set 函数的对象来创建一个可写的 ref 对象。

### 1.computed 函数
根据这个 api 的描述，显而易见的能够知道 computed 接受一个函数或是对象类型的参数，所以我们先从它的函数签名看起。
```javascript
export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
export function computed<T>(
  options: WritableComputedOptions<T>
): WritableComputedRef<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
)

```
在 computed 函数的重载中，代码第一行接收 getter 类型的参数，并返回 ComputedRef 类型的函数签名是文档中描述的第一种情况，接受 getter 函数，并以 getter 函数的返回值返回一个不可变的响应式 ref 对象。

而在第二行代码中，computed 函数接受一个 options 对象，并返回一个可写的 ComputedRef 类型，是文档的第二种情况，创建一个可写的 ref 对象。

第三行代码，则是这个函数重载的最宽泛情况，参数名已经提现了这一点：getterOrOptions。

一起看一下 computed api 中相关的类型定义：
```javascript
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

```

从类型定义中得知：WritableComputedRef 以及 ComputedRef 都是扩展自 Ref 类型的，这也就理解了文档中为什么说 computed 返回的是一个 ref 类型的响应式对象。

接下来看一下 computed api 的函数体内的完整逻辑：
```javascript
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

```

在 computed api 中，首先会判断传入的参数是一个 getter 函数还是 options 对象，如果是函数的话则这个函数只能是 getter 函数无疑，此时将 getter 赋值，并且在 DEV 环境中访问 setter 不会成功，同时会报出警告。如果传入是不是函数，computed 就会将它作为一个带有 get、set 属性的对象处理，将对象中的 get、set 赋值给对应的 getter、setter。最后在处理完成后，会返回一个 ComputedRefImpl 类的实例对象，computed api 就处理完成。

### 2.ComputedRefImpl 类
这个类与我们之前介绍的 RefImpl Class 类似，但构造函数中的逻辑有点区别。

先看类中的成员变量：
```javascript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true

  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean
}
```
跟 RefImpl 类相比，增加了 _dirty 私有成员变量，一个 effect 的只读副作用函数变量，以及增加了一个 __v_isReadonly 标记。

接着看一下构造函数中的逻辑：
```javascript
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
```

构造函数中，会为 getter 创建一个副作用函数，并且在副作用选项中设置为延迟执行，并且增加了调度器。在调度器中会判断 this._dirty 标记是否为 false，如果是的话，将 this._dirty 置为 true，并且利用 trigger 派发更新。
```javascript
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
```
在 computed 中，通过 getter 函数获取值时，会先执行副作用函数，并将副作用函数的返回值赋值给 _value，并将 _dirty 的值赋值给 false，这就可以保证如果 computed 中的依赖没有发生变化，则副作用函数不会再次执行，那么在 getter 时获取到的 _dirty 始终是 false，也不需要再次执行副作用函数，节约开销。之后通过 track 收集依赖，并返回 _value 的值。

而在 setter 中，只是执行我们传入的 setter 逻辑，至此 computed api 的实现也已经讲解完毕了。

### 下面是精简版computed
```javascript
// packages/reactivity/computed.ts
import { effect, track, trigger } from './effect';
import { isFunction } from '@vue/shared';
class ComputedRefImpl {
    private _value;
    private _dirty = true; // 默认是脏值，不要用缓存的值
    public readonly effect;
    public readonly __v_isRef = true;
    constructor(getter, private readonly _setter) {
        this.effect = effect(getter, {
            lazy: true, // 计算属性特性，默认不执行
            scheduler: () => {
                if (!this._dirty) { // 依赖属性变化时
                    this._dirty = true; // 标记为脏值，触发视图更新
                    trigger(this, 'set', 'value');
                }
            }
        })
    }
    get value() {    // 计算属性也要收集依赖 计算属性本身就是一个effect
        if (this._dirty) {
            // 取值时执行effect
            this._value = this.effect();
            this._dirty = false;
        }
        track(this,  TrackOpTypes.GET ,'value'); // 进行属性依赖收集
        return this._value
    }
    set value(newValue) {
        this._setter(newValue);
    }
}
​
// vue2 和 vue3 的computed原理是不一样的
export function computed(getterOrOptions) {
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) { // computed两种写法
        getter = getterOrOptions;
        setter = () => {
            console.warn('computed value is readonly')
        }
    } else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter)
}
```