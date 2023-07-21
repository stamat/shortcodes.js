import { clone, shallowMerge, detachElement, insertBeforeElement } from './spellbook/helpers';

//TODO: THIS SHIT NEEDS A HEAVY REWRITE!!! YOU LAZY ASS!

//TODO: decide if jQuery is really necessary

class Shortcodes {
	constructor(options) {
		this.descriptor_index = {};
		this.exec_fns = {};
	
		this.shopify_img_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(_[0-9]+x[0-9]*)(\.[a-z]{3,4}.*)$/gi
		this.shopify_img_replacer_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(\.[a-z]{3,4}.*)$/gi
		
		this.options = {
			templates: '#templates',
			template_class: 'template',
			self_anchor_class: 'self-anchor',
			placement_class_prefix: 'shortcode-landing'
		}
	
		if (options) {
			shallowMerge(this.options, options)
		}
	}

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
	 * Finds elements between the shortcodes makes a map of all shortcodes and their containing elements
	 * 
	 * @param {HTMLElement|NodeList} elem - Entry element to parse and find shortcodes in
	 * @param {string} one - If specified, returns only the shortcode map for the specified shortcode
	 */
	parseDOM(elem, one) {
		const map = {}
		let last_section = null
		const children = elem instanceof NodeList ? elem : elem.children
		
		const re = /\[([\/a-z0-9\-_\s]+)\]/gi // regex for detecting shortcodes
		let shortcode_counter = 0

		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			let match = null

			if (!(child instanceof HTMLPreElement || child.querySelector('pre'))) { //only if it's not "pre" element
				const text = child.textContent.toLowerCase().trim()
				match = re.exec(text)
				
				re.lastIndex = 0; //regex needs a reset in for loops, I always forget this
			}

			// when the shortcode is detected
			if (match && match.length > 1) {

				// detect closing tag and remove it
				if (match[1].indexOf('/') === 0 
					&& last_section 
					&& last_section.indexOf(match[1].replace(/^\//, '')) > -1) { // if it's a closing tag of the current shortcode
					last_section = null
					child.remove()
					continue
				}

				last_section = `${match[1]} sc${shortcode_counter}`
				const self_locator = document.createElement('div')
				self_locator.className = `${this.options.self_anchor_class} shortcode-${last_section.split(/\s+/)[0]} sc${shortcode_counter}`

				if (!map.hasOwnProperty(last_section)) {
					map[last_section] = []
					shortcode_counter++
				}

				insertBeforeElement(child, self_locator) 			
				map[last_section].push(self_locator)
				child.remove()

				continue
			}

			if (last_section) {
				map[last_section].push(child)
				detachElement(child)
			}

			if (one && last_section !== one) {
				if (map.hasOwnProperty(one)) {
					return map[one]
				}
			}
		}

		if (one && map.hasOwnProperty(one)) {
			return map[one]
		}
		return map
	}
}

//if this isn't a God function I don't know what is... Wait, I know, it's a terrible nonrefactored code!
Shortcodes.prototype.sortDOM = function(descriptor, val) {
	var re = /^\{([a-z0-9\-_\s]+)\}$/gi; //subtag attributes

	var item_tags = []; //collects attributes per "slide"
	var elements = {}; //sorted DOM per tag name
	var other_than_rest = {};
	var other_than_rest_count = 0;
	var first_element_key = null;
	var last_element_key = null;
	var max_element_key = null;

	var cycle_counter = 0;
	var subtag_first_flag = false;

	//cycles are used for backaging the rest of elements in arrays
	function newCycle() {
		fillTheGaps();
		cycle_counter += 1;
	}

	//rest has to be always present, it is a default collection of all undefined elements
	elements.rest = [];

	var memo_block_template = {}; //this will hold all the tag names from elements and remove the ones found, so we can generate empty states for the not found ones
	var memo_block = {};

	function fillTheGaps() {
		for (var k in memo_block) {
			elements[k].push(null);
		}
		memo_block = newMemoBlock();
	}

	//clone temp memo_block
	function newMemoBlock() {
		res = {};
		for (var k in memo_block_template) {
			res[k] = true;
		}
		return res;
	}

	//extract other than rest
	if (descriptor.hasOwnProperty('elements')) {
		for (var k in descriptor.elements) {
			if (k !== 'rest') {
				last_element_key = k;
				if (!elements.hasOwnProperty(k)) {
					elements[k] = [];
				}

				if (first_element_key === null) {
					first_element_key = k;
				}

				if (!other_than_rest.hasOwnProperty(k)) {
					other_than_rest[k] = true;
					other_than_rest_count++;
				}
			}

			memo_block_template[k] = true;
			memo_block[k] = true;
		}
	}

	for (var i = 0; i < val.length; i++) {
		var $item = $(val[i]);

		//XXX: ??? did we stop using this? this might be a part of legacy code
		if ($item.hasClass('self-anchor')) {
			// find yourself in this confusion
			if (descriptor.anchor === 'self') {
				descriptor.anchor = $item;
			}
			continue;
		}

		//if the contents are empty
		if (!$item.is('img') && $item.html().trim() === '') {
			continue;
		}

		var green_flag = false;

		//testing for slide attributes
		if (descriptor.hasOwnProperty('item_template')) {
			var text = $item.text().toLowerCase().trim();
			var match = re.exec(text);
			re.lastIndex = 0;

			if (match && match.length > 1) {
				if (cycle_counter || subtag_first_flag) {
					newCycle();
				}

				item_tags[cycle_counter] = match[1];
				subtag_first_flag = true;
				continue;
			}
		}

		//iterating found elements, sort defined
		if (other_than_rest_count) {
			for (var k in other_than_rest) {

				if (elements[k].length === descriptor.elements[k].count) { //if the count of elements reatches set count skip iteration
					continue;
				}

				//XXX: this is a temporary and very bad solution | this was written to be able to use images inside the ul/li as secondary images
				if (k === 'img' && $item.find('li').length) {
					continue;
				}

				var $inner = $item.find(k); //gotta cover all the possible cases of undefined generated html

				if ($item.is(k) || $inner.length) { //if element is found
					if ($inner.length) {
						$item = $inner.first();
					}

					// if an element is found that belongs to a memo block but it's already processed - this means a new cycle must begin
					if (descriptor.hasOwnProperty('item_template') && !memo_block.hasOwnProperty(k)) {
						newCycle();
					}

					elements[k].push($item);

					if (descriptor.hasOwnProperty('item_template')) {
						delete memo_block[k];
					}
					green_flag = true; // don't iterate the rest

					break;
				}
			}
		}

		//iterating found elements, sort undefined = rest
		if (!green_flag) {
			//collecting other elements
			if (descriptor.hasOwnProperty('item_template')) { //if it is a repeater
				if (!elements.rest[cycle_counter]) {
					delete memo_block['rest'];
					elements.rest[cycle_counter] = [];
				}
				elements.rest[cycle_counter].push($item[0]);
			} else {
				elements.rest.push($item[0]);
			}
		}
	}

	if (descriptor.hasOwnProperty('item_template')) {
		fillTheGaps();
	}


	// calculate which element has the most entries = number of slides
	// this will be used as a slide delimiter later on
	var max_count = null;

	for (var k in other_than_rest) {
		var c = elements[k].length;

		if (max_element_key === null) {
			max_element_key = k;
			max_count = c;
		} else {
			if (c > max_count) {
				max_element_key = k;
				max_count = c;
			}
		}
	}

	return {	elements: elements,
				item_tags: item_tags,
				first_element_key: first_element_key,
				last_element_key: last_element_key,
				max_element_key: max_element_key
	};
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

Shortcodes.prototype.bind = function(descriptor, val, parsed_attrs) {
	var $template = null;

	if (descriptor.hasOwnProperty('template')) {
		$template = this.getTemplate(descriptor.template);
	}

	var sorted = this.sortDOM(descriptor, val);

	if (descriptor.hasOwnProperty('item_template')) {
		for (var i = 0; i < sorted.elements[sorted.max_element_key].length; i++) {
			var $item_template = this.getTemplate(descriptor.item_template);
			if (sorted.item_tags[i]) {
				$item_template.addClass(sorted.item_tags[i]);
			}

			for (var k in descriptor.elements) {
				var props = descriptor.elements[k];
				if (sorted.elements[k][i]) { //if the element exists, may be an uneven number
					var $item = $(sorted.elements[k][i]);
					this.executeProperties($item, $item_template, props, descriptor, i);
				}
			}

			var $dest = descriptor.hasOwnProperty('template') ? $template.find(descriptor.item_anchor) : $(descriptor.anchor);
			if (typeof descriptor.bind_fn === 'function') {
				descriptor.bind_fn($item_template, $dest, descriptor, parsed_attrs, i);
			} else {
				$dest[descriptor.bind_fn]($item_template);
			}
		}
	} else {
		if (descriptor.hasOwnProperty('elements')) {
			for (var k in descriptor.elements) {
				var props = descriptor.elements[k];

				if (sorted.elements.hasOwnProperty(k)) {
					for (var i = 0; i < sorted.elements[k].length; i++) {
						var $item = $(sorted.elements[k][i]);
						var $dest = descriptor.hasOwnProperty('template') ? $template : $(descriptor.anchor);
						this.executeProperties($item, $dest, props, descriptor, i);
					}
				}
			}
		} else {
			var $dest = descriptor.hasOwnProperty('template') ? $template : $(descriptor.anchor);
			if (typeof descriptor.bind_fn === 'function') {
				descriptor.bind_fn(sorted.elements.rest, $dest, descriptor, parsed_attrs);
			} else {
				$dest[descriptor.bind_fn](sorted.elements.rest);
			}
		}
	}

	if (descriptor.hasOwnProperty('template')) {
		if (typeof descriptor.bind_fn === 'function') {
			descriptor.bind_fn($template, $(descriptor.anchor), descriptor, parsed_attrs);
		} else {
			$(descriptor.anchor)[descriptor.bind_fn]($template);
		}
		return $template;
	}

	return $(descriptor.anchor);
};

Shortcodes.prototype.getTemplate = function(selector) {
	var $template = $(this.options.templates).find(selector+'.'+this.options.template_class).clone();
	$template.removeClass(this.options.template_class);
	return $template;
}

//TODO: what about subtag attribute parses?
Shortcodes.prototype.parseAttributes = function(descriptor, attrs) {
	var self = this;
	var res = {
		classes: [],
		css: {}
	};

	var fns = {};

	//option to add parsers from descriptor
	if (descriptor.hasOwnProperty('attribute_parsers')) {
		for (var k in descriptor.attribute_parsers) {
			fns[k] = descriptor.attribute_parsers[k];
		}
	}

	//some default parsers
	fns['header'] = function(pts, descriptor, attr) {
		var $header = null;
		if (descriptor.hasOwnProperty('header_selector') && descriptor.header_selector) {
			$header = $(descriptor.header_selector);
		}

		if ($header === null || !$header.length) {
			$header = $('header');
		}

		if ($header === null || !$header.length) {
			$header = $('body');
		}

		$header.addClass(pts.join('-'));
	}

	fns['placement'] = function(pts, descriptor, attr) {
		if (pts[0]) {
			if (pts[0] === 'content') {
				descriptor.anchor = 'self';
			} else {
				descriptor.anchor = '.' + self.options.placement_class_prefix + '-' + pts[0];
			}
		}
	}

	fns['background'] = function(pts, descriptor, attr) {
		if (pts[0] && pts[0] === 'color' && pts[1]) {
			res.css['background-color'] = '#'+pts[1];
		} else {
			res.classes.push(attr);
		}
	}

	fns['color'] = function(pts, descriptor, attr) {
		if (pts[0]) {
			res.css['color'] = pts[0];
		} else {
			res.classes.push(attr);
		}
	}

	for (var i = 0; i < attrs.length; i++) {
		var attr = attrs[i].trim().toLowerCase();

		if (/sc[0-9]+/gi.test(attr)) {
			continue;
		}

		var pts = attr.split('-');
		if (pts[0] && fns.hasOwnProperty(pts[0])) {
			fns[pts.shift()](pts, descriptor, attr);
		} else {
			res.classes.push(attr);
		}
	}

	return res;
};

Shortcodes.prototype.register = function(shortcode_name, descriptor) {
	this.descriptor_index[shortcode_name] = descriptor;
	var self = this;

	this.exec_fns[shortcode_name] = function(k, attrs, val) {
		var descriptor = clone(self.descriptor_index[k]);

		var parsed_attrs = self.parseAttributes(descriptor, attrs);

		if (descriptor.hasOwnProperty('pre') && descriptor.pre) {
			descriptor.pre(descriptor, attrs, val, parsed_attrs);
		}

		var $template = self.bind(descriptor, val, parsed_attrs);

		$template.addClass(parsed_attrs.classes.join(' '));
		$template.css(parsed_attrs.css);
		$template.addClass('shortcode-js');

		//TODO: per item callback
		if (descriptor.hasOwnProperty('callback') && descriptor.callback) {
			descriptor.callback($template, parsed_attrs, descriptor);
		}
	};
};

Shortcodes.prototype.execute = function($elem, callback) {
	$($elem).css('visibility', 'hidden');
	var shortcode_map = this.parseDOM($elem[0]);

	for (var k in shortcode_map) {
		var attrs = k.split(/\s+/gi);

		var fn_name = attrs.shift();

		if (this.exec_fns.hasOwnProperty(fn_name)) {
			this.exec_fns[fn_name](fn_name, attrs, shortcode_map[k]);
		}
	}

	$($elem).css('visibility', 'visible');

	if (callback !== undefined) {
		callback(shortcode_map, this.exec_fns);
	}
};

Shortcodes.prototype.clear = function() {
	$('.shortcode-js').remove();
	$('.self-anchor').remove();
};

Shortcodes.prototype.reinit = function($elem, callback) {
	this.clear();
	this.execute($elem, callback);
};
