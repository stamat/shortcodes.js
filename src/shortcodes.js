import { clone, shallowMerge, remove, insertBeforeElement, propertyIsFunction, css, isEmptyElement, decodeHTML, query, isFunction, hasOwnProperties, isObject, propertyIsString, isArray, transformDashToCamelCase, matchesAll, isString } from 'book-of-spells'
import { getShortcodeContent, isSpecificClosingTag, getShortcodeName } from './lib/parsers'
import { Shortcode } from './lib/Shortcode'
import { detachElement } from 'book-of-spells/src/dom.mjs'

export class Shortcodes {
	constructor(options) {
		this.descriptor_index = {}
		this.exec_fns = {}
	
		this.shopify_img_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(_[0-9]+x[0-9]*)(\.[a-z]{3,4}.*)/gi
		this.shopify_img_replacer_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(\.[a-z]{3,4}.*)/gi
		
		this.options = {
			template_class: 'template',
			self_anchor_class: 'self-anchor',
			placement_class_prefix: 'shortcode-landing',
			detachElements: false,
		}
	
		if (options) {
			shallowMerge(this.options, options)
		}
	}

	/**
	 * Shopify image link image size changer
	 * 
	 * @param {string} src 
	 * @param {number} width 
	 * @returns string
	 */
	shopifyImageLink(src, width) {
		const pref = '$1'
		let suf = '$2'
		if (!width) width = 100
		this.shopify_img_replacer_re.lastIndex = 0
		let re = this.shopify_img_replacer_re

		if (!re.test(src)) return src

		if (this.shopify_img_re.test(src)) {
			suf = '$3'
			this.shopify_img_re.lastIndex = 0
			re = this.shopify_img_re
		}
		
		const replacement = `${pref}_${width}x${suf}`
		return src.replace(re, replacement)
	}

	/**
	 * Creates a self anchor element used for inserting shortcode in the DOM tree where it was found
	 * 
	 * @param {HTMLElement} elem - Element to insert the anchor before
	 * @param {string} custom_anchor_class - Custom class to add to the anchor if provided
	 * @param {string} shortcode_name - Name of the shortcode, adds the shortcode-{shortcode_name} class to the anchor if provided
	 * @param {number} counter - Counter of the shortcode, adds the sc{counter} class to the anchor if provided
	 */
	createSelfAnchor(elem, custom_anchor_class, shortcode_name, counter) {
		const self_anchor = document.createElement('div')
		const classes = []
		if (custom_anchor_class) classes.push(custom_anchor_class)
		if (shortcode_name) classes.push(`shortcode-${shortcode_name}`)
		if (counter) classes.push(`${shortcode_name}-sc-${counter}`)
		self_anchor.className = classes.join(' ')
		insertBeforeElement(elem, self_anchor)

		return self_anchor
	}

	/**
	 * Finds elements between the shortcodes makes a map of all shortcodes and their containing elements
	 * 
	 * @param {HTMLElement} elem - Entry element to parse and find shortcodes in
	 * @param {object} register - Object containing all registered shortcodes, used to check if the shortcode is registered
	 * @param {string} self_anchor_class - Class to add to the self anchor element
	 */
	iterateNode(elem, register, self_anchor_class) {
		const map = {}
		const children = elem.children
		let last_shortcode = null
		let shortcode_counter = 0
		const scheduleForDetachment = []
		const scheduleForRemoval = []

		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			let match = null
			
			// check all elements for shortcodes except "pre" elements
			if (!(child instanceof HTMLPreElement || child.querySelector('pre'))) { //only if it's not "pre" element
				const text = decodeHTML(child.textContent.trim())
				match = getShortcodeContent(text)
				// if the shortcode is not registered, treat it as a regular text
				if (match && !register.hasOwnProperty(getShortcodeName(match))) {
					match = null
				}
			}

			// when the shortcode tag is detected
			if (match) {
				// detect closing tag and remove it
				if (last_shortcode && isSpecificClosingTag(match, last_shortcode.name)) {
					last_shortcode = null
					scheduleForRemoval.push(child)
					continue
				}

				// TODO: we can check for a subtag here?

				last_shortcode = new Shortcode(match, clone(register[getShortcodeName(match)]), shortcode_counter)
				if (last_shortcode.descriptor.detachElements === undefined || last_shortcode.descriptor.detachElements === null) {
					last_shortcode.descriptor.detachElements = this.options.detachElements
				}
				const self_anchor = this.createSelfAnchor(child, self_anchor_class, last_shortcode.name, shortcode_counter)

				if (!map.hasOwnProperty(last_shortcode.uid)) {
					map[last_shortcode.uid] = last_shortcode
					shortcode_counter++
				}

				map[last_shortcode.uid].self_anchor = self_anchor
				child.remove() // safe to remove, since we have a self anchor that replaces the tag element, so the loop is not broken
				continue
			}
			
			if (last_shortcode && last_shortcode.uid) {
				let addResult = false

				// if the image is in the paragraph, we need to extract it... maybe? this is a hotfix! think about this!
				if (child.matches('p, div') && child.children.length && child.children.length === child.querySelectorAll('img').length) {
					child.querySelectorAll('img').forEach(img => {
						map[last_shortcode.uid].addContent(img)
					})
					addResult = true
				} else {
					addResult = map[last_shortcode.uid].addContent(child)
				}
				if (last_shortcode.descriptor.detachElements && addResult) scheduleForDetachment.push(child)
			}

			//TODO: Shortcode object, since it holds the descriptor, should be able to know if it gathered enough elements
		}
		
