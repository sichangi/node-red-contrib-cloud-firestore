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
  this.ReplaceMap = {
    delete: '_delete',
    arrayUnion: '_arrayUnion',
    arrayRemove: '_arrayRemove',
    serverTimestamp: '_serverTimestamp',
    GeoPoint: {lat: '_lat', lng: '_lng'}
  }
}

FirestoreWriteNode.prototype.validateOperation = function ({operation: op, document}) {
  if ((op === 'set' || op === 'update') && !document) throw `Operation ${op} requires a document reference`
}

FirestoreWriteNode.prototype.onInput = function (msg, send, errorCb) {
  const input = (msg.hasOwnProperty('firestore')) ? msg['firestore'] : {}
  const col = input.collection || this.collection
  const doc = input.document || this.document
  const op = input.operation || this.operation
  const payload = this.preparePayload(msg.payload)

  this.validateOperation({operation: op, document: doc})

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
  }

  function handleFailure(err) {
    errorCb(err)
  }
}

function traverse(object, func) {
  const whatIs = Object.prototype.toString.call(object)
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

/**
 * Prepares array operations and GeoLocation references
 * @param load
 */
FirestoreWriteNode.prototype.preparePayload = function (load) {
  traverse(load, (obj, key) => {
    if (obj[key] === this.ReplaceMap.serverTimestamp) {
      obj[key] = this.firebase.firestore.FieldValue.serverTimestamp()
    }

    if (obj[key] === this.ReplaceMap.delete) {
      obj[key] = this.firebase.firestore.FieldValue.delete()
    }

    if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.GeoPoint.lat) && obj[key].hasOwnProperty(this.ReplaceMap.GeoPoint.lng)) {
      let lat = obj[key]._lat
      let lng = obj[key]._lng
      obj[key] = new this.firebase.firestore.GeoPoint(lat, lng)
    }
  })

  // Replace ArrayUnions and ArrayRemovals after other values are set
  traverse(load, (obj, key) => {
    if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.arrayUnion)) {
      obj[key] = this.firebase.firestore.FieldValue.arrayUnion(obj[key][this.ReplaceMap.arrayUnion])
    } else if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.arrayRemove)) {
      obj[key] = this.firebase.firestore.FieldValue.arrayRemove(obj[key][this.ReplaceMap.arrayRemove])
    }
  })

  return load
}

FirestoreWriteNode.prototype.setStatusCallback = function (cb) {
  this.onStatus = cb;
}

module.exports = FirestoreWriteNode
