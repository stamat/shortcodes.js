/** shortcodes.js v1.0.0 | Nikola Stamatovic @stamat <nikola@oshinstudio.com> OSHIN LLC | GPLv3 and Commercial **/


//TODO: decide if jQuery is really necessary

function Shortcodes() {
	this.descriptor_index = {};
	this.exec_fns = {};

	//Object deep clone from d0.js @stamat
	if (!window.hasOwnProperty('d0')) {
		window.d0 = {};

		window.d0.getClass = function(val) {
			return Object.prototype.toString.call(val)
				.match(/^\[object\s(.*)\]$/)[1];
		};

		window.d0.whatis = function(val) {

			if (val === undefined)
				return 'undefined';
			if (val === null)
				return 'null';

			var type = typeof val;

			if (type === 'object')
				type = window.d0.getClass(val).toLowerCase();

			if (type === 'number') {
				if (val.toString().indexOf('.') > 0)
					return 'float';
				else
					return 'integer';
			}

			return type;
		};

		window.d0.types = {
			'undefined': -1,
			'null': 0,
			'boolean': 1,
			'integer': 2,
			'float': 3,
			'string': 4,
			'array': 5,
			'object': 6,
			'function': 7,
			'regexp': 8,
			'date': 9
		}

		window.d0.clone = function(o) {
			var res = null;
			var type = window.d0.types[window.d0.whatis(o)];
			if(type === 6) {
				res = window.d0._cloneObject(o);
		    } else if(type === 5) {
		    	res = window.d0._cloneArray(o);
		    } else {
		    	res = o;
		    }
		    return res;
		};

		window.d0._cloneObject = function(o) {
			var res = {};
			for(var i in o) {
				res[i] = window.d0.clone(o[i]);
			}
			return res;
		};

		window.d0._cloneArray = function(a) {
			var res = [];
			for(var i = 0; i < a.length; i++) {
				res[i] = window.d0.clone(a[i]);
			}
			return res;
		};
	}
}

Shortcodes.prototype.parseDOM = function($elem, one) {
	var map = {};
 	var last_section = null;

 	var children = $($elem).children();
 	var re = /\[([\/a-z0-9\-_\s]+)\]/gi;
 	var shortcode_counter = 0;

 	for (var i = 0; i < children.length; i++) {
 		var $child = $(children[i]);

 		var text = $child.text().toLowerCase().trim();

 		var match = re.exec(text);
 		re.lastIndex = 0; //regex needs a reset in for loops, I always forget this

 		if (match && match.length > 1) {

 			// detect closing tag, replace with /^\// regex
 			if (match[1].indexOf('/') === 0 && last_section && last_section.indexOf(match[1].replace(/^\//, '')) > -1) {
 				last_section = null;
 				$child.remove();
 				continue;
 			}

 			last_section = match[1] + ' sc' + shortcode_counter;
 			var $self_locator = $('<div class="self-anchor shortcode-'+last_section.split(/\s+/)[0]+' sc'+shortcode_counter+'" />');

 			if (!map.hasOwnProperty(last_section)) {
 				map[last_section] = [];
 				shortcode_counter++;
 			}

 			$child.before($self_locator);
 			map[last_section].push($self_locator);
 			$child.remove();

 			continue;
 		}

 		if (last_section) {
 			map[last_section].push($child);
 			$child.detach();
 		}

 		if (one && last_section !== one) {
 			if (map.hasOwnProperty(one)) {
 				return map[one];
 			}
 		}
 	}

 	if (one && map.hasOwnProperty(one)) {
 		return map[one];
 	}
 	return map;
};

//if this isn't a God function I don't know what is... Wait, I know, it's a terrible nonrefactored code!
Shortcodes.prototype.sortDOM = function(descriptor, val) {
	var re = /^\{([a-z0-9\-_\s]+)\}$/gi; //subtag attributes

	var item_tags = []; //collects attributes per "slide"
	var elements = {}; //sorted DOM per tag name
	var other_than_rest = {};
	var other_than_rest_count = 0;
	var first_element_key = null;
	var last_element_key = null;

	var cycle_counter = 0;
	var cycle_flag = true;

	function newCycle() {
		if (cycle_flag) {
			return;
		}
		cycle_flag = true;
		cycle_counter++;
	}

	function resetCycle() {
		cycle_flag = false;
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
		}
	}
	//rest has to be always present, it is a default nondefined element
	elements.rest = [];

	for (var i = 0; i < val.length; i++) {
		var $item = $(val[i]);

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
				green_flag = true;
				newCycle();

				item_tags[cycle_counter] = match[1];
			}
		}

		if (other_than_rest_count && !green_flag) {
			for (var k in other_than_rest) {

				if (elements[k].length === descriptor.elements[k].count) { //if the count of elements reatches set count
					continue;
				}

				//XXX: this is a temporary and very bad solution
				if (k === 'img' && $item.find('li').length) {
					continue;
				}

				var $inner = $item.find(k); //gotta cover all the possible cases of undefined generated html

				if ($item.is(k) || $inner.length) {
					if ($inner.length) {
						$item = $inner.first();
					}

					elements[k].push($item);
					green_flag = true;
					//use interupts only if it is a repeater element, otherwise store all
					if (descriptor.hasOwnProperty('item_template')) {
						if (k === last_element_key) {
							resetCycle();
						} else {
							newCycle();
						}
					}
					break;
				}
			}
		}

		if (!green_flag) {
			//collecting other elements
			if (descriptor.hasOwnProperty('item_template')) { //if it is a repeater
				resetCycle();

				if (!elements.rest[cycle_counter]) {
					elements.rest[cycle_counter] = [];
				}
				elements.rest[cycle_counter].push($item[0]);

			} else {
				elements.rest.push($item[0]);
			}
		}
	}

	return {	elements: elements,
				item_tags: item_tags,
				first_element_key: first_element_key,
				last_element_key: last_element_key
	};
}

