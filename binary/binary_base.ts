
// let zlib = require("zlib");
import {Long} from "../utils/long";

let TAG_TYPE_OFFSET = 1;
import {Buffer} from "../thirdparty/buffer";
import {util} from "../utils/util";
import {Tag} from "../type/types"

export class BinaryBase{
    public type: Tag
    public value:any
    public id:string
    constructor(id?:string){
        this.type  =  Tag.End;
        this.id    = id||"";
        this.value = undefined;
    }
    clone():any{
        // let buff = this.writeToBuffer();
        // return bt.readFromBuffer(buff,0);
    }
    _readBodyFromBuffer(buff, offset):number {
        return 0;
    };
    _readNameFromBuffer(buff, offset):number {
        let nameLength = buff.readUInt16BE(offset);
        let name = buff.toString("utf8", offset + 2, offset + 2 + nameLength);
        this.id = name;
        return nameLength + 2;
    }
    readFromBuffer(buff, offset):number {
        let nameLength = this._readNameFromBuffer(buff, offset + TAG_TYPE_OFFSET);
        let bodyLength = this._readBodyFromBuffer(buff, offset + TAG_TYPE_OFFSET +
            nameLength);
        return TAG_TYPE_OFFSET + nameLength + bodyLength;
    }
    getType(): Tag {
        return this.type;
    }
    getName():string {
        return this.id;
    }
    getValue() {
        return this.value;
    }
    count() {
        if(undefined === this.value || null === this.value) return 0;
        if(typeof this.value !== "object") return 0;
        if(util.isArray(this.value)) return this.value.length;
        return Object.keys(this.value).length;
    }
    select(tagName) {
        if(!this.value || !Object.keys(this.value).length) return null;
        if(undefined === this.value[tagName] ||
            !this.value.hasOwnProperty(tagName)) {
            return null;
        }
        return this.value[tagName];
    }
    getTypeId() {
        return this.getType()
    }
    inspect() {
        return "<NBTTag " + this.getType() + ">";
    }
    toString () {
        return JSON.stringify(this.toJSON());
    }
    toJSObject() {
        let val = this.value;
        if(this.type ===  Tag.Complex) {
            let _val = [];
            for(let key in val) {
                _val[key] = val[key].toJSObject();
            }
            return _val;
        }
        if(this.type ===  Tag.Compound) {
            let _val = {};
            for(let key in val) {
                if(!val.hasOwnProperty(key)) continue;
                _val[key] = val[key].toJSObject();
            }
            return _val;
        }
        if(this.type ===  Tag.List) {
            let _val = [];
            for(let i = 0; i < val.length; i++) {
                _val.push(val[i].toJSObject());
            }
            return _val;
        }
        return val;
    }
    toJSON() {
        let val = this.value;

        if(typeof val === "number") {
            return val;
        }

        if(typeof val === "string") {
            return val;
        }

        if(typeof val === "boolean") {
            return val;
        }

        //TODO:这里要判断JS精度超限
        if(val instanceof Long) {
            return val.toNumber();
        }

        if(this.type ===  Tag.Int_Array
            || this.type ===  Tag.Byte_Array
            || this.type ===  Tag.Float_Array
            || this.type ===  Tag.Double_Array
            || this.type ===  Tag.Short_Array
            || this.type ===  Tag.Long_Array
            || this.type ===  Tag.Bool_Array
        ) {
            return val;
        }
        if(this.type ===  Tag.Complex) {
            let _val = [];
            for(let i in val) {
                _val.push(val[i].toJSON());
            }
            return _val;
        }

        if(this.type ===  Tag.List) {
            let _val = [];
            for(let i = 0; i < val.length; i++) {
                _val.push(val[i].toJSON());
            }
            return _val;
        }

        let _val = {};
        for(let key in val) {
            if(!val.hasOwnProperty(key)) continue;
            _val[key] = val[key].toJSON();
        }

        return _val;
    }
    writeBuffer(buff, offset):number {
        return 0
    }
    calcBufferLength() {
        return 0;
    }
    writeToBuffer() {
        let nameBuff = Buffer.from(this.id||'', "utf8");
        let buff = Buffer.from(new Uint8Array(this.calcBufferLength()+1 + 2 + nameBuff.length),'utf8');
        buff.writeUInt8(this.getTypeId(), 0);
        buff.writeUInt16BE(nameBuff.length, 1);
        nameBuff.copy(buff, 1 + 2);
        this.writeBuffer(buff,3+nameBuff.length);
        return buff;
    }
    // writeToCompressedBuffer() {
    //     let _buff = this.writeToBuffer();
    //     let buff = zlib.deflate(_buff);
    //     return buff;
    // }
    // writeToCompressedBufferAsync(cb) {
    //     let _buff = this.writeToBuffer();
    //     return new Promise(function (resolve, reject) {
    //         zlib.deflate(_buff,function (err,data) {
    //             if (err) {
    //                 cb&&cb(err);
    //                 reject(err);
    //             } else {
    //                 cb&&cb(null,data);
    //                 resolve(data);
    //             }
    //         })
    //     });
    // }
    setValue(value) {
    }
}
