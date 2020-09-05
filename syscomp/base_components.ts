
import {IComponent} from "../ecs/default_component";
import {comp, format, Tag} from "../type/types";

@comp('Vector')
export class Vector extends IComponent {
    static get defineDepends() {
        return [].concat(super.defineDepends);
    }
    @format(Tag.Double)
    public x:number
    @format(Tag.Double)
    public y:number
    @format(Tag.Double)
    public z:number
    public _angle:number
    constructor(x=0, y=0, z=0) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
        this._angle = 0;
    }

    onRemove(ent,ecs){
        this.reset();
    }

    reset(){
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    assign(v:Vector) {
        this.x = v.x
        this.y = v.y
        this.z = v.z
    }

    clone() {
        return Object.getPrototypeOf(this).constructor(this.x, this.y, this.z);
    }

    reverse(self) {
        let ret = self ? this : this.clone();
        ret.x = -ret.x;
        ret.y = -ret.y;
        ret.z = -ret.z;
        return ret;
    }

    equal(v) {
        return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    add(pos, self) {
        let ret = self ? this : this.clone();
        ret.x += pos.x;
        ret.y += pos.y;
        ret.z += pos.z;
        return ret;
    }

    normalize(self) {
        let ret = self ? this : this.clone();
        let length = ret.length;
        if (length===0) {
            return ret;
        }
        ret = ret.div(length, self);
        return ret;
    }

    sub(pos, self) {
        let ret = self ? this : this.clone();
        ret.x -= pos.x;
        ret.y -= pos.y;
        ret.z -= pos.z;
        return ret;
    }

    div(v, self) {
        let ret = self ? this : this.clone();
        ret.x /= v;
        ret.y /= v;
        ret.z /= v;
        return ret;
    }

    mul(v, self) {
        let ret = self ? this : this.clone();
        ret.x *= v;
        ret.y *= v;
        ret.z *= v;
        return ret;
    }

    mod(v,self) {
        let ret = self ? this : this.clone();
        ret.x = ret.x%v;
        ret.y = ret.y%v;
        ret.z = ret.z%v;
        return ret;
    }

    floor(self) {
        let ret = self ? this : this.clone();
        ret.x = Math.floor(ret.x);
        ret.y = Math.floor(ret.y);
        ret.z = Math.floor(ret.z);
        return ret;
    }

    mag(){
        return this.x*this.x+this.y*this.y+this.z*this.z;
    }

    set length(length) {
        let angle;
        if (!this.x && !this.y) {
            angle = this._angle || 0;
        } else {
            angle = this.angle;
        }
        this.x = Math.cos(angle) * length;
        this.y = Math.sin(angle) * length;
    }

    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
    }

    set angle(angle) {
        angle = angle * Math.PI / 180;
        this._angle = angle;
        const length = this.length;
        this.x = Math.cos(angle) * length;
        this.y = Math.sin(angle) * length;
    }

    get angle() {
        return this.getAngleByVector(this.x, this.y);
    }

    getIndex(width){
        return this.x+this.y*width;
    }

    createFromIndex(index,width,self){
        let ret = self ? this : this.clone();
        ret.x = index%width;
        ret.y = Math.floor(index/width);
        return ret;
    }

    getAngleByVector(x, y) {
        if (y === 0) {
            if (x < 0) {
                return 270;
            } else if (x > 0) {
                return 90;
            }
            return 0;
        }
        if (x === 0) {
            if (y < 0) {
                return 180;
            } else if (y > 0) {
                return 0;
            }
        }
        let tan_yx = Math.abs(y) / Math.abs(x);
        let angle = 0;
        if (y > 0 && x < 0) {
            angle = 270 + Math.atan(tan_yx) * 180 / Math.PI;
        } else if (y > 0 && x > 0) {
            angle = 90 - Math.atan(tan_yx) * 180 / Math.PI;
        } else if (y < 0 && x < 0) {
            angle = 270 - Math.atan(tan_yx) * 180 / Math.PI;
        } else if (y < 0 && x > 0) {
            angle = 90 + Math.atan(tan_yx) * 180 / Math.PI;
        }
        return angle;
    }
}

@comp('Position')
export class Position extends Vector {
    static get defineDepends(){
        return [].concat(super.defineDepends);
    }

    @format(Tag.Double)
    public x:number
    @format(Tag.Double)
    public y:number
    @format(Tag.Double)
    public z:number
    constructor(x=0, y=0, z=0) {
        super(x, y, z);
    }
}

@comp('Velocity')
export class Velocity extends Vector {

    @format(Tag.Double)
    public x:number
    @format(Tag.Double)
    public y:number
    @format(Tag.Double)
    public z:number
    constructor(x=0, y=0, z=0) {
        super(x, y, z);
    }

    set speed(speed) {
        this.length = speed;
    }

