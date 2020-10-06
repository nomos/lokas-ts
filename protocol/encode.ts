import {Serializable} from "./protocol";
import {Tag, TypeRegistry} from "./types";
import * as ByteBuffer from "bytebuffer";
import {log} from "../utils/logger";
import * as Long from "long";

import {util} from "../utils/util";
import {convertToLongArray} from "../utils/convert";

export const INT8_MIN = -128
export const INT8_MAX = 127
export const UINT8_MIN = 0
export const UINT8_MAX = 255
export const INT16_MIN = -32768
export const INT16_MAX = 32767
export const UINT16_MIN = 0
export const UINT16_MAX = 65535
export const INT32_MIN = -2147483648
export const INT32_MAX = 2147483647
export const UINT32_MIN = 0
export const UINT32_MAX = 4294967295
export const NUMBER_MAX = Number.MAX_SAFE_INTEGER
export const NUMBER_MIN = Number.MIN_SAFE_INTEGER
export const HEADER_SIZE = 4 + 2

export function marshalMessage(transId: number, msg: Serializable): ByteBuffer {
    let classDef = TypeRegistry.GetInstance().GetClassDef(msg.DefineName)
    if (classDef == undefined) {
        log.panic("msg is not registered", msg)
        return
    }
    if (classDef.Tag == Tag.End) {
        log.panic("msg is not tagged", msg)
    }
    let length = calBuffLength(msg, classDef.Tag, null, null)
    let transIdLength = 4   //[0:4] transId
    let lenLength = 2       //[4:6] 长度
    let tagLength = classDef.Tag < 128 ? 1 : 2       //[6:8|10] tag
    let complexLength = 2
    let totalLength = length + transIdLength + tagLength + complexLength + lenLength
    if (totalLength > UINT16_MAX) {
        log.panic("package too big")
    }
    let buff = ByteBuffer.allocate(totalLength)
    let offset = 0
    buff.writeUint32(transId, offset)
    offset += 4
    buff.writeUint16(totalLength, offset)
    offset += 2
    offset = writeTag(buff, classDef.Tag, offset)
    writeComplex(buff, classDef.Tag, msg, offset)
    return buff
}


export function marshal(msg: Serializable): ByteBuffer {
    let classDef = TypeRegistry.GetInstance().GetClassDef(msg.DefineName)
    if (classDef == undefined) {
        throw new Error("unregistered tag " + msg.DefineName)
    }
    let length = calBuffLength(msg, classDef.Tag, null, null)
    let tagLength = classDef.Tag < 128 ? 1 : 2
    let totalLength = length + tagLength
    let buff = ByteBuffer.allocate(totalLength);
    let offset = writeTag(buff, classDef.Tag, 0)
    writeComplex(buff, classDef.Tag, msg, offset)
    return buff
}

function calBuffLength(value: any, tag: number, tag1?: number, tag2?: number): number {
    let length = 0;
    let tagCustom
    if (tag > Tag.Null) {
        tagCustom = tag
        tag = Tag.Proto
    }
    switch (tag) {
        case Tag.Bool:
            return 1
        case Tag.Byte:
            return 1
        case Tag.Short:
            return 2
        case Tag.Int:
            return 4
        case Tag.Long:
            return 8
        case Tag.Float:
            return 4
        case Tag.Double:
            return 8
        case Tag.String:
            return 2 + ByteBuffer.fromUTF8(<string>value).limit;
        case Tag.Time:
            return 8
        case Tag.Bool_Array:
            return 4 + Math.ceil((<boolean[]>value).length / 8.0);
        case Tag.Byte_Array:
            return 4 + (<number[]>value).length;
        case Tag.Short_Array:
            return 4 + (<number[]>value).length * 2;
        case Tag.Int_Array:
            return 4 + (<number[]>value).length * 4;
        case Tag.Long_Array:
            return 4 + (<[]>value).length * 8;
        case Tag.Float_Array:
            return 4 + (<number[]>value).length * 4;
        case Tag.Double_Array:
            return 4 + (<number[]>value).length * 8;
        case Tag.List:
            if (isBaseValue(tag1)) {
                log.panic("list must be complex type")
            }
            if (tag2 == Tag.List || tag2 == Tag.Map) {
                log.panic("can't nesting composite type")
            }
            (<any[]>value).forEach((v) => {
                log.warn("tag1",tag1)
                length += calBuffLength(v, tag1)
            })
            let tagLength = tag1 < 128 ? 1 : 2
            return tagLength + 4 + length;
        case Tag.Map:
            if (isBaseValue(tag1) && tag1 != Tag.String) {
                log.panic("list must be base type")
            }
            if (tag2 == Tag.List || tag2 == Tag.Map) {
                log.panic("can't nesting composite type")
            }
            if (tag2 >= 128) {
                let valueDef = TypeRegistry.GetInstance().GetClassDefByTag(tag2)
                if (valueDef == null) {
                    log.panic("value tag at map not registered", tag2)
                    return
                }
                tag2 = valueDef.Tag
            }


            let keyTagLength = 1
            let valueTagLength = tag2 < 128 ? 1 : 2
            switch (tag1) {
                case Tag.String:
                    (<Map<string, any>>value).forEach((v, k) => {
                        length += calBuffLength(k, Tag.String)
                        length += calBuffLength(v, tag2)
                    })
                    return length + 4 + keyTagLength + valueTagLength
                case Tag.Int:
                case Tag.Long:
                    let keyLength = tag1 === Tag.Int ? 4 : 8;
                    (<Map<number, any>>value).forEach((v) => {
                        length += keyLength
                        length += calBuffLength(v, tag2)
                    })
                    return length + 4 + keyTagLength + valueTagLength
                default:
                    log.panic("unsupported map key type", tag1)
            }
            break
        case Tag.Proto:
            let tagDef = TypeRegistry.GetInstance().GetClassDefByTag(tagCustom)
            if (tagDef == undefined) {
                log.panic("class is not registered", tag, value)
                return
            }
            let lengthLength = 1
            let endTagLength = 1
            tagDef.Members.forEach((v) => {
                length += v.Tag < 128 ? 1 : 2
                let data = value[v.Key]
                length += calBuffLength(data, v.Tag, v.Tag1, v.Tag2)
            })
            //加上Tag_End加上长度
            return length + endTagLength + lengthLength
        case Tag.Buffer:
            return 4 + (<Buffer>value).length
        default:
            log.panic("unsupported tag ", tag, value)
    }
}

