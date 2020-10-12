import {IRuntime} from "./runtime";

export interface ISystem {
    Name:string
    Desc:string
    Enabled:boolean
    StateOnly:any
    Priority:number
    AddOrder:number
    SetRuntime(runtime:IRuntime)

    GetRuntime():IRuntime
    OnRegister(runtime:IRuntime)
    OnEnable(runtime:IRuntime)
    OnDisable(runtime:IRuntime)
    CalUpdate(sysUpdateTime, now):SystemUpdater[]
    OffState(time:number, runtime:IRuntime)
    OnState(time:number, runtime:IRuntime)
    DoUpdates(dt, now, ecs)
    DoLateUpdates(dt, now, ecs)
}

export class SystemUpdater {
    public Interval:number = 0
    public ActiveTime:number = 0
    public System:ISystem
    constructor(interval:number,activeTime:number,system:ISystem) {
        this.Interval = interval
        this.ActiveTime = activeTime
        this.System = system
    }
}

export class System implements ISystem{
    public Enabled:boolean
    public StateOnly:string
    public Name:string
    public Desc:string
    public Priority:number
    public AddOrder:number

    protected updateTime:number
    protected lastUpdateTime:number
    protected runtime:IRuntime

    constructor(runtime:IRuntime){
        this.runtime = runtime;
        this.Enabled = true;
        this.lastUpdateTime = 0;
        this.Priority = 0;
    }

    GetRuntime():IRuntime{
        return this.runtime;
    }

    SetRuntime(runtime:IRuntime){
        this.runtime = runtime
    }

    OnEnable(runtime:IRuntime){

    }

    OnDisable(runtime:IRuntime){

    }

    OnRegister(runtime:IRuntime){

    }

    OnState(now, runtime:IRuntime) {

    }

    OffState(now, runtime:IRuntime) {

    }

    protected Update(dt, now, runtime:IRuntime) {

    }

    protected LateUpdate(dt, now, runtime:IRuntime) {

    }

    CalUpdate(sysUpdateTime, now):SystemUpdater[] {
        if (!this.Enabled) {
            return [];
        }
        let ret = [];
        let updateTime = this.updateTime||sysUpdateTime;
        while (updateTime<now-this.lastUpdateTime) {
            ret.push(new SystemUpdater(updateTime,this.lastUpdateTime+updateTime,this));
            this.lastUpdateTime+=updateTime;
        }
        return ret;
    }


    protected doOffState(now,ecs) {
        if (this.Enabled) {
            let self = this;
            this.runtime.once('_afterUpdate',function () {
                self.OffState(now, ecs);
            });
        }
    }

    DoUpdates(dt, now, ecs) {
        if (this.StateOnly) {
            if (this.StateOnly!==ecs.getState()) {
                return;
            }
        }
        ecs.updateCommands();
        this.Update(dt, now, this.runtime);
    }

    DoLateUpdates(dt, now, ecs) {
        if (this.StateOnly) {
            if (this.StateOnly!==ecs.getState()) {
                return;
            }
        }
        this.LateUpdate(dt, now, this.runtime);
    }
}




