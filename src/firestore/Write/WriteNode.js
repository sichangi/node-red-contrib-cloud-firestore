function FirestoreWriteNode(config) {
  if (!config.admin) {
    throw "No firebase admin specified";
  }

  if (!config.operation) {
    throw 'FireStore write operation NOT Present';
  }

  if (!config.collection) {
    throw 'FireStore collection reference NOT defined';
  }

  this.firebase = config.admin.core
  this.firestore = config.admin.firestore
  this.collection = config.collection
  this.operation = config.operation
  this.document = config.document
}

FirestoreWriteNode.prototype.validateOperation = function ({operation: op, document}) {
  if ((op === 'set' || op === 'update') && !document) throw `Operation ${op} requires a document reference`
}

FirestoreWriteNode.prototype.onInput = function (msg, send, errorCb, debug, node) {
  const input = (msg.hasOwnProperty('firestore')) ? msg['firestore'] : {}

  const col = input.collection || this.collection
  const doc = input.document || this.document
  const op = input.operation || this.operation
  const payload = this.preparePayload(msg.payload)

  this.validateOperation({operation: op, document: doc})
  node.status({fill: 'blue', shape: 'ring', text: 'Running'})

  switch (op) {
    case 'add':
      this.firestore.collection(col).add(payload)
          .then(handleSuccess)
          .catch(handleFailure)
      break;
    case 'set':
    case 'update':
      this.firestore.collection(col).doc(doc)[op](payload)
          .then(handleSuccess)
          .catch(handleFailure)
      break;
    default:
      handleFailure(`Invalid operation given: ${op}`)
  }

  function handleSuccess(result) {
    msg.payload = result
    send(msg)
    node.status({fill: 'green', shape: 'dot', text: 'Complete'})
  }

  function handleFailure(err) {
    errorCb(err)
    node.status({fill: 'red', shape: 'ring', text: 'Error'})
  }
}

function traverse(object, func) {
  const whatIs = Object.prototype.toString
  if (whatIs.call(object) === '[object Object]') {
    for (let key in object) {
      func(object, key)
      let item = object[key]
      if (whatIs.call(item) === '[object Object]') {
        traverse(item, func)
      }
    }
  }
}

/**
 * Prepares array operations and GeoLocation references
 * @param load
 */
FirestoreWriteNode.prototype.preparePayload = function (load) {
  const traverseGeoPoints = (object) => {
    traverse(object, (obj, key) => {
      if (obj[key].hasOwnProperty('latitude') && obj[key].hasOwnProperty('longitude')) {
        let lat = obj[key].latitude
        let lng = obj[key].longitude
        obj[key] = new this.firebase.firestore.GeoPoint(lat, lng)
      }
    })
  }

  traverseGeoPoints(load)

  traverse(load, (obj, key) => {
    if (obj[key].hasOwnProperty('arrayUnion')) {
      let hasUnion = obj[key]
      traverseGeoPoints(hasUnion)
      obj[key] = this.firebase.firestore.FieldValue.arrayUnion(hasUnion['arrayUnion'])
    }

    if (obj[key].hasOwnProperty('arrayRemove')) {
      let hasRemove = obj[key]
      traverseGeoPoints(hasRemove)
      obj[key] = this.firebase.firestore.FieldValue.arrayRemove(hasRemove['arrayRemove'])
    }
  })

  return load
}

FirestoreWriteNode.prototype.setStatusCallback = function (cb) {
  this.onStatus = cb;
}

module.exports = FirestoreWriteNode
