/**
 * Shallow merges two objects together. Used to pass simple options to functions.
 * 
 * @param {object} target The target object to merge into
 * @param {object} source The source object to merge from
 * @example
 * const target = { foo: 'bar' }
 * const source = { bar: 'baz' }
 * shallowMerge(target, source) // { foo: 'bar', bar: 'baz' }
 */
function shallowMerge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key]
  }
}

function _cloneObject(o: object) {
  let res = {}
  for (const i in o) {
    res[i] = clone(o[i])
  }
  return res
}

function _cloneArray(a: Array<any>) {
  let res: Array<any> = []
  for(var i = 0; i < a.length; i++) {
    res[i] = clone(a[i])
  }
  return res
}

/**
 * Deep clone function that's mindful of arrays and objects
 * 
 * @param {object} o The object to clone
 * @example
 * const obj = { foo: 'bar' }
 * const clone = clone(obj)
 * clone.foo = 'baz'
 * console.log(obj.foo) // 'bar'
 * console.log(clone.foo) // 'baz'
 * @todo Check if faster than assign. This function is pretty old...
 */ 
function clone(o: any) {
  let res: any = null
  if(Array.isArray(o)) {
    res = _cloneArray(o)
  } else if(typeof o === 'object' && o !== null) {
    res = _cloneObject(o)
  } else {
    res = o;
  }
  return res;
}

/**
 * Detaches an element from the DOM and returns it
 * 
 * @param {HTMLElement} element The element to detach
 */
function detachElement(element: HTMLElement) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
  return element
}

/**
 * Inserts an element before another element
 * 
 * @param {HTMLElement} targetElement The element to insert before
 * @param {HTMLElement} newElement The element to insert
 * @example
 * const target = document.getElementById('target')
 * const newElement = document.createElement('div')
 * newElement.id = 'newElement'
 * insertBeforeElement(target, newElement)
 * // <div id="newElement"></div>
 * // <div id="target"></div>
 */
function insertBeforeElement(targetElement: HTMLElement, newElement: HTMLElement) {
  targetElement.parentNode?.insertBefore(newElement, targetElement);
}

/**
 * Removes all elements matching a selector from the DOM
 * 
 * @param {string} selector The selector to select elements to remove
 */
function removeAll(selector: string) {
  for (const element of document.querySelectorAll(selector)) {
    element.remove();
  }
}

export { clone, shallowMerge, detachElement, insertBeforeElement, removeAll }
