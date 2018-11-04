function RealtimeOutNode(config) {
  if (!config.admin) {
    throw "No firebase admin specified";
  }

  if (!config.ref){
    throw 'Database ref Not Present';
  }

  if (!config.operation){
    throw 'Write Operation is not defined';
  }

  this.ref = config.ref;
  this.operation = config.operation;
  this.database = config.admin.database;
	this.onStatus = ()=>{}
}

RealtimeOutNode.prototype.onInput = function(msg, out, errorcb) {
  const refPath = msg.ref || this.ref;
  const operation = msg.operation || this.operation;

  this.database.ref().child(refPath)[operation](msg.payload, error => {
    if (error){
      errorcb(error);
    } else {
      out(msg);
    }
  });

  // let first = true
  // ref.on('value', snapshot => {
  //   // output on result, or immediately when there's no update
  //   if (!first || (msg.payload === snapshot.val())){
  //     out({payload: snapshot.val()})
  //     return;
  //   }
  //   first = false;
  //   if (!snapshot.exists()){
  //     this.database.ref().child(refPath).set(msg.payload, error => {
  //       if (error){
  //         errorcb(error)
  //       } 
  //     });
  //   } else {
  //     ref.set(msg.payload, error => {
  //       if (error){
  //         errorcb(error)
  //       } 
  //     });
  //   }
  // });
};

RealtimeOutNode.prototype.setStatusCallback = function(cb) {
	this.onStatus = cb;
};

module.exports = RealtimeOutNode
