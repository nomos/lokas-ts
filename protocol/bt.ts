import {TAGBool} from "./boolean";
import {TAGByte} from "./byte";
import {TAGShort} from "./short";
import {TAGInt} from "./int";
import {TAGLong} from "./longint";
import {TAGFloat} from "./float";
import {TAGDouble} from "./double";
import {TAGString} from "./string";
import {TAGList} from "./list";
import {TAGMap} from "./map";
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
import {Tag} from "./types"
import {util} from "../utils/util";
import {BinaryBase} from "./binary_base";

// let zlib = require('zlib');

export {Tag} from "./types"


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
        case Tag.Map:
            return new TAGMap()
        case Tag.Proto:
            return new TAGComplex()
        case Tag.Buffer:
            return new TAGBuffer()
    }
}

export function getTagFuncByString(t:string):(value?)=>BinaryBase {
    switch (t) {
        case "Bool":
            return CreateBool
        case "Byte":
            return CreateByte
        case "Short":
            return CreateShort
        case "Int":
            return CreateInt
        case "Long":
            return CreateLong
        case "Float":
            return CreateFloat
        case "Double":
            return CreateDouble
        case "String":
            return CreateString
        case "BoolArray":
            return CreateBoolArray
        case "ByteArray":
            return CreateByteArray
        case "ShortArray":
            return CreateShortArray
        case "IntArray":
            return CreateIntArray
        case "LongArray":
            return CreateLongArray
        case "FloatArray":
            return CreateFloatArray
        case "DoubleArray":
            return CreateDoubleArray
        case "List":
            return CreateList
        case "Map":
            return CreateMap
        case "Complex":
            return CreateComplex
        case "Buff":
            return CreateBuff
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
        case Tag.Map:
            return TAGMap
        case Tag.Proto:
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
            type = Tag.Map;
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
        return CreateBool(obj);
    }

    let numbertemp;
    if (stringnumber && util.isStringNumber(obj)) {
        numbertemp = Number(obj);
    }

    if (util.isByte(obj)) {
        return CreateByte(obj);
    } else if (stringnumber && util.isByte(numbertemp)) {
        return CreateByte(numbertemp);
    }
    if (util.isShort(obj)) {
        return CreateShort(obj);
    } else if (stringnumber && util.isShort(numbertemp)) {
        return CreateShort(numbertemp);
    }
    if (util.isInt(obj)) {
        return CreateInt(obj);
    } else if (stringnumber && util.isInt(numbertemp)) {
        return CreateInt(numbertemp);
    }
    if (util.isLong(obj)) {
        return CreateLong(obj);
    }
    if (util.isLongString(obj) && stringnumber) {
        return CreateLong(obj);
    }
    if (util.isFloat(obj)) {
        return CreateFloat(obj);
    }
    if (util.isDouble(obj)) {
        return CreateDouble(obj);
    }
    if (util.isString(obj)) {
        return CreateString(obj);
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
                ret.push(CreateString(obj[i]));
            }
        }

        if (type === Tag.Map || type === Tag.List) {
            ret = new TAGList();
            for (let i = 0; i < obj.length; i++) {
                let nbtobj = createFromJSObject(obj[i]);
                if (nbtobj) {
                    ret.push(nbtobj);
                }
            }
        }

    } else if (util.isObject(obj)) {
        ret = new TAGMap();
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

export function readTag(buff,offset):[number,number] {
    let high = buff.readUInt8(offset);
    if (high<128) {
        return [high,offset+1]
    } else {
        let low = buff.readUInt8(offset);
        return [high<<8+low,offset+2]
    }
}

export function readFromBuffer(buff, offset?) {
    offset = offset || 0;
    let [type,offset1] = readTag(buff,offset)
    let ret = getTag(type);
    ret.readFromBuffer(buff, offset1);
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

export function CreateByte(value?) {
    let ret = new TAGByte();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateShort(value?) {
    let ret = new TAGShort();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateInt(value?) {
    let ret = new TAGInt();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateLong(value?) {
    let ret = new TAGLong();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateFloat(value?) {
    let ret = new TAGFloat();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateDouble(value?) {
    let ret = new TAGDouble();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateByteArray(value?) {
    let ret = new TAGByteArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateInt8Array(value?) {
    let ret = new TAGByteArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateUInt8Array(value?) {
    let ret = new TAGByteArray();
    ret.unsigned = true;
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateString(value?) {
    let ret = new TAGString();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateList(value?) {
    let ret = new TAGList();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateMap(value?) {
    let ret = new TAGMap();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateComplex(value?) {
    let ret = new TAGComplex();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateBuff(value?) {
    let ret = new TAGBuffer();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateIntArray(value?) {
    let ret = new TAGIntArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateBool(value?) {
    let ret = new TAGBool();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateShortArray(value?) {
    let ret = new TAGShortArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateBoolArray(value?) {
    let ret = new TAGBoolArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateFloatArray(value?) {
    let ret = new TAGFloatArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateDoubleArray(value?) {
    let ret = new TAGDoubleArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

export function CreateLongArray(value?) {
    let ret = new TAGLongArray();
    if (value !== undefined) {
        ret.setValue(value);
    }
    return ret;
}

