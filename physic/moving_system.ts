import {Position,Velocity,Acceleration} from "./base_components";
import {ISystem} from "../ecs/ISystem";
import {Circle} from "./circle"
import {Polygon} from "./polygon"

export class AccelSubSystem extends ISystem {
    constructor(ecs,opt) {
        super(ecs,opt);
        this.name = 'AccelSubSystem';
        this.components = [Velocity,Acceleration];
        this.update = function (ent,dt) {
            let vel = ent.get(Velocity);
            let acc = ent.get(Acceleration);
            vel.x+=acc.x*dt/1000;
            vel.y+=acc.y*dt/1000;
        };
    }
}


export class MoveSubSystem extends ISystem {
    constructor(ecs,opt) {
        super(ecs,opt);
        this.name = 'MoveSubSystem';
        this.components = [[Circle,Polygon,Position],Velocity];
        this.update = function (ent,dt) {
            let cVelocity = ent.get('Velocity');
            let pos = ent.get(['Polygon','Circle','Position']);
            pos.x+=cVelocity.x*dt/1000;
            pos.y+=cVelocity.y*dt/1000;
        }
    }
}

let MovingModule = {
    name:'MovingModule',
    onLoad:function (ecs) {
        ecs.registerComponent('Position',Position, 300, 10);
        ecs.registerComponent('Velocity',Velocity, 300, 10);
        ecs.registerComponent('Acceleration',Acceleration, 300, 10);
        ecs.registerComponent('Polygon',Polygon, 200, 10);
        ecs.registerComponent('Circle',Circle, 200, 10);
        ecs.registerSystem(MovingSystem);
    }
};