const Polygon = require('./Polygon');

class Point extends Polygon{
    static defineName(){
        return 'Point';
    }
    constructor(x=0,y=0){
        super(x,y,[[0,0]],0,1,1);
        this.x = x;
        this.y = y;
    }
}

module.exports = Point;