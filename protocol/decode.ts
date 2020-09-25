import {Buffer} from "../thirdparty/buffer";
import {Tag, TypeRegistry} from "./types";
import {log} from "../utils/logger";
import {HEADER_SIZE, isBaseArray, isBaseValue} from "./encode";
import {Long} from "../utils/long";
import {Serializable} from "./protocol";

export function unmarshalMessageHeader(buff: Buffer): [number, number, number] {
    let offset = 0
    let transId = buff.readUInt32BE(offset)
    offset += 4
    let len = buff.readUInt16BE(offset)
    offset += 2
    let tag:number
    [tag,offset] = readTag(buff,offset)
    return [tag, transId, len]
}

function readTag(buff: Buffer, offset: number): [number, number] {
    let high = buff.readUInt8(offset);
    if (high < 128) {
        return [high, offset + 1]
    } else {
        let low = buff.readUInt8(offset);
        return [high << 8 + low, offset + 2]
    }
}

export function unmarshalMessageBody(buff: Buffer, tag: number): [Serializable, number] {
    return readComplex(buff, tag, HEADER_SIZE)
}

export function unmarshal(buff: Buffer,value?:Serializable):Serializable {
    let [tag,offset] = readTag(buff,0)
    if (value) {
        let [value1,offset1] = readValueFromComplex(buff,value,tag,offset)
        return value
    } else {
        let [ret,offset1] = readComplex(buff,tag,offset)
        return ret
    }
}

export function readValue(buff: Buffer, tag: number, tag1: number, tag2: number, offset: number): [any, number] {
    let customTag: number
    if (tag > Tag.Null) {
        customTag = tag
        tag = Tag.Proto
    }
    if (isBaseValue(tag)) {
        return readBaseValue(buff, tag,tag1, offset)
    } else if (isBaseArray(tag)) {
        return readBaseArray(buff, tag,tag1, offset)
    } else if (tag == Tag.String) {
        return readString(buff, offset)
    } else if (tag == Tag.Time) {
        return readTime(buff, offset)
    } else if (tag == Tag.List) {
        return readList(buff, tag1, offset)
    } else if (tag == Tag.Proto) {
        return readComplex(buff, customTag, offset)
    } else if (tag == Tag.Map) {
        return readMap(buff, tag, tag1, tag2, offset)
    } else if (tag == Tag.End) {
        log.panic("read value error")
        return [null, offset + 1];
    } else {
        log.panic("unsupported tag type", tag)
    }
}

function readLength(buff: Buffer, offset: number): [number, number] {
    return [buff.readUInt32BE(offset), offset + 4]
}

export function readMap(buff: Buffer, tag: number, tag1: number, tag2: number, offset: number): [Map<number | string, any>, number] {
    let keyTag: number
    let valueTag: number
    let length: number
    [keyTag, offset] = readTag(buff, offset);
    if (keyTag != tag1) {
        log.panic("key tag is not match")
    }
    switch (keyTag) {
        case Tag.Int:
        case Tag.Long:
        case Tag.String:
            break
        default:
            log.panic("unsupported key tag", tag)
    }
    [valueTag, offset] = readTag(buff, offset);
    if (valueTag != tag2) {
        log.panic("value tag is not match")
    }
    [length, offset] = readLength(buff, offset);
    let ret = new Map()
    for (let i = 0; i < length; i++) {
        if (keyTag == Tag.String) {
            let key: string
            let obj: any
            [key, offset] = readString(buff, offset);
            [obj, offset] = readValue(buff, valueTag, null, null, offset);
            ret.set(key, obj)
        }
    }

    return [ret, offset]
}

export function readValueFromComplex(buff: Buffer,value:any, tag: number, offset: number): [any, number] {
    let proto = TypeRegistry.GetInstance().GetProtoByTag(tag).constructor
    if (!(value instanceof proto)) {
        log.panic("value is not matched")
    }
    let classDef = TypeRegistry.GetInstance().GetClassDefByTag(tag)
    if (!classDef) {
        log.panic("tag is not registered", tag);
    }
    let length = buff.readUInt8(offset)
    offset+=1
    classDef.Members.forEach(function (v, i, arr) {
        [tag, offset] = readTag(buff, offset);
        if (tag == Tag.Long) {
        }
        [value[v.Key], offset] = readValue(buff, v.Tag, v.Tag1, v.Tag2, offset);
    })
    let tagEnd: number
    [tagEnd, offset] = readTag(buff, offset)
    if (tagEnd !== Tag.End) {
        log.panic("end tag error", tagEnd)
    }
    return [value, offset]
}

export function readComplex(buff: Buffer, tag: number, offset: number): [any, number] {
    let ret = TypeRegistry.GetInstance().GetInstanceByTag(tag)
    let classDef = TypeRegistry.GetInstance().GetClassDefByTag(tag)
    if (!classDef) {
        log.panic("tag is not registered", tag);
    }
    let length = buff.readUInt8(offset)
    offset+=1
    classDef.Members.forEach(function (v, i, arr) {
        [tag, offset] = readTag(buff, offset);
        if (tag == Tag.Long) {
        }
        [ret[v.Key], offset] = readValue(buff, v.Tag, v.Tag1, v.Tag2, offset);
    })
    let tagEnd: number
    [tagEnd, offset] = readTag(buff, offset)
    if (tagEnd !== Tag.End) {
        log.panic("end tag error", tagEnd)
    }
    return [ret, offset]
}

