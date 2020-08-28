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
import {Tag} from "../type/types"
import {util} from "../utils/util";
import {BinaryBase} from "./binary_base";

// let zlib = require('zlib');

export {Tag} from "../type/types"


export function getTag(tagId: Tag) {
    switch (tagId) {
        case Tag.Bool:
            return new TAGBool()
        case Tag.Byte:
            return new TAGByte()
        case Tag.Short:
            return new TAGShort()
        case Tag.Int:
            return new TAGInt()
        case Tag.Long:
            return new TAGLong()
        case Tag.Float:
            return new TAGFloat()
        case Tag.Double:
            return new TAGDouble()
        case Tag.String:
            return new TAGString()
        case Tag.Bool_Array:
            return new TAGBoolArray()
        case Tag.Byte_Array:
            return new TAGByteArray()
        case Tag.Short_Array:
            return new TAGShortArray()
        case Tag.Int_Array:
            return new TAGIntArray()
        case Tag.Long_Array:
            return new TAGLongArray()
        case Tag.Float_Array:
            return new TAGFloatArray()
        case Tag.Double_Array:
            return new TAGDoubleArray()
        case Tag.List:
            return new TAGList()
        case Tag.Compound:
            return new TAGCompound()
        case Tag.Complex:
            return new TAGComplex()
        case Tag.Buffer:
            return new TAGBuffer()
    }
}

export function getTagFuncByString(t:string):(value?)=>BinaryBase {
    switch (t) {
        case "Bool":
            return Bool
        case "Byte":
            return Byte
        case "Short":
            return Short
        case "Int":
            return Int
        case "Long":
            return Long
        case "Float":
            return Float
        case "Double":
            return Double
        case "String":
            return String
        case "BoolArray":
            return BoolArray
        case "ByteArray":
            return ByteArray
        case "ShortArray":
            return ShortArray
        case "IntArray":
            return IntArray
        case "LongArray":
            return LongArray
        case "FloatArray":
            return FloatArray
        case "DoubleArray":
            return DoubleArray
        case "List":
            return List
        case "Compound":
            return Compound
        case "Complex":
            return Complex
        case "Buff":
            return Buff
    }
}

export function getTagType(tagId: Tag) {
    switch (tagId) {
        case Tag.Bool:
            return TAGBool
        case Tag.Byte:
            return TAGByte
        case Tag.Short:
            return TAGShort
        case Tag.Int:
            return TAGInt
        case Tag.Long:
            return TAGLong
        case Tag.Float:
            return TAGFloat
        case Tag.Double:
            return TAGDouble
        case Tag.String:
            return TAGString
        case Tag.Bool_Array:
            return TAGBoolArray
        case Tag.Byte_Array:
            return TAGByteArray
        case Tag.Short_Array:
            return TAGShortArray
        case Tag.Int_Array:
            return TAGIntArray
        case Tag.Long_Array:
            return TAGLongArray
        case Tag.Float_Array:
            return TAGFloatArray
        case Tag.Double_Array:
            return TAGDoubleArray
        case Tag.List:
            return TAGList
        case Tag.Compound:
            return TAGCompound
        case Tag.Complex:
            return TAGComplex
        case Tag.Buffer:
            return TAGBuffer
    }
}

//类型 Object>Array>String>Double>Float>Long>Int>Boolean
export function checkArrayType(arr): Tag {
    let type = 0;
    let strType = false;
    let integer = true;
    if (!arr.length) {
        return Tag.String;
    }
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (util.isObject(item)) {
            type = Tag.Compound;
            break;
        }
        if (util.isArray(item)) {
            type = Tag.List;
            break;
        }

        if (util.isString(item)) {
            strType = true;
            type = Tag.String;
        }
        if (util.isBoolean(item)) {
            type = Tag.Bool_Array;
            break;
        }
        if (strType) {
            if (!util.isLongString(item)) {
                type = Tag.String;
                break;
            } else {
                if (item > Number.MAX_SAFE_INTEGER) {
                    type = Tag.Long_Array;
                }
                if (type !== Tag.Long_Array) {
                    type = Tag.Int_Array;
                }
            }
        } else {

            if (!util.isInteger(item)) {
                integer = false;
            }
            if (integer) {
                if (type <= Tag.Long_Array && !util.isInt(item)) {
                    type = Tag.Long_Array;
                    break;
                }
                if (type <= Tag.Int_Array && !util.isByte(item)) {
                    type = Tag.Int_Array;
                }
                if (type <= Tag.Short_Array && !util.isByte(item)) {
                    type = Tag.Short_Array;
                }
                if (type <= Tag.Byte_Array && util.isByte(item)) {
                    type = Tag.Byte_Array;
                }
            } else {
                if (!util.isFloat(item)) {
                    type = Tag.Double_Array;
                    break;
                }
                type = Tag.Float_Array;
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
        if (type === Tag.Bool_Array ||
            type === Tag.Byte_Array ||
            type === Tag.Short_Array ||
            type === Tag.Int_Array ||
            type === Tag.Long_Array ||
            type === Tag.Float_Array ||
            type === Tag.Double_Array
        ) {
            ret = getTag(type);
            for (let i = 0; i < obj.length; i++) {
                ret.push(obj[i]);
            }
        }
        if (type === Tag.String) {
            ret = new TAGList();
            for (let i = 0; i < obj.length; i++) {
                ret.push(String(obj[i]));
            }
        }

        if (type === Tag.Compound || type === Tag.List) {
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

export function readFromBuffer(buff, offset?) {
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