		for (let i = 0; i < scheduleForDetachment.length; i++) {
			detachElement(scheduleForDetachment[i])
		}

		for (let i = 0; i < scheduleForRemoval.length; i++) {
			scheduleForRemoval[i].remove()
		}

		return map
	}
}

//if this isn't a God function I don't know what is... Wait, I know, it's a piece of terrible nonrefactored code!
//FUCK ME.
Shortcodes.prototype.sortDOM = function(shortcode_obj) {
	const descriptor = shortcode_obj.descriptor
	const content = shortcode_obj.content
	
	const reSubtag = /^\s*\{\s*([a-z0-9\-_\s]+)\s*\}\s*$/gi //subtag attributes. I guess subtags are used for item ("slide") delimiters

	const item_tags = [] //collects attributes per "slide"
	const elements = {} //sorted DOM per tag name
	const other_than_rest = {}
	let other_than_rest_count = 0
	let first_element_key = null
	let last_element_key = null
	let max_element_key = null

	let cycle_counter = 0
	let subtag_first_flag = false

	//cycles are used for packaging the rest of elements in arrays
	function newCycle() {
		fillTheGaps()
		cycle_counter += 1
	}

	//rest has to be always present, it is a default collection of all undefined elements
	elements.rest = []

	const memo_block_template = {} //this will hold all the tag names from elements and remove the ones found, so we can generate empty states for the not found ones
	let memo_block = {}

	// fill the gaps in the memo block with nulls. This is needed for the repeater. If the repeater is not filled with elements, it will not be processed?
	function fillTheGaps() {
		for (const k in memo_block) {
			elements[k].push(null)
		}
		memo_block = newMemoBlock()
	}

	//clone temp memo_block
	// Memo block is used to check if all the elements are found. If not, the cycle is reset and the rest of the elements are packaged in arrays? (by copilot)
	function newMemoBlock() {
		res = {}
		for (const k in memo_block_template) {
			res[k] = true
		}
		return res
	}

	//extract other than rest
	if (descriptor.hasOwnProperty('elements')) {
		for (const k in descriptor.elements) {
			if (k !== 'rest') {
				last_element_key = k
				if (!elements.hasOwnProperty(k)) elements[k] = []

				if (first_element_key === null) first_element_key = k

				if (!other_than_rest.hasOwnProperty(k)) {
					other_than_rest[k] = true
					other_than_rest_count++
				}
			}

			memo_block_template[k] = true
			memo_block[k] = true
		}
	}

	for (let i = 0; i < content.length; i++) {
		let item = content[i]

		//if the contents are empty, with exclusion of images
		if (!item.matches('img') && !item.matches('hr') && isEmptyElement(item)) continue

		let green_flag = false // ⬇🇸🇦 if true, the iteration is over? (copilot said this not me) 

		//check for subtags - they are used as item ("slide") delimiters
		if (descriptor.hasOwnProperty('item_template')) {
			var text = item.textContent.trim()
			var match = reSubtag.exec(text)
			reSubtag.lastIndex = 0

			if (match && match.length > 1) {
				if (cycle_counter || subtag_first_flag) {
					newCycle()
				}

				item_tags[cycle_counter] = match[1]
				subtag_first_flag = true
				continue
			}
		}

		//iterating found elements, sort defined
		if (other_than_rest_count) {
			for (const k in other_than_rest) {

				if (elements[k].length === descriptor.elements[k].count) { //if the count of elements reatches set count skip iteration
					continue
				}

				//❗️XXX: this is a temporary and very bad solution | this was written to be able to use images inside the ul/li as secondary images //XXX: WHAT IS THE USE CASE???
				if (k === 'img' && item.querySelectorAll('li').length) {
					continue
				}

				const inner = item.querySelector(k) //gotta cover all the possible cases of undefined generated html

				if (item.matches(k) || inner) { //if element is found
					if (inner) item = inner

					// if an element is found that belongs to a memo block but it's already processed - this means a new cycle must begin
					// 👆🏻 WHAT THE FUCK?!?!?!
					if (descriptor.hasOwnProperty('item_template') && !memo_block.hasOwnProperty(k)) {
						newCycle()
					}

					elements[k].push(item)

					if (descriptor.hasOwnProperty('item_template')) {
						delete memo_block[k]
					}

					green_flag = true // ⬆🇸🇦 don't iterate the rest

					break
				}
			}
		}

		//iterating found elements, sort undefined = rest
		if (!green_flag) {
			//collecting other elements
			if (descriptor.hasOwnProperty('item_template')) { //if it is a repeater
				if (!elements.rest[cycle_counter]) {
					delete memo_block['rest']
					elements.rest[cycle_counter] = []
				}
				elements.rest[cycle_counter].push(item)
			} else {
				elements.rest.push(item)
			}
		}
	}

	if (descriptor.hasOwnProperty('item_template')) {
		fillTheGaps()
	}


	// calculate which element has the most entries = number of slides
	// this will be used as a slide delimiter later on
	let max_count = null

	for (const k in other_than_rest) {
		var c = elements[k].length

		if (max_element_key === null) {
			max_element_key = k
			max_count = c
		} else {
			if (c > max_count) {
				max_element_key = k
				max_count = c
			}
		}
	}

	return { elements: elements,
		item_tags: item_tags,
		first_element_key: first_element_key,
		last_element_key: last_element_key,
		max_element_key: max_element_key
	}
}

