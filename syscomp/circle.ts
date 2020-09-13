import {IComponent} from "../ecs/default_component";
import {define, format,Tag} from "../protocol/types";
import {Position} from "./base_components";

@define('Circle')
export class Circle extends IComponent {

    static get defineDepends(): Array<string> {
        return ['Position'].concat(super.defineDepends);
    }
    @format(Tag.Double)
    public radius:number
    @format(Tag.Double)
    public scale:number
    constructor(radius=0,scale=1){
        super();
        this.radius = radius;
        this.scale = scale;
    }

    get x(){return this.getSibling(Position).x;}

    set x(x){this.getSibling(Position).x = x;}

    get y(){return this.getSibling(Position).y;}

    set y(y){this.getSibling(Position).y = y;}

    draw(context,scale){
        scale = scale||1;
        context.circle(this.x*scale,this.y*scale,this.radius*this.scale*scale*scale);
    }
}