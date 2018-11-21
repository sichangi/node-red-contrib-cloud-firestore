function objectTypeOf(object) {
  return Object.prototype.toString.call(object)
}

/**
 * Traverses Objects and or Arrays applying specified conditions through a function
 * @param object [Object | Array] - Object under traversal
 * @param func [Function] - function applying effects to an objects property
 */
function traverse(object, func) {
  const objectType = objectTypeOf(object)
  if (objectType === '[object Object]') {
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        func(object, key)
        traverse(object[key], func)
      }
    }
  } else if (objectType === '[object Array]') {
    object.forEach((val, index) => {
      func(object, index)
      traverse(val, func)
    })
  }
}

module.exports = {
  traverse,
  objectTypeOf
}
