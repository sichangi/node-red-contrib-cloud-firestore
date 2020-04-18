const {traverse} = require('../utils');

function FirestoreWriteNode(config) {
  if (!config.admin) {
    throw 'No firebase admin specified';
  }

  if (!config.operation) {
    throw 'FireStore write operation NOT Present';
  }

  if (!config.collection) {
    throw 'FireStore collection reference NOT defined';
  }

  this.instance = config.admin.app;
  this.firebase = config.admin.firebase;
  this.firestore = config.admin.firestore;
  this.collection = config.collection;
  this.operation = config.operation;
  this.options = config.options;
  this.document = config.document;
  this.ReplaceMap = {
    delete: '_delete',
    arrayUnion: '_arrayUnion',
    arrayRemove: '_arrayRemove',
    serverTimestamp: '_serverTimestamp',
    GeoPoint: {lat: '_lat', lng: '_lng'}
  };
}

FirestoreWriteNode.prototype.validateOperation = function ({operation: op, document}) {
  if ((op === 'set' || op === 'update' || op === 'delete') && !document) throw `Operation ${op} requires a document reference`;
};

FirestoreWriteNode.prototype.onInput = function (msg, send, errorCb) {
  const input = (msg.hasOwnProperty('firestore')) ? msg['firestore'] : {};
  msg.firebase = {app: this.instance, admin: this.firebase};

  const col = input.collection || this.collection;
  const doc = input.document || this.document;
  const op = input.operation || this.operation;
  const opts = input.options || this.options;
  const payload = this.preparePayload(msg.payload);

  this.validateOperation({operation: op, document: doc});

  let referenceQuery = null;

  switch (op) {
    case 'add':
      referenceQuery = this.firestore.collection(col).add(payload);
      break;
    case 'set':
      referenceQuery = this.firestore.collection(col).doc(doc).set(payload, opts);
      break;
    case 'update':
    case 'delete':
      referenceQuery = this.firestore.collection(col).doc(doc)[op](payload);
      break;
    default:
      return handleFailure(`Invalid operation given: ${op}`, msg);
  }

  referenceQuery
    .then((result) => {
      msg.payload = result;
      send(msg);
    })
    .catch((err) => handleFailure(err, msg));

  function handleFailure(err, msg) {
    errorCb(err, msg);
  }
};

/**
 * Prepares array operations and GeoLocation references
 * @param load
 */
FirestoreWriteNode.prototype.preparePayload = function (load) {
  traverse(load, (obj, key) => {
    if (obj[key] === this.ReplaceMap.serverTimestamp) {
      obj[key] = this.firebase.firestore.FieldValue.serverTimestamp();
    }

    if (obj[key] === this.ReplaceMap.delete) {
      obj[key] = this.firebase.firestore.FieldValue.delete();
    }

    if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.GeoPoint.lat) && obj[key].hasOwnProperty(this.ReplaceMap.GeoPoint.lng)) {
      let lat = obj[key][this.ReplaceMap.GeoPoint.lat];
      let lng = obj[key][this.ReplaceMap.GeoPoint.lng];
      obj[key] = new this.firebase.firestore.GeoPoint(lat, lng);
    }
  });

  // Replace ArrayUnions and ArrayRemovals after other values are set
  traverse(load, (obj, key) => {
    if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.arrayUnion)) {
      obj[key] = this.firebase.firestore.FieldValue.arrayUnion(obj[key][this.ReplaceMap.arrayUnion]);
    } else if (obj[key] && obj[key].hasOwnProperty(this.ReplaceMap.arrayRemove)) {
      obj[key] = this.firebase.firestore.FieldValue.arrayRemove(obj[key][this.ReplaceMap.arrayRemove]);
    }
  });

  return Object.assign({}, load);
};

module.exports = FirestoreWriteNode;