function writeTag(buff: ByteBuffer, tag: number, offset: number): number {
    if (tag < UINT8_MIN || tag > UINT16_MAX) {
        log.panic("tag is invalid", tag)
    }
    if (tag < 128) {
        buff.writeUint8(tag, offset)
        return offset + 1
    } else {
        buff.writeUint16(tag, offset)
        return offset + 2
    }
}

export function isBaseValue(tag: number): boolean {
    switch (tag) {
        case Tag.Bool:
        case Tag.Byte:
        case Tag.Short:
        case Tag.Int:
        case Tag.Long:
        case Tag.Float:
        case Tag.Double:
            return true
        default:
            return false
    }
}

export function isBaseArray(tag: number): boolean {
    switch (tag) {
        case Tag.Bool_Array:
        case Tag.Byte_Array:
        case Tag.Short_Array:
        case Tag.Int_Array:
        case Tag.Long_Array:
        case Tag.Float_Array:
        case Tag.Double_Array:
            return true
        default:
            return false
    }
}

function writeValue(buff: ByteBuffer, tag: number, tag1: number, tag2: number, tag3: number, v: any, offset: number): number {
    let tagCustom = 0
    if (tag > Tag.Null) {
        tagCustom = tag
        tag = Tag.Proto
    }
    if (isBaseValue(tag)) {
        offset = writeBaseValue(buff, tag, tag1, v, offset)
    } else if (tag == Tag.String) {
        offset = writeString(buff, v, offset)
    } else if (tag == Tag.Time) {
        offset = writeTime(buff, v, offset)
    } else if (isBaseArray(tag)) {
        offset = writeBaseArray(buff, tag, tag1, v, offset)
    } else if (tag == Tag.List) {
        offset = writeList(buff, tag, tag1, tag2, v, offset)
    } else if (tag == Tag.Map) {
        offset = writeMap(buff, tag1, tag2, tag3, v, offset)
    } else if (tag == Tag.Proto) {
        offset = writeComplex(buff, tagCustom, v, offset)
    } else {
        log.panic("unsupported tag type", tag)
    }
    return offset
}