//TODO: simplify with declarative programming
Shortcodes.prototype.executeProperties = function($item, $dest, props, descriptor) {
	// Extract DOM attributes
	if (props.extract_fn === 'attr') {
		if (typeof props.extract_attr === 'string') {
			extract = $item[props.extract_fn](props.extract_attr);
		} else { // if it has multiple attributes to extract, like alt image -> for binding use custom function
			extract = [];
			for (var i = 0; i < props.extract_attr.length; i++) {
				if (props.extract_attr[i] === 'html') {
					extract.push($item.html());
					continue;
				}
				var attr = props.extract_attr[i];
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
		props.bind_fn(extract, $dest, props, descriptor); //execute custom bind function
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
		for (var i = 0; i < sorted.elements[sorted.first_element_key].length; i++) {
			var $item_template = this.getTemplate(descriptor.item_template);
			if (sorted.item_tags[i]) {
				$item_template.addClass(sorted.item_tags[i]);
			}

			for (var k in descriptor.elements) {
				var props = descriptor.elements[k];
				if (sorted.elements[k][i]) { //if the element exists, may be an uneven number
					var $item = $(sorted.elements[k][i]);
					this.executeProperties($item, $item_template, props, descriptor);
				}
			}

			var $dest = descriptor.hasOwnProperty('template') ? $template.find(descriptor.item_anchor) : $(descriptor.anchor);
			if (typeof descriptor.bind_fn === 'function') {
				descriptor.bind_fn($item_template, $dest, descriptor, parsed_attrs);
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
						this.executeProperties($item, $dest, props, descriptor);
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
	var $template = $('#templates').find(selector+'.template').clone();
	$template.removeClass('template');
	return $template;
}

//TODO: what about subtag attribute parses?
Shortcodes.prototype.parseAttributes = function(descriptor, attrs) {
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
				descriptor.anchor = '.shortcode-landing-' + pts[0];
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
		var descriptor = window.d0.clone(self.descriptor_index[k]);

		var parsed_attrs = self.parseAttributes(descriptor, attrs);

		if (descriptor.hasOwnProperty('pre') && descriptor.pre) {
			descriptor.pre(descriptor, attrs, val, parsed_attrs);
		}

		var $template = self.bind(descriptor, val, parsed_attrs);

		$template.addClass(parsed_attrs.classes.join(' '));
		$template.css(parsed_attrs.css);

		//TODO: per item callback
		if (descriptor.hasOwnProperty('callback') && descriptor.callback) {
			descriptor.callback($template, parsed_attrs, descriptor);
		}
	};
};

Shortcodes.prototype.execute = function($elem, callback) {
	$($elem).css('visibility', 'hidden');
	var shortcode_map = this.parseDOM($elem);

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

window.shortcodes = new Shortcodes();

//# sourceMappingURL=shortcodes.js.map
