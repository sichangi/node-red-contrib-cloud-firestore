const RealtimeInNode = require('./InNode');

function validateNodeConfig(n){
  if (!n.ref){
    throw "No ref specified";
  }

  if (!n.admin) {
    throw "No admin specified";
  }
}

module.exports = function(RED) {
  "use strict";

  function FirebaseIn(n) {
    validateNodeConfig(n)

    RED.nodes.createNode(this,n);
    var node = this;

    node.ref = n.ref;
    node.dataAtStart = n.dataAtStart;
    node.admin = RED.nodes.getNode(n.admin);

    const realtimeInNode = new RealtimeInNode(node)
    realtimeInNode.setOutputCallback(node.send.bind(node))
    realtimeInNode.setStatusCallback(node.status.bind(node))
  }

  RED.nodes.registerType("Realtime DB in", FirebaseIn);
}


