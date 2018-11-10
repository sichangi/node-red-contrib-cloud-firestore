node-red-contrib-cloud-firestore
------------

[Node-RED](http://nodered.org) nodes to handle google cloud firestore read and write operations

 
Install
-------
Install from [npm](http://npmjs.org)
```
npm install node-red-contrib-cloud-firestore
```

Usage
-----
**Firestore Read**

Node fetches data from a referenced collection, subcollection or document.
Configurations can be made within the node or on the ``msg.firestore`` property:
- ``collection``: [string] The collection or subCollection in reference
- ``document``: [string] The document reference under the defined collection
- ``realtime``: [boolean] telling the node to listen for live updates or not (false by default)

Response data from the operation is output through the ``msg.payload`` property 

**Firestore Write**

Node performs write operations to the referenced collection, subCollection or document.
Configurations made from within the node or on the ``msg.firestore`` property:
- ``operation``: [string] Write operation to perform, either ``add``, ``set`` or ``update``
- ``collection``: [string] collection or subCollection reference to write to
- ``document``: [string] document reference to write to (optional for ``add`` operations) 

Handling Firestore Classes
-----
Due to the nature of Cloud firestores implementation, some actions need special handling.

**Arrays**

To perform [array updates](https://firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array), you'll 
need to wrap your elements in an object with the ``_arrayUnion`` or ``_arrayRemove`` property respectively to add or remove elements from an array
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

Objects within the payload received by the Write Node containing a ``_lat`` and ``_lng`` property will be replaced with the appropriate [GeoPoint](https://firebase.google.com/docs/reference/admin/node/admin.firestore.GeoPoint) constructor:

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

Properties with the ``_serverTimestamp`` string value will be replace with the appropriate sentinel [serverTimestamp](https://firebase.google.com/docs/reference/admin/node/admin.firestore.FieldValue#.serverTimestamp):

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

Properties with the ``_delete`` string value will be replaced with the appropriate sentinel [delete](https://firebase.google.com/docs/reference/admin/node/admin.firestore.FieldValue#.delete)  

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
