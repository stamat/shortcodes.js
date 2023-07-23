import { clone, shallowMerge, removeAll, insertBeforeElement, propertyIsFunction, css, isElementEmpty } from './spellbook/helpers';
import { parseAttributes, getShortcodeContent, isSpecificClosingTag, getShortcodeName } from './lib/parsers';

//TODO: THIS SHIT NEEDS A HEAVY REWRITE!!! YOU LAZY ASS!

//TODO: decide if jQuery is really necessary

class Shortcodes {
	constructor(options) {
		this.descriptor_index = {};
		this.exec_fns = {};
	
		this.shopify_img_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(_[0-9]+x[0-9]*)(\.[a-z]{3,4}.*)$/gi
		this.shopify_img_replacer_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(\.[a-z]{3,4}.*)$/gi
		
		this.options = {
			template_class: 'template',
			self_anchor_class: 'self-anchor',
			placement_class_prefix: 'shortcode-landing'
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
		let re = this.shopify_img_replacer_re

		if (!re.test(src)) return src

		if (this.shopify_img_re.test(src)) {
			suf = '$3'
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

		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			let match = null
			
			// check all elements for shortcodes except "pre" elements
			if (!(child instanceof HTMLPreElement || child.querySelector('pre'))) { //only if it's not "pre" element
				const text = child.textContent.trim()
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
					child.remove()
					continue
				}

				last_shortcode = new Shortcode(match, clone(register[getShortcodeName(match)]), shortcode_counter)
				const self_anchor = this.createSelfAnchor(child, self_anchor_class, last_shortcode.name, shortcode_counter)

				if (!map.hasOwnProperty(last_shortcode.uid)) {
					map[last_shortcode.uid] = last_shortcode
					shortcode_counter++
				}

				map[last_shortcode.uid].content.push(self_anchor)
				child.remove()
				continue
			}

			if (last_shortcode.uid) {
				map[last_shortcode.uid].content.push(child)
			}
		}

		return map
	}
}

//if this isn't a God function I don't know what is... Wait, I know, it's a piece of terrible nonrefactored code!
//FUCK ME.
Shortcodes.prototype.sortDOM = function(shortcode_obj) {
	const descriptor = shortcode_obj.descriptor
	const content = shortcode_obj.content
	
	const reSubtag = /^\s*\{\s*([a-z0-9\-_\s]+)\s*\}\s*$/gi; //subtag attributes. I guess subtags are used for item ("slide") delimiters

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
		res = {};
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

		//❗️TODO: THIS CAN BE DONE IN THE SHORTCODE CLASS DURING CONSTRUCTION
		if (item.classList.contains(this.options.self_anchor_class)) {
			if (descriptor.anchor === 'self') descriptor.anchor = item
			continue
		}

		//if the contents are empty, with exclusion of images
		if (!item.matches('img') && isElementEmpty(item)) continue

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
					continue;
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
	let max_count = null;

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

	return {	elements: elements,
				item_tags: item_tags,
				first_element_key: first_element_key,
				last_element_key: last_element_key,
				max_element_key: max_element_key
	}
}

//TODO: simplify with declarative programming
Shortcodes.prototype.executeProperties = function($item, $dest, props, descriptor, num) {
	//$item = $($item);
	// Extract DOM attributes
	if (props.extract_fn === 'attr') {
		if (typeof props.extract_attr === 'string') {
			extract = $item[props.extract_fn](props.extract_attr);

			if ($item.is('img') && props.extract_attr === 'src') {
				if (extract && this.shopify_img_re.test(extract)) {
					extract = extract.replace(this.shopify_img_re, '$1$3');
				}
			}
		} else { // if it has multiple attributes to extract, like alt image -> for binding use custom function
			extract = [];
			for (var j = 0; j < props.extract_attr.length; j++) {
				if (props.extract_attr[j] === 'html') {
					extract.push($item.html());
					continue;
				}

				if ($item.is('img') && props.extract_attr[j] === 'src') {
					var src = $item.attr('src');
					if (src && this.shopify_img_re.test(src)) {
						extract.push(src.replace(this.shopify_img_re, '$1$3'));
						continue;
					}
				}
				var attr = props.extract_attr[j];
				extract.push($item[props.extract_fn](attr));
			}
		}
	// Extract DOM
	} else if (props.extract_fn === 'self') {
		extract = $item;
	// Extract with jQuery function
	} else {
		extract = $item[props.extract_fn]();
	}

	//TODO: should be extract_fn typeof function
	if (props.hasOwnProperty('parse')) {
		if (typeof props.parse === 'function') {
			extract = props.parse(extract);  //execute custom extract parsing function
		} else {
			if (window.hasOwnProperty(props.parse)) {
				extract = window[props.parse](extract);
			}
		}
	}

	if (props.bind_fn === 'css'
		&& props.hasOwnProperty('bind_property')
		&& props.bind_property === 'background-image') {
		extract  = 'url(' + extract + ')';
	} else if (typeof props.bind_fn === 'function') {
		props.bind_fn(extract, $dest, props, descriptor, num); //execute custom bind function
		return;
	}

	//do some auto binding
	switch (props.anchor_element) {
		case 'item':
			$target = $dest.find(props.anchor);
			if ($dest.is(props.anchor) && $target.length === 0) {
				$target = $dest;
			}

			if (props.bind_fn === 'css' && props.hasOwnProperty('bind_property')) {
				$target[props.bind_fn](props.bind_property, extract);
			} else {
				$target[props.bind_fn](extract);
			}
			break;
		case 'template':
			$target = $dest.find(props.anchor);
			if ($dest.is(props.anchor) && $target.length === 0) {
				$target = $dest;
			}

			if (props.bind_fn === 'css' && props.hasOwnProperty('bind_property')) {
				$target[props.bind_fn](props.bind_property, extract);
			} else {
				$target[props.bind_fn](extract);
			}
			break;
		default:
			$target = $(descriptor.anchor).find(props.anchor);
			if ($(descriptor.anchor).is(props.anchor) && $target.length === 0) {
				$target = $(descriptor.anchor);
			}

			if (props.bind_fn === 'css' && props.hasOwnProperty('bind_property')) {
				$target[props.bind_fn](props.bind_property, extract);
			} else {
				$target[props.bind_fn](extract);
			}
	}
}

