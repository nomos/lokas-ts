# lokas-js
A entity-component framework for both server and client

## example
```
        class Position extends Component {
            static defineName() {
                return 'Position';
            }
            constructor(x, y) {
                super();
                this.x = x;
                this.y = y;
            }
        }

        class Velocity extends Position {
            static defineName() {
                return 'Velocity';
            }
            constructor(x, y) {
                super(x,y);
            }
        }

        let ecs = new ECS(1000 / 30.0, 1);
        ecs.registerComponent(Position);
        ecs.registerComponent(Component);
        ecs.registerSystem({
            name: 'Moving',
            components: ['Position', 'Velocity'],
            update:function (ent,dt,now,ecs) {
                let cPosition = ent.get(Position);
                let cVelocity = ent.get(Velocity);
                console.log(`x=${cPosition.x} y=${cPosition.y}`)
                cPosition.x+=dt*cVelocity.x;
                cPosition.y+=dt*cVelocity.y;
            }
        });
        ecs.start();
```
