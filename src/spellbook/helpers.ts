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
 */ 
function clone(o: any) {
  let res: any = null
  if(typeof o === 'object' && o !== null) {
    res = _cloneObject(o)
  } else if(Array.isArray(o)) {
    res = _cloneArray(o)
  } else {
    res = o;
  }
  return res;
}

export { clone }
