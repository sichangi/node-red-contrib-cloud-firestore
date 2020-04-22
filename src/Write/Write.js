const FirestoreWriteNode = require('./WriteNode');

function validateNodeConfig(n) {
  if (!n.admin) {
    throw 'No admin specified';
  }
}

module.exports = function (RED) {
  'use strict';

  function FirestoreWrite(n) {
    validateNodeConfig(n);

    RED.nodes.createNode(this, n);
    var node = this;

    node.collection = n.collection;
    node.document = n.document;
    node.operation = n.operation;
    node.options = n.options;
    node.eject = n.eject;
    node.admin = RED.nodes.getNode(n.admin);
    node.status({});

    const firestoreWriteNode = new FirestoreWriteNode(node);

    node.on('input', (msg, send, done) => {
      node.status({fill:"blue",shape:"ring",text:"querying..."})
      firestoreWriteNode.onInput(msg, node.send.bind(node))
      .then(() => {
        node.status({fill:"green",shape:"dot",text:"success"})
        // Tells NodeRED we've finished
        if(done) done()
      })
      .catch((err) => {
        node.status({fill:"red",shape:"dot",text:"error"})
        node.error(err)
      })
    });
  }

  RED.nodes.registerType('Firestore out', FirestoreWrite);
};


