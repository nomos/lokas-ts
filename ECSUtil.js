const Long = require('long');
const Buffer = require('buffer').Buffer;
const ObjectID = this?require('bson').ObjectId:require('./binary/objectid');
const Component = require('./Component');

let ECSUtil = {};

ECSUtil.mountComponnet = function(NewComponent) {
//TODO:这里准备更新
    NewComponent.prototype.getComponentName = NewComponent.prototype.getComponentName||function () {
        return this.__classname;
    };
    NewComponent.prototype.getECS = NewComponent.prototype.getECS||Component.prototype.getECS;
    NewComponent.prototype.isClient = NewComponent.prototype.isClient||Component.prototype.isClient;
    NewComponent.prototype.getRenderer = NewComponent.prototype.getRenderer||Component.prototype.getRenderer;
    NewComponent.prototype.isRenderer = NewComponent.prototype.isRenderer||Component.prototype.isRenderer;
    NewComponent.prototype.getEntity = NewComponent.prototype.getEntity||Component.prototype.getEntity;
    NewComponent.prototype.getSibling = NewComponent.prototype.getSibling||Component.prototype.getSibling;
    NewComponent.prototype.dirty = NewComponent.prototype.dirty||Component.prototype.dirty;
};

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
        return comp.defineName;
    }
    if (comp.prototype&&comp.prototype.__classname) {
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
    if (!(typeof arg=== 'string'||typeof arg=== 'number')) {
        return false;
    }
    let regPos = /^\d+(\.\d+)?$/; //非负浮点数
    let regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
    return regPos.test(arg) || regNeg.test(arg);
};

ECSUtil.isLongString = function (arg) {
    if (!ECSUtil.isStringNumber(arg)||typeof arg!=='string') {
        return false;
    }
    return Long.fromString(''+arg).toString() === arg;
};

ECSUtil.isFloat = function (arg) {
    return  ECSUtil.isNumber(arg)&&!ECSUtil.isInteger(arg);
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
    return  ECSUtil.isNumber(arg)&&!ECSUtil.isInteger(arg)&&(!isNaN(arg));
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

