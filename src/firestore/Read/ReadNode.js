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
  const dbRef = doc ? this.firestore.collection(col).doc(doc) : this.firestore.collection(col)

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

  if (!rt) {
    dbRef.get()
        .then((snap) => {
          snapHandler(snap)
        })
        .catch((err) => {
          errorCb(err)
        })
  } else {
    // remove existing one before registering another
    this.unsubscribeListener()
    this.snapListener = dbRef.onSnapshot((snap) => snapHandler(snap), (error) => errorCb(error))
  }
}

FirestoreReadNode.prototype.unsubscribeListener = function () {
  if (Object.prototype.toString.call(this.snapListener) === "[object Function]") this.snapListener()
}

FirestoreReadNode.prototype.onClose = function (done) {
  this.unsubscribeListener()
  done()
}

FirestoreReadNode.prototype.setStatusCallback = function (cb) {
  this.onStatus = cb;
};

module.exports = FirestoreReadNode
