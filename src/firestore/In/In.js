const FireStoreInNode = require('./InNode');

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

  function FireStoreIn(n) {
    validateNodeConfig(n)

    RED.nodes.createNode(this, n);
    var node = this;

    node.collection = n.collection;
    node.doc = n.document || '';
    node.realtime = n.realtime || false;
    node.dataAtStart = n.dataAtStart;
    node.admin = RED.nodes.getNode(n.admin);

    const firestoreInNode = new FireStoreInNode(node)
    node.on('input', msg => {
      firestoreInNode.onInput(msg, node.send.bind(node), node.error.bind(node), node.log.bind(node))
    })

    node.on('close', firestoreInNode.onClose)

    firestoreInNode.setStatusCallback(node.status.bind(node))
  }

  RED.nodes.registerType("Firestore in", FireStoreIn);
}


