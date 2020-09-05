import {Position,Velocity,Acceleration} from "./base_components";
import {ISystem, System} from "../ecs/system";
import {Runtime} from "../ecs/runtime";
import {Circle} from "./circle"
import {Polygon} from "./polygon"

export class AccelSubSystem extends System implements ISystem{
    public name:string = 'AccelSubSystem';
    public desc:string = ""
    constructor(runtime) {
        super(runtime);
    }
    update(dt, now, runtime: Runtime) {
        super.update(dt, now, runtime);
        let entArr = runtime.getEntities([Velocity,Acceleration])
        entArr.forEach(function (ent) {
            let vel = ent.get(Velocity);
            let acc = ent.get(Acceleration);
            vel.x+=acc.x*dt/1000;
            vel.y+=acc.y*dt/1000;
        })
    }
}


export class MoveSubSystem extends System implements ISystem {
    public name:string = 'MoveSubSystem';
    public desc:string = ""
    constructor(runtime) {
        super(runtime)
    }
    update(dt, now, runtime: Runtime) {
        super.update(dt, now, runtime);
        let entArr = runtime.getEntities([Velocity],[Circle,Polygon,Position])
        entArr.forEach(function (ent) {
            let cVelocity = ent.get(Velocity);
            let pos = ent.getOneOf([Circle,Polygon,Position])
            pos.x+=cVelocity.x*dt/1000;
            pos.y+=cVelocity.y*dt/1000;
        })
    }
}