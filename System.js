class System {
    constructor(ecs,opt){
        this.ecs = ecs;
        this.type = 'system';
        this.components = [];
        this.enabled = true;
        this.lastUpdateTime = 0;
        this.priority = 0;
        if (opt) {
            this.onEnable = opt.onEnable;
            this.onDisable = opt.onDisable;
            this.desc = opt.desc||'';
            this.name = opt.name||this.name;
            this.updateTime = opt.updateTime||opt.interval;
            this.priority = opt.priority||0;
            this.components = opt.components||[];
            this.updateHandler = opt.updateHandler||this.updateHandler;
            this.beforeUpdate = opt.beforeUpdate||this.beforeUpdate;
            this.update = opt.update||this.update;
            this.afterUpdate = opt.afterUpdate||this.afterUpdate;
            this.beforeLateUpdate = opt.beforeLateUpdate||this.beforeLateUpdate;
            this.lateUpdate = opt.lateUpdate||this.lateUpdate;
            this.afterLateUpdate = opt.afterLateUpdate||this.afterLateUpdate;
            this.sysUpdate = opt.sysUpdate||this.sysUpdate;
            this.onRegister = opt.onRegister||this.onRegister;
            this.stateOnly = opt.stateOnly||'';
            this.onState = opt.onState||this.onState;
            this.offState = opt.offState||this.offState;
        }
    }

    onEnable(ecs){

    }

    onDisable(ecs){

    }

    update(dt,now,ecs) {

    }

    onEnable(ecs){

    }

    onDisable(ecs){

    }

    onRegister(ecs){

    }

    updateHandler(dt,now,ecs){
        if (!this.update) {
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
    lateUpdateHandler(dt,now,ecs){
        if (!this.lateUpdate) {
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

    sysUpdate(dt, now, ecs){}

    sysLateUpdate(dt, now, ecs){}

    beforeUpdate(dt, now, ecs){}

    afterUpdate(dt, now, ecs){}

    beforeLateUpdate(dt, now, ecs){}

    afterLateUpdate(dt, now, ecs){}

    onRegister(ecs){}

    setAddOrder(order) {
        this._addOrder = order;
    }

    getSize() {
        let num=0;
        for (let i=0;i<this.groups.length;i++) {
            num+=this.groups[i]._entityIndexes.length;
        }
        return num;
    }

    isEmpty() {
        return this.getSize() === 0;
    }

    calUpdate(sysUpdateTime,now,ecs) {
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
    }

    onState(now,ecs) {

    }

    offState(now,ecs) {

    }

    doOnState(now,ecs) {
        if (this.enabled) {
            let self = this;
            this.ecs.once('_afterUpdate',function () {
                self.onState(now, ecs);
            });
        }
    }

    doOffState(now,ecs) {
        if (this.enabled) {
            let self = this;
            this.ecs.once('_afterUpdate',function () {
                self.offState(now, ecs);
            });
        }
    }

    doUpdates(dt,now,ecs) {
        if (this.stateOnly) {
            if (this.stateOnly!==ecs.getState()) {
                return;
            }
        }
        ecs.updateCommands();
        this.beforeUpdate(dt, now, this.ecs);
        this.sysUpdate(dt, now, this.ecs);
        if (this.groups.length===0) {
            this.update(dt, now, this.ecs);
            return;
        }
        this.updateHandler(dt, now, this.ecs);
        this.afterUpdate(dt, now, this.ecs);
    }

    doLateUpdates(dt,now,ecs) {
        if (this.stateOnly) {
            if (this.stateOnly!==ecs.getState()) {
                return ;
            }
        }
        this.beforeLateUpdate(dt, now, this.ecs);
        this.sysLateUpdate(dt, now, this.ecs);
        if (this.groups.length===0) {
            this.lateUpdate(dt, now, this.ecs);
            return;
        }
        this.lateUpdateHandler(dt, now, this.ecs);
        this.afterLateUpdate(dt, now, this.ecs);
    }
}

module.exports = System;









