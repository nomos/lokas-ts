import {TAGBool} from "./boolean";
import {TAGByte} from "./byte";
import {TAGShort} from "./short";
import {TAGInt} from "./int";
import {TAGLong} from "./longint";
import {TAGFloat} from "./float";
import {TAGDouble} from "./double";
import {TAGString} from "./string";
import {TAGList} from "./list";
import {TAGCompound} from "./compound";
import {TAGBoolArray} from "./bool_array";
import {TAGByteArray} from "./byte_array";
import {TAGShortArray} from "./short_array";
import {TAGIntArray} from "./int_array";
import {TAGLongArray} from "./long_array";
import {TAGFloatArray} from "./float_array";
import {TAGDoubleArray} from "./double_array";
import {TAGComplex} from './complex';
import {TAGBuffer} from "./buffer_type";
import {Buffer} from "../thirdparty/buffer";
import {Type} from "./tags"
import {util} from "../utils/util";

// let zlib = require('zlib');

export {Type} from "./tags"


export function getTag(tagId: Type) {
    switch (tagId) {
        case Type.TAG_Bool:
            return new TAGBool()
        case Type.TAG_Byte:
            return new TAGByte()
        case Type.TAG_Short:
            return new TAGShort()
        case Type.TAG_Int:
            return new TAGInt()
        case Type.TAG_Long:
            return new TAGLong()
        case Type.TAG_Float:
            return new TAGFloat()
        case Type.TAG_Double:
            return new TAGDouble()
        case Type.TAG_String:
            return new TAGString()
        case Type.TAG_Bool_Array:
            return new TAGBoolArray()
        case Type.TAG_Byte_Array:
            return new TAGByteArray()
        case Type.TAG_Short_Array:
            return new TAGShortArray()
        case Type.TAG_Int_Array:
            return new TAGIntArray()
        case Type.TAG_Long_Array:
            return new TAGLongArray()
        case Type.TAG_Float_Array:
            return new TAGFloatArray()
        case Type.TAG_Double_Array:
            return new TAGDoubleArray()
        case Type.TAG_List:
            return new TAGList()
        case Type.TAG_Compound:
            return new TAGCompound()
        case Type.TAG_Complex:
            return new TAGComplex()
        case Type.TAG_Buffer:
            return new TAGBuffer()
    }
}

export function getTagType(tagId: Type) {
    switch (tagId) {
        case Type.TAG_Bool:
            return TAGBool
        case Type.TAG_Byte:
            return TAGByte
        case Type.TAG_Short:
            return TAGShort
        case Type.TAG_Int:
            return TAGInt
        case Type.TAG_Long:
            return TAGLong
        case Type.TAG_Float:
            return TAGFloat
        case Type.TAG_Double:
            return TAGDouble
        case Type.TAG_String:
            return TAGString
        case Type.TAG_Bool_Array:
            return TAGBoolArray
        case Type.TAG_Byte_Array:
            return TAGByteArray
        case Type.TAG_Short_Array:
            return TAGShortArray
        case Type.TAG_Int_Array:
            return TAGIntArray
        case Type.TAG_Long_Array:
            return TAGLongArray
        case Type.TAG_Float_Array:
            return TAGFloatArray
        case Type.TAG_Double_Array:
            return TAGDoubleArray
        case Type.TAG_List:
            return TAGList
        case Type.TAG_Compound:
            return TAGCompound
        case Type.TAG_Complex:
            return TAGComplex
        case Type.TAG_Buffer:
            return TAGBuffer
    }
}

//类型 Object>Array>String>Double>Float>Long>Int>Boolean
export function checkArrayType(arr): Type {
    let type = 0;
    let strType = false;
    let integer = true;
    if (!arr.length) {
        return Type.TAG_String;
    }
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (util.isObject(item)) {
            type = Type.TAG_Compound;
            break;
        }
        if (util.isArray(item)) {
            type = Type.TAG_List;
            break;
        }

        if (util.isString(item)) {
            strType = true;
            type = Type.TAG_String;
        }
        if (util.isBoolean(item)) {
            type = Type.TAG_Bool_Array;
            break;
        }
        if (strType) {
            if (!util.isLongString(item)) {
                type = Type.TAG_String;
                break;
            } else {
                if (item > Number.MAX_SAFE_INTEGER) {
                    type = Type.TAG_Long_Array;
                }
                if (type !== Type.TAG_Long_Array) {
                    type = Type.TAG_Int_Array;
                }
            }
        } else {

            if (!util.isInteger(item)) {
                integer = false;
            }
            if (integer) {
                if (type <= Type.TAG_Long_Array && !util.isInt(item)) {
                    type = Type.TAG_Long_Array;
                    break;
                }
                if (type <= Type.TAG_Int_Array && !util.isByte(item)) {
                    type = Type.TAG_Int_Array;
                }
                if (type <= Type.TAG_Short_Array && !util.isByte(item)) {
                    type = Type.TAG_Short_Array;
                }
                if (type <= Type.TAG_Byte_Array && util.isByte(item)) {
                    type = Type.TAG_Byte_Array;
                }
            } else {
                if (!util.isFloat(item)) {
                    type = Type.TAG_Double_Array;
                    break;
                }
                type = Type.TAG_Float_Array;
            }
        }
    }
    return type;
}

