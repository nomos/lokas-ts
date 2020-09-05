import {Runtime} from "./runtime";

export interface ISystem {
    name:string
    desc:string
    enabled:boolean
    stateOnly:any
    priority:number
    addOrder:number
    setRuntime(runtime:Runtime)
    getRuntime():Runtime
    onRegister(runtime:Runtime)
    onEnable(runtime:Runtime)
    onDisable(runtime:Runtime)
    calUpdate(sysUpdateTime,now)
    offState(time:number, runtime:Runtime)
    onState(time:number, runtime:Runtime)
}

export class System implements ISystem{
    public runtime:Runtime
    public enabled:boolean
    public stateOnly:string
    public name:string
    public desc:string
    public priority:number
    public addOrder:number
    public updateTime:number
    public lastUpdateTime:number

    constructor(runtime:Runtime){
        this.runtime = runtime;
        this.enabled = true;
        this.lastUpdateTime = 0;
        this.priority = 0;
    }

    getRuntime():Runtime{
        return this.runtime;
    }

    setRuntime(runtime:Runtime){
        this.runtime = runtime
    }

    onEnable(runtime:Runtime){

    }

    onDisable(runtime:Runtime){

    }

    onRegister(runtime:Runtime){

    }

    onState(now,runtime:Runtime) {

    }

    offState(now,runtime:Runtime) {

    }

    update(dt,now,runtime:Runtime) {

    }

    lateUpdate(dt,now,runtime:Runtime) {

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








