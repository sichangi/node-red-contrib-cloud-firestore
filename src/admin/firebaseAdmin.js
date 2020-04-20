const FirebaseAdminNode = require('./firebaseAdminNode');

module.exports = function (RED) {
  'use strict';

  function FirebaseAdminConfig(n) {
    RED.nodes.createNode(this, n);
    const node = this;

    try {
      node.serviceAccountJson = JSON.parse(node.credentials.serviceAccountJson);
    } catch (e) {
      throw 'Invalid service account json';
    }

    if (!node.serviceAccountJson) {
      throw 'No service account set';
    }

    const firebaseAdminNode = new FirebaseAdminNode(node);
    node.app = firebaseAdminNode.app;
    node.firebase = firebaseAdminNode.core;
    node.database = firebaseAdminNode.database;
    node.firestore = firebaseAdminNode.firestore;
    node.on('close', firebaseAdminNode.onClose);
  }

  RED.nodes.registerType('firebase admin', FirebaseAdminConfig, {
    credentials: {
      serviceAccountJson: {type: 'text'}
    }
  });
};
