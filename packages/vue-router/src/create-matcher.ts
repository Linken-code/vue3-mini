
import { createRouteMap } from './create-route-map';
import { normalizeLocation } from './util/location';
import { createRoute } from './util/route';
export const createMatcher = (routes, router) => {

	const { nameMap, pathMap, pathList } = createRouteMap(routes);

	const match = (raw, currentRoute, redirect) => {
		const location = normalizeLocation(raw, current, append = false, router)
		const { name } = location

		if (name) {

		} else if (location.path) {
			location.params = {}
			for (let i = 0; i < pathList.length; i++) {
				const path = pathList[i]
				const record = pathMap[path]
				if (matchRoute(record.regex, location.path, location.params)) {
					return _createRoute(record, location, redirect)
				}
			}
		}
		return _createRoute(null, location)

	}

	const addRoutes = () => {

	}

	const _createRoute = (record, location, redirect = null) => {
		return createRoute(record, location, redirect, router)
	}
	return {
		match, addRoutes
	}
}

const matchRoute = (regex, path, params: Object): Boolean => {
	const m = path.match(regex)

	if (!m) {
		return false
	} else if (!params) {
		return true
	}

	for (let i = 1; i < m.length; i++) {
		const key = regex.keys[i - 1]
		const val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i]
		if (key) {
			params[key.name || 'patchMatch'] = val
		}
	}

	return true
}

