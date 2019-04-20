# node-red-contrib-cloud-firestore

Node-RED nodes to handle google cloud firestore read and write operations

## Install
Install from [npm](https://www.npmjs.com/package/node-red-contrib-cloud-firestore)
```
npm install node-red-contrib-cloud-firestore
```

Install from the palette manager
```
node-red-contrib-cloud-firestore
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
- ``query``: [array&lt;object&gt;] an array of objects defining query methods to apply to the read

Response data from the operation is output through the ``msg.payload`` property

#### Upstream input queries

To perform dynamic queries with the read node through input, you need to supply an array of objects on the ``msg.firestore.query`` property in the order they will be chained
with the query method as the only property and it's value being an array of arguments, or a single string value as show below.

```
{
    query : [
        {where: ["state", "==", "CA"]},
        {where: ["population", "<", 1000000]}
    ]
}

=> reference.where("state", "==", "CA").where("population", "<", 1000000)
```

```
{
    query : [
        {orderBy: "name"},
        {limit: 2}
    ]
}

=> reference.orderBy("name").limit(2)
```

```
{
    query : [
        {where: ["population", ">", 100000]},
        {orderBy: ["population", "asc"]},
        {limit: 2}
    ]
}

=> reference.where("population", ">", 100000).orderBy("population", "asc").limit(2)
```

```
{
    query : [
        {orderBy: "population"},
        {startAt: 100000},
        {endAt: 1000000}
    ]
}

=> reference.orderBy("population").startAt(100000).endAt(1000000)
```

### Firestore Write

Node performs write operations to the referenced collection, subCollection or document.
Configurations made from within the node or on the ``msg.firestore`` property:
- ``operation``: [string] Write operation to perform, either ``add``, ``set``, ``update`` or ``delete``
- ``collection``: [string] collection or subCollection reference to write to
- ``document``: [string] document reference to write to (optional for ``add`` operations)
- ``options``: [object] additional options passed to firebase (currently
  specific to ``set`` operations)

#### Handling Firestore classes & sentinels

Due to the nature of Cloud firestores implementation, some actions need special handling.

**Arrays**

To perform [array updates](https://firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array), you'll
need to wrap your elements in an object with the ``_arrayUnion`` or ``_arrayRemove`` property to add or remove elements respectively within an array
```
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
```
{
    animals: firestore.FieldValue.arrayUnion("goats"),
    farmers: firestore.FieldValue.arrayRemove({name: "John Doe"})
}
```

**GeoPoints**

Objects within the payload received by the Write Node containing a ``_lat`` and ``_lng`` property will be replaced with the appropriate [GeoPoint](https://firebase.google.com/docs/reference/admin/node/admin.firestore.GeoPoint) class

```
{
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
```
{
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

```
{
    time: '_serverTimestamp'
}
```

becomes:
```
{
    time: firestore.FieldValue.serverTimestamp()
}
```

**Delete**

Properties with the ``_delete`` string value will be replaced with the appropriate [delete](https://firebase.google.com/docs/reference/admin/node/admin.firestore.FieldValue#.delete) sentinel

```
{
    unwantedField: '_delete'
}
```

becomes:
```
{
    unwantedField: firestore.FieldValue.delete()
}
```

## TODO

- Prepare automated tests
- Handle transactions and batch writes
