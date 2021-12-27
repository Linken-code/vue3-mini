import { trackEffects, triggerEffects, isTracking } from './effect'
import { TrackOpType, TriggerTypes } from './operations'
import { hasChange, isArray, isObject, IsDEV } from '@vue/shared'
import { reactive, toRaw, isReactive } from './reactive'
import { createDep } from './dep'

const convert = target => {
  return isObject(target) ? reactive(target) : target
}
class RefImpl {
  private _value
  public dep = undefined
  // 每一个 ref 实例下都有一个__v_isRef 的只读属性，标识它是一个 ref
  public readonly __v_isRef = true

  constructor(public rawValue, public shallow = false) {
    // 判断是不是浅比较，如果不是就调convert，判断如果是对象就调用 reactive()
    this._value = shallow ? rawValue : convert(rawValue)
  }
  //getter
  get value() {
    //3.0收集依赖
    //Track(this, TrackOpType.GET, "value")
    // 3.2进行依赖收集
    trackRefValue(this)
    return this._value
  }

  //setter
  set value(newValue) {
    if (hasChange(newValue, this._value)) {
      // 值已更换，重新赋值
      this._value = this.shallow ? newValue : convert(newValue) //新值替换旧值
      this.rawValue = newValue
      //3.0
      //Trigger(this, TriggerTypes.SET, 'value', newValue)
      // 3.2派发更新
      triggerRefValue(this, newValue)
    }
  }
}

const trackRefValue = ref => {
  // 如果激活了 effect，就收集
  if (isTracking()) {
    ref = toRaw(ref)
    // 如果该属性没有没有收集过依赖函数，就创建一个 dep，用来存放依赖 effect
    if (!ref.dep) {
      ref.dep = createDep()
    }
    // 开发环境
    if (IsDEV) {
      trackEffects(ref.dep, {
        target: ref,
        type: TrackOpType.GET,
        key: 'value'
      })
    } else {
      // 调用本文上面的 trackEffects 收集依赖
      trackEffects(ref.dep)
    }
  }
}

const triggerRefValue = (ref, newValue: any) => {
  ref = toRaw(ref)
  if (ref.dep) {
    if (IsDEV) {
      triggerEffects(ref.dep, {
        target: ref,
        type: TriggerTypes.SET,
        key: 'value',
        newValue: newValue
      })
    } else {
      triggerEffects(ref.dep)
    }
  }
}

class ObjectRefImpl {
  public _v_isRef = true
  constructor(public target, public key) {}

  //getter
  get value() {
    return this.target[this.key]
  }

  //setter
  set value(newValue) {
    if (newValue) {
      this.target[this.key] = newValue
    }
  }
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}
//创建ref
const createRef = (target, shallow = false) => {
  return new RefImpl(target, shallow)
}

export function isRef(r: any) {
  return Boolean(r && r.__v_isRef === true)
}

export function unref<T>(ref): T {
  return isRef(ref) ? (ref.value as any) : ref
}

//Ref
export const ref = (target: any) => {
  return createRef(target)
}

export const shallowRef = (target: any) => {
  return createRef(target, true)
}

export const toRef = (target: any, key: any) => {
  return new ObjectRefImpl(target, key)
}

export const toRefs = (target: any) => {
  let arr = isArray(target) ? new Array(target.length) : {}
  for (let key in target) {
    arr[key] = toRef(target, key)
  }
  return arr
}

export function proxyRefs<T extends object>(objectWithRefs: T) {
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
