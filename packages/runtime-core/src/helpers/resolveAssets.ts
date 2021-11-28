import { camelize, capitalize } from "@vue/shared/src"
let components

export const resolveComponent = (name: string) => {
	return (components &&
		(components[name] ||
			camelize(name) ||
			capitalize(camelize(name))))
}