Shortcodes.prototype.constructElements = function(item, dest, props, shortcode_obj, num) {
	const descriptor = shortcode_obj.descriptor
	// Extract DOM attributes
	const extracted = props.extract ? shortcode_obj.elementExtract(item, props.extract) : null

	if (!extracted) return

	// TODO: this should be optional, if the option for shopify is set do this.
	if (matchesAll(item, 'img') && extracted.hasOwnProperty('src')) {
		if (this.shopify_img_re.test(extracted.src)) {
			extracted.src = extracted.src.replace(this.shopify_img_re, '$1$3')
		}
	}

	if (propertyIsFunction(props, 'parse_extracted')) {
		props.parse(extracted, item, dest, props, shortcode_obj, num)
	} else if (propertyIsString(props, 'parse_extracted') && propertyIsFunction(window, props.parse_extracted)) {
		window[props.parse_extracted](extracted, item, dest, props, shortcode_obj, num)
	}

	if (!props.hasOwnProperty('bind_extracted')) return
	if (!isArray(props.bind_extracted)) props.bind_extracted = [props.bind_extracted]

	if (props.hasOwnProperty('anchor_element')) {
		finalDestination = query(props.anchor, dest)
	} else {
		finalDestination = query(props.anchor, descriptor.anchor)
	}

	if (!finalDestination.length && matchesAll(dest, props.anchor)) finalDestination = dest
	if (!props.anchor) finalDestination = dest
	if (finalDestination instanceof Element) finalDestination = [finalDestination]

	for (let i = 0; i < finalDestination.length; i++) {
		this.bindElement(finalDestination[i], props.bind_extracted, extracted, props, shortcode_obj, num)
	}
}

