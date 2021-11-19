export const createRoute = (record, location, redirect = null, router = null) => {
	const route = {
		name: record.name || (record && record.name),
		path: location.path || '/',
		meta: (record && record.meta) || {},
		hash: location.hash || '',
		query: Object,
		params: location.params || {},
		fullPath: getFullPath(location, stringifyQuery),
		matched: record ? formatMatch(record) : []
	}
	return Object.freeze(route)
}

const getFullPath = ({ path, query = {}, hash = "" }, stringifyQuery) => {
	const stringify = stringifyQuery || stringifyQuery
	return (path || '/') + stringify(query) + hash
}

const formatMatch = (record) => {
	const res = []
	while (record) {
		res.unshift(record)
		record = record.parent
	}
	return res
}

export const START = createRoute(null, { path: '/' })

export const iaSameRoute = (a, b) => {
	if (b === START) {
		return a === b
	} else if (!b) {
		return false
	} else if (a.path && b.path) {
		return (
			a.path.replace() === b.replace() &&
			a.hash === b.hash &&
			a.path == b.path
		)
	} else if (a.name && b.name) {
		return (
			a.name === b.name &&
			a.hash === b.hash
		)
	} else {
		return false
	}

}
