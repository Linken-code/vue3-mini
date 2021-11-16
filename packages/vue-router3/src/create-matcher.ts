
import { createRouteMap } from './create-route-map';
import { normalizeLocation } from './util/location';
import { createRoute } from './util/route';
export const createMatcher = (routes, router) => {

	const { nameMap, pathMap, pathList } = createRouteMap(routes);

	const match = (raw, currentRoute, redirect) => {
		const location = normalizeLocation()
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
	}

	const addRoutes = () => {

	}

	const _createRoute = (record, location, redirect) => {
		return createRoute(record, location, redirect, router)
	}
	return {
		match, addRoutes
	}
}

const matchRoute = (regex, path, params) => {
	return true
}

