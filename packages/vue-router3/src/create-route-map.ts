export const createRouteMap = (routes) => {

	const nameMap = []

	const pathMap = Object.create(null)

	const pathList = Object.create(null)

	routes.forEach((route) => {
		addRouteRecord(nameMap, pathMap, pathList, route)
	})

	return { nameMap, pathMap, pathList }

}

const addRouteRecord = (nameMap, pathMap, pathList, route) => {
	const { path, name } = route

	const record = {
		path: path,
		components: route.components || { default: route.component }
	}

	if (!pathMap[record.path]) {
		pathList.push(record.path)
		pathMap[record.path] = record
	}
}