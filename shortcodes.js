/* shortcodes.js v1.0.2 | https://github.com/stamat/shortcodes.js | MIT License */
(() => {
  // node_modules/book-of-spells/src/parsers.mjs
  function parseAttributes(str) {
    const re = /\s*(?:([a-z_]{1}[a-z0-9\-_]*)=?(?:"([^"]+)"|'([^']+)')*)\s*/gi;
    const reWithoutValue = /^\s*([a-z_]{1}[a-z0-9\-_]*)\s*$/i;
    const reHasValue = /^\s*([a-z_]{1}[a-z0-9\-_]*)=("[^"]+"|'[^']+')\s*$/i;
    const reReplaceFirstAndLastQuote = /^["']|["']$/g;
    const res2 = {};
    const match = str.match(re);
    for (let i2 = 0; i2 < match.length; i2++) {
      const m = match[i2];
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

  // node_modules/book-of-spells/src/helpers.mjs
  function shallowMerge(target, source) {
    for (const key in source) {
      target[key] = source[key];
    }
  }
  function clone(o) {
    let res2 = null;
    if (isArray(o)) {
      res2 = [];
      for (const i2 in o) {
        res2[i2] = clone(o[i2]);
      }
    } else if (isObject(o)) {
      res2 = {};
      for (const i2 in o) {
        res2[i2] = clone(o[i2]);
      }
    } else {
      res2 = o;
    }
    return res2;
  }
  function isObject(o) {
    return typeof o === "object" && !Array.isArray(o) && o !== null;
  }
  function isArray(o) {
    return Array.isArray(o);
  }
  function isString(o) {
    return typeof o === "string";
  }
  function isFunction(o) {
    return typeof o === "function";
  }
  function propertyIsFunction(obj, propertyName) {
    return obj.hasOwnProperty(propertyName) && isFunction(obj[propertyName]);
  }
  function propertyIsString(obj, propertyName) {
    return obj.hasOwnProperty(propertyName) && isString(obj[propertyName]);
  }
  function transformDashToCamelCase(str) {
    return str.replace(/-([a-z])/g, function(g) {
      return g[1].toUpperCase();
    });
  }
  function hasOwnProperties(obj, properties) {
    if (!isArray(properties))
      properties = [properties];
    for (let i2 = 0; i2 < properties.length; i2++) {
      if (!obj.hasOwnProperty(properties[i2]))
        return false;
    }
    return true;
  }

  // node_modules/book-of-spells/src/dom.mjs
  function isEmptyElement(element) {
    return element.innerHTML.trim() === "";
  }
  function remove(selector, from = document) {
    const elements = query(selector, from);
    for (const element of elements) {
      element.remove();
    }
  }
  function query(selector, from = document) {
    if (selector instanceof Array || selector instanceof NodeList)
      return selector;
    if (selector instanceof Element)
      return [selector];
    if (from instanceof Element || from instanceof Document)
      return from.querySelectorAll(selector);
    if (isString(from))
      from = query(from);
    if (!from instanceof Array && !from instanceof NodeList)
      return [];
    const res2 = [];
    for (const element of from) {
      res2.push(...element.querySelectorAll(selector));
    }
    return res2;
  }
  function css(element, styles, transform = false) {
    if (!element || !styles)
      return;
    for (let property in styles) {
      if (transform)
        property = transformDashToCamelCase(property);
      element.style[property] = styles[property];
    }
  }
  function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    const res2 = txt.value;
    txt.remove();
    return res2;
  }
  function insertBeforeElement(targetElement, newElement) {
    if (!targetElement || !newElement)
      return;
    targetElement.parentNode.insertBefore(newElement, targetElement);
  }
  function matchesAll(elements, selector) {
    if (!elements || !selector || !elements.length)
      return false;
    if (elements instanceof Element)
      elements = [elements];
    if (isString(elements))
      elements = query(elements);
    for (const element of elements) {
      if (!element.matches(selector))
        return false;
    }
    return true;
  }

  // src/lib/parsers.js
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

  // src/lib/Shortcode.js
  var Shortcode = class {
    constructor(tag_content, descriptor2, counter, opts) {
      const name = getShortcodeName(tag_content);
      const attributes = parseAttributes(tag_content);
      delete attributes[name];
      this.tag_content = tag_content;
      this.uid = `${name}-sc-${counter}`;
      this.name = name;
      this.attributes = attributes;
      this.descriptor = clone(descriptor2);
      this.content = [];
      this.counter = counter;
      this.classes = [];
      this.css = {};
      this.options = {
        placement_class_prefix: "shortcode-landing"
      };
      if (opts) {
        shallowMerge(this.options, opts);
      }
    }
    executeAttributes() {
      var self = this;
      const fns = {};
      fns["header-class"] = function(shortcode_obj, value) {
        let header = null;
        if (shortcode_obj.descriptor.hasOwnProperty("header_selector") && shortcode_obj.descriptor.header_selector) {
          header = document.querySelector(shortcode_obj.descriptor.header_selector);
        }
        if (!header)
          header = document.querySelector("header");
        if (!header)
          header = document.querySelector("body");
        header.classList.add(value);
      };
      fns["body-class"] = function(shortcode_obj, value) {
        document.querySelector("body").classList.add(value);
      };
      fns["placement"] = function(shortcode_obj, value) {
        if (value === "content") {
          shortcode_obj.descriptor.anchor = "self";
          return;
        }
        shortcode_obj.descriptor.anchor = `.${self.options.placement_class_prefix}-${value}`;
      };
      fns["background-color"] = function(shortcode_obj, value) {
        shortcode_obj.css["backgroundColor"] = value;
      };
      fns["background-image"] = function(shortcode_obj, value) {
        shortcode_obj.css["backgroundImage"] = `url(${value})`;
      };
      fns["color"] = function(shortcode_obj, attr) {
        shortcode_obj.css["color"] = attr;
      };
      if (this.descriptor.hasOwnProperty("attribute_parsers")) {
        for (const k in this.descriptor.attribute_parsers) {
          if (propertyIsFunction(this.descriptor.attribute_parsers, k)) {
            fns[k] = this.descriptor.attribute_parsers[k];
          }
        }
      }
      for (const key in this.attributes) {
        const value = this.attributes[key];
        if (fns.hasOwnProperty(key) && value) {
          fns[key](this, value);
        } else {
          this.classes.push(key);
        }
      }
      return this;
    }
  };

  // src/shortcodes.js
  var Shortcodes = class {
    constructor(options) {
      this.descriptor_index = {};
      this.exec_fns = {};
      this.shopify_img_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(_[0-9]+x[0-9]*)(\.[a-z]{3,4}.*)$/gi;
      this.shopify_img_replacer_re = /^([a-z\.:\/]+\.shopify\.[a-z0-9\/_\-]+)(\.[a-z]{3,4}.*)$/gi;
      this.options = {
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
        classes.push(`${shortcode_name}-sc-${counter}`);
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
      let last_shortcode = null;
      let shortcode_counter = 0;
      for (let i2 = 0; i2 < children.length; i2++) {
        const child = children[i2];
        let match = null;
        if (!(child instanceof HTMLPreElement || child.querySelector("pre"))) {
          const text = decodeHTML(child.textContent.trim());
          match = getShortcodeContent(text);
          if (match && !register.hasOwnProperty(getShortcodeName(match))) {
            match = null;
          }
        }
        if (match) {
          if (last_shortcode && isSpecificClosingTag(match, last_shortcode.name)) {
            last_shortcode = null;
            child.remove();
            continue;
          }
          last_shortcode = new Shortcode(match, clone(register[getShortcodeName(match)]), shortcode_counter);
          const self_anchor = this.createSelfAnchor(child, self_anchor_class, last_shortcode.name, shortcode_counter);
          if (!map.hasOwnProperty(last_shortcode.uid)) {
            map[last_shortcode.uid] = last_shortcode;
            shortcode_counter++;
          }
          map[last_shortcode.uid].content.push(self_anchor);
          child.remove();
          continue;
        }
        if (last_shortcode.uid) {
          map[last_shortcode.uid].content.push(child);
        }
      }
      return map;
    }
  };
  Shortcodes.prototype.sortDOM = function(shortcode_obj) {
    const descriptor2 = shortcode_obj.descriptor;
    const content = shortcode_obj.content;
    const reSubtag = /^\s*\{\s*([a-z0-9\-_\s]+)\s*\}\s*$/gi;
    const item_tags = [];
    const elements = {};
    const other_than_rest = {};
    let other_than_rest_count = 0;
    let first_element_key = null;
    let last_element_key = null;
    let max_element_key = null;
    let cycle_counter = 0;
    let subtag_first_flag = false;
    function newCycle() {
      fillTheGaps();
      cycle_counter += 1;
    }
    elements.rest = [];
    const memo_block_template = {};
    let memo_block = {};
    function fillTheGaps() {
      for (const k in memo_block) {
        elements[k].push(null);
      }
      memo_block = newMemoBlock();
    }
    function newMemoBlock() {
      res = {};
      for (const k in memo_block_template) {
        res[k] = true;
      }
      return res;
    }
    if (descriptor2.hasOwnProperty("elements")) {
      for (const k in descriptor2.elements) {
        if (k !== "rest") {
          last_element_key = k;
          if (!elements.hasOwnProperty(k))
            elements[k] = [];
          if (first_element_key === null)
            first_element_key = k;
          if (!other_than_rest.hasOwnProperty(k)) {
            other_than_rest[k] = true;
            other_than_rest_count++;
          }
        }
        memo_block_template[k] = true;
        memo_block[k] = true;
      }
    }
    for (let i2 = 0; i2 < content.length; i2++) {
      let item = content[i2];
      if (item.classList.contains(this.options.self_anchor_class)) {
        if (descriptor2.anchor === "self")
          descriptor2.anchor = item;
        continue;
      }
      if (!item.matches("img") && isEmptyElement(item))
        continue;
      let green_flag = false;
      if (descriptor2.hasOwnProperty("item_template")) {
        var text = item.textContent.trim();
        var match = reSubtag.exec(text);
        reSubtag.lastIndex = 0;
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
        for (const k in other_than_rest) {
          if (elements[k].length === descriptor2.elements[k].count) {
            continue;
          }
          if (k === "img" && item.querySelectorAll("li").length) {
            continue;
          }
          const inner = item.querySelector(k);
          if (item.matches(k) || inner) {
            if (inner)
              item = inner;
            if (descriptor2.hasOwnProperty("item_template") && !memo_block.hasOwnProperty(k)) {
              newCycle();
            }
            elements[k].push(item);
            if (descriptor2.hasOwnProperty("item_template")) {
              delete memo_block[k];
            }
            green_flag = true;
            break;
          }
        }
      }
      if (!green_flag) {
        if (descriptor2.hasOwnProperty("item_template")) {
          if (!elements.rest[cycle_counter]) {
            delete memo_block["rest"];
            elements.rest[cycle_counter] = [];
          }
          elements.rest[cycle_counter].push(item);
        } else {
          elements.rest.push(item);
        }
      }
    }
    if (descriptor2.hasOwnProperty("item_template")) {
      fillTheGaps();
    }
    let max_count = null;
    for (const k in other_than_rest) {
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
  Shortcodes.prototype.constructElements = function(item, dest, props, shortcode_obj, num) {
    const descriptor2 = shortcode_obj.descriptor;
    const extracted = props.extract ? this.extract(item, props.extract) : null;
    if (!extracted)
      return;
    console.log(item);
    if (matchesAll(item, "img") && extracted.hasOwnProperty("src")) {
      if (this.shopify_img_re.test(extracted.src)) {
        extracted.src = extracted.src.replace(this.shopify_img_re, "$1$3");
      }
    }
    if (propertyIsFunction(props, "parse_extracted")) {
      props.parse(extracted, item, dest, props, shortcode_obj, num);
    } else if (propertyIsString(props, "parse_extracted") && propertyIsFunction(window, props.parse_extracted)) {
      window[props.parse_extracted](extracted, item, dest, props, shortcode_obj, num);
    }
    if (!props.hasOwnProperty("bind_extracted"))
      return;
    if (!isArray(props.bind_extracted))
      props.bind_extracted = [props.bind_extracted];
    if (props.hasOwnProperty("anchor_element")) {
      finalDestination = query(props.anchor, dest);
    } else {
      finalDestination = query(props.anchor, descriptor2.anchor);
    }
    if (!finalDestination.length && dest.matches(props.anchor))
      finalDestination = dest;
    if (finalDestination instanceof Element)
      finalDestination = [finalDestination];
    for (let i2 = 0; i2 < finalDestination.length; i2++) {
      this.bindElement(finalDestination[i2], props.bind_extracted, extracted, props, shortcode_obj, num);
    }
  };
  Shortcodes.prototype.construct = function(shortcode_obj) {
    let template = null;
    if (shortcode_obj.descriptor.hasOwnProperty("template")) {
      template = this.getTemplate(shortcode_obj.descriptor.template);
    }
    const sorted = this.sortDOM(shortcode_obj);
    if (shortcode_obj.descriptor.hasOwnProperty("item_template")) {
      for (let i2 = 0; i2 < sorted.elements[sorted.max_element_key].length; i2++) {
        const item_template = this.getTemplate(shortcode_obj.descriptor.item_template);
        if (sorted.item_tags[i2]) {
          item_template.classList.add(sorted.item_tags[i2]);
        }
        for (const k in shortcode_obj.descriptor.elements) {
          var props = shortcode_obj.descriptor.elements[k];
          if (sorted.elements[k][i2]) {
            const item = sorted.elements[k][i2];
            this.constructElements(item, item_template, props, shortcode_obj, i2);
          }
        }
        const dest = shortcode_obj.descriptor.hasOwnProperty("template") ? template.querySelectorAll(shortcode_obj.descriptor.item_anchor) : document.querySelectorAll(descriptor.anchor);
        this.bindShortcode(item_template, dest, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj, i2);
      }
    } else {
      if (shortcode_obj.descriptor.hasOwnProperty("elements")) {
        for (const k in shortcode_obj.descriptor.elements) {
          var props = shortcode_obj.descriptor.elements[k];
          if (sorted.elements.hasOwnProperty(k)) {
            for (let i2 = 0; i2 < sorted.elements[k].length; i2++) {
              const item = sorted.elements[k][i2];
              const dest = shortcode_obj.descriptor.hasOwnProperty("template") ? template : document.querySelectorAll(shortcode_obj.descriptor.anchor);
              this.constructElements(item, dest, props, shortcode_obj, i2);
            }
          }
        }
      } else {
        const dest = shortcode_obj.descriptor.hasOwnProperty("template") ? template : document.querySelectorAll(shortcode_obj.descriptor.anchor);
        this.bindShortcode(sorted.elements.rest, dest, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj);
      }
    }
    if (shortcode_obj.descriptor.hasOwnProperty("template")) {
      this.bindShortcode(template, shortcode_obj.descriptor.anchor, shortcode_obj.descriptor.bind_fn, shortcode_obj.descriptor.bind_property, shortcode_obj);
      return template;
    }
    return document.querySelector(shortcode_obj.descriptor.anchor);
  };
  Shortcodes.prototype.getTemplate = function(selector) {
    selector = [selector];
    if (this.options.template_class) {
      selector.push(`.${this.options.template_class}`);
    }
    const template = document.querySelector(selector.join("")).cloneNode(true);
    template.classList.remove(this.options.template_class);
    template.removeAttribute("hidden");
    template.removeAttribute("aria-hidden");
    return template;
  };
  Shortcodes.prototype.register = function(shortcode_name, descriptor2) {
    this.descriptor_index[shortcode_name] = descriptor2;
    const self = this;
    this.exec_fns[shortcode_name] = function(shortcode_obj) {
      shortcode_obj.executeAttributes();
      if (propertyIsFunction(shortcode_obj.descriptor, "pre")) {
        shortcode_obj.descriptor.pre(shortcode_obj);
      }
      const template = self.construct(shortcode_obj);
      if (template) {
        if (shortcode_obj.classes.length)
          template.classList.add(shortcode_obj.classes.join(" "));
        css(template, shortcode_obj.css);
        template.classList.add("shortcode-js");
      }
      if (propertyIsFunction(shortcode_obj.descriptor, "callback")) {
        shortcode_obj.descriptor.callback(template, shortcode_obj);
      }
    };
  };
  Shortcodes.prototype.execute = function(elem, callback) {
    elem.style.visibility = "hidden";
    const shortcode_map = this.iterateNode(elem, this.descriptor_index, this.options.self_anchor_class);
    for (const key in shortcode_map) {
      const fn_name = shortcode_map[key].name;
      if (this.exec_fns.hasOwnProperty(fn_name)) {
        this.exec_fns[fn_name](shortcode_map[key]);
      }
    }
    elem.style.visibility = "visible";
    if (callback)
      callback(shortcode_map, this.exec_fns);
  };
  Shortcodes.prototype.clear = function() {
    remove(".shortcode-js");
    remove(".self-anchor");
  };
  Shortcodes.prototype.reinitialize = function(elem, callback) {
    this.clear();
    this.execute(elem, callback);
  };
  Shortcodes.prototype.bindElement = function(destination, properties, extracted, payload, additional_payload, num) {
    if (isString(destination))
      destination = querySingle(destination);
    if (isString(properties))
      properties = [properties];
    const fns = {};
    fns["append"] = function(destination2, property, extracted2) {
      if (!extracted2.hasOwnProperty("self"))
        return;
      if (extracted2.self instanceof HTMLElement)
        extracted2.self = [extracted2.self];
      for (let i2 = 0; i2 < extracted2.self.length; i2++) {
        destination2.appendChild(extracted2.self[i2]);
      }
    };
    fns["prepend"] = function(destination2, property, extracted2) {
      if (!extracted2.hasOwnProperty("self"))
        return;
      if (extracted2.self instanceof HTMLElement)
        extracted2.self = [extracted2.self];
      for (let i2 = 0; i2 < extracted2.self.length; i2++) {
        if (destination2.firstChild) {
          destination2.insertBefore(extracted2.self[i2], destination2.firstChild);
        } else {
          destination2.appendChild(extracted2.self[i2]);
        }
      }
    };
    fns["html"] = function(destination2, property, extracted2) {
      if (!extracted2.hasOwnProperty("html"))
        return;
      destination2.innerHTML = extracted2.html;
    };
    fns["text"] = function(destination2, property, extracted2) {
      if (!extracted2.hasOwnProperty("text"))
        return;
      destination2.textContent = extracted2.text;
    };
    fns["style"] = function(destination2, property, extracted2) {
      if (!isArray(property))
        property = [property];
      for (let i2 = 0; i2 < property.length; i2++) {
        if (!isObject(property[i2]) || !hasOwnProperties(property[i2], "style_property", "extracted_property"))
          continue;
        const camelCaseProp = transformDashToCamelCase(property[i2].style_property);
        if (!extracted2.hasOwnProperty(property[i2].extracted_property))
          continue;
        let extract = extracted2[property[i2].extracted_property];
        if (camelCaseProp === "backgroundImage") {
          extract = `url(${extract})`;
        }
        destination2.style[camelCaseProp] = extract;
      }
    };
    for (let i2 = 0; i2 < properties.length; i2++) {
      if (fns.hasOwnProperty(properties[i2])) {
        fns[properties[i2]](destination, properties[i2], extracted);
        continue;
      }
      if (isFunction(properties[i2])) {
        properties[i2](destination, extracted, payload, additional_payload, num);
        continue;
      }
      if (isObject(properties[i2])) {
        fns["style"](destination, properties[i2], extracted);
        continue;
      }
      destination.setAttribute(properties[i2], extracted[properties[i2]]);
    }
  };
  Shortcodes.prototype.bindShortcode = function(source, destination, function_name, property_name, payload, additional_payload) {
    if (typeof destination === "string")
      destination = query(destination);
    else if (destination instanceof HTMLElement)
      destination = [destination];
    if (typeof source === "string")
      source = query(source);
    else if (source instanceof HTMLElement)
      source = [source];
    if (isFunction(function_name)) {
      function_name(source, destination, property_name, payload, additional_payload);
      return;
    }
    const fns = {};
    fns["style"] = function(source2, destination2, property_name2, payload2, additional_payload2) {
      if (typeof property_name2 === "string")
        property_name2 = [property_name2];
      for (let i2 = 0; i2 < property_name2.length; i2++) {
        const propCamelCase = transformDashToCamelCase(property_name2[i2]);
        destination2.style[propCamelCase] = source2.style[propCamelCase];
      }
    };
    fns["html"] = function(source2, destination2, property_name2, payload2, additional_payload2) {
      destination2.innerHTML = source2.innerHTML;
    };
    fns["text"] = function(source2, destination2, property_name2, payload2, additional_payload2) {
      destination2.textContent = source2.textContent;
    };
    fns["prepend"] = function(source2, destination2, property_name2, payload2, additional_payload2) {
      if (destination2.firstChild) {
        destination2.insertBefore(source2, destination2.firstChild);
      } else {
        destination2.appendChild(source2);
      }
    };
    fns["append"] = function(source2, destination2, property_name2, payload2, additional_payload2) {
      destination2.appendChild(source2);
    };
    if (destination.length) {
      for (let i2 = 0; i2 < destination.length; i2++) {
        for (let j = 0; j < source.length; j++) {
          if (fns.hasOwnProperty(function_name)) {
            fns[function_name](source[j], destination[i2], property_name, payload, additional_payload);
          }
        }
      }
    }
  };
  Shortcodes.prototype.extract = function(element, properties) {
    if (typeof element === "string")
      element = querySingle(element);
    if (typeof properties === "string")
      properties = [properties];
    const fns = {};
    const result = {};
    fns["html"] = function(element2, property) {
      result.html = element2.innerHTML;
    };
    fns["text"] = function(element2, property) {
      result.text = element2.textContent;
    };
    fns["self"] = function(element2, property) {
      result.self = element2;
    };
    fns["style"] = function(element2, property) {
      if (!hasOwnProperties(properties[i], ["name", "properties"]))
        return;
      if (!property.name === "style")
        return;
      if (!isArray(property.properties))
        property.properties = [property.properties];
      result.style = {};
      for (let i2 = 0; i2 < property.properties.length; i2++) {
        const camelCaseProp = transformDashToCamelCase(property.properties[i2]);
        result.style[property.properties[i2]] = element2.style[camelCaseProp];
      }
    };
    fns["function"] = function(element2, property) {
      if (!hasOwnProperties(property, ["name", "extract_fn"]))
        return;
      if (!isFunction(property.extract_fn))
        return;
      result[property.name] = property.extract_fn(element2);
    };
    for (let i2 = 0; i2 < properties.length; i2++) {
      if (fns.hasOwnProperty(properties[i2])) {
        fns[properties[i2]](element, properties[i2]);
        continue;
      }
      if (isObject(properties[i2])) {
        fns["function"](element, properties[i2]);
        fns["style"](element, properties[i2]);
        continue;
      }
      result[properties[i2]] = element.getAttribute(properties[i2]);
    }
    return result;
  };

  // src/index.js
  if (typeof window !== "undefined") {
    window.Shortcodes = Shortcodes;
  }
})();
//# sourceMappingURL=shortcodes.js.map