export function convertToJSObject() {

}


export function createFromJSObject(obj, opt?) {
    let stringnumber: boolean = false;
    if (opt && opt.stringnumber !== undefined) {
        stringnumber = opt.stringnumber;
    }

    if (null === obj || Object.prototype.toString.call(obj) === '[object Function]') {
        return;
    }
    if (util.isBoolean(obj)) {
        return Bool(obj);
    }

    let numbertemp;
    if (stringnumber && util.isStringNumber(obj)) {
        numbertemp = Number(obj);
    }

    if (util.isByte(obj)) {
        return Byte(obj);
    } else if (stringnumber && util.isByte(numbertemp)) {
        return Byte(numbertemp);
    }
    if (util.isShort(obj)) {
        return Short(obj);
    } else if (stringnumber && util.isShort(numbertemp)) {
        return Short(numbertemp);
    }
    if (util.isInt(obj)) {
        return Int(obj);
    } else if (stringnumber && util.isInt(numbertemp)) {
        return Int(numbertemp);
    }
    if (util.isLong(obj)) {
        return Long(obj);
    }
    if (util.isLongString(obj) && stringnumber) {
        return Long(obj);
    }
    if (util.isFloat(obj)) {
        return Float(obj);
    }
    if (util.isDouble(obj)) {
        return Double(obj);
    }
    if (util.isString(obj)) {
        return String(obj);
    }
    if (util.isBuffer(obj)) {
        return new Buffer(obj);
    }

    let ret;
    //如果是数组要确定数组类型
    if (util.isArray(obj)) {
        let type = checkArrayType(obj);
        if (type === Type.TAG_Bool_Array ||
            type === Type.TAG_Byte_Array ||
            type === Type.TAG_Short_Array ||
            type === Type.TAG_Int_Array ||
            type === Type.TAG_Long_Array ||
            type === Type.TAG_Float_Array ||
            type === Type.TAG_Double_Array
        ) {
            ret = getTag(type);
            for (let i = 0; i < obj.length; i++) {
                ret.push(obj[i]);
            }
        }
        if (type === Type.TAG_String) {
            ret = new TAGList();
            for (let i = 0; i < obj.length; i++) {
                ret.push(String(obj[i]));
            }
        }

        if (type === Type.TAG_Compound || type === Type.TAG_List) {
            ret = new TAGList();
            for (let i = 0; i < obj.length; i++) {
                let nbtobj = createFromJSObject(obj[i]);
                if (nbtobj) {
                    ret.push(nbtobj);
                }
            }
        }

    } else if (util.isObject(obj)) {
        ret = new TAGCompound();
        for (let i in obj) {
            if (!obj.hasOwnProperty(i))
                continue;
            let nbtobj = createFromJSObject(obj[i]);
            if (nbtobj) {
                ret.addValue(i, nbtobj, true);
            }
        }
    }
    return ret;
}

export function readFromBuffer(buff, offset) {
    offset = offset || 0;
    let type = buff.readUInt8(offset);
    let ret = getTag(type);
    ret.readFromBuffer(buff, offset);
    return ret;
}

// export function readfromCompressedBufferAsync(buff, offset, cb) {
//     return new Promise(function (resolve, reject) {
//         zlib.inflate(buff, function (err, data) {
//             if (err) {
//                 cb && cb(err);
//                 reject(err);
//             } else {
//                 let ret = readFromBuffer(Buffer.from(data), offset);
//                 cb && cb(null, ret);
//                 resolve(ret);
//             }
//         })
//     });
// }
//
// export function readfromCompressedBuffer(buff, offset) {
//     buff = Buffer.from(zlib.inflate(buff));
//     return readFromBuffer(buff, offset);
// }

export function Byte(value?) {
    let ret = new TAGByte();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Short(value?) {
    let ret = new TAGShort();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Int(value?) {
    let ret = new TAGInt();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Long(value?) {
    let ret = new TAGLong();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Float(value?) {
    let ret = new TAGFloat();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Double(value?) {
    let ret = new TAGDouble();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function ByteArray(value?) {
    let ret = new TAGByteArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Int8Array(value?) {
    let ret = new TAGByteArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function UInt8Array(value?) {
    let ret = new TAGByteArray();
    ret.unsigned = true;
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function String(value?) {
    let ret = new TAGString();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function List(value?) {
    let ret = new TAGList();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Compound(value?) {
    let ret = new TAGCompound();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Complex(value?) {
    let ret = new TAGComplex();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Buff(value?) {
    let ret = new TAGBuffer();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function IntArray(value?) {
    let ret = new TAGIntArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function Bool(value?) {
    let ret = new TAGBool();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function ShortArray(value?) {
    let ret = new TAGShortArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function BoolArray(value?) {
    let ret = new TAGBoolArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function FloatArray(value?) {
    let ret = new TAGFloatArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function DoubleArray(value?) {
    let ret = new TAGDoubleArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function LongArray(value?) {
    let ret = new TAGLongArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

