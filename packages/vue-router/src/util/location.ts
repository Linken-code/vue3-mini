import { resolvePath } from './path'

export const normalizeLocation = (raw, current, append, router) => {
	let next = typeof raw === 'string' ? { path: raw } : raw
	const parsedPath = next
	const basePath = (current && current.path) || '/'
	const path = parsedPath.path ? resolvePath(parsedPath.path, basePath, append || next.append) : basePath
	return { path }
}
