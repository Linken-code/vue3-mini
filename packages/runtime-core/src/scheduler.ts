const queue = []
let isFlushing = false
let currentFlushPromise = null
const queueFlush = () => {
	if (!isFlushing) {
		isFlushing = true;
		currentFlushPromise = Promise.resolve().then(() => {
			try {
				for (let i = 0; i < queue.length; i++) {
					const job = queue[i];
					job()
				}
			} finally {
				isFlushing = false;
				queue.length = 0
				currentFlushPromise = null;
			}
		})
	}
}

export const queueJob = (job) => {
	if (!queue.length || queue.includes(job)) {
		queue.push(job);
		queueFlush()
	}
}

export const nextTick = (fn) => {
	const p = currentFlushPromise || Promise.resolve()
	return fn ? p.then(fn) : p
}