Shortcodes.prototype.construct = function(shortcode_obj) {
	let template = null

	if (shortcode_obj.descriptor.hasOwnProperty('template')) {
		template = this.getTemplate(shortcode_obj.descriptor.template)
	}
	
	const sorted = this.sortDOM(shortcode_obj)

	if (shortcode_obj.descriptor.hasOwnProperty('anchor') && shortcode_obj.descriptor.anchor === 'self') {
		shortcode_obj.descriptor.anchor = shortcode_obj.self_anchor
	}

	if (shortcode_obj.descriptor.hasOwnProperty('item_template')) {
		for (let i = 0; i < sorted.elements[sorted.max_element_key].length; i++) {
			const item_template = this.getTemplate(shortcode_obj.descriptor.item_template)
			if (sorted.item_tags[i]) {
				item_template.classList.add(sorted.item_tags[i])
			}

			for (const k in shortcode_obj.descriptor.elements) {
				var props = shortcode_obj.descriptor.elements[k]
				if (sorted.elements[k][i]) { //if the element exists, may be an uneven number
					const item = sorted.elements[k][i]
					this.constructElements(item, item_template, props, shortcode_obj, i)
				}
			}

			const dest = shortcode_obj.descriptor.hasOwnProperty('template') ? template.querySelectorAll(shortcode_obj.descriptor.item_anchor) : document.querySelectorAll(descriptor.anchor)
			this.bindShortcode(item_template, dest, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj, i)
		}
	} else {
		if (shortcode_obj.descriptor.hasOwnProperty('elements')) {
			for (const k in shortcode_obj.descriptor.elements) {
				var props = shortcode_obj.descriptor.elements[k]

				if (sorted.elements.hasOwnProperty(k)) {
					for (let i = 0; i < sorted.elements[k].length; i++) {
						const item = sorted.elements[k][i]
						const dest = shortcode_obj.descriptor.hasOwnProperty('template') ? template : document.querySelectorAll(shortcode_obj.descriptor.anchor)
						this.constructElements(item, dest, props, shortcode_obj, i)
					}
				}
			}
		} else {
			const dest = shortcode_obj.descriptor.hasOwnProperty('template') ? template : document.querySelectorAll(shortcode_obj.descriptor.anchor)
			this.bindShortcode(sorted.elements.rest, dest, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj)
		}
	}

	if (shortcode_obj.descriptor.hasOwnProperty('template')) {
		this.bindShortcode(template, shortcode_obj.descriptor.anchor, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj)
		return template
	}

	return document.querySelector(shortcode_obj.descriptor.anchor)
}

Shortcodes.prototype.getTemplate = function(selector) {
	selector = [selector]
	if (this.options.template_class) {
		selector.push(`.${this.options.template_class}`)
	}
	const template = document.querySelector(selector.join('')).cloneNode(true)
	template.classList.remove(this.options.template_class)
	template.removeAttribute('hidden')
	template.removeAttribute('aria-hidden')

	return template
}

Shortcodes.prototype.register = function(shortcode_name, descriptor) {
	this.descriptor_index[shortcode_name] = descriptor
	const self = this

	this.exec_fns[shortcode_name] = function(shortcode_obj) {
		shortcode_obj.executeAttributes()

		// execute preprocessing function
		if (propertyIsFunction(shortcode_obj.descriptor, 'pre')) {
			shortcode_obj.descriptor.pre(shortcode_obj)
		}

		const template = self.construct(shortcode_obj)

		if (template) {
			if (shortcode_obj.classes.length) template.classList.add(...shortcode_obj.classes)
			css(template, shortcode_obj.css)
			template.classList.add('shortcode-js')
		}
		
		//TODO: per item callback? I forgot what I've meant by this
		if (propertyIsFunction(shortcode_obj.descriptor, 'callback')) {
			shortcode_obj.descriptor.callback(template, shortcode_obj)
		}
	}
}

Shortcodes.prototype.execute = function(elem, callback) {
	elem.style.visibility = 'hidden'
	const shortcode_map = this.iterateNode(elem, this.descriptor_index, this.options.self_anchor_class)

	for (const key in shortcode_map) {
		const fn_name = shortcode_map[key].name
		if (this.exec_fns.hasOwnProperty(fn_name)) {
			this.exec_fns[fn_name](shortcode_map[key])
		}
	}

	elem.style.visibility = 'visible'
	if (callback) callback(shortcode_map, this.exec_fns)
}

