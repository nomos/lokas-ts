const Component = require('../Component');

class Circle extends Component {
    static get defineName(){
        return 'Circle';
    }

    static get defineDepends(){
        return ['Position'].concat(super.defineDepends);
    }

    static get defineData(){
        return {};
    }

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

exports.Circle = Circle;
