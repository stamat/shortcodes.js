require = require('esm')(module)
const { parseAttributes, getShortcodeContent, isSpecificClosingTag, getShortcodeName } = require('./parsers')

test('parseAttributes', () => {
  expect(parseAttributes('shortcode foo="bar"')).toEqual({"foo": "bar", "shortcode": null})
  expect(parseAttributes('foo="bar" baz="qux"')).toEqual({ foo: 'bar', baz: 'qux' })
  expect(parseAttributes("button text=\"Click me\" data='{\"key\": \"value\"}' class=\"btn btn-primary\"")).toEqual({ button: null, text: 'Click me', data: '{"key": "value"}', class: 'btn btn-primary' })
  expect(parseAttributes("text=\"Click me\" data='{\"key\": \"value\"}' class=\"btn btn-primary\"")).toEqual({ text: 'Click me', data: '{"key": "value"}', class: 'btn btn-primary' })
})

test('getShortcodeContent', () => {
  expect(getShortcodeContent('[shortcode foo="bar"]')).toEqual('shortcode foo="bar"')
  expect(getShortcodeContent('[shortcode foo="bar"] [foo bar="baz"]')).toEqual('shortcode foo="bar"')
  expect(getShortcodeContent('shortcode foo="bar"]')).toEqual(null)
  expect(getShortcodeContent('[shortcode foo="bar"')).toEqual(null)
})

test('isSpecificClosingTag', () => {
  const shortcodeTagContent = getShortcodeContent('[/  shortcode ]')
  expect(isSpecificClosingTag(shortcodeTagContent, 'shortcode')).toEqual(true)
  expect(isSpecificClosingTag(shortcodeTagContent, 'foo')).toEqual(false)
  expect(isSpecificClosingTag(shortcodeTagContent, 'shortcode1')).toEqual(false)
  expect(isSpecificClosingTag(shortcodeTagContent, 'shortcod')).toEqual(false)
  expect(isSpecificClosingTag(shortcodeTagContent, 'shortcod1')).toEqual(false)
})

test('getShortcodeName', () => {
  const testShortcodeMap = {
    'shortcode': '[shortcode foo="bar"]',
    'foo': '[foo test foo="bar"]',
    'baz': '[baz foo]',
    'qux': '[qux]'
  }

  for (const key in testShortcodeMap) {
    const shortcodeTagContent = getShortcodeContent(testShortcodeMap[key])
    expect(getShortcodeName(shortcodeTagContent)).toEqual(key)
  }
})
