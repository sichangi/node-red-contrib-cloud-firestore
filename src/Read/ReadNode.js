const {objectTypeOf} = require('../utils');
const util = require('util');
const vm = require('vm');

function FirestoreReadNode(config) {
  if (!config.admin) {
    throw 'No firebase admin specified';
  }

  if (!config.collection) {
    throw 'FireStore collection Not Present';
  }

  this.id = config.id;
  this.RED = config.RED;
  this.context = config.context();
  this.instance = config.admin.app;
  this.firebase = config.admin.firebase;
  this.firestore = config.admin.firestore;
  this.collection = config.collection;
  this.group = config.group;
  this.document = config.document;
  this.realtime = config.realtime;
  this.query = config.query;
  this.snapHandler = config.snapHandler;
  this.snapListener = null;

  // register a realtime listener on node start
  if (this.realtime) {
    const msg = {firestore: {}};
    const res = this.context.flow.get(`$fst-input-${this.id}`);
    msg.firestore = res || {};
    this.main(msg, config.send.bind(config), config.error.bind(config));
  }
}

FirestoreReadNode.prototype.main = function (msg, send, error) {
  const input = (msg.hasOwnProperty('firestore')) ? msg.firestore || {} : {};
  msg.firebase = {app: this.instance, admin: this.firebase};

  const col = input.collection = input.collection || this.collection;
  const group = input.group = input.group || this.group;
  const doc = input.document = input.document || this.document;
  const rt = input.realtime = input.realtime || this.realtime;
  const query = input.query = input.query || this.query;
  const disable = input.disableHandler = input.disableHandler || false;

  // Resolves any defaults across the entire node
  Object.keys(input).forEach(key => this[key] = input[key]);

  let snapHandler = this.snapHandler;
  if (!disable) {
    snapHandler = this.prepareSnapHandler(this.snapHandler, {
      config: input,
      context: this.context,
      RED: this.RED, msg
    });
  }

  if (rt) {
    // Save input to storage to better handle realtime recalls on node restarts
    try {
      this.context.flow.set(`$fst-input-${this.id}`, input);
    } catch (e) {
    }
  }

  if (doc && group) throw 'Cannot set document ref in a collection group query';

  let baseRef, referenceQuery;
  if (group) {
    baseRef = this.firestore.collectionGroup(col);
    referenceQuery = this.prepareQuery(baseRef, query);
  } else {
    baseRef = doc ? this.firestore.collection(col).doc(doc) : this.firestore.collection(col);
    referenceQuery = doc ? baseRef : this.prepareQuery(baseRef, query);
  }

  // remove existing listener before registering another
  this.unsubscribeListener();

  if (disable) {
    msg.payload = referenceQuery;
    return send(msg);
  }

  if (!rt) {
    referenceQuery.get()
      .then((snap) => snapHandler(snap))
      .then((result) => {
        msg.payload = result;
        send(msg);
      })
      .catch((err) => error(err, msg));
  } else {
    this.snapListener = referenceQuery.onSnapshot((snap) => {
      Promise.resolve(snapHandler(snap))
        .then((result) => {
          msg.payload = result;
          send(msg);
        }).catch(err => error(err, msg));
    }, (err) => error(err, msg));
  }
};

FirestoreReadNode.prototype.prepareQuery = function (baseRef, queryObj) {
  queryObj.forEach((condition) => {
    const key = Object.keys(condition)[0];

    let value = condition[key];
    let isString = objectTypeOf(value) === '[object String]';
    let isArray = objectTypeOf(value) === '[object Array]';
    let isObject = objectTypeOf(value) === '[object Object]';

    switch (key) {
      case 'where':
        if (isString) {
          baseRef = baseRef.where(value);
        } else if (isArray) {
          baseRef = baseRef.where(...value);
        } else if (isObject) {
          baseRef = baseRef.where(value.field, value.operation, value.value);
        }
        break;
      case 'orderBy':
        if (isString) {
          baseRef = baseRef.orderBy(value);
        } else if (isArray) {
          baseRef = baseRef.orderBy(...value);
        } else if (isObject) {
          baseRef = !!value.direction ?
            baseRef.orderBy(value.field, value.direction)
            : baseRef.orderBy(value.field);
        }
        break;
      case 'startAt':
      case 'endAt':
      case 'startAfter':
      case 'endBefore':
        baseRef = isArray ? baseRef[key](...value) : baseRef[key](value);
        break;
      case 'limit':
      case 'offset':
        baseRef = baseRef[key](value);
        break;
    }
  });

  return baseRef;
};

FirestoreReadNode.prototype.prepareSnapHandler = function (func, ctx = {}) {
  if (!func) return this.defaultSnapHandler.bind(this);
  const sandbox = {
    ...ctx,
    util: util,
    Date: Date,
    Buffer: Buffer,
    Promise: Promise,
    console: console
  };
  const context = vm.createContext(sandbox);
  const script = new vm.Script(`(function() {return function(snap) {${func}}})()`, {
    filename: this.id + (this.name ? '[' + this.name + ']' : '') + 'custom handler',
    displayErrors: true
  });
  try {
    return script.runInContext(context);
  } catch (e) {
    throw e.message || e;
  }
};

FirestoreReadNode.prototype.defaultSnapHandler = function (snap) {
  if (!this.document) { // get an entire collection
    const docArray = {};
    snap.forEach(function (snapDoc) {
      if (!snapDoc.exists) return;
      docArray[snapDoc.id] = snapDoc.data();
    });
    return docArray;
  } else {
    return snap.data();
  }
};

FirestoreReadNode.prototype.unsubscribeListener = function () {
  if (objectTypeOf(this.snapListener) === '[object Function]') this.snapListener();
};

FirestoreReadNode.prototype.onClose = function (done) {
  this.unsubscribeListener();
  done();
};

module.exports = FirestoreReadNode;
