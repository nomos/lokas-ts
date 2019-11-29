const Component = require('../Component');

class Circle extends Component{
    static defineName(){
        return 'Circle';
    }
    constructor(x=0,y=0,radius=0,scale=1){
        super();
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.scale = scale;
    }
    draw(context){
        context.circle(this.x,this.y,this.radius*this.scale);
    }
}

module.exports = Circle;