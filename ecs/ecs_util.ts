import {Long} from "../utils/long";
import {Buffer} from "../thirdparty/buffer";
import {IComponent} from "./default_component";

export namespace ECSUtil{

    export function remove(arr,func) {
        for (let i=0;i<arr.length;i++) {
            let value = arr[i];
            let isDel = func(value);
            if (isDel) {
                arr.splice(i,1);
                i--;
            }
        }
    }

    export function isEqual(arrA,arrB) {
        if(!arrA||!arrB){
            return false;
        }
        if(arrA.length !== arrB.length) {
            return false;
        }
        for(let i=0,l=arrA.length;i<l;i++){
            if(Array.isArray(arrA[i]) && Array.isArray(arrB[i])){
                if(!isEqual(arrA[i],arrB[i])){
                    return false;
                }
            }else if(arrA[i] != arrB[i]){
                return false;
            }
        }
        return true;
    }

    export function getComponentType(comp) {
        if (isString(comp)){
            return comp;
        }
        if (comp.defineName) {
            return comp.defineName;
        }
        if (comp.prototype&&comp.prototype.__classname) {
            return comp.prototype.__classname;
        }
        return comp.__proto__.getComponentName();
    }

    export function clone(comp) {
        let ret = function() {
            return comp.apply(ret,arguments);
        }
        return ret;
    }


    export function includes(collection,value) {
        if (isArray(value)) {
            for (let i=0;i<value.length;i++) {
                if (collection.indexOf(value[i])==-1) {
                    return false;
                }
            }
        } else {
            if (collection.indexOf(value)==-1) {
                return false;
            }
            return collection.includes(value);
        }
        return true;
    }

    export function isObject(val) {
        return val!=null&& typeof val==='object'&&Array.isArray(val)===false&&Object.prototype.toString.call(val)!=='[object Function]';
    }

    export function isArray(arg) {
        return Object.prototype.toString.call(arg)==='[object Array]';
    }

    export function isFunction(arg) {
        return Object.prototype.toString.call(arg)==='[object Function]';
    }

    export function isBuffer(arg) {
        return arg instanceof Buffer||arg instanceof ArrayBuffer||arg instanceof Uint8Array;
    }

    export function isNumber(arg) {
        return typeof arg==='number';
    }

    export function isString(arg) {
        return typeof arg==='string';
    }

    export function isStringNumber(arg) {
        if (!(typeof arg=== 'string'||typeof arg=== 'number')) {
            return false;
        }
        let regPos = /^\d+(\.\d+)?$/; //非负浮点数
        let regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
        return regPos.test(String(arg)) || regNeg.test(String(arg));
    }

    export function isLongString(arg) {
        if (!isStringNumber(arg)||typeof arg!=='string') {
            return false;
        }
        return Long.fromString(''+arg).toString() === arg;
    }

    export function isByte(arg) {
        return isLong(arg)&&(arg >= -128 && arg <= 127);
    }

    export function isShort(arg) {
        return isLong(arg)&&(arg >= -32768 && arg <= 32767);
    }

    export function isInt(arg) {
        return isLong(arg)&&(arg >= -2147483648 && arg <= 2147483647);
    }

    export function LongNotInt(arg) {
        return isLong(arg)&&(arg < -2147483648 || arg > 2147483647);
    }

    export function isLong(arg) {
        return isNumber(arg)&&(!isNaN(arg))&&arg%1 === 0;
    }

    export function isInteger(arg) {
        return  arg%1 === 0;
    }

    export function isFloat(arg) {
        return isDouble(arg)&&(arg >= -3.4e+38 && arg <= 3.4e+38);
    }

    export function isDouble(arg) {
        return  isNumber(arg)&&!isInteger(arg)&&(!isNaN(arg));
    }

    export function isBoolean(arg) {
        return typeof arg === 'boolean';
    }

    export function isInheritFrom(A,B) {
        return A.prototype.__proto__.constructor === B;
    }

    export function isGZip(buf) {
        if (!buf||buf.length<3) {
            return false;
        }
        return buf[0]===0x1F&&buf[1]===0x8B&&buf[2]===0x08;
    }
}




