function FirestoreInNode(config) {
  this.node = config
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
}

FirestoreInNode.prototype.onInput = function (msg, send, errorCb, log) {
  const input = (msg.hasOwnProperty('firestore')) ? msg.firestore : {}

  const col = input.collection || this.collection
  const doc = input.document || this.document
  // TODO: handle realtime reads
  // const rt = input.realtime || this.realtime

  const dbRef = doc ? this.firestore.collection(col).doc(doc) : this.firestore.collection(col)

  this.node.status({fill: 'blue', shape: 'ring', text: 'Running'})

  dbRef.get()
      .then((snap) => {
        if (!doc) { // get an entire collection
          let docArray = {};
          snap.forEach(function (doc) {
            if (!doc.exists) return;
            docArray[doc.id] = doc.data()
          });
          msg.payload = docArray
        } else {
          msg.payload = snap.data()
        }

        send(msg)
        this.node.status({fill: 'green', shape: 'dot', text: 'Complete'})
      })
      .catch((err) => {
        this.node.status({fill: 'red', shape: 'ring', text: 'Error'})
        errorCb(err)
      })
}

FirestoreInNode.prototype.onClose = function () {

}

FirestoreInNode.prototype.setStatusCallback = function (cb) {
  this.onStatus = cb;
};

module.exports = FirestoreInNode
