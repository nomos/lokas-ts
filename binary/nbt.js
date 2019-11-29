let TAGBool = require("./boolean");
let TAGByte = require("./byte");
let TAGShort = require("./short");
let TAGInt = require("./int");
let TAGLong = require("./longint");
let TAGFloat = require("./float");
let TAGDouble = require("./double");
let TAGString = require("./string");
let TAGList = require("./list");
let TAGCompound = require("./compound");
let TAGBoolArray = require("./bool_array");
let TAGByteArray = require("./byte_array");
let TAGShortArray = require("./short_array");
let TAGIntArray = require("./int_array");
let TAGLongArray = require("./long_array");
let TAGFloatArray = require("./float_array");
let TAGDoubleArray = require("./double_array");
let TAGComplex = require('./complex');
let TAGBase = require("./binary_base");
let TAGObjectID = require("./object_id");
let TAGBuffer = require("./buffer_type");
let zlib = require('zlib');
let Buffer = require('buffer').Buffer;
let utils = require('../ECSUtil');
let nbt = {

    TAGBool        : TAGBool,
    TAGByte        : TAGByte,
    TAGShort       : TAGShort,
    TAGInt         : TAGInt,
    TAGLong        : TAGLong,
    TAGFloat       : TAGFloat,
    TAGDouble      : TAGDouble,
    TAGString      : TAGString,
    TAGBoolArray   : TAGBoolArray,
    TAGByteArray   : TAGByteArray,
    TAGShortArray  : TAGShortArray,
    TAGIntArray    : TAGIntArray,
    TAGLongArray   : TAGLongArray,
    TAGFloatArray  : TAGFloatArray,
    TAGDoubleArray : TAGDoubleArray,
    TAGList        : TAGList,
    TAGCompound    : TAGCompound,
    TAGComplex     : TAGComplex,
    TAGBase        : TAGBase,
    TAGObjectID    : TAGObjectID,
    TAGBuffer      : TAGBuffer,

    "1"           : TAGBool,
    "2"            : TAGByte,
    "3"            : TAGShort,
    "4"            : TAGInt,
    "5"            : TAGLong,
    "6"            : TAGFloat,
    "7"            : TAGDouble,
    "8"            : TAGString,
    "9"            : TAGBoolArray,
    "10"           : TAGByteArray,
    "11"           : TAGShortArray,
    "12"           : TAGIntArray,
    "13"           : TAGLongArray,
    "14"           : TAGFloatArray,
    "15"           : TAGDoubleArray,
    "16"           : TAGList,
    "17"           : TAGCompound,
    "18"           : TAGComplex,
    "19"           : TAGObjectID,
    "20"           : TAGBuffer,

    TAG_Bool       : 1,
    TAG_Byte       : 2,
    TAG_Short      : 3,
    TAG_Int        : 4,
    TAG_Long       : 5,
    TAG_Float      : 6,
    TAG_Double     : 7,
    TAG_String     : 8,
    TAG_Bool_Array : 9,
    TAG_Byte_Array : 10,
    TAG_Short_Array: 11,
    TAG_Int_Array  : 12,
    TAG_Long_Array : 13,
    TAG_Float_Array  : 14,
    TAG_Double_Array : 15,
    TAG_List       : 16,
    TAG_Compound   : 17,
    TAG_Complex    : 18,
    TAG_ObjectID   : 19,
    TAG_Buffer     : 20,
};

//类型 Object>Array>String>Double>Float>Long>Int>Boolean
nbt.checkArrayType = function (arr) {
    let type = 0;
    let strType = false;
    let integer = true;
    for (let i=0;i<arr.length;i++) {
        let item = arr[i];
        if (utils.isObject(item)) {
            type = nbt.TAG_Compound;
            break;
        }
        if (utils.isArray(item)) {
            type = nbt.TAG_List;
            break;
        }

        if (utils.isString(item)) {
            strType = true;
            type = nbt.TAG_String;
        }
        if (utils.isBoolean(item)) {
            type = nbt.TAG_Bool_Array;
            break;
        }
        if (strType) {
            if (!utils.isLongString(item)) {
                type = nbt.TAG_String;
                break;
            } else {
                type = nbt.TAG_Long_Array;
            }
        } else {

            if (!utils.isInteger(item)) {
                integer = false;
            }
            if (integer) {
                if (type<=nbt.TAG_Long_Array&&!utils.isInt(item)) {
                    type = nbt.TAG_Long_Array;
                    break;
                }
                if (type<=nbt.TAG_Int_Array&&!utils.isByte(item)) {
                    type = nbt.TAG_Int_Array;
                }
                if (type<=nbt.TAG_Short_Array&&!utils.isByte(item)) {
                    type = nbt.TAG_Short_Array;
                }
                if (type<=nbt.TAG_Byte_Array&&utils.isByte(item)) {
                    type = nbt.TAG_Byte_Array;
                }
            } else {
                if (!utils.isFloat(item)) {
                    type = nbt.TAG_Double_Array;
                    break;
                }
                type = nbt.TAG_Float_Array;
            }
        }
    }
    return type;
};

nbt.convertToJSObject = function () {

};



