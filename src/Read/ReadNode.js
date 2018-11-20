const {traverse} = require('../utils')

function FirestoreReadNode(config) {
  if (!config.admin) {
    throw "No firebase admin specified";
  }

  if (!config.collection) {
    throw 'FireStore collection Not Present';
  }

  this.firestore = config.admin.firestore
  this.collection = config.collection
  this.document = config.document
  this.realtime = config.realtime
  this.snapListener = null
  // register a realtime listener on node init
  if (this.realtime) this.main({}, config.send.bind(config), config.error.bind(config))
}

FirestoreReadNode.prototype.main = function (msg, send, errorCb) {
  const input = (msg.hasOwnProperty('firestore')) ? msg.firestore : {}

  const col = input.collection || this.collection
  const doc = input.document || this.document

  const rt = input.realtime || this.realtime
  const query = input.query || this.query || {}

  const baseRef = doc ? this.firestore.collection(col).doc(doc) : this.firestore.collection(col)
  const referenceQuery = doc ? baseRef : this.prepareQuery(baseRef, query)

// remove existing one before registering another
  this.unsubscribeListener()

  if (!rt) {
    referenceQuery.get()
        .then((snap) => {
          snapHandler(snap)
        })
        .catch((err) => {
          errorCb(err)
        })
  } else {
    this.snapListener = referenceQuery.onSnapshot((snap) => snapHandler(snap), (error) => errorCb(error))
  }

  function snapHandler(snap) {
    if (!doc) { // get an entire collection
      let docArray = {};
      snap.forEach(function (snapDoc) {
        if (!snapDoc.exists) return;
        docArray[snapDoc.id] = snapDoc.data()
      });
      msg.payload = docArray
    } else {
      msg.payload = snap.data()
    }
    send(msg)
  }
}

FirestoreReadNode.prototype.prepareQuery = function (baseRef, queryObj) {
  // Handle order specific queries, where orderBy comes before where or vice-versa
  Object.keys(queryObj).forEach((key) => {
    switch (key) {
      case 'where':
        if (queryObj[key].length === 3) {
          baseRef = baseRef.where(...queryObj.where)
        }
        break;
      case 'orderBy':
        traverse(queryObj, (obj, key) => {
          if (key === 'orderBy' && obj[key].hasOwnProperty('field')) {
            baseRef = obj[key].direction ?
                baseRef.orderBy(obj[key].field, obj[key].direction)
                : baseRef.orderBy(obj[key].field)
          }
        })
        break;
    }
  })

  // always ensure limit is last
  if (queryObj.hasOwnProperty('limit') && queryObj.limit) {
    baseRef = baseRef.limit(queryObj.limit)
  }

  return baseRef
}

FirestoreReadNode.prototype.unsubscribeListener = function () {
  if (Object.prototype.toString.call(this.snapListener) === "[object Function]") this.snapListener()
}

FirestoreReadNode.prototype.onClose = function (done) {
  this.unsubscribeListener()
  done()
}

module.exports = FirestoreReadNode
