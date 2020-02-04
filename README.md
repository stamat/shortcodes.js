# shortcodes.js v1.0.1
JavaScript Shortcode Engine that uses sequences of DOM elements for templating dynamic and beautiful layouts while preserving SEO where backend development is limited, e.g. Shopify.

## Dependencies

**jQuery 1.11.3+**

## How it works?
The shortcodes work by interpreting different text formatting, set in WYSIWYG editor under the shortcode tag, predefined for each tag. For example a simple marquee shortcode will interpret an H1 (Header size 1) as a title of the marque and an image inserted into the text as a background image. All this based on provided descriptor and template DOM Element....

*TODO: basic code setup and demo in action*

# *Work in progress!*

## Sample descriptor

Unfortunately this descriptor example is only for me to navigate the code and remember what is what, before I write the documentation and demos.

I know my nomenclature and logic can be confusing sometimes, since it's confusing even for myself sometimes. So the work on this piece of code will be simplification through refactoring. NOTE: Descriptor nomenclature might change with every major release.

```javascript
var example_descriptor = {
    template: 'section.carousel',
    anchor: '.carousel-landing', // or "self" if you use a closing tag for shortcode this will inject the shortcode at the place it was found
    item_template: '.slide.section-carousel',
    item_anchor: '.slides-landing',
	pre: function(descriptor, attrs, val) {/*...*/}, //callback before templating
	attribute_parsers: {custom: function(pts, descriptor, attr){} /*...*/}, //additional attribute parsing methods, see Shortcodes.prototype.parseAttributes. This example will trigger a function for any attribute starting with "custom-"
	callback: function($template, parsed_attrs, descriptor) {/*...*/}, //callback after templating is complete, with arguments sufficient for doing some manual additional programming
    bind_fn: 'append', // jquery function html, text, append, before, prepend or custom function with arguments (extract, $dest, props, descriptor)
    elements: {
        'img': {
            count: 'many',
            bind_fn: function(extract, $dest, props, descriptor) {
                // console.log('whoa');
            },
            extract_fn: 'attr', //what about the alt images?
            extract_attr: ['src', 'alt'], //if extract is attr you need to provide which attr, can be string or array
            anchor: '.image-landing',
            anchor_element: 'item'
        },
        'h1, h2, h3, h4': {
            count: 'many', // count = 'many' or num
            bind_fn: 'html', // jquery function html, text, append, before, prepend, or custom function
            extract_fn: 'html', // jquery function html, text, self, attr or custom function
            anchor: '.title-landing', // where on element should it land
            anchor_element: 'item', // item or template or anchor (to the selected element)
        },
        'rest': { //rest items are used
            extract_fn: 'self',
            bind_fn: 'append',
            anchor: '.rest-landing',
            anchor_element: 'item'
        }
    }
};

shortcodes.register('example', example_descriptor); //will register [example] shortcode based on provided descriptor, which contains all the infromation required for parsing DOM and templates with the instructions for templating.
```

## Licensing
### Open Source
GPL v3.0 - https://www.gnu.org/licenses/gpl-3.0.en.html

### Commercial
If you wish to use Shortcodes.js in commercial products and applications - you are obliged to contact <sam@oshinstudio.com> OSHIN LLC for the details of the commercial licence.

The original bearers of the commercial licence are OSHIN LLC and Nikola Stamatovic @stamat, where OSHIN LLC is the only party able to issue commercial licences.

## Project and development by
Nikola Stamatovic @stamat <nikola@oshinstudio.com>, OSHIN LLC
