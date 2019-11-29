const {Position,Velocity,Accelation} = require("./BaseComponents");
const Circle = require('./Circle');
const Polygon = require('./Polygon');

let MovingSystem = [
    function AccelSubSystem() {
        this.name = 'AccelSubSystem';
        this.components = [Velocity,Accelation];
        this.update = function (ent,dt) {
            let vel = ent.get(Velocity);
            let acc = ent.get(Accelation);
            vel.x+=acc.x*dt/1000;
            vel.y+=acc.y*dt/1000;
        };
    },
    function MoveSubSystem() {
        this.name = 'MoveSubSystem';
        this.components = [[Circle,Polygon,Position],Velocity];
        this.update = function (ent,dt) {
            let cPolygon = ent.get('Polygon');
            let cCircle = ent.get('Circle');
            let cPosition = ent.get('Position');
            let cVelocity = ent.get('Velocity');
            let pos = cPolygon||cCircle||cPosition;
            pos.x+=cVelocity.x*dt/1000;
            pos.y+=cVelocity.y*dt/1000;
        }
    },
];

let MovingModule = {
    name:'MovingModule',
    onLoad:function (ecs) {
        ecs.registerComponent('Position',Position, 300, 10);
        ecs.registerComponent('Velocity',Velocity, 300, 10);
        ecs.registerComponent('Accelation',Accelation, 300, 10);
        ecs.registerComponent('Polygon',Polygon, 200, 10);
        ecs.registerComponent('Circle',Circle, 200, 10);
        ecs.registerSystem(MovingSystem);
    }
};

module.exports = {
    MovingSystem:MovingSystem,
    MovingModule:MovingModule
};
