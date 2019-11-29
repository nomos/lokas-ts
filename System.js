let System = function (ecs,opt) {
    this.ecs = ecs;
    this.desc = opt.desc;
    this.name = opt.name;
    this.updateTime = opt.updateTime||opt.interval;
    this.priority = opt.priority||0;
    this.components = opt.components;
    this.groups = ecs.registerGroups(opt.components);
    this.type = 'system';
    this.enabled = true;
    this.onEnable = opt.onEnable;
    this.onDisable = opt.onDisable;
    this.lastStep = 0;
    this.curStep = 0;
    this.lastUpdateTime = 0;
    this.updateHandler = opt.updateHandler;
    this.beforeUpdate = opt.beforeUpdate;
    this.update = opt.update;
    this.afterUpdate = opt.afterUpdate;
    this.beforeLateUpdate = opt.beforeLateUpdate;
    this.lateUpdate = opt.lateUpdate;
    this.afterLateUpdate = opt.afterLateUpdate;
    this.sysUpdate = opt.sysUpdate;
    this.onRegister = opt.onRegister;
    this.initUpdateHandlers(opt);
    this.stateOnly = opt.stateOnly||'';
    this.onState = opt.onState;
    this.offState = opt.offState;
};

module.exports = System;

let pro = System.prototype;

pro.initUpdateHandlers = function (opt) {
    let self = this;
    if (!opt.updateHandler) {
        this.updateHandler = function (dt,now,ecs) {
            if (!self.update) {
                return;
            }
            for (let j=0;j<this.groups.length;j++) {
                let group = this.groups[j];
                for (let i=0;i<group._entityIndexes.length;i++) {
                    let id = group._entityIndexes[i];
                    let ent = group._entities[id];
                    //FIXME:这里临时处理
                    if (!ent || ent._onDestroy) {
                        continue;
                    }
                    this.update(ent, dt, now, ecs);
                }
            }
        }
    }
    if (!opt.lateUpdateHandler) {
        this.lateUpdateHandler = function (dt,now,ecs) {
            if (!self.lateUpdate) {
                return;
            }
            for (let j=0;j<this.groups.length;j++) {
                let group = this.groups[j];
                for (let i=0;i<group._entityIndexes.length;i++) {
                    let id = group._entityIndexes[i];
                    let ent = group._entities[id];
                    //FIXME:这里临时处理
                    if (!ent || ent._onDestroy) {
                        continue;
                    }
                    this.lateUpdate(ent, dt, now, ecs);
                }
            }

        }
    }
};

pro.setAddOrder = function (order) {
    this._addOrder = order;
};

pro.getSize = function () {
    let num=0;
    for (let i=0;i<this.groups.length;i++) {
        num+=this.groups[i]._entityIndexes.length;
    }
    return num;
};

pro.isEmpty = function () {
    return this.getSize() === 0;
};

pro.calUpdate = function (sysUpdateTime,now,ecs) {
    if (!this.enabled) {
        return [];
    }
    let ret = [];
    let updateTime = this.updateTime||sysUpdateTime;
    while (updateTime<now-this.lastUpdateTime) {
        ret.push({
            activeTime:this.lastUpdateTime+updateTime,
            interval:updateTime
        });
        this.lastUpdateTime+=updateTime;
    }
    return ret;
};

pro.doOnState = function (now,ecs) {
    if (this.enabled) {
        let self = this;
        this.ecs.once('_afterUpdate',function () {
            self.onState && self.onState(now, ecs);
        });
    }
};

pro.doOffState = function (now,ecs) {
    if (this.enabled) {
        let self = this;
        this.ecs.once('_afterUpdate',function () {
            self.offState && self.offState(now, ecs);
        });
    }
};

pro.doUpdates = function (dt,now,ecs) {
    if (this.stateOnly) {
        if (this.stateOnly!==ecs.getState()) {
            return;
        }
    }
    ecs.updateCommands();
    this.beforeUpdate&&this.beforeUpdate(dt, now, this.ecs);
    this.sysUpdate && this.sysUpdate(dt, now, this.ecs);
    if (this.groups.length===0) {
        this.update && this.update(dt, now, this.ecs);
        return;
    }
    this.updateHandler(dt, now, this.ecs);
    this.afterUpdate&&this.afterUpdate(dt, now, this.ecs);
};

pro.doLateUpdates = function (dt,now,ecs) {
    if (this.stateOnly) {
        if (this.stateOnly!==ecs.getState()) {
            return ;
        }
    }
    this.beforeLateUpdate&&this.beforeLateUpdate(dt, now, this.ecs);
    this.sysLateUpdate && this.sysLateUpdate(dt, now, this.ecs);
    if (!this.groups.length===0) {
        this.lateUpdate && this.lateUpdate(dt, now, this.ecs);
        return;
    }
    this.lateUpdateHandler(dt, now, this.ecs);
    this.afterLateUpdate&&this.afterLateUpdate(dt, now, this.ecs);
};





