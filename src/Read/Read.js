const FirestoreReadNode = require('./ReadNode');

function validateNodeConfig(n) {
  if (!n.collection) {
    throw "No collection specified";
  }

  if (!n.admin) {
    throw "No admin specified";
  }
}

module.exports = function (RED) {
  "use strict";

  function FirestoreRead(n) {
    validateNodeConfig(n)

    RED.nodes.createNode(this, n);
    var node = this;

    node.collection = n.collection;
    node.document = n.document;
    node.realtime = n.realtime;
    node.query = n.query;
    node.admin = RED.nodes.getNode(n.admin);

    const firestoreReadNode = new FirestoreReadNode(node)
    node.on('input', msg => {
      firestoreReadNode.main(msg, node.send.bind(node), node.error.bind(node))
    })

    node.on('close', firestoreReadNode.onClose.bind(firestoreReadNode))
  }

  RED.nodes.registerType("Firestore in", FirestoreRead);
}


