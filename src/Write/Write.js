const FirestoreWriteNode = require('./WriteNode');

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

  function FirestoreWrite(n) {
    validateNodeConfig(n)

    RED.nodes.createNode(this,n);
    var node = this;

    node.collection = n.collection;
    node.document = n.document;
    node.operation = n.operation;
    node.options = n.options;
    node.admin = RED.nodes.getNode(n.admin);

    const firestoreWriteNode = new FirestoreWriteNode(node)

    node.on('input', msg => {
      firestoreWriteNode.onInput(msg, node.send.bind(node), node.error.bind(node), node)
    })
  }

  RED.nodes.registerType("Firestore out", FirestoreWrite);
}


