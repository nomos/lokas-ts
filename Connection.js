let Connection = function (uid,ecs) {
    this.uid = uid;
    this.step = -1;
    this.entitySteps = {};
    this.ecs = ecs;
    this.compHash = 0;
};

module.exports = Connection;

let pro = Connection.prototype;

pro.reset = function () {
    this._step = -1;
    this.entitySteps = [];
};

pro.sync = function (step,entMap) {
    this.step = step;
    this.entitySteps = entMap;
};