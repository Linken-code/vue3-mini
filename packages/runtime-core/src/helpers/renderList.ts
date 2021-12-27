import { isNumber, isString, isArray, isObject } from '@vue/shared'
export const renderList = (source, renderItem) => {
  const nodes = []

  if (isNumber(source)) {
    for (let i = 0; i < source; i++) {
      nodes.push(renderItem(i + 1, i))
    }
  } else if (isArray(source) || isString(source)) {
    for (let i = 0; i < source.length; i++) {
      nodes.push(renderItem(source[i], i))
    }
  } else if (isObject(source)) {
    const keys = Object.keys(source)
    keys.forEach((key, index) => {
      nodes.push(renderItem(source[key], key, index))
    })
  }
  return nodes
}
