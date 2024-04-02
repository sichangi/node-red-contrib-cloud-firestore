const FirestoreReadNode = require('./ReadNode');

function validateNodeConfig(n) {
  if (!n.admin) {
    throw 'No admin specified';
  }
}

module.exports = function (RED) {
  'use strict';

  function FirestoreRead(n) {
    validateNodeConfig(n);

    RED.nodes.createNode(this, n);
    var node = this;

    node.RED = { util: RED.util };
    node.collection = n.collection;
    node.group = n.group;
    node.document = n.document;
    node.realtime = n.realtime;
    node.query = n.query;
    node.eject = n.eject;
    node.snapHandler = n.snapHandler;
    node.admin = RED.nodes.getNode(n.admin);
    node.status({});

    const firestoreReadNode = new FirestoreReadNode(node);
    node.on('input', (msg, send, done) => {
      node.status({ fill: 'blue', shape: 'ring', text: 'querying...' })
      firestoreReadNode.main(msg, node.send.bind(node), node.error.bind(node))
        .then(() => {
          node.status({ fill: 'green', shape: 'dot', text: 'success' })
          // Tells NodeRED we've finished
          if (done) done()
        })
        .catch((err) => {
          node.status({ fill: 'red', shape: 'dot', text: 'error' })
          node.error(err)
        })
    });

    node.on('close', firestoreReadNode.onClose.bind(firestoreReadNode));
  }

  RED.nodes.registerType('Firestore in', FirestoreRead);
};


