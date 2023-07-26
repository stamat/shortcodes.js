import { clone, shallowMerge, propertyIsFunction, parseAttributes } from 'book-of-spells';
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
		this.counter = counter
		this.classes = []
		this.css = {}
		this.options = {
			placement_class_prefix: 'shortcode-landing',
		}

		if (opts) {
			shallowMerge(this.options, opts)
		}
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
}

export default Shortcode
