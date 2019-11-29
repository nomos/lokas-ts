const Component = require('../Component');

class Rect extends Component{
    static defineName(){
        return 'Rect';
    }
    constructor(minX=0,minY=0,maxX=0,maxY=0){
        super();
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }
    defineData(){
        return {
            minX:'Float',
            minY:'Float',
            maxX:'Float',
            maxY:'Float',
        }
    }
    get x(){
        return this.minX/2+this.maxX/2;
    }
    get y(){
        return this.minY/2+this.maxY/2;
    }
    set w(width) {
        this.minX = this.x-width/2;
        this.maxX = this.x+width/2;
    }
    get w() {
        return this.maxX-this.minX;
    }
    set h(height) {
        this.minY = this.y-height/2;
        this.maxY = this.y+height/2;
    }
    get h() {
        return this.maxY-this.minY;
    }
    intersectionWithRect = function (a) {
        return !(this.minY>a.maxY||this.minX>a.maxX||this.maxY<a.minY||this.maxX<a.minX);
    };
    draw (color, fill, graphic) {
        graphic.rect(this.minX, this.minY, this.w, this.h);
        graphic.strokeColor=cc.color(color);
        graphic.fillColor=cc.color(color);
        fill ? graphic.fill():graphic.stroke();
    }

}

module.exports = Rect;