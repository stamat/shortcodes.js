
/**
 * Parse a string of attributes and return an object
 * 
 * @param {string} string - The string to parse
 * @returns {object} - The parsed attributes 
 * @example
 * parseAttributes('button text="Click me" data='{"key": \"value"}' class="btn btn-primary"')
 * // => { button: null, text: 'Click me', data: '{"key": "value"}', class: 'btn btn-primary' }
 */
export function parseAttributes(string) {
	const re = /\s*(?:([a-z_]{1}[a-z0-9\-_]*)=?(?:"([^"]+)"|'([^']+)')*)\s*/gi
	const reWithoutContent = /^\s*([a-z_]{1}[a-z0-9\-_]*)\s*$/i
	const reHasContent = /^\s*([a-z_]{1}[a-z0-9\-_]*)=("[^"]+"|'[^']+')\s*$/i
	const reReplaceFirstAndLastQuote = /^["']|["']$/g
	
	const res = {}

	let match = string.match(re)

	for (let i = 0; i < match.length; i++) {
		const m = match[i]
		if (m === '') continue

		if (reWithoutContent.test(m)) {
			const [, key] = m.match(reWithoutContent)
			res[key] = null
			reWithoutContent.lastIndex = 0
		} else if (reHasContent.test(m)) {
			const [, key, value] = m.match(reHasContent)
			res[key] = value.replace(reReplaceFirstAndLastQuote, '')
			reReplaceFirstAndLastQuote.lastIndex = 0
			reHasContent.lastIndex = 0
		}
	}

	return res
}
