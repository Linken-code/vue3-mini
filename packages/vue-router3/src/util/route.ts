export const createRoute = (record, location, redirect = {}, router = {}) => {
	const route = {
		name: record.name || (record && record.name),
		path: location.path || '/',
		meta: (record && record.meta) || {},
		hash: location.hash || '',
		query: {},
		params: location.params || {},
		match: record ? formatMatch(record) : []
	}
	return Object.freeze(route)
}
export const START = createRoute(null, { path: '/' })

const formatMatch = (record) => {
	const res = []
	while (record) {
		res.unshift(record)
		record = record.parent
	}
	return res
}