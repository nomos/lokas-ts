import {IComponent} from "../ecs/default_component";
import {define, Tag} from "../protocol/types";

@define("Vector", [
    ["X", Tag.Double],
    ["Y", Tag.Double],
    ["Z", Tag.Double],
])
export class Vector extends IComponent {
    public X: number
    public Y: number
    public Z: number
    protected _angle: number

    constructor(x = 0, y = 0, z = 0) {
        super();
        this.X = x;
        this.Y = y;
        this.Z = z;
        this._angle = 0;
    }

    OnRemove(ent, ecs) {
        this.reset();
    }

    reset() {
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
    }

    assign(v: Vector) {
        this.X = v.X
        this.Y = v.Y
        this.Z = v.Z
    }

    clone() {
        return Object.getPrototypeOf(this).constructor(this.X, this.Y, this.Z);
    }

    reverse(self) {
        let ret = self ? this : this.clone();
        ret.x = -ret.x;
        ret.y = -ret.y;
        ret.z = -ret.z;
        return ret;
    }

    equal(v) {
        return this.X === v.x && this.Y === v.y && this.Z === v.z;
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
        if (length === 0) {
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

    mod(v, self) {
        let ret = self ? this : this.clone();
        ret.x = ret.x % v;
        ret.y = ret.y % v;
        ret.z = ret.z % v;
        return ret;
    }

    floor(self) {
        let ret = self ? this : this.clone();
        ret.x = Math.floor(ret.x);
        ret.y = Math.floor(ret.y);
        ret.z = Math.floor(ret.z);
        return ret;
    }

    mag() {
        return this.X * this.X + this.Y * this.Y + this.Z * this.Z;
    }

    set length(length) {
        let angle;
        if (!this.X && !this.Y) {
            angle = this._angle || 0;
        } else {
            angle = this.angle;
        }
        this.X = Math.cos(angle) * length;
        this.Y = Math.sin(angle) * length;
    }

    get length() {
        return Math.sqrt(Math.pow(this.X, 2) + Math.pow(this.Y, 2) + Math.pow(this.Z, 2));
    }

    set angle(angle) {
        angle = angle * Math.PI / 180;
        this._angle = angle;
        const length = this.length;
        this.X = Math.cos(angle) * length;
        this.Y = Math.sin(angle) * length;
    }

    get angle() {
        return this.getAngleByVector(this.X, this.Y);
    }

    getIndex(width) {
        return this.X + this.Y * width;
    }

    createFromIndex(index, width, self) {
        let ret = self ? this : this.clone();
        ret.x = index % width;
        ret.y = Math.floor(index / width);
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

@define("Position", [
    ["X", Tag.Double],
    ["Y", Tag.Double],
    ["Z", Tag.Double],
])
export class Position extends Vector {

    public X: number
    public Y: number
    public Z: number

    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z);
    }
}

@define("Velocity", [
    ["X", Tag.Double],
    ["Y", Tag.Double],
    ["Z", Tag.Double],
])
export class Velocity extends Vector {

    public X: number
    public Y: number
    public Z: number

    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z);
    }

    set speed(speed) {
        this.length = speed;
    }

    get speed() {
        return this.length;
    }
}

@define("Acceleration", [
    ["X", Tag.Double],
    ["Y", Tag.Double],
    ["Z", Tag.Double],
])
export class Acceleration extends Vector {

    public X: number
    public Y: number
    public Z: number

    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z);
    }
}

@define("Angle", [
    ["Angle", Tag.Double],
])
export class Angle extends IComponent {

    public _Angle: number

    constructor(angle = 0) {
        super();
        this.Angle = angle;
    }

    OnRemove(ent, ecs) {
        this.Angle = 0;
    }


    set Angle(angle) {
        while (angle < 0) {
            angle += 360;
        }
        if (angle >= 360) {
            angle = angle % 360;
        }
        this._Angle = angle;
    }

