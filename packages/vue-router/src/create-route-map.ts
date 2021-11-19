import { pathToRegexp } from 'path-to-regexp'

export const createRouteMap = (routes) => {

	const nameMap = []

	const pathMap = Object.create(null)

	const pathList = Object.create(null)

	routes.forEach((route) => {
		addRouteRecord(pathList, pathMap, nameMap, route)
	})

	return { nameMap, pathMap, pathList }

}

const addRouteRecord = (pathList, pathMap, nameMap, route, parent = {}, matchAs = undefined) => {
	const { path, name } = route
	const normalizePaths = normalizePath(path, parent)
	const pathToRegexOptions = {}
	const record = {
		path: normalizePaths,
		parent,
		regex: compileRouteRegex(normalizePaths, pathToRegexOptions),
		components: route.components || { default: route.component },
	}

	if (route.children) {
		route.children.forEach((child) => {
			const childMatchAs = matchAs ? `${matchAs}/${child.path}` : undefined
			addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
		})
	}
	if (!pathMap[record.path]) {
		pathList.push(record.path)
		pathMap[record.path] = record
	}
}

const normalizePath = (path, parent) => {
	if (parent === null) return path
	return `${parent.path}/${path}`
}

const compileRouteRegex = (path: string, pathToRegexOptions) => {
	const regex = pathToRegexp(path, [], pathToRegexOptions)
	return regex
}