nbt.createFromJSObject = function (obj,opt) {
    let stringnumber = nbt.stringnumber;
    if (opt&&opt.stringnumber!==undefined) {
        stringnumber = opt.stringnumber;
    }
    if (null===obj||Object.prototype.toString.call(obj)==='[object Function]') {
        return;
    }
    if (utils.isBoolean(obj)) {
        return nbt.Bool(obj);
    }

    let numbertemp;
    if (stringnumber&&utils.isStringNumber(obj)) {
        numbertemp = Number(obj);
    }

    if (utils.isByte(obj)) {
        return nbt.Byte(obj);
    } else if (stringnumber&&utils.isByte(numbertemp)) {
        return nbt.Byte(numbertemp);
    }
    if (utils.isShort(obj)) {
        return nbt.Short(obj);
    } else if (stringnumber&&utils.isShort(numbertemp)) {
        return nbt.Short(numbertemp);
    }
    if (utils.isInt(obj)) {
        return nbt.Int(obj);
    } else if (stringnumber&&utils.isInt(numbertemp)) {
        return nbt.Int(numbertemp);
    }
    if (utils.isLong(obj)) {
        return nbt.Long(obj);
    }

    if (utils.isLongString(obj)&&stringnumber) {
        return nbt.Long(obj);
    }
    if (utils.isFloat(obj)) {
        return nbt.Float(obj);
    }
    if (utils.isDouble(obj)) {
        return nbt.Double(obj);
    }
    if (utils.isString(obj)) {
        return nbt.String(obj);
    }
    if (utils.isBuffer(obj)) {
        return nbt.Buffer(obj);
    }
    if (utils.isObjectID(obj)) {
        return nbt.ObjectID(obj);
    }

    let ret;
    //如果是数组要确定数组类型
    if (utils.isArray(obj)) {
        let type = nbt.checkArrayType(obj);

        if (type === nbt.TAG_Bool_Array||
            type === nbt.TAG_Byte_Array||
            type === nbt.TAG_Short_Array||
            type === nbt.TAG_Int_Array||
            type === nbt.TAG_Long_Array||
            type === nbt.TAG_Float_Array||
            type === nbt.TAG_Double_Array
        ) {
            ret = new nbt[type]();
            for (let i=0;i<obj.length;i++) {
                ret.push(obj[i]);
            }
        }
        if (type === nbt.TAG_String) {
            ret = nbt.List();
            for (let i=0;i<obj.length;i++) {
                ret.push(nbt.String(obj[i]));
            }
        }

        if (type === nbt.TAG_Compound||type === nbt.TAG_List) {
            ret = nbt.List();
            for (let i=0;i<obj.length;i++) {
                let nbtobj = nbt.createFromJSObject(obj[i]);
                if (nbtobj) {
                    ret.push(nbtobj);
                }
            }
        }

    } else if (utils.isObject(obj)) {
        ret = nbt.Compound();
        for (let i in obj) {
            if (!obj.hasOwnProperty(i))
                continue;
            let nbtobj = nbt.createFromJSObject(obj[i]);
            if (nbtobj) {
                ret.addValue(i,nbtobj,true);
            }
        }
    }
    return ret;
};

nbt.readFromBuffer = function (buff,offset) {
    offset = offset||0;
    let type = buff.readUInt8(offset);
    let ret = new nbt[type]();
    ret.readFromBuffer(buff,offset);
    return ret;
};

nbt.readfromCompressedBufferAsync = function (buff,offset,cb) {
    return new Promise(function (resolve, reject) {
        zlib.inflate(buff,function (err,data) {
            if (err) {
                cb&&cb(err);
                reject(err);
            } else {
                let ret = nbt.readFromBuffer(Buffer.from(data),offset);
                cb&&cb(null,ret);
                resolve(ret);
            }
        })
    });
};

nbt.readfromCompressedBuffer = function (buff,offset) {
    buff = Buffer.from(zlib.inflate(buff));
    return nbt.readFromBuffer(buff,offset);
};

nbt.Byte = function (value) {
    let ret = new nbt.TAGByte();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Short = function (value) {
    let ret = new nbt.TAGShort();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Int = function (value) {
    let ret = new nbt.TAGInt();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Long = function (value) {
    let ret = new nbt.TAGLong();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Float = function (value) {
    let ret = new nbt.TAGFloat();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Double = function (value) {
    let ret = new nbt.TAGDouble();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.ByteArray = function (value) {
    let ret = new nbt.TAGByteArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Int8Array = function (value) {
    let ret = new nbt.TAGByteArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.UInt8Array = function (value) {
    let ret = new nbt.TAGByteArray();
    ret.unsigned = true;
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.String = function (value) {
    let ret = new nbt.TAGString();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.List = function (value) {
    let ret = new nbt.TAGList();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Compound = function (value) {
    let ret = new nbt.TAGCompound();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Complex = function (value) {
    let ret = new nbt.TAGComplex();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.ObjectID = function (value) {
    let ret = new nbt.TAGObjectID();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Buffer = function (value) {
    let ret = new nbt.TAGBuffer();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.IntArray = function (value) {
    let ret = new nbt.TAGIntArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Bool = function (value) {
    let ret = new nbt.TAGBool();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.Boolean = nbt.Bool;

nbt.ShortArray = function (value) {
    let ret = new nbt.TAGShortArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.BoolArray = function (value) {
    let ret = new nbt.TAGBoolArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.FloatArray = function (value) {
    let ret = new nbt.TAGFloatArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.DoubleArray = function (value) {
    let ret = new nbt.TAGDoubleArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

nbt.LongArray = function (value) {
    let ret = new nbt.TAGLongArray();
    if (value!==undefined) {ret.setValue(value);}
    return ret;
};

module.exports = nbt;
