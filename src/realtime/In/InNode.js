function FirebaseInNode(config) {
	if (!config.admin) {
    throw "No firebase admin specified";
  }

  if (!config.ref){
    throw 'Database ref Not Present';
  }

  let first = true;
  const ref = config.admin.database.ref(config.ref);
  ref.on('value', snapshot => {
    if (!snapshot.exists()){
      return;
    }

    if (first){
      if (config.dataAtStart){
        this.onInput({payload: snapshot.val()})
      }
      first = false;
      return;
    }

    this.onInput({payload: snapshot.val()})
  })

	this.onInput = ()=>{}
	this.onStatus = ()=>{}
}

FirebaseInNode.prototype.setOutputCallback = function(cb) {
	this.onInput = cb;
};

FirebaseInNode.prototype.setStatusCallback = function(cb) {
	this.onStatus = cb;
};

module.exports = FirebaseInNode