Shortcodes.prototype.clear = function() {
	remove('.shortcode-js')
	remove('.self-anchor')
}

Shortcodes.prototype.reinitialize = function(elem, callback) {
	this.clear()
	this.execute(elem, callback)
}

Shortcodes.prototype.bindElement = function(destination, properties, extracted, payload, additional_payload, num) {
	if (isString(destination)) destination = querySingle(destination)
	if (isString(properties)) properties = [properties]

	const fns = {}

	fns['append'] = function(destination, property, extracted) {
		if (!extracted.hasOwnProperty('self')) return
		if (extracted.self instanceof HTMLElement) extracted.self = [extracted.self]
		for (let i = 0; i < extracted.self.length; i++) {
			destination.appendChild(extracted.self[i])
		}
	}

	fns['prepend'] = function(destination, property, extracted) {
		if (!extracted.hasOwnProperty('self')) return
		if (extracted.self instanceof HTMLElement) extracted.self = [extracted.self]
		for (let i = 0; i < extracted.self.length; i++) {
			if (destination.firstChild) {
				destination.insertBefore(extracted.self[i], destination.firstChild)
			} else {
				destination.appendChild(extracted.self[i])
			}
		}
	}

	fns['html'] = function(destination, property, extracted) {
		if (!extracted.hasOwnProperty('html')) return
		destination.innerHTML = extracted.html
	}

	fns['text'] = function(destination, property, extracted) {
		if (!extracted.hasOwnProperty('text')) return
		destination.textContent = extracted.text
	}

	fns['style'] = function(destination, property, extracted) {
		if (!isArray(property)) property = [property]

		for (let i = 0; i < property.length; i++) {
			if (!isObject(property[i]) || !hasOwnProperties(property[i], 'style_property', 'extracted_property')) continue
			const camelCaseProp = transformDashToCamelCase(property[i].style_property)
			if (!extracted.hasOwnProperty(property[i].extracted_property)) continue
			let extract = extracted[property[i].extracted_property]
			if (camelCaseProp === 'backgroundImage') {
				extract = `url(${extract})`
			}
			destination.style[camelCaseProp] = extract
		}
	}

	for (let i = 0; i < properties.length; i++) {
		if (fns.hasOwnProperty(properties[i])) {
			fns[properties[i]](destination, properties[i], extracted)
			continue
		}

		if (isFunction(properties[i])) {
			properties[i](destination, extracted, payload, additional_payload, num)
			continue
		}

		if (isObject(properties[i])) {
			fns['style'](destination, properties[i], extracted)
			continue
		}

		destination.setAttribute(properties[i], extracted[properties[i]])
	}
}

Shortcodes.prototype.bindShortcode = function(source, destination, function_name, property_name, payload, additional_payload) {
	if (typeof destination === 'string') destination = query(destination)
	else if (destination instanceof HTMLElement) destination = [destination]

	if (typeof source === 'string') source = query(source)
	else if (source instanceof HTMLElement) source = [source]

	if (isFunction(function_name)) {
		function_name(source, destination, property_name, payload, additional_payload)
		return
	}

	const fns = {}

	fns['style'] = function(source, destination, property_name, payload, additional_payload) {
		if (typeof property_name === 'string') property_name = [property_name]

		for (let i = 0; i < property_name.length; i++) {
			const propCamelCase = transformDashToCamelCase(property_name[i])
			destination.style[propCamelCase] = source.style[propCamelCase]
		}
	}

	fns['html'] = function(source, destination, property_name, payload, additional_payload) {
		destination.innerHTML = source.innerHTML
	}

	fns['text'] = function(source, destination, property_name, payload, additional_payload) {
		destination.textContent = source.textContent
	}

	fns['prepend'] = function(source, destination, property_name, payload, additional_payload) {
		if (destination.firstChild) {
			destination.insertBefore(source, destination.firstChild)
		} else {
			destination.appendChild(source)
		}
	}

	fns['append'] = function(source, destination, property_name, payload, additional_payload) {
		destination.appendChild(source)
	}

	if (destination.length) {
		for (let i = 0; i < destination.length; i++) {
			for (let j = 0; j < source.length; j++) {
				if (fns.hasOwnProperty(function_name)) {
					fns[function_name](source[j], destination[i], property_name, payload, additional_payload)
				}
			}
		}
	}
}

export default Shortcodes
