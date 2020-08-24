import {Runtime} from "./runtime";

export class ISystem {
    public runtime:Runtime
    public enabled:boolean
    public stateOnly:string
    public name:string
    public desc:string
    public updateTime:number
    public lastUpdateTime:number
    public priority:number
    public lateUpdate:(interval,now,runtime)=>void

    constructor(ecs,opt){
        this.runtime = ecs;
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
            this.update = opt.update||this.update;
            this.lateUpdate = opt.lateUpdate||this.lateUpdate;
            this.onRegister = opt.onRegister||this.onRegister;
            this.stateOnly = opt.stateOnly||'';
            this.onState = opt.onState||this.onState;
            this.offState = opt.offState||this.offState;
        }
    }

    getECS(){
        return this.runtime;
    }

    isClient(){
        return this.runtime.isClient();
    }

    isServer(){
        return !this.isClient();
    }

    onEnable(ecs){

    }

    onDisable(ecs){

    }

    onRegister(ecs){

    }

    onState(now,ecs) {

    }

    offState(now,ecs) {

    }

    update(dt,now,ecs) {

    }

    getEntities(name){
        let groups = this.getECS().getGroup.apply(this.getECS(),arguments);
        let ret = [];
        for (let j=0;j<groups.length;j++) {
            let group = groups[j];
            for (let i = 0; i < group._entityIndexes.length; i++) {
                let id = group._entityIndexes[i];
                let ent = this.runtime.getEntity(id);
                if (!ent || ent.isOnDestroy()) {
                    continue;
                }
                ret.push(ent);
            }
        }
        return ret;
    }

    getDirtyEntities(name){
        let groups = this.getECS().getGroup.apply(this.getECS(),arguments);
        let ret = [];
        for (let j=0;j<groups.length;j++) {
            let group = groups[j];
            ret = ret.concat(group._dirtyEntities);
        }
        return ret;
    }

    calUpdate(sysUpdateTime,now) {
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

    doOnState(now,ecs) {
        if (this.enabled) {
            let self = this;
            this.runtime.once('_afterUpdate',function () {
                self.onState(now, ecs);
            });
        }
    }

    doOffState(now,ecs) {
        if (this.enabled) {
            let self = this;
            this.runtime.once('_afterUpdate',function () {
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
        this.update(dt, now, this.runtime);
    }

    doLateUpdates(dt,now,ecs) {
        if (this.stateOnly) {
            if (this.stateOnly!==ecs.getState()) {
                return;
            }
        }
        this.lateUpdate(dt, now, this.runtime);
    }
}








