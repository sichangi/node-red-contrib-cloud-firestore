function objectTypeOf(object) {
  return Object.prototype.toString.call(object)
}

/**
 * Traverses Objects and or Arrays applying specified conditions through a function
 * @param object [Object | Array] - Object under traversal
 * @param func [Function] - function applying effects to an objects property
 */
function traverse(object, func) {
  const whatIs = objectTypeOf(object)
  if (whatIs === '[object Object]') {
    for (let key in object) {
      func(object, key)
      traverse(object[key], func)
    }
  } else if (whatIs === '[object Array]') {
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
