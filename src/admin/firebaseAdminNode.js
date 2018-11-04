var firebaseAdmin = require('firebase-admin');

function FirebaseAdminNode(config) {
  if (!config.serviceAccountJson) {
    throw 'Service Account Json Not Present';
  }

  this.app = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(config.serviceAccountJson),
    databaseURL: `https://${config.serviceAccountJson.project_id}.firebaseio.com`,
    projectId: config.serviceAccountJson.project_id,
  });


  this.core = firebaseAdmin;
  this.database = firebaseAdmin.database();
  this.firestore = firebaseAdmin.firestore();
  this.messaging = firebaseAdmin.messaging();

  this.firestore.settings({timestampsInSnapshots: true})
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
