const Long = require('long');
const Buffer = require('buffer').Buffer;
const ObjectID = this?require('bson').ObjectId:require('./objectid');

let ECSUtil = {};

ECSUtil.remove = function (arr,func) {
    for (let i=0;i<arr.length;i++) {
        let value = arr[i];
        let isDel = func(value);
        if (isDel) {
            arr.splice(i,1);
            i--;
        }
    }
};

ECSUtil.isEqual = function (arrA,arrB) {
    if(!arrA||!arrB){
        return false;
    }
    if(arrA.length !== arrB.length) {
        return false;
    }
    for(let i=0,l=arrA.length;i<l;i++){
        if(Array.isArray(arrA[i]) && Array.isArray(arrB[i])){
            if(!utils.isEqual(arrA[i],arrB[i])){
                return false;
            }
        }else if(arrA[i] != arrB[i]){
            return false;
        }
    }
    return true;
};

ECSUtil.isObject=function (val) {
    return val!=null&& typeof val==='object'&&Array.isArray(val)===false&&Object.prototype.toString.call(val)!=='[object Function]';
};

ECSUtil.isArray=function (arg) {
    return Object.prototype.toString.call(arg)==='[object Array]';
};

ECSUtil.isFunction=function (arg) {
    return Object.prototype.toString.call(arg)==='[object Function]';
};

ECSUtil.isNumber=function (arg) {
    return typeof arg==='number';
};

ECSUtil.isString=function (arg) {
    return typeof arg==='string';
};

ECSUtil.getComponentType = function (comp) {
    if (ECSUtil.isString(comp)){
        return comp;
    }
    if (comp.defineName) {
        return comp.defineName();
    }
    if (comp.prototype) {
        return comp.prototype.__classname;
    }
    return comp.__proto__.getComponentName();
};

ECSUtil.clone = function (comp) {

    let ret = function () {
        return comp.apply(ret,arguments);
    };
    return ret;
};

ECSUtil.cloneFunc=function (ctor, superCtor) {
    for (let i in superCtor.prototype) {
        ctor.prototype[i]=superCtor.prototype[i];
    }
};

ECSUtil.cloneObjectDeep=function (obj) {
    if (null===obj||"object"!== typeof obj) return obj;

    if (obj instanceof Date) {
        let copy=new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if (obj instanceof Array|obj instanceof Object) {
        let copy=(obj instanceof Array) ? []:{};
        for (let attr in obj) {
            if (obj.hasOwnProperty(attr))
                copy[attr]=ECSUtil.cloneObjectDeep(obj[attr]);
        }
        return copy;
    }
};

ECSUtil.has = function (obj,key) {
    return obj[key]!==undefined;
};

ECSUtil.includes = function (collection,value) {
    if (ECSUtil.isArray(value)) {
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
};

ECSUtil.inherits=function (ctor, superCtor) {
    ctor._super = superCtor.prototype;
    for (let i in superCtor.prototype) {
        ctor.prototype[i]=superCtor.prototype[i];
    }
};

ECSUtil.isObject=function (val) {
    return val!=null&& typeof val==='object'&&Array.isArray(val)===false&&Object.prototype.toString.call(val)!=='[object Function]';
};

ECSUtil.isArray=function (arg) {
    return Object.prototype.toString.call(arg)==='[object Array]';
};

ECSUtil.isFunction=function (arg) {
    return Object.prototype.toString.call(arg)==='[object Function]';
};

ECSUtil.isBuffer = function (arg) {
    return arg instanceof Buffer||arg instanceof ArrayBuffer||arg instanceof Uint8Array;
};

ECSUtil.isObjectID = function (arg) {
    return arg instanceof ObjectID;
};

ECSUtil.isNumber=function (arg) {
    return typeof arg==='number';
};

ECSUtil.isString=function (arg) {
    return typeof arg==='string';
};

ECSUtil.isStringNumber = function(arg) {
    let regPos = /^\d+(\.\d+)?$/; //非负浮点数
    let regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
    return regPos.test(arg) || regNeg.test(arg);
};

ECSUtil.isLongString = function (arg) {
    if (!ECSUtil.isStringNumber(arg)) {
        return false;
    }
    return Long.fromString(arg).toString() === arg;
};

ECSUtil.isFloat = function (arg) {
    return  ECSUtil.isNumber(arg)&&arg%1 === 0;
};

ECSUtil.isByte = function (arg) {
    return ECSUtil.isLong(arg)&&(arg >= -128 && arg <= 127);
};

ECSUtil.isShort = function (arg) {
    return ECSUtil.isLong(arg)&&(arg >= -32768 && arg <= 32767);
};

ECSUtil.isInt = function (arg) {
    return ECSUtil.isLong(arg)&&(arg >= -2147483648 && arg <= 2147483647);
};

ECSUtil.LongNotInt = function (arg) {
    return ECSUtil.isLong(arg)&&(arg < -2147483648 || arg > 2147483647);
};

ECSUtil.isLong = function (arg) {
    return ECSUtil.isNumber(arg)&&(!isNaN(arg))&&arg%1 === 0;
};

ECSUtil.isInteger = function (arg) {
    return  arg%1 === 0;
};

ECSUtil.isFloat = function (arg) {
    return ECSUtil.isDouble(arg)&&(arg >= -3.4e+38 && arg <= 3.4e+38);
};

ECSUtil.isDouble = function (arg) {
    return !ECSUtil.isInteger(arg)&&(!isNaN(arg));
};

ECSUtil.isBoolean = function (arg) {
    return typeof arg === 'boolean';
};

ECSUtil.isGZip=function (buf) {
    if (!buf||buf.length<3) {
        return false;
    }
    return buf[0]===0x1F&&buf[1]===0x8B&&buf[2]===0x08;
};



module.exports = ECSUtil;

