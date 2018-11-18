var firebaseAdmin = require('firebase-admin');

function FirebaseAdminNode(config) {
  if (!config.serviceAccountJson) {
    throw 'Service Account Json Not Present';
  }

  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(config.serviceAccountJson),
      databaseURL: `https://${config.serviceAccountJson.project_id}.firebaseio.com`,
      projectId: config.serviceAccountJson.project_id,
    })

    this.core = firebaseAdmin;
    this.firestore = firebaseAdmin.firestore();
    this.firestore.settings({timestampsInSnapshots: true})
  } else {
    firebaseAdmin.app()
  }
}

FirebaseAdminNode.prototype.onClose = function (removed, done) {
  let deletePromises = [];
  firebaseAdmin.apps.forEach((app) => {
    deletePromises.push(app.delete());
  });
  Promise.all(deletePromises)
      .then(() => {
        done()
      })
      .catch((e) => {
        console.log(e)
        done()
      });
};

module.exports = FirebaseAdminNode