    get Angle(): number {
        return this._Angle;
    }

    get degree() {
        return this._Angle * Math.PI / 180;
    }

    set degree(degree: number) {
        this.Angle = degree * 180 / Math.PI
    }

    get sin_value() {
        return Math.sin(this.degree);
    }

    get cos_value() {
        return Math.cos(this.degree);
    }


    clone() {
        return Object.getPrototypeOf(this).constructor(this.Angle);
    }

    reverse(self = false) {
        let ret = self ? this : this.clone();
        ret.angle = 360 - ret.angle;
        return ret;
    }

    add(angle, self = false) {
        let ret = self ? this : this.clone();
        ret.angle += angle;
        return ret;
    }

    sub(angle, self = false) {
        let ret = self ? this : this.clone();
        ret.angle -= angle;
        return ret;
    }

    setVector(v) {
        if (v.y === 0) {
            if (v.x < 0) {
                return 270;
            } else if (v.x > 0) {
                return 90;
            }
            return 0;
        }
        if (v.x === 0) {
            if (v.y < 0) {
                return 180;
            } else if (v.y >= 0) {
                return 0;
            }
        }
        let tan_yx = Math.abs(v.y) / Math.abs(v.x);
        this.Angle = 0;
        if (v.y > 0 && v.x < 0) {
            this.Angle = 270 + Math.atan(tan_yx) * 180 / Math.PI;
        } else if (v.y > 0 && v.x > 0) {
            this.Angle = 90 - Math.atan(tan_yx) * 180 / Math.PI;
        } else if (v.y < 0 && v.x < 0) {
            this.Angle = 270 - Math.atan(tan_yx) * 180 / Math.PI;
        } else if (v.y < 0 && v.x > 0) {
            this.Angle = 90 + Math.atan(tan_yx) * 180 / Math.PI;
        }
    }

    getVectorX(length) {
        length = Math.abs(length);
        if (this.Angle == 0) {
            return length;
        }
        if (this.Angle == 90) {
            return 0;

        }
        if (this.Angle == 180) {
            return -length;

        }
        if (this.Angle == 270) {
            return 0;
        }
        return this.cos_value * length;
    }

    getVectorY(length) {
        length = Math.abs(length);
        if (this.Angle == 0) {
            return 0;
        }
        if (this.Angle == 90) {
            return length;

        }
        if (this.Angle == 180) {
            return 0;

        }
        if (this.Angle == 270) {
            return -length;
        }
        return this.sin_value * length;
    }

    getVector() {
        if (this.Angle == 0) {
            return new Vector(0, 1);
        }
        if (this.Angle == 90) {
            return new Vector(1, 0);

        }
        if (this.Angle == 180) {
            return new Vector(0, -1);

        }
        if (this.Angle == 270) {
            return new Vector(-1, 0);
        }
        return new Vector(this.getVectorX(1), this.getVectorY(1));
    }
}

@define("AngularMovement", [
    ["Velocity", Tag.Double],
    ["Acceleration", Tag.Double],
], Angle)
export class AngularMovement extends IComponent {

    public Velocity: number = 0
    public Acceleration: number = 0

    constructor(velocity = 0, acceleration = 0) {
        super();
        this.Velocity = velocity || this.Velocity;
        this.Acceleration = acceleration || this.Acceleration;
    }

    OnRemove(ent, ecs) {
        this.Velocity = 0;
        this.Acceleration = 0;
    }
}

@define("Size", [
    ["Width", Tag.Double],
    ["Height", Tag.Double],
])
export class Size extends IComponent {

    public Width: number = 0
    public Height: number = 0

    constructor(w = 0, h = 0) {
        super();
        this.Width = w || this.Width;
        this.Height = h || this.Height;
    }

    OnRemove(ent, ecs) {
        this.Width = 0;
        this.Height = 0;
    }

    get length() {
        return this.Height;
    }

    set length(v) {
        this.Height = v;
    }
}

