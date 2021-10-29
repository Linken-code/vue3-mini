//操作属性
import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchAttr } from './modules/attr'
import { patchEvent } from './modules/event'
export const patchProps = (el, key, preValue, nextValue) => {
	switch (key) {
		case 'class':
			patchClass(el, nextValue)
			break;
		case 'style':
			patchStyle(el, preValue, nextValue)
			break;
		default:
			//event事件
			if (/^on[^a-z]/.test(key)) {
				patchEvent(el, key, nextValue)
			} else {	//attr属性
				patchAttr(el, key, nextValue)
			}
			break;
	}
}