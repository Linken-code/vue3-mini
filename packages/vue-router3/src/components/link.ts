export default {
	name: 'RouterLink',
	props: {
		to: {
			type: String,
			required: true
		},
		tag: {
			type: String,
			default: 'a'
		}
	},
	render(h) {
		const classes = {}
		const data = { class: classes, attrs: {} }
		const href = '#' + this.to
		if (this.tag === 'a') {
			data.attrs = { href }
		}

		return h('a', data, this.$slots.default);
	}
}