function writeBaseArray(buff: ByteBuffer, tag: number, tag1: number, v: any, offset: number): number {
    switch (tag) {
        case Tag.Bool_Array:
            buff.writeUint32((<boolean[]>v).length, offset);
            let trueLen = Math.ceil((<boolean[]>v).length / 8.0);
            let u256s = [];
            for (let i = 0; i < (<boolean[]>v).length; i++) {
                let bi = Math.floor(i / 8);
                let si = i % 8;
                if (u256s.length <= bi) {
                    u256s.push(0);
                }
                let data = (<boolean[]>v)[i];
                if (data) {
                    u256s[bi] += Math.pow(2, si);
                }
            }
            for (let i = 0; i < trueLen; i++) {
                buff.writeUint8(u256s[i], offset + 4 + i);
            }
            return 4 + trueLen + offset;
        case Tag.Byte_Array:
            buff.writeUint32((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                if (this.unsigned) {
                    buff.writeUint8((<number[]>v)[i], offset + 4 + i);
                } else {
                    buff.writeInt8((<number[]>v)[i], offset + 4 + i);
                }
            }
            return 4 + (<number[]>v).length + offset;
        case Tag.Short_Array:
            buff.writeUint32((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeInt16((<number[]>v)[i], offset + 4 + i * 2);
            }
            return 4 + (<number[]>v).length * 2 + offset;
        case Tag.Int_Array:
            buff.writeUint32((<number[]>v).length, offset);

            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeInt32((<number[]>v)[i], offset + 4 + i * 4);
            }
            return 4 + (<number[]>v).length * 4 + offset;
        case Tag.Long_Array:
            let longArr = convertToLongArray(v)
            buff.writeUint32(longArr.length, offset);
            for (let i = 0; i < longArr.length; i++) {
                let high = longArr[i].high;
                let low = longArr[i].low;
                buff.writeInt32(high, offset + 4 + i * 8);
                buff.writeInt32(low, offset + 4 + i * 8 + 4);
            }
            return 4 + longArr.length * 8 + offset;
        case Tag.Float_Array:
            buff.writeUint32((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeFloat((<number[]>v)[i], offset + 4 + i * 4);
            }
            return 4 + (<number[]>v).length * 4 + offset;
        case Tag.Double_Array:
            buff.writeUint32((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeDouble((<number[]>v)[i], offset + 4 + i * 8);
            }
            return 4 + (<number[]>v).length * 8 + offset;
        default:
            log.panic("unsupported base array type", tag, v)
    }
}

function writeComplex(buff: ByteBuffer, tag: number, msg: Serializable, offset: number): number {

    if (Object.getPrototypeOf(msg) != TypeRegistry.GetInstance().GetProtoByTag(tag)) {
        log.panic("tag is not matched",Object.getPrototypeOf(msg),TypeRegistry.GetInstance().GetProtoByTag(tag))
        return
    }
    let classDef = TypeRegistry.GetInstance().GetClassDefByTag(tag)
    if (classDef == undefined) {
        log.panic("unregistered tag")
        return
    }
    buff.writeUint8(classDef.Members.length, offset)
    offset += 1
    classDef.Members.forEach(function (v) {
        offset = writeTag(buff, v.Tag, offset)
        offset = writeValue(buff, v.Tag, v.Tag1, v.Tag2, v.Tag3, msg[v.Key], offset)
    })
    offset = writeTag(buff, Tag.End, offset)
    return offset
}

function writeList(buff: ByteBuffer, tag: number, tag1: number, tag2: number, v: any[], offset: number): number {
    offset = writeTag(buff, tag1, offset)
    if (!v.length) {
        buff.writeUint32(0, offset);
        return offset + 4;
    }

    buff.writeUint32(v.length, offset);
    offset += 4
    for (let i = 0; i < v.length; i++) {
        offset = writeValue(buff, tag1, tag2, null, null, v[i], offset)
    }
    return offset;
}

function writeMap(buff: ByteBuffer, keyTag: number, valueTag: number, valueTag1, v: Map<any, any>, offset: number): number {
    switch (keyTag) {
        case Tag.String:
        case Tag.Int:
        case Tag.Long:
            offset = writeTag(buff, keyTag, offset)
            break
        default:
            log.panic("unsupported key tag", keyTag, v)
    }
    offset = writeTag(buff, valueTag, offset)
    let lengthOffset = offset
    offset += 4
    let length = 0
    v.forEach(function (v, k) {
        length++
        if (keyTag == Tag.String) {
            offset = writeString(buff, k, offset)
        } else {
            offset = writeBaseValue(buff, keyTag, null, k, offset)
        }
        offset = writeValue(buff, valueTag, valueTag1, null, null, v, offset)
    })
    buff.writeUint32(length, lengthOffset);
    return offset
}

function writeTime(buff: ByteBuffer, v: Date, offset: number): number {
    let long = Long.fromNumber(v.getTime())
    return writeLong(buff, long, offset)
}

function writeString(buff: ByteBuffer, v: string, offset: number): number {
    let strBuff = ByteBuffer.fromUTF8(v);
    buff.writeUint16(strBuff.limit, offset);
    strBuff.copyTo(buff, offset + 2);
    return 2 + strBuff.limit + offset;
}

function writeBaseValue(buff: ByteBuffer, tag: number, tag1: number, v: any, offset: number): number {
    switch (tag) {
        case Tag.Bool:
            if (!util.isBoolean(v)) {
                log.panic("value is not a boolean", v)
            }
            let data = <boolean>v ? 1 : 0
            buff.writeInt8(data, offset)
            return offset + 1
        case Tag.Byte:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeInt8(v, offset)
            return offset + 1
        case Tag.Short:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeInt16(v, offset)
            return offset + 2
        case Tag.Int:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeInt32(v, offset)
            return offset + 4
        case Tag.Long:
            if (tag1 != Tag.Int && util.isLongString(v)) {
                let long = Long.fromString(v)
                return writeLong(buff, long, offset)
            } else if (tag1 == Tag.Int && util.isNumber(v)) {
                let long = Long.fromNumber(v)
                return writeLong(buff, long, offset)
            } else {
                log.panic("value is not a long type must be string number", v)
            }
            break
        case Tag.Float:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeFloat(v, offset)
            return offset + 4
        case Tag.Double:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeDouble(v, offset)
            return offset + 8
        default:
            log.panic("unsupported base value", tag, v)
    }
}


function writeLong(buff: ByteBuffer, v: Long, offset): number {
    let bytes = v.toBytesBE()
    for (let i = 0, j = offset; i < 8; i++, j++) {
        buff.writeUint8(bytes[i], j)
    }
    return 8 + offset
}