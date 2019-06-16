const {traverse} = require('../utils')

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
  this.options = config.options
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
  if ((op === 'set' || op === 'update' || op === 'delete') && !document) throw `Operation ${op} requires a document reference`
}

FirestoreWriteNode.prototype.onInput = function (msg, send, errorCb) {
  const input = (msg.hasOwnProperty('firestore')) ? msg['firestore'] : {}
  const col = input.collection || this.collection
  const doc = input.document || this.document
  const op = input.operation || this.operation
  const opts = input.options || this.options
  const payload = this.preparePayload(msg.payload)

  this.validateOperation({operation: op, document: doc})

  switch (op) {
    case 'add':
      this.firestore.collection(col).add(payload)
        .then(handleSuccess)
        .catch(handleFailure)
      break
    case 'set':
      this.firestore.collection(col).doc(doc)[op](payload, opts)
        .then(handleSuccess)
        .catch(handleFailure)
      break
    case 'update':
    case 'delete':
      this.firestore.collection(col).doc(doc)[op](payload)
        .then(handleSuccess)
        .catch(handleFailure)
      break
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
      let lat = obj[key][this.ReplaceMap.GeoPoint.lat]
      let lng = obj[key][this.ReplaceMap.GeoPoint.lng]
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

  return Object.assign({}, load)
}

module.exports = FirestoreWriteNode
