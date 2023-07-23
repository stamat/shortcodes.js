/* shortcodes.js v1.0.0 | https://github.com/stamat/shortcodes.js | MIT License */

// src/spellbook/helpers.ts
function shallowMerge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}
function _cloneObject(o) {
  let res2 = {};
  for (const i in o) {
    res2[i] = clone(o[i]);
  }
  return res2;
}
function _cloneArray(a) {
  let res2 = [];
  for (var i = 0; i < a.length; i++) {
    res2[i] = clone(a[i]);
  }
  return res2;
}
function clone(o) {
  let res2 = null;
  if (Array.isArray(o)) {
    res2 = _cloneArray(o);
  } else if (typeof o === "object" && o !== null) {
    res2 = _cloneObject(o);
  } else {
    res2 = o;
  }
  return res2;
}
function insertBeforeElement(targetElement, newElement) {
  var _a;
  (_a = targetElement.parentNode) == null ? void 0 : _a.insertBefore(newElement, targetElement);
}
function removeAll(selector) {
  for (const element of document.querySelectorAll(selector)) {
    element.remove();
  }
}

// src/lib/parsers.js
function parseAttributes(str) {
  const re = /\s*(?:([a-z_]{1}[a-z0-9\-_]*)=?(?:"([^"]+)"|'([^']+)')*)\s*/gi;
  const reWithoutValue = /^\s*([a-z_]{1}[a-z0-9\-_]*)\s*$/i;
  const reHasValue = /^\s*([a-z_]{1}[a-z0-9\-_]*)=("[^"]+"|'[^']+')\s*$/i;
  const reReplaceFirstAndLastQuote = /^["']|["']$/g;
  const res2 = {};
  const match = str.match(re);
  for (let i = 0; i < match.length; i++) {
    const m = match[i];
    if (m === "")
      continue;
    if (reWithoutValue.test(m)) {
      const [, key] = m.match(reWithoutValue);
      res2[key] = null;
      reWithoutValue.lastIndex = 0;
    } else if (reHasValue.test(m)) {
      const [, key, value] = m.match(reHasValue);
      res2[key] = value.replace(reReplaceFirstAndLastQuote, "");
      reReplaceFirstAndLastQuote.lastIndex = 0;
      reHasValue.lastIndex = 0;
    }
  }
  return res2;
}
function getShortcodeContent(str) {
  const re = /\[([^\[\]]+)\]/i;
  const match = str.match(re);
  return match ? match[1] : null;
}
function isSpecificClosingTag(str, tag) {
  const re = new RegExp(`^\\/\\s*${tag}\\s*$`, "i");
  return re.test(str);
}
function getShortcodeName(str) {
  const re = /^\s*([a-z_]{1}[a-z0-9\-_]*)\s*/i;
  const match = str.match(re);
  return match ? match[1] : null;
}

// src/shortcodes.js
var Shortcodes = class {
  constructor(options) {
    this.descriptor_index = {};
    this.exec_fns = {};
    this.shopify_img_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(_[0-9]+x[0-9]*)(\.[a-z]{3,4}.*)$/gi;
    this.shopify_img_replacer_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(\.[a-z]{3,4}.*)$/gi;
    this.shortcode_re = /\[([^\[\]]+)\]/gi;
    this.options = {
      templates: "#templates",
      template_class: "template",
      self_anchor_class: "self-anchor",
      placement_class_prefix: "shortcode-landing"
    };
    if (options) {
      shallowMerge(this.options, options);
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
    const pref = "$1";
    let suf = "$2";
    if (!width)
      width = 100;
    let re = this.shopify_img_replacer_re;
    if (!re.test(src))
      return src;
    if (this.shopify_img_re.test(src)) {
      suf = "$3";
      re = this.shopify_img_re;
    }
    const replacement = `${pref}_${width}x${suf}`;
    return src.replace(re, replacement);
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
    const self_anchor = document.createElement("div");
    const classes = [];
    if (custom_anchor_class)
      classes.push(custom_anchor_class);
    if (shortcode_name)
      classes.push(`shortcode-${shortcode_name}`);
    if (counter)
      classes.push(`sc${counter}`);
    self_anchor.className = classes.join(" ");
    insertBeforeElement(elem, self_anchor);
    return self_anchor;
  }
  /**
   * Finds elements between the shortcodes makes a map of all shortcodes and their containing elements
   * 
   * @param {HTMLElement} elem - Entry element to parse and find shortcodes in
   * @param {object} register - Object containing all registered shortcodes, used to check if the shortcode is registered
   * @param {string} self_anchor_class - Class to add to the self anchor element
   */
  iterateNode(elem, register, self_anchor_class) {
    const map = {};
    const children = elem.children;
    let map_key = null;
    let last_shortcode = null;
    let shortcode_counter = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      let match = null;
      if (!(child instanceof HTMLPreElement || child.querySelector("pre"))) {
        const text = child.textContent.toLowerCase().trim();
        match = getShortcodeContent(text);
        if (match && !register.hasOwnProperty(getShortcodeName(match))) {
          match = null;
        }
      }
      if (match) {
        if (last_shortcode && isSpecificClosingTag(match, last_shortcode.name)) {
          map_key = null;
          last_shortcode = null;
          child.remove();
          continue;
        }
        last_shortcode = {
          content: match,
          name: getShortcodeName(match),
          attributes: parseAttributes(match),
          counter: shortcode_counter,
          elements: []
        };
        delete last_shortcode.attributes[last_shortcode.name];
        map_key = `${last_shortcode.name} sc${shortcode_counter}`;
        const self_anchor = this.createSelfAnchor(child, self_anchor_class, last_shortcode.name, shortcode_counter);
        if (!map.hasOwnProperty(map_key)) {
          map[map_key] = last_shortcode;
          shortcode_counter++;
        }
        map[map_key].elements.push(self_anchor);
        child.remove();
        continue;
      }
      if (map_key) {
        map[map_key].elements.push(child);
      }
    }
    return map;
  }
};
Shortcodes.prototype.sortDOM = function(descriptor, val) {
  var re = /^\{([a-z0-9\-_\s]+)\}$/gi;
  var item_tags = [];
  var elements = {};
  var other_than_rest = {};
  var other_than_rest_count = 0;
  var first_element_key = null;
  var last_element_key = null;
  var max_element_key = null;
  var cycle_counter = 0;
  var subtag_first_flag = false;
  function newCycle() {
    fillTheGaps();
    cycle_counter += 1;
  }
  elements.rest = [];
  var memo_block_template = {};
  var memo_block = {};
  function fillTheGaps() {
    for (var k2 in memo_block) {
      elements[k2].push(null);
    }
    memo_block = newMemoBlock();
  }
  function newMemoBlock() {
    res = {};
    for (var k2 in memo_block_template) {
      res[k2] = true;
    }
    return res;
  }
  if (descriptor.hasOwnProperty("elements")) {
    for (var k in descriptor.elements) {
      if (k !== "rest") {
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
    if ($item.hasClass(this.options.self_anchor_class)) {
      if (descriptor.anchor === "self") {
        descriptor.anchor = $item;
      }
      continue;
    }
    if (!$item.is("img") && $item.html().trim() === "") {
      continue;
    }
    var green_flag = false;
    if (descriptor.hasOwnProperty("item_template")) {
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
    if (other_than_rest_count) {
      for (var k in other_than_rest) {
        if (elements[k].length === descriptor.elements[k].count) {
          continue;
        }
        if (k === "img" && $item.find("li").length) {
          continue;
        }
        var $inner = $item.find(k);
        if ($item.is(k) || $inner.length) {
          if ($inner.length) {
            $item = $inner.first();
          }
          if (descriptor.hasOwnProperty("item_template") && !memo_block.hasOwnProperty(k)) {
            newCycle();
          }
          elements[k].push($item);
          if (descriptor.hasOwnProperty("item_template")) {
            delete memo_block[k];
          }
          green_flag = true;
          break;
        }
      }
    }
    if (!green_flag) {
      if (descriptor.hasOwnProperty("item_template")) {
        if (!elements.rest[cycle_counter]) {
          delete memo_block["rest"];
          elements.rest[cycle_counter] = [];
        }
        elements.rest[cycle_counter].push($item[0]);
      } else {
        elements.rest.push($item[0]);
      }
    }
  }
  if (descriptor.hasOwnProperty("item_template")) {
    fillTheGaps();
  }
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
  return {
    elements,
    item_tags,
    first_element_key,
    last_element_key,
    max_element_key
  };
};
Shortcodes.prototype.executeProperties = function($item, $dest, props, descriptor, num) {
  if (props.extract_fn === "attr") {
    if (typeof props.extract_attr === "string") {
      extract = $item[props.extract_fn](props.extract_attr);
      if ($item.is("img") && props.extract_attr === "src") {
        if (extract && this.shopify_img_re.test(extract)) {
          extract = extract.replace(this.shopify_img_re, "$1$3");
        }
      }
    } else {
      extract = [];
      for (var j = 0; j < props.extract_attr.length; j++) {
        if (props.extract_attr[j] === "html") {
          extract.push($item.html());
          continue;
        }
        if ($item.is("img") && props.extract_attr[j] === "src") {
          var src = $item.attr("src");
          if (src && this.shopify_img_re.test(src)) {
            extract.push(src.replace(this.shopify_img_re, "$1$3"));
            continue;
          }
        }
        var attr = props.extract_attr[j];
        extract.push($item[props.extract_fn](attr));
      }
    }
  } else if (props.extract_fn === "self") {
    extract = $item;
  } else {
    extract = $item[props.extract_fn]();
  }
  if (props.hasOwnProperty("parse")) {
    if (typeof props.parse === "function") {
      extract = props.parse(extract);
    } else {
      if (window.hasOwnProperty(props.parse)) {
        extract = window[props.parse](extract);
      }
    }
  }
  if (props.bind_fn === "css" && props.hasOwnProperty("bind_property") && props.bind_property === "background-image") {
    extract = "url(" + extract + ")";
  } else if (typeof props.bind_fn === "function") {
    props.bind_fn(extract, $dest, props, descriptor, num);
    return;
  }
  switch (props.anchor_element) {
    case "item":
      $target = $dest.find(props.anchor);
      if ($dest.is(props.anchor) && $target.length === 0) {
        $target = $dest;
      }
      if (props.bind_fn === "css" && props.hasOwnProperty("bind_property")) {
        $target[props.bind_fn](props.bind_property, extract);
      } else {
        $target[props.bind_fn](extract);
      }
      break;
    case "template":
      $target = $dest.find(props.anchor);
      if ($dest.is(props.anchor) && $target.length === 0) {
        $target = $dest;
      }
      if (props.bind_fn === "css" && props.hasOwnProperty("bind_property")) {
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
      if (props.bind_fn === "css" && props.hasOwnProperty("bind_property")) {
        $target[props.bind_fn](props.bind_property, extract);
      } else {
        $target[props.bind_fn](extract);
      }
  }
};
Shortcodes.prototype.bind = function(descriptor, val, parsed_attrs) {
  var $template = null;
  if (descriptor.hasOwnProperty("template")) {
    $template = this.getTemplate(descriptor.template);
  }
  var sorted = this.sortDOM(descriptor, val);
  if (descriptor.hasOwnProperty("item_template")) {
    for (var i = 0; i < sorted.elements[sorted.max_element_key].length; i++) {
      var $item_template = this.getTemplate(descriptor.item_template);
      if (sorted.item_tags[i]) {
        $item_template.addClass(sorted.item_tags[i]);
      }
      for (var k in descriptor.elements) {
        var props = descriptor.elements[k];
        if (sorted.elements[k][i]) {
          var $item = $(sorted.elements[k][i]);
          this.executeProperties($item, $item_template, props, descriptor, i);
        }
      }
      var $dest = descriptor.hasOwnProperty("template") ? $template.find(descriptor.item_anchor) : $(descriptor.anchor);
      if (typeof descriptor.bind_fn === "function") {
        descriptor.bind_fn($item_template, $dest, descriptor, parsed_attrs, i);
      } else {
        $dest[descriptor.bind_fn]($item_template);
      }
    }
  } else {
    if (descriptor.hasOwnProperty("elements")) {
      for (var k in descriptor.elements) {
        var props = descriptor.elements[k];
        if (sorted.elements.hasOwnProperty(k)) {
          for (var i = 0; i < sorted.elements[k].length; i++) {
            var $item = $(sorted.elements[k][i]);
            var $dest = descriptor.hasOwnProperty("template") ? $template : $(descriptor.anchor);
            this.executeProperties($item, $dest, props, descriptor, i);
          }
        }
      }
    } else {
      var $dest = descriptor.hasOwnProperty("template") ? $template : $(descriptor.anchor);
      if (typeof descriptor.bind_fn === "function") {
        descriptor.bind_fn(sorted.elements.rest, $dest, descriptor, parsed_attrs);
      } else {
        $dest[descriptor.bind_fn](sorted.elements.rest);
      }
    }
  }
  if (descriptor.hasOwnProperty("template")) {
    if (typeof descriptor.bind_fn === "function") {
      descriptor.bind_fn($template, $(descriptor.anchor), descriptor, parsed_attrs);
    } else {
      $(descriptor.anchor)[descriptor.bind_fn]($template);
    }
    return $template;
  }
  return $(descriptor.anchor);
};
Shortcodes.prototype.getTemplate = function(selector) {
  var $template = $(this.options.templates).find(selector + "." + this.options.template_class).clone();
  $template.removeClass(this.options.template_class);
  return $template;
};
Shortcodes.prototype.parseAttribute = function(attr) {
  var res2 = {
    name: null,
    value: null
  };
  var pts = attr.split("=");
  if (pts.length === 2) {
    res2.name = pts[0].trim();
    res2.value = pts[1].trim();
  }
  return res2;
};
Shortcodes.prototype.parseAttributes = function(descriptor, attrs) {
  var self = this;
  const res2 = {
    classes: [],
    css: {},
    attrs: {}
  };
  const fns = {};
  fns["header"] = function(pts2, descriptor2, attr2) {
    let header = null;
    if (descriptor2.hasOwnProperty("header_selector") && descriptor2.header_selector) {
      header = document.querySelector(descriptor2.header_selector);
    }
    if (!header)
      document.querySelector("header");
    if (!header)
      document.querySelector("body");
    header.classList.add(pts2.join("-"));
  };
  fns["placement"] = function(pts2, descriptor2, attr2) {
    if (pts2[0]) {
      if (pts2[0] === "content") {
        descriptor2.anchor = "self";
      } else {
        descriptor2.anchor = "." + self.options.placement_class_prefix + "-" + pts2[0];
      }
    }
  };
  fns["background"] = function(pts2, descriptor2, attr2) {
    if (pts2[0] && pts2[0] === "color" && pts2[1]) {
      res2.css["background-color"] = "#" + pts2[1];
    } else {
      res2.classes.push(attr2);
    }
  };
  fns["color"] = function(pts2, descriptor2, attr2) {
    if (pts2[0]) {
      res2.css["color"] = pts2[0];
    } else {
      res2.classes.push(attr2);
    }
  };
  if (descriptor.hasOwnProperty("attribute_parsers")) {
    for (var k in descriptor.attribute_parsers) {
      fns[k] = descriptor.attribute_parsers[k];
    }
  }
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i].trim().toLowerCase();
    if (/sc[0-9]+/gi.test(attr)) {
      continue;
    }
    var pts = attr.split("-");
    if (pts[0] && fns.hasOwnProperty(pts[0])) {
      fns[pts.shift()](pts, descriptor, attr);
    } else {
      res2.classes.push(attr);
    }
  }
  return res2;
};
Shortcodes.prototype.register = function(shortcode_name, descriptor) {
  this.descriptor_index[shortcode_name] = descriptor;
  var self = this;
  this.exec_fns[shortcode_name] = function(k, attrs, val) {
    const descriptor2 = clone(self.descriptor_index[k]);
    const parsed_attrs = self.parseAttributes(descriptor2, attrs);
    console.log(parsed_attrs);
    if (descriptor2.hasOwnProperty("pre") && descriptor2.pre && typeof descriptor2.pre === "function") {
      descriptor2.pre(descriptor2, attrs, val, parsed_attrs);
    }
    var $template = self.bind(descriptor2, val, parsed_attrs);
    $template.addClass(parsed_attrs.classes.join(" "));
    $template.css(parsed_attrs.css);
    $template.addClass("shortcode-js");
    if (descriptor2.hasOwnProperty("callback") && descriptor2.callback) {
      descriptor2.callback($template, parsed_attrs, descriptor2);
    }
  };
};
Shortcodes.prototype.execute = function(elem, callback) {
  elem.style.visibility = "hidden";
  const shortcode_map = this.iterateNode(elem, this.descriptor_index, this.options.self_anchor_class);
  for (let k in shortcode_map) {
    const attrs = shortcode_map[k].attributes;
    const fn_name = shortcode_map[k].name;
    const elements = shortcode_map[k].elements;
    if (this.exec_fns.hasOwnProperty(fn_name)) {
      this.exec_fns[fn_name](fn_name, attrs, elements);
    }
  }
  elem.style.visibility = "visible";
  if (callback)
    callback(shortcode_map, this.exec_fns);
};
Shortcodes.prototype.clear = function() {
  removeAll(".shortcode-js");
  removeAll(".self-anchor");
};
Shortcodes.prototype.reinitialize = function($elem, callback) {
  this.clear();
  this.execute($elem, callback);
};
//# sourceMappingURL=shortcodes.js.map
