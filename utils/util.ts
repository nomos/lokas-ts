import * as Long from "long";
import * as ByteBuffer from "bytebuffer";
import {IComponent} from "../ecs/default_component";

export class CountTimer {
    public lastTime: number

    constructor() {
        this.lastTime = Date.now();
    }

    time(): number {
        let timeNow = Date.now();
        let ret = timeNow - this.lastTime;
        this.lastTime = timeNow;
        return ret;
    }
}

export namespace util {

    export function dateFormat(date:Date,format:string):string {
        let ret={
            "M+":date.getMonth()+1,
            "d+":date.getDate(),
            "h+":date.getHours(),
            "m+":date.getMinutes(),
            "s+":date.getSeconds(),
            "q+":Math.floor((date.getMonth()+3)/3),
            "S+":date.getMilliseconds()
        };
        if (/(y+)/i.test(format)) {
            format=format.replace(RegExp.$1, (date.getFullYear()+'').substr(4-RegExp.$1.length));
        }
        for (let k in ret) {
            if (new RegExp("("+k+")").test(format)) {
                format=format.replace(RegExp.$1, RegExp.$1.length==1
                    ? ret[k]:("00"+ret[k]).substr((""+ret[k]).length));
            }
        }
        return format;
    }

    export function remove<T>(arr:Array<T>, func) {
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i];
            let isDel = func(value);
            if (isDel) {
                arr.splice(i, 1);
                i--;
            }
        }
    }

    export function exclude<T>(arr_a:Array<T>, arr_b:Array<T>) {
        let ret = new Array<T>();
        for (let item_a of arr_a) {
            let found = false;
            for (let item_b of arr_b) {
                if (item_a === item_b) {
                    found = true;
                }
            }
            if (found) continue;
            ret.push(item_a);
        }
        return ret;
    }


    export function isEqual<T>(arrA:Array<T>, arrB:Array<T>) {
        if (!arrA || !arrB) {
            return false;
        }
        if (arrA.length !== arrB.length) {
            return false;
        }
        for (let i = 0, l = arrA.length; i < l; i++) {
            if (Array.isArray(arrA[i]) && Array.isArray(arrB[i])) {
                // @ts-ignore
                if (!isEqual(arrA[i], arrB[i])) {
                    return false;
                }
            } else if (arrA[i] != arrB[i]) {
                return false;
            }
        }
        return true;
    }

    export function includes<T>(collection:Array<T>, value:Array<T>|T) {
        if (isArray(value)) {
            for (let i = 0; i < (<Array<T>>value).length; i++) {
                if (collection.indexOf(value[i]) == -1) {
                    return false;
                }
            }
        } else {
            if (collection.indexOf(<T>value) == -1) {
                return false;
            }
            return collection.includes(<T>value);
        }
        return true;
    }

    export function isObject(val) {
        return val != null && typeof val === 'object' && Array.isArray(val) === false && Object.prototype.toString.call(val) !== '[object Function]';
    }

    export function isArray(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    }

    export function isFunction(arg) {
        return Object.prototype.toString.call(arg) === '[object Function]';
    }

    export function isBuffer(arg) {
        return arg instanceof ByteBuffer || arg instanceof ArrayBuffer || arg instanceof Uint8Array;
    }

    export function isNumber(arg) {
        return typeof arg === 'number';
    }

    export function isValidNumber(arg) {
        return isNumber(arg)&&!isNaN(arg)
    }

    export function isString(arg) {
        return typeof arg === 'string';
    }

    export function isStringNumber(arg) {
        if (!(typeof arg === 'string' || typeof arg === 'number')) {
            return false;
        }
        let regPos = /^\d+(\.\d+)?$/; //非负浮点数
        let regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
        return regPos.test(String(arg)) || regNeg.test(String(arg));
    }

    export function isLongString(arg) {
        if (!isStringNumber(arg) || typeof arg !== 'string') {
            return false;
        }
        return Long.fromString('' + arg).toString() === arg;
    }

    export function isByte(arg) {
        return isLong(arg) && (arg >= -128 && arg <= 127);
    }

    export function isShort(arg) {
        return isLong(arg) && (arg >= -32768 && arg <= 32767);
    }

    export function isInt(arg) {
        return isLong(arg) && (arg >= -2147483648 && arg <= 2147483647);
    }

    export function IsLongNotInt(arg) {
        return isLong(arg) && (arg < -2147483648 || arg > 2147483647);
    }

    export function isLong(arg) {
        return isNumber(arg) && (!isNaN(arg)) && arg % 1 === 0;
    }

    export function isInteger(arg) {
        return arg % 1 === 0;
    }

    export function isFloat(arg) {
        return isDouble(arg) && (arg >= -3.4e+38 && arg <= 3.4e+38);
    }

    export function isDouble(arg) {
        return isNumber(arg) && !isInteger(arg) && (!isNaN(arg));
    }

    export function isBoolean(arg) {
        return typeof arg === 'boolean';
    }

    export function isInheritFrom(A, B) {
        return A.prototype.__proto__.constructor === B;
    }

    export function isGZip(buf) {
        if (!buf || buf.length < 3) {
            return false;
        }
        return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
    }

    export function fix2(v: number) {
        let ret = (Math.floor(v * 100) / 100).toPrecision(2);
        return ret;
    }

    export function has(obj, arg) {
        return obj[arg] !== undefined;
    }

    export function base64ToBuffer(base64) {

    }

    export function bufferToBase64(buffer) {
        let binary = '';
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    const EARTH_RADIUS = 6371.0;

    function ConvertDegreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function HaverSin(theta) {
        let v = Math.sin(theta / 2);
        return v * v;
    }

    export function printJson(obj) {
        try {
            let seen = [];
            let json = JSON.stringify(obj, function (key, val) {
                if (typeof val == "object") {
                    if (seen.indexOf(val) >= 0) return;
                    seen.push(val)
                }
                return val;
            });
            return json;
        } catch (e) {
            return e;
        }
    }

    export function getGeoDistance(a, b) {
//用haversine公式计算球面两点间的距离。
//经纬度转换成弧度
        let lat1 = ConvertDegreesToRadians(a.lat);
        let lon1 = ConvertDegreesToRadians(a.lon);
        let lat2 = ConvertDegreesToRadians(b.lat);
        let lon2 = ConvertDegreesToRadians(b.lon);

//差值
        let vLon = Math.abs(lon1 - lon2);
        let vLat = Math.abs(lat1 - lat2);

//h is the great circle distance in radians, great circle就是一个球体上的切面，它的圆心即是球心的一个周长最大的圆。
        let h = HaverSin(vLat) + Math.cos(lat1) * Math.cos(lat2) * HaverSin(vLon);

        let distance = 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));

        return distance;
    }
}