export function readList(buff: Buffer, tag: number, offset: number): [any[], number] {
    let innerTag: number
    [innerTag, offset] = readTag(buff, offset)
    if (innerTag != tag) {
        log.panic("tag is not matched", tag, innerTag)
    }
    let length: number
    [length, offset] = readLength(buff, offset)
    let ret = []
    for (let i = 0; i < length; i++) {
        let data: any
        [data, offset] = readValue(buff, innerTag, null, null, offset)
        ret.push(data)
    }
    return [ret, offset]
}

export function readBaseArray(buff: Buffer, tag: number,tag1:number, offset: number): [any[], number] {
    switch (tag) {
        case Tag.Bool_Array:
            {
                let len = buff.readUInt32BE(offset);
                let trueLen = Math.ceil(len / 8.0);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + trueLen;
                let ret = [];

                let u256s = [];
                for (let i = nextOffset; i < endOffset; i++) {
                    u256s.push(buff.readUInt8(i));
                }
                for (let i = 0; i < len; i++) {
                    let bi = Math.floor(i / 8);
                    let si = i % 8;
                    let bNumber = u256s[bi];
                    let data = bNumber >> si & 1;
                    if (data === 1) {
                        ret.push(true);
                    } else {
                        ret.push(false);
                    }
                }
                return [ret, 4 + trueLen + offset];
            }
        case Tag.Byte_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len;
                let ret = [];

                for (let i = nextOffset; i < endOffset; i++) {
                    if (this.unsigned) {
                        ret.push(buff.readUInt8(i));
                    } else {
                        ret.push(buff.readInt8(i));
                    }
                }
                return [ret, 4 + len + offset];
            }
        case Tag.Short_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len * 2;
                let ret = [];

                for (let i = nextOffset; i < endOffset; i += 2) {
                    ret.push(buff.readInt16BE(i));
                }
                return [ret, 4 + len * 2 + offset];
            }
        case Tag.Int_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len * 4;
                let ret = [];

                for (let i = nextOffset; i < endOffset; i += 4) {
                    ret.push(buff.readInt32BE(i));
                }

                return [ret, 4 + len * 4 + offset];
            }
        case Tag.Long_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len * 8;
                let ret
                if (tag1==Tag.Int) {
                    ret = new Array<number>();
                    for (let i = 0; i < endOffset - nextOffset; i += 8) {
                        let high = buff.readInt32BE(nextOffset + i);
                        let low = buff.readInt32BE(nextOffset + i + 4);
                        ret.push((new Long(low, high)).toNumber());
                    }
                } else {
                    ret = new Array<string>();
                    for (let i = 0; i < endOffset - nextOffset; i += 8) {
                        let high = buff.readInt32BE(nextOffset + i);
                        let low = buff.readInt32BE(nextOffset + i + 4);
                        ret.push((new Long(low, high)).toString());
                    }
                }
                return [ret, 4 + len * 8 + offset];
            }
        case Tag.Float_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len * 4;
                let ret = [];
                for (let i = nextOffset; i < endOffset; i += 4) {
                    ret.push(buff.readFloatBE(i));
                }
                return [ret, 4 + len * 4 + offset];
            }
        case Tag.Double_Array:
            {
                let len = buff.readUInt32BE(offset);
                let nextOffset = offset + 4;
                let endOffset = nextOffset + len * 8;
                let ret = [];
                for (let i = nextOffset; i < endOffset; i += 8) {
                    ret.push(buff.readDoubleBE(i));
                }
                return [ret, 4 + len * 8 + offset];
            }
        default:
            log.panic("unsupported base array type", tag)
    }
}

export function readBaseValue(buff: Buffer, tag: number,tag1:number, offset: number): [any, number] {
    switch (tag) {
        case Tag.Bool:
            return [!!(buff.readInt8(offset)), 1 + offset];
        case Tag.Byte:
            return [buff.readInt8(offset), 1 + offset]
        case Tag.Short:
            return [buff.writeInt16BE(this.value, offset), 2 + offset]
        case Tag.Int:
            return [buff.readInt32BE(offset), 4 + offset]
        case Tag.Long:
            if (tag1==Tag.Int) {
                return readLongToNumber(buff,offset)
            } else {
                return readLongToString(buff,offset)
            }
        case Tag.Float:
            return [buff.readFloatBE(offset), 4 + offset]
        case Tag.Double:
            return [buff.readDoubleBE(offset), 8 + offset]
        default:
            log.panic("unsupported base value type", tag)
    }
}

function readLongToString(buff:Buffer,offset:number):[string,number] {
    let sliced = buff.slice(offset, offset + 8);
    return [Long.fromBytesBE(sliced, true).toString(), 8 + offset];
}


function readLongToNumber(buff:Buffer,offset:number):[number,number] {
    let sliced = buff.slice(offset, offset + 8);
    return [Long.fromBytesBE(sliced, true).toNumber(), 8 + offset];
}

function readTime(buff:Buffer,offset:number):[Date,number] {
    let long:Long
    let sliced = buff.slice(offset, offset + 8);
    long = Long.fromBytesBE(sliced, true)
    let ret = new Date(long.toNumber())
    return [ret,8+offset]
}

function readString(buff: Buffer, offset: number): [string, number] {
    let len = buff.readUInt16BE(offset);
    let nextOffset = offset + 2;
    let ret = buff.toString("utf8", nextOffset, nextOffset + len);
    return [ret, 2 + len + offset];
}