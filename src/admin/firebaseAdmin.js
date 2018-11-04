const FirebaseAdminNode = require('./firebaseAdminNode');

module.exports = function (RED) {
  "use strict";

  function FirebaseAdminConfig(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    try {
      node.serviceAccountJson = JSON.parse(node.credentials.serviceAccountJson);
    } catch (e) {
      throw "Bad service account json";
    }

    if (!node.serviceAccountJson) {
      throw "Bad node config";
    }

    const firebaseAdminNode = new FirebaseAdminNode(node);
    node.core = firebaseAdminNode.core;
    node.database = firebaseAdminNode.database;
    node.firestore = firebaseAdminNode.firestore;
    node.on('close', firebaseAdminNode.onClose);
  }

  RED.nodes.registerType("firebase admin", FirebaseAdminConfig, {
    credentials: {
      serviceAccountJson: {type: "text"}
    }
  });
}
