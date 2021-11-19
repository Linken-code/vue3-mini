export const resolvePath = (relative, basePath, append) => {
	const firstChar = relative.charAt(0)
	if (firstChar === '/') {
		return relative
	}

	return '/' + relative
}