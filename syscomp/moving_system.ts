import {Position,Velocity,Acceleration} from "./base_components";
import {ISystem, System} from "../ecs/system";
import {IRuntime} from "../ecs/runtime";
import {Circle} from "./circle"
import {Polygon} from "./polygon"

export class AccelSubSystem extends System implements ISystem{
    public Name:string = 'AccelSubSystem';
    public Desc:string = ""
    constructor(runtime) {
        super(runtime);
    }
    Update(dt, now, runtime: IRuntime) {
        super.Update(dt, now, runtime);
        let entArr = runtime.GetEntities([Velocity,Acceleration])
        entArr.forEach(function (ent) {
            let vel = ent.Get(Velocity);
            let acc = ent.Get(Acceleration);
            vel.X+=acc.X*dt/1000;
            vel.Y+=acc.Y*dt/1000;
        })
    }
}


export class MoveSubSystem extends System implements ISystem {
    public Name:string = 'MoveSubSystem';
    public Desc:string = ""
    constructor(runtime) {
        super(runtime)
    }
    Update(dt, now, runtime: IRuntime) {
        super.Update(dt, now, runtime);
        let entArr = runtime.GetEntities([Velocity],[Circle,Polygon,Position])
        entArr.forEach(function (ent) {
            let cVelocity = ent.Get(Velocity);
            let pos = ent.getOneOf([Circle,Polygon,Position])
            pos.X+=cVelocity.X*dt/1000;
            pos.Y+=cVelocity.Y*dt/1000;
        })
    }
}