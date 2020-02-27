const Polygon = require('./Polygon');

class Point extends Polygon{
    static get defineName(){
        return 'Point';
    }
    constructor(){
        super([[0,0]],0,1,1);
    }
}

module.exports = Point;