    get speed() {
        return this.length;
    }
}

@comp('Acceleration')
export class Acceleration extends Vector {

    @format(Tag.Double)
    public x:number
    @format(Tag.Double)
    public y:number
    @format(Tag.Double)
    public z:number
    constructor(x=0, y=0, z=0) {
        super(x, y, z);
    }
}

@comp('Angle')
export class Angle extends IComponent {

    static get defineDepends(){
        return [].concat(super.defineDepends);
    }

    @format(Tag.Double)
    public _angle:number

    constructor(angle=0){
        super();
        this.angle = angle;
    }

    onRemove(ent,ecs){
        this.angle = 0;
    }


    set angle(angle){
        while (angle<0) {
            angle+=360;
        }
        if (angle>=360) {
            angle = angle%360;
        }
        this._angle = angle;
    }
    get angle():number{
        return this._angle;
    }

    get degree(){
        return this._angle*Math.PI/180;
    }

    set degree(degree:number) {
        this.angle = degree*180/Math.PI
    }

    get sin_value(){
        return Math.sin(this.degree);
    }

    get cos_value(){
        return Math.cos(this.degree);
    }


    clone() {
        return Object.getPrototypeOf(this).constructor(this.angle);
    }

    reverse(self=false) {
        let ret = self ? this : this.clone();
        ret.angle = 360-ret.angle;
        return ret;
    }

    add(angle,self=false){
        let ret = self ? this : this.clone();
        ret.angle+=angle;
        return ret;
    }

    sub(angle,self=false){
        let ret = self ? this : this.clone();
        ret.angle-=angle;
        return ret;
    }

    setVector(v){
        if (v.y===0) {
            if (v.x<0) {
                return 270;
            } else if (v.x>0) {
                return 90;
            }
            return 0;
        }
        if (v.x===0) {
            if (v.y<0) {
                return 180;
            } else if (v.y>=0) {
                return 0;
            }
        }
        let tan_yx =  Math.abs(v.y)/Math.abs(v.x);
        this.angle = 0;
        if (v.y>0&&v.x<0) {
            this.angle = 270+Math.atan(tan_yx)*180/Math.PI;
        } else if (v.y>0&&v.x>0) {
            this.angle = 90-Math.atan(tan_yx)*180/Math.PI;
        } else if (v.y<0&&v.x<0) {
            this.angle = 270-Math.atan(tan_yx)*180/Math.PI;
        } else if (v.y<0&&v.x>0) {
            this.angle = 90+Math.atan(tan_yx)*180/Math.PI;
        }
    }

    getVectorX(length){
        length = Math.abs(length);
        if (this.angle == 0) {
            return length;
        }
        if (this.angle == 90) {
            return 0;

        }
        if (this.angle == 180) {
            return -length;

        }
        if (this.angle == 270) {
            return 0;
        }
        return this.cos_value*length;
    }

    getVectorY(length){
        length = Math.abs(length);
        if (this.angle == 0) {
            return 0;
        }
        if (this.angle == 90) {
            return length;

        }
        if (this.angle == 180) {
            return 0;

        }
        if (this.angle == 270) {
            return -length;
        }
        return this.sin_value*length;
    }

    getVector(){
        if (this.angle == 0) {
            return new Vector(0,1);
        }
        if (this.angle == 90) {
            return new Vector(1,0);

        }
        if (this.angle == 180) {
            return new Vector(0,-1);

        }
        if (this.angle == 270) {
            return new Vector(-1,0);
        }
        return new Vector(this.getVectorX(1),this.getVectorY(1));
    }
}

@comp('AngularMovement')
export class AngularMovement extends IComponent {

    static get defineDepends(){
        return ['Angle'].concat(super.defineDepends);
    }

    @format(Tag.Double)
    public velocity:number = 0
    @format(Tag.Double)
    public acceleration:number = 0
    constructor(velocity=0,acceleration=0){
        super();
        this.velocity = velocity;
        this.acceleration = acceleration;
    }

    onRemove(ent,ecs){
        this.velocity = 0;
        this.acceleration = 0;
    }
}

@comp('Size')
export class Size extends IComponent {
    static get defineDepends() {
        return [].concat(super.defineDepends);
    }
    @format(Tag.Double)
    public width:number = 0
    @format(Tag.Double)
    public height:number = 0
    constructor(w = 0, h = 0) {
        super();
        this.width = w;
        this.height = h;
    }

    onRemove(ent,ecs){
        this.width = 0;
        this.height = 0;
    }

    get length(){
        return this.height;
    }

    set length(v){
        this.height = v;
    }
}

@comp('TimeStamp')
export class TimeStamp extends IComponent {
    static get defineDepends() {
        return [].concat(super.defineDepends);
    }
    @format(Tag.Long)
    public time:number = 0
    constructor(time) {
        super();
        this.time = time;
    }
}


