/**
 * Get the shortcode content from a string if shortcode is present
 * 
 * @param {string} string - The string to parse
 * @returns {string} - The shortcode content
 * @example
 * getShortcodeContent('[shortcode foo="bar"]')
 * // => 'shortcode foo="bar"'
 */
export function getShortcodeContent(str) {
	const re = /\[([^\[\]]+)\]/i
	const match = str.match(re)
	return match ? match[1] : null
}

/**
 * Check if it is a specific closing tag from provided shortcode content (meaning without the brackets)
 * 
 * @param {string} string - The string to parse, shortcode content without the brackets
 * @param {string} tag - The shortcode tag to check
 * @returns {boolean} - True if it is a specific closing tag, false otherwise
 * @example
 * const shortcodeTagContent = getShortcodeContent('[/  shortcode ]')
 * isSpecificClosingTag(shortcodeTagContent, 'shortcode')
 * // => true
 */
export function isSpecificClosingTag(str, tag) {
	const re = new RegExp(`^\\/\\s*${tag}\\s*$`, 'i')
	return re.test(str)
}

/**
 * Get the shortcode name from shortcode content
 * 
 * @param {string} string - The string to parse, shortcode content without the brackets
 * @returns {string} - The shortcode name
 * @example
 * const testShortcodeTagContent = getShortcodeContent('[shortcode foo="bar"]')
 * getShortcodeName(testShortcodeTagContent)
 * // => 'shortcode'
 */
export function getShortcodeName(str) {
	const re = /^\s*([a-z_]{1}[a-z0-9\-_]*)\s*/i
	const match = str.match(re)
	return match ? match[1] : null
}
