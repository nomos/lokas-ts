import {DefaultComponent} from "../ecs/default_component";

export class Circle extends DefaultComponent {
    static get defineName(){
        return 'Circle';
    }

    static get defineDepends(): Array<string> {
        return ['Position'].concat(super.defineDepends);
    }

    static get defineData(){
        return {};
    }
    public radius:number
    public scale:number
    constructor(radius=0,scale=1){
        super();
        this.radius = radius;
        this.scale = scale;
    }

    get x(){return this.getSibling('Position').x;}

    set x(x){this.getSibling('Position').x = x;}

    get y(){return this.getSibling('Position').y;}

    set y(y){this.getSibling('Position').y = y;}

    draw(context,scale){
        scale = scale||1;
        context.circle(this.x*scale,this.y*scale,this.radius*this.scale*scale*scale);
    }
}