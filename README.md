# node-red-contrib-cloud-firestore

Node-RED nodes to handle google cloud firestore read and write operations.

For any assistance, contributions or stars, visit the [repo](https://github.com/sichangi/node-red-contrib-cloud-firestore). 

## Install
Install from the palette manager
```
node-red-contrib-cloud-firestore
```

Install from [npm](https://www.npmjs.com/package/node-red-contrib-cloud-firestore)
```
npm install node-red-contrib-cloud-firestore
```

## Usage

### Admin configuration

A configuration property under either Read or Write nodes that
initializes a firebase app taking in a name and the json contents of
your apps service account credentials which can be generated under
``Project settings > service accounts > Firebase Admin SDK``.

### Firestore Read

Node fetches data from a referenced collection, subcollection or document.

Configurations can be made within the node or on the ``msg.firestore`` property:
- ``collection``: [string] The collection or subCollection in reference
- ``document``: [string] The document reference under the defined collection
- ``realtime``: [boolean] telling the node to listen for live updates or not (false by default)
- ``group``: [boolean] fetch all documents under collections with the above supplied collection name (false by default)
- ``query``: [array&lt;object&gt;] an array of objects defining query methods to apply to the read
- ``disableHandler``: [boolean] disables the default snapshot handler, returning a built query reference as the payload (false by default)

Response data from the operation is output through the ``msg.payload`` property

#### Upstream input queries

To perform dynamic queries with the read node through input, you need to supply an array of objects on the ``msg.firestore.query`` property in the order they will be chained
with the query method as the only property and it's value being an array of arguments, or a single string value as show below.

```json5
{
  query : [
      {where: ["state", "==", "CA"]},
      {where: ["population", "<", 1000000]}
  ]
}

// reference.where("state", "==", "CA").where("population", "<", 1000000)
```

```json5
{
  query : [
      {orderBy: "name"},
      {limit: 2}
  ]
}

// reference.orderBy("name").limit(2)
```

```json5
{
  query : [
      {where: ["population", ">", 100000]},
      {orderBy: ["population", "asc"]},
      {limit: 2}
  ]
}

// reference.where("population", ">", 100000).orderBy("population", "asc").limit(2)
```

```json5
{
  query : [
      {orderBy: "population"},
      {startAt: 100000},
      {endAt: 1000000}
  ]
}

// reference.orderBy("population").startAt(100000).endAt(1000000)
```

#### Custom snapshot handler

You can also write your own snapshot handler under the expert zone accordion. The editor is similar to the core function node & but supports
the following global objects: ``config`` (the nodes settings), ``snap`` ([query snapshot](https://firebase.google.com/docs/reference/js/firebase.firestore.QuerySnapshot)), ``util``(nodejs), ``msg``, ``context``, ``RED.util`` & ``console``.
The ``Promise``, ``Buffer`` and ``Date`` objects are also supported.

> The ``snap`` object contains the resulting [query snapshot](https://firebase.google.com/docs/reference/js/firebase.firestore.QuerySnapshot).

Do remember that what you ``return`` will then be sent as the output payload.
The following example returns an array of objects, while logging to the cmd console
```js
const docs = [];
let added = context.flow.get('added');

snap.docChanges().forEach(change => {
    docs.push(change.doc.data());
    if (change.type === 'added') {
      added++;
      console.log('Added: ', change.doc.data());
    }
    if (change.type === 'modified') {
      console.log('Modified: ', change.doc.data());
    }
    if (change.type === 'removed') {
      console.log('Removed: ', change.doc.data());
}
});

context.flow.set('added', added);  
return docs;
```

Additionally, you can also save your snippets into the snippet library by giving it a file name and clicking the ``Save to Library`` button

#### Realtime edge cases

If you intend on passing in dynamic configurations from an upstream node while still having realtime enabled, 
the node will not have your upstream values recorded during the next restart. This could result in some unexpected
outcomes.

A way around this would be for the node to store your most recent settings from the interface / upstream nodes
into node-red's provided [storage mechanism](https://nodered.org/docs/user-guide/context).

To enable this workaround in the node, you'll have to change your instances default storage module from ``memory``
to ``localfilesystem`` in your ``settings.js`` file. Read more on this [here](https://nodered.org/docs/api/context/store/localfilesystem)
 

### Firestore Write

Node performs write operations to the referenced collection, subCollection or document.

Configurations made from within the node or on the ``msg.firestore`` property:
- ``operation``: [string] Write operation to perform, either ``add``, ``set``, ``update`` or ``delete``
- ``collection``: [string] collection or subCollection reference to write to.
- ``document``: [string] document reference to write to (optional for ``add`` operations)
- ``options``: [object] additional options passed to firebase (currently
  specific to ``set`` operations)

#### Handling Firestore classes & sentinels

Due to the nature of Cloud firestore's implementation, some actions need special handling.

**Arrays**

To perform [array updates](https://firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array), you'll
need to wrap your elements in an object with the ``_arrayUnion`` or ``_arrayRemove`` property to add or remove elements respectively within an array
```js
msg.payload = {
  animals: {
      _arrayUnion: 'goats'
  },
  farmers: {
      _arrayRemove: {name: "John Doe"}
  }
}
```
becomes:
```js
msg.payload = {
  animals: firestore.FieldValue.arrayUnion("goats"),
  farmers: firestore.FieldValue.arrayRemove({name: "John Doe"})
}
```

**GeoPoints**

Objects within the payload received by the Write Node containing a ``_lat`` and ``_lng`` property will be replaced with the appropriate [GeoPoint](https://firebase.google.com/docs/reference/admin/node/admin.firestore.GeoPoint) class

```js
msg.payload = {
     farm:{
         location: {
              _lat: -1.232134,
              _lng: 36.123131
         },
         fence: [
              {_lat: -1.433434, _lng: 35.123324},
              {_lat: -1.673214, _lng: 36.126541},
              {_lat: -1.334124, _lng: 34.342131}
         ]
    }
}
```
becomes:
```js
msg.payload = {
  farm: {
      location: new firestore.GeoPoint(-1.232134, 36.123131),
      fence: [
          new firestore.GeoPoint(-1.433434, 35.123324),
          new firestore.GeoPoint(-1.673214, 36.126541),
          new firestore.GeoPoint(-1.334124, 34.342131)
      ]
  }
}
```

**Server Timestamp**

Properties with the ``_serverTimestamp`` string value will be replace with the appropriate [serverTimestamp](https://firebase.google.com/docs/reference/admin/node/admin.firestore.FieldValue#.serverTimestamp) sentinel

```js
msg.payload = {
  time: '_serverTimestamp'
}
```

becomes:
```js
msg.payload = {
  time: firestore.FieldValue.serverTimestamp()
}
```

**Increment**

Properties with the ``_increment`` string value will be replaced with the appropriate increment sentinel

```js
msg.payload = {
  itemCount: {
    '_increment': 30
  }
}
```

becomes:
```js
msg.payload = {
  itemCount: firestore.FieldValue.increment(30)
}
```

**Delete**

Properties with the ``_delete`` string value will be replaced with the appropriate [delete](https://firebase.google.com/docs/reference/admin/node/admin.firestore.FieldValue#.delete) sentinel

```js
msg.payload = {
  unwantedField: '_delete'
}
```

becomes:
```js
msg.payload = {
  unwantedField: firestore.FieldValue.delete()
}
```

## Extensibility & additional use cases

### Mustache templating

Both the read & write nodes support mustache templating on the ``collection`` & ``document`` properties, which allows you to
cherry pick your collection / document properties directly from the ``msg`` object.

For example, setting the collection field to ``{{col}}`` with a message object like
```js
msg = {
  col: "users"
}
```

will have the corresponding node run operations against the ``users`` collection.

### Firebase instances

Both the read & write nodes can expose a ``firebase`` object that contains the current app instance and a reference 
to the firebase admin sdk, which allows you to extend the node to your liking. Simply enable the eject property in the ui / via
an upstream input.

 ```js
// upstream input / via the ui
msg.firestore = {
  eject: true
};

// output
msg.firebase = {
  "app": "...", // current firebase instance
  "admin": "...", // firebase admin sdk
};
 ```

## TODO
- Handle transactions and batch writes
