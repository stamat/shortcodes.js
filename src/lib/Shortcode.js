import { clone, shallowMerge, propertyIsFunction, parseAttributes, isEmpty } from 'book-of-spells';
import { getShortcodeName } from './parsers';

export class Shortcode {
	constructor(tag_content, descriptor, counter, opts) {
		const name = getShortcodeName(tag_content)
		const attributes = parseAttributes(tag_content)
		delete attributes[name]

		this.tag_content = tag_content
		this.uid = `${name}-sc-${counter}`
		this.name = name
		this.attributes = attributes
		this.descriptor = clone(descriptor)
		this.content = []
		this.elements = null
		this.counter = counter
		this.classes = []
		this.css = {}
		this.options = {
			placement_class_prefix: 'shortcode-landing',
		}

		this.stats = {
			other_than_rest_count: 0,
	 		first_element_key: null,
			last_element_key: null,
			max_element_key: null
		}
		this.self_anchor = null

		if (opts) {
			shallowMerge(this.options, opts)
		}

		if (this.descriptor.hasOwnProperty('elements') && !isEmpty(this.descriptor.elements)) {
			this.elements = {}

			for (const k in this.descriptor.elements) {
				this.elements[k] = this.descriptor.elements[k]
				if (this.elements[k].count && this.elements[k].count === 'many') this.elements[k].count = Infinity
				if (k === 'rest') {
					this.elements[k].count = Infinity
				}
				if (!this.elements[k].count) this.elements[k].count = 1

				this.elements[k].key = k
				this.elements[k].content = []
				this.elements[k].extracts = [] //TODO: we can also do extracts when we add content
			}
		}
	}

	getElementObject(element_name) {
		if (!this.elements) return null

		if (this.elements.hasOwnProperty(element_name)) return this.elements[element_name]

		for (const k in this.elements) {
			if(new RegExp(k, 'i').test(element_name))
				return this.elements[k]
		}

		if (this.elements.hasOwnProperty('rest')) return this.elements['rest']

		return null
	}

	ifElementIsSatisfied(element_name) {
		if (!this.elements) return true

		const elementObject = this.getElementObject(element_name)

		return this.checkIfSatisfied(elementObject)
	}

	checkIfSatisfied(element) {
		if (!element) return true
		if (element.count && element.count > element.content.length) return false
		return true
	}

	canAddContent(content) {
		if (!(content instanceof HTMLElement)) return false
		const tagName = content.tagName.toLowerCase()

		const elementObject = this.getElementObject(tagName)
		const isSatisfied = this.checkIfSatisfied(elementObject)

		return isSatisfied ? false : elementObject
	}

	addContent(content) {
		const elementObject = this.canAddContent(content)
		if (!elementObject) return false
		this.content.push(content)
		elementObject.content.push(content)
		elementObject.extracts.push(this.elementExtract(content, elementObject.extract))

		// Update stats. Stats are used for identifying the the groups of content within shortcode to deduce if it's a single element shortcode or a shortcode with items
		if (this.stats.first_element_key === null) this.stats.first_element_key = elementObject.key
		this.stats.last_element_key = elementObject.key
		if (elementObject.key !== 'rest') this.stats.other_than_rest_count++
		for (const k in this.elements) {
			if (this.elements[k].content.length > 0) this.stats.max_element_key = this.elements[k].key
		}
		
		return true
	}

	executeAttributes() {
		var self = this
		const fns = {}

		fns['header-class'] = function(shortcode_obj, value) {
			let header = null

			if (shortcode_obj.descriptor.hasOwnProperty('header_selector') && shortcode_obj.descriptor.header_selector) {
				header = document.querySelector(shortcode_obj.descriptor.header_selector)
			}

			if (!header) header = document.querySelector('header')
			if (!header) header = document.querySelector('body')

			header.classList.add(value)
		}

		fns['body-class'] = function(shortcode_obj, value) {
			document.querySelector('body').classList.add(value)
		}

		fns['placement'] = function(shortcode_obj, value) {
			if (value === 'content') {
				shortcode_obj.descriptor.anchor = 'self'
				return
			}
			shortcode_obj.descriptor.anchor = `.${self.options.placement_class_prefix}-${value}`
		}

		fns['background-color'] = function(shortcode_obj, value) {
			shortcode_obj.css['backgroundColor'] = value
		}

		fns['background-image'] = function(shortcode_obj, value) {
			shortcode_obj.css['backgroundImage'] = `url(${value})`
		}

		fns['color'] = function(shortcode_obj, attr) {
			shortcode_obj.css['color'] = attr
		}

		//Descriptor can carry custom attribute parsers. They can override the default ones
		if (this.descriptor.hasOwnProperty('attribute_parsers')) {
			for (const k in this.descriptor.attribute_parsers) {
				if (propertyIsFunction(this.descriptor.attribute_parsers, k)) {
					fns[k] = this.descriptor.attribute_parsers[k]
				}
			}
		}

		for (const key in this.attributes) {
			const value = this.attributes[key]

			if (fns.hasOwnProperty(key) && value) {
				fns[key](this, value)
			} else {
				this.classes.push(key)
			}
		}

		return this
	}

	elementExtract = function(element, properties) {
		if (typeof element === 'string') element = querySingle(element)
	
		if (typeof properties === 'string') properties = [properties]
	
		const fns = {}
		const result = {}
	
		fns['html'] = function(element, property) {
			result.html = element.innerHTML
		}
	
		fns['text'] = function(element, property) {
			result.text = element.textContent
		}
	
		fns['self'] = function(element, property) {
			result.self = element
		}
	
		fns['style'] = function(element, property) {
			if (!hasOwnProperties(properties[i], ['name', 'properties'])) return
			if (!property.name === 'style') return
			if (!isArray(property.properties)) property.properties = [property.properties]
	
			result.style = {}
	
			for (let i = 0; i < property.properties.length; i++) {
				const camelCaseProp = transformDashToCamelCase(property.properties[i])
				result.style[property.properties[i]] = element.style[camelCaseProp]
			}
		}
	
		fns['function'] = function(element, property) {
			if (!hasOwnProperties(property, ['name', 'extract_fn'])) return
			if (!isFunction(property.extract_fn)) return
			result[property.name] = property.extract_fn(element)
		}
	
		for (let i = 0; i < properties.length; i++) {
	
			if (fns.hasOwnProperty(properties[i])) {
				fns[properties[i]](element, properties[i])
				continue
			}
	
			if (isObject(properties[i])) {
				fns['function'](element, properties[i])
				fns['style'](element, properties[i])
				continue
			}
	
			result[properties[i]] = element.getAttribute(properties[i])
		}
	
		return result
	}
}

export default Shortcode