Shortcodes.prototype.construct = function(shortcode_obj) {
	var $template = null;

	if (shortcode_obj.descriptor.hasOwnProperty('template')) {
		$template = $(this.getTemplate(shortcode_obj.descriptor.template));
	}
	
	var sorted = this.sortDOM(shortcode_obj);

	if (shortcode_obj.descriptor.hasOwnProperty('item_template')) {
		for (var i = 0; i < sorted.elements[sorted.max_element_key].length; i++) {
			var $item_template = $(this.getTemplate(shortcode_obj.descriptor.item_template));
			if (sorted.item_tags[i]) {
				$item_template.addClass(sorted.item_tags[i]);
			}

			for (var k in shortcode_obj.descriptor.elements) {
				var props = shortcode_obj.descriptor.elements[k];
				if (sorted.elements[k][i]) { //if the element exists, may be an uneven number
					var $item = $(sorted.elements[k][i]);
					this.executeProperties($item, $item_template, props, shortcode_obj.descriptor, i);
				}
			}

			var $dest = shortcode_obj.descriptor.hasOwnProperty('template') ? $template.find(shortcode_obj.descriptor.item_anchor) : $(descriptor.anchor);
			if (typeof shortcode_obj.descriptor.bind_fn === 'function') {
				shortcode_obj.descriptor.bind_fn($item_template, $dest, shortcode_obj.descriptor, shortcode_obj, i);
			} else {
				$dest[shortcode_obj.descriptor.bind_fn]($item_template);
			}
		}
	} else {
		if (shortcode_obj.descriptor.hasOwnProperty('elements')) {
			for (var k in shortcode_obj.descriptor.elements) {
				var props = shortcode_obj.descriptor.elements[k];

				if (sorted.elements.hasOwnProperty(k)) {
					for (var i = 0; i < sorted.elements[k].length; i++) {
						var $item = $(sorted.elements[k][i]);
						var $dest = shortcode_obj.descriptor.hasOwnProperty('template') ? $template : $(shortcode_obj.descriptor.anchor);
						this.executeProperties($item, $dest, props, shortcode_obj.descriptor, i);
					}
				}
			}
		} else {
			var $dest = shortcode_obj.descriptor.hasOwnProperty('template') ? $template : $(shortcode_obj.descriptor.anchor);
			if (typeof shortcode_obj.descriptor.bind_fn === 'function') {
				shortcode_obj.descriptor.bind_fn(sorted.elements.rest, $dest, shortcode_obj.descriptor, shortcode_obj);
			} else {
				if (propertyIsFunction($dest, shortcode_obj.descriptor.bind_fn))
					$dest[shortcode_obj.descriptor.bind_fn](sorted.elements.rest)
			}
		}
	}

	if (shortcode_obj.descriptor.hasOwnProperty('template')) {
		if (typeof shortcode_obj.descriptor.bind_fn === 'function') {
			shortcode_obj.descriptor.bind_fn($template, $(document.querySelector(shortcode_obj.descriptor.anchor)), shortcode_obj.descriptor, shortcode_obj);
		} else {
			$(shortcode_obj.descriptor.anchor)[shortcode_obj.descriptor.bind_fn]($template);
		}
		return $template[0];
	}

	return document.querySelector(shortcode_obj.descriptor.anchor);
};

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
			if (shortcode_obj.classes.length) template.classList.add(shortcode_obj.classes.join(' '))
			css(template, shortcode_obj.css);
			template.classList.add('shortcode-js')
		}
		
		//TODO: per item callback
		if (propertyIsFunction(shortcode_obj.descriptor, 'callback')) {
			shortcode_obj.descriptor.callback($(template), shortcode_obj)
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
	removeAll('.shortcode-js')
	removeAll('.self-anchor')
}

Shortcodes.prototype.reinitialize = function($elem, callback) {
	this.clear()
	this.execute($elem, callback)
}

class Shortcode {
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
			let header = null;

			if (shortcode_obj.descriptor.hasOwnProperty('header_selector') && shortcode_obj.descriptor.header_selector) {
				header = document.querySelector(shortcode_obj.descriptor.header_selector);
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
			shortcode_obj.descriptor.anchor= '.' + self.options.placement_class_prefix + '-' + value;
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
			for (var k in this.descriptor.attribute_parsers) {
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
