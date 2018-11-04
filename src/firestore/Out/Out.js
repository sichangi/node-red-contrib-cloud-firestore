const FirestoreOutNode = require('./OutNode');

function validateNodeConfig(n){
  if (!n.collection){
    throw "No collection ref specified";
  }

  if (!n.operation){
    throw "No operation specified";
  }

  if (!n.admin) {
    throw "No admin specified";
  }
}

module.exports = function(RED) {
  "use strict";

  function FirestoreOut(n) {
    validateNodeConfig(n)

    RED.nodes.createNode(this,n);
    var node = this;

    node.collection = n.collection;
    node.document = n.document;
    node.operation = n.operation;
    node.admin = RED.nodes.getNode(n.admin);

    const firebaseOutNode = new FirestoreOutNode(node)
    firebaseOutNode.setStatusCallback(node.status.bind(node))

    node.on('input', msg => {
      firebaseOutNode.onInput(msg, node.send.bind(node), node.error.bind(node), node.log.bind(node), node)
    })
  }

  RED.nodes.registerType("Firestore out", FirestoreOut);
}


