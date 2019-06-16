var firebaseAdmin = require('firebase-admin')

function FirebaseAdminNode(config) {
  if (!config.serviceAccountJson) {
    throw 'Service Account Json Not Present'
  }

  const app = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(config.serviceAccountJson),
    databaseURL: `https://${config.serviceAccountJson.project_id}.firebaseio.com`,
    projectId: config.serviceAccountJson.project_id
  }, config.serviceAccountJson.project_id)

  this.core = app
  this.firestore = app.firestore()
}

FirebaseAdminNode.prototype.onClose = function (removed, done) {
  let deletePromises = []
  firebaseAdmin.apps.forEach((app) => deletePromises.push(app.delete()))
  Promise.all(deletePromises)
    .then(done)
    .catch((e) => {
      console.error(e.message || e)
      done()
    })
}

module.exports = FirebaseAdminNode
