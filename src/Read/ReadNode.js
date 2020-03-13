const vm = require('vm')
const util = require('util')
const {objectTypeOf} = require('../utils')

function defaultSnapHandler(snap) {
  if (snap.size) { // get an entire collection
    const documents = {}
    snap.forEach(function (snapDoc) {
      if (!snapDoc.exists) return
      documents[snapDoc.id] = snapDoc.data()
    })
    return documents
  } else {
    return snap.data()
  }
}

function FirestoreReadNode(config, RED) {
  if (!config.admin) {
    throw 'No firebase admin specified'
  }

  if (!config.collection) {
    throw 'FireStore collection Not Present'
  }

  this.instance = config.admin.app
  this.firebase = config.admin.firebase
  this.firestore = this.instance.firestore();
  this.collection = config.collection
  this.group = config.group
  this.document = config.document
  this.realtime = config.realtime
  this.query = config.query
  if(config.snapHandler) {
    const sandbox = {
            console:console,
            util: util,
            Buffer:Buffer,
            Date: Date,
            RED: {
                util: RED.util
            },
    }
    const context = vm.createContext(sandbox)
    const script = new vm.Script(`(function(snap) {${config.snapHandler}})(snap)`, {
      filename: this.id+(this.name?' ['+this.name+']':'')+'custom handler',
      displayErrors: true
    });
    this.snapHandler = (snap) => {
      context.snap = snap
      try {
        return script.runInContext(context)
      } catch(e) {
        console.error(e);
      }
    }
  } else {
    this.snapHandler = defaultSnapHandler
  }
  this.snapListener = null
  this.status = config.status
  // register a realtime listener on node init
  if (this.realtime) this.main({}, config.send.bind(config), config.error.bind(config))
}

FirestoreReadNode.prototype.main = function (msg, send, errorCb) {
  const input = (msg.hasOwnProperty('firestore')) ? msg.firestore : {}
  msg.firebase = {app: this.instance, admin: this.firebase}

  const col = input.collection || this.collection
  const group = input.group || this.group
  const doc = input.document || this.document
  const rt = input.realtime || this.realtime
  const query = input.query || this.query
  const disable = input.disableHandler || false

  if (doc && group) throw 'Cannot set document ref in a collection group query'

  let baseRef, referenceQuery
  try {
    if (group) {
      baseRef = this.firestore.collectionGroup(col)
      referenceQuery = this.prepareQuery(baseRef, query)
    } else {
      baseRef = doc ? this.firestore.collection(col).doc(doc) : this.firestore.collection(col)
      referenceQuery = doc ? baseRef : this.prepareQuery(baseRef, query)
    }
  } catch(e) {
    return Promise.reject(e);
  }

  // remove existing listener before registering another
  this.unsubscribeListener()

  if (disable) {
    msg.payload = referenceQuery
    send(msg)
    return Promise.resolve()
  }

  if (!rt) {
    return referenceQuery.get()
      .then((snap) => this.snapHandler(snap))
      .then((result) => {
        msg.payload = result
        send(msg)
      })
  } else {
    this.snapListener = referenceQuery.onSnapshot((snap) => {
      msg.payload = this.snapHandler(snap)
      send(msg)
    }, (error) => errorCb(error, msg))
    return Promise.resolve();
  }
}

FirestoreReadNode.prototype.prepareQuery = function (baseRef, queryObj) {
  queryObj.forEach((condition) => {
    const key = Object.keys(condition)[0]

    let value = condition[key]
    let isString = objectTypeOf(value) === '[object String]'
    let isArray = objectTypeOf(value) === '[object Array]'
    let isObject = objectTypeOf(value) === '[object Object]'

    switch (key) {
      case 'where':
        if (isString) {
          baseRef = baseRef.where(value)
        } else if (isArray) {
          baseRef = baseRef.where(...value)
        } else if (isObject) {
          baseRef = baseRef.where(value.field, value.operation, value.value)
        }
        break
      case 'orderBy':
        if (isString) {
          baseRef = baseRef.orderBy(value)
        } else if (isArray) {
          baseRef = baseRef.orderBy(...value)
        } else if (isObject) {
          baseRef = !!value.direction ?
            baseRef.orderBy(value.field, value.direction)
            : baseRef.orderBy(value.field)
        }
        break
      case 'startAt':
      case 'endAt':
      case 'startAfter':
      case 'endBefore':
        baseRef = isArray ? baseRef[key](...value) : baseRef[key](value)
        break
      case 'limit':
      case 'offset':
        baseRef = baseRef[key](value)
        break
    }
  })

  return baseRef
}

FirestoreReadNode.prototype.unsubscribeListener = function () {
  if (objectTypeOf(this.snapListener) === '[object Function]') this.snapListener()
}

FirestoreReadNode.prototype.onClose = function (done) {
  this.unsubscribeListener()
  done()
}

module.exports = FirestoreReadNode
