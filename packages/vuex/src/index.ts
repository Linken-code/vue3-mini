import { Store } from './store'

import { inject } from 'vue'

export const createStore = () => {
	return new Store()
}

export const useStore = (key = null) => {
	return inject(key || 'store')
}