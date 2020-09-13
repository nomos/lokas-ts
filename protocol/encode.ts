import {Serializable} from "./protocol";
import {Tag, TypeRegistry} from "./types";
import {Buffer} from "../thirdparty/buffer";
import {log} from "../utils/logger";
import {Long} from "../utils/long";
import {util} from "../utils/util";
import {convertToLongArray} from "../utils/convert";

const INT8_MIN = -128
const INT8_MAX = 127
const UINT8_MIN = 0
const UINT8_MAX = 255
const INT16_MIN = -32768
const INT16_MAX = 32767
const UINT16_MIN = 0
const UINT16_MAX = 65535
const INT32_MIN = -2147483648
const INT32_MAX = 2147483647
const UINT32_MIN = 0
const UINT32_MAX = 4294967295
const NUMBER_MAX = Number.MAX_SAFE_INTEGER
const NUMBER_MIN = Number.MIN_SAFE_INTEGER
const HEADER_SIZE = 4+2

export function marshalToBytes(transId: number, msg: any): Buffer {
    let classDef = TypeRegistry.getInstance().getClassDef(msg.defineName)
    if (classDef == undefined) {
        log.panic("msg is not registered", msg)
        return
    }
    if (classDef.tag == Tag.End) {
        log.panic("msg is not tagged", msg)
    }
    let length = calBuffLength(msg,classDef.tag,null,null)
    let transIdLength = 4   //[0:4] transId
    let lenLength = 2       //[0:4] 长度
    let tagLength = classDef.tag<128?1:2       //[0:4] tag
    let complexLength = 2
    let totalLength = length + transIdLength + tagLength+ complexLength + lenLength
    if (totalLength > UINT16_MAX) {
        log.panic("package too big")
    }
    let buff = Buffer.from(new Uint8Array(totalLength), 'utf8');
    let offset = 0
    buff.writeUInt32BE(transId, transIdLength)
    offset+=4
    buff.writeUInt16BE(totalLength, offset)
    offset+=2
    offset = writeTag(buff,classDef.tag,offset)
    writeComplex(buff,classDef.tag,msg,offset)
    return buff
}

export function marshal(msg:Serializable):Buffer {
    let classDef = TypeRegistry.getInstance().getClassDef(msg.defineName)
    if (classDef == undefined) {
        throw new Error("unregistered tag "+msg.defineName)
    }
    let length = calBuffLength(msg,classDef.tag,null,null)
    let tagLength = classDef.tag<128?1:2
    let totalLength = length + tagLength
    let buff = Buffer.from(new Uint8Array(totalLength), 'utf8');
    let offset = writeTag(buff,classDef.tag,0)
    writeComplex(buff,classDef.tag,msg,offset)
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
            return 2 + Buffer.byteLength(<string>value, "utf8");
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
            return 4 + (<number[]>value).length * 8;
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
            (<any[]>value).forEach((v, i, arr) => {
                length += calBuffLength(v, tag1)
            })
            let tagLength = tag1 < 128 ? 1 : 2
            return tagLength + 4 + length;
        case Tag.Map:
            if (isBaseValue(tag1)&&tag1!=Tag.String) {
                log.panic("list must be base type")
            }
            if (tag2 == Tag.List || tag2 == Tag.Map) {
                log.panic("can't nesting composite type")
            }
            if (tag2>=128) {
                let valueDef = TypeRegistry.getInstance().getClassDefByTag(tag2)
                if (valueDef == null) {
                    log.panic("value tag at map not registered", tag2)
                }
                tag2 = valueDef.tag
            }


            let keyTagLength = 1
            let valueTagLength = tag2<128?1:2
            switch (tag1) {
                case Tag.String:
                    (<Map<string, any>>value).forEach((v, k, map) => {
                        length += calBuffLength(k, Tag.String)
                        length += calBuffLength(v, tag2)
                    })
                    return length+4+keyTagLength+valueTagLength
                case Tag.Int:
                case Tag.Long:
                    let keyLength = tag1 === Tag.Int ? 4 : 8;
                    (<Map<number, any>>value).forEach((v, k, map) => {
                        length += keyLength
                        length += calBuffLength(v, tag2)
                    })
                    return length+4+keyTagLength+valueTagLength
                default:
                    log.panic("unsupported map key type", tag1)
            }
            break
        case Tag.Proto:
            let tagDef = TypeRegistry.getInstance().getClassDefByTag(tagCustom)
            if (tagDef == undefined) {
                log.panic("class is not registered", tag, value)
                return
            }
            let lengthLength = 1
            let endTagLength = 1
            tagDef.members.forEach((v, i, arr) => {
                length += v.tag < 128 ? 1 : 2
                let data = value[v.key]
                length += calBuffLength(data, v.tag, v.tag1, v.tag2)
            })
            //加上Tag_End加上长度
            return length + endTagLength + lengthLength
        case Tag.Buffer:
            return 4 + (<Buffer>value).length
        default:
            log.panic("unsupported tag ",tag,value)
    }
}

function writeTag(buff: Buffer, tag: number, offset: number): number {
    if (tag < UINT8_MIN || tag > UINT16_MAX) {
        log.panic("tag is invalid", tag)
    }
    if (tag < 128) {
        buff.writeUInt8(tag, offset)
        return offset + 1
    } else {
        buff.writeUInt16BE(tag, offset)
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

function writeValue(buff: Buffer, tag: number, tag1: number, tag2: number, v: any, offset: number): number {
    let tagCustom = 0
    if (tag > Tag.Null) {
        tagCustom = tag
        tag = Tag.Proto
    }
    if (isBaseValue(tag)) {
        offset = writeBaseValue(buff, tag, v, offset)
    } else if (tag == Tag.String) {
        offset = writeString(buff, v, offset)
    } else if (tag == Tag.Time) {
        offset = writeTime(buff, v, offset)
    } else if (isBaseArray(tag)) {
        offset = writeBaseArray(buff, tag, v, offset)
    } else if (tag == Tag.List) {
        offset = writeList(buff, tag, tag1, v, offset)
    } else if (tag == Tag.Map) {
        offset = writeMap(buff, tag1, tag2, v, offset)
    } else if (tag == Tag.Proto) {
        offset = writeComplex(buff, tagCustom, v, offset)
    } else {
        log.panic("unsupported tag type", tag)
    }
    return offset
}

function writeBaseArray(buff: Buffer, tag: number, v: any, offset: number): number {
    switch (tag) {
        case Tag.Bool_Array:
            buff.writeUInt32BE((<boolean[]>v).length, offset);
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
                buff.writeUInt8(u256s[i], offset + 4 + i);
            }
            return 4 + trueLen + offset;
        case Tag.Byte_Array:
            buff.writeUInt32BE((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                if (this.unsigned) {
                    buff.writeUInt8((<number[]>v)[i], offset + 4 + i);
                } else {
                    buff.writeInt8((<number[]>v)[i], offset + 4 + i);
                }
            }
            return 4 + (<number[]>v).length + offset;
        case Tag.Short_Array:
            buff.writeUInt32BE((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeInt16BE((<number[]>v)[i], offset + 4 + i * 2);
            }
            return 4 + (<number[]>v).length * 2 + offset;
        case Tag.Int_Array:
            buff.writeUInt32BE((<number[]>v).length, offset);

            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeInt32BE((<number[]>v)[i], offset + 4 + i * 4);
            }
            return 4 + (<number[]>v).length * 4 + offset;
        case Tag.Long_Array:
            let longArr = convertToLongArray(v)
            buff.writeUInt32BE(longArr.length, offset);
            for (let i = 0; i < longArr.length; i++) {
                let high = longArr[i].high;
                let low = longArr[i].low;
                buff.writeInt32BE(high, offset + 4 + i * 8);
                buff.writeInt32BE(low, offset + 4 + i * 8 + 4);
            }
            return 4 + longArr.length * 8 + offset;
        case Tag.Float_Array:
            buff.writeUInt32BE((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeFloatBE((<number[]>v)[i], offset + 4 + i * 4);
            }
            return 4 + (<number[]>v).length * 4 + offset;
        case Tag.Double_Array:
            buff.writeUInt32BE((<number[]>v).length, offset);
            for (let i = 0; i < (<number[]>v).length; i++) {
                buff.writeDoubleBE((<number[]>v)[i], offset + 4 + i * 8);
            }
            return 4 + (<number[]>v).length * 8 + offset;
        default:
            log.panic("unsupported base array type", tag, v)
    }
}

function writeComplex(buff: Buffer, tag: number, msg: any, offset: number): number {
    if (Object.getPrototypeOf(msg) != TypeRegistry.getInstance().getProtoByTag(tag)) {
        log.panic("tag is not matched")
    }
    let classDef = TypeRegistry.getInstance().getClassDefByTag(tag)
    if (classDef == undefined) {
        log.panic("unregistered tag")
    }
    buff.writeUInt8(classDef.members.length, offset)
    offset += 1
    classDef.members.forEach(function (v, i, arr) {
        offset = writeTag(buff, v.tag, offset)
        offset = writeValue(buff, v.tag, v.tag1, v.tag2, msg[v.key], offset)
    })
    offset = writeTag(buff, Tag.End, offset)
    return offset
}

function writeList(buff: Buffer, tag: number, tag1: number, v: any[], offset: number): number {
    offset = writeTag(buff, tag1, offset)
    if (!v.length) {
        buff.writeUInt32BE(0, offset);
        return offset + 4;
    }

    buff.writeUInt32BE(v.length, offset);
    offset += 4
    for (let i = 0; i < v.length; i++) {
        offset = writeValue(buff, tag1, null, null, v[i], offset)
    }
    return offset;
}

function writeMap(buff: Buffer, keyTag: number, valueTag: number, v: Map<any, any>, offset: number): number {
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
    v.forEach(function (v, k, map) {
        length++
        if (keyTag == Tag.String) {
            offset = writeString(buff, k, offset)
        } else {
            offset = writeBaseValue(buff, keyTag, k, offset)
        }
        offset = writeValue(buff, valueTag, null, null, v, offset)
    })
    buff.writeUInt32BE(length, lengthOffset);
    return offset
}

function writeTime(buff:Buffer,v:Date,offset:number):number {
    let long = Long.fromNumber(v.getTime())
    return writeLong(buff,long,offset)
}

function writeString(buff: Buffer, v: string, offset: number): number {
    let strBuff = Buffer.from(v, "utf8");
    strBuff.copy(buff, offset + 2);
    buff.writeUInt16BE(strBuff.length, offset);
    return 2 + strBuff.length + offset;
}

function writeBaseValue(buff: Buffer, tag: number, v: any, offset: number): number {
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
            buff.writeInt16BE(v, offset)
            return offset + 2
        case Tag.Int:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeInt32BE(v, offset)
            return offset + 4
        case Tag.Long:
            if (util.isLongString(v)) {
                let long = Long.fromString(v)
                return writeLong(buff,long,offset)
            } else {
                log.panic("value is not a long type must be string number", v)
            }
            break
        case Tag.Float:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeFloatBE(v, offset)
            return offset + 4
        case Tag.Double:
            if (!util.isValidNumber(v)) {
                log.panic("value is not a number", v)
            }
            buff.writeDoubleBE(v, offset)
            return offset + 8
        default:
            log.panic("unsupported base value", tag, v)
    }
}


function writeLong(buff:Buffer,v:Long,offset):number {
    let bytes = v.toBytesBE()
    for (let i = 0, j = offset; i < 8; i++, j++) {
        buff.writeUInt8(bytes[i], j)
    }
    return 8+offset
}