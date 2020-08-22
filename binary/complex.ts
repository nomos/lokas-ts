import {Buffer} from "../thirdparty/buffer";
import {BinaryBase} from "./binary_base";
import {Type} from "./tags"

export class TAGComplex extends BinaryBase{
    constructor(){
        super();
        this.type =  Type.TAG_Complex;
        this.value     = [];
    }
    _getNextTag(buff, offset):number {
        let tagType = buff.readUInt8(offset);
        if(tagType < 0) {
            throw new Error("Unknown tag type - " + tagType + ".");
        }

        if(tagType === 0) {
            return -1;
        }
        let Tags = require("./nbt");
        let Tag = Tags[tagType];
        if(null === Tag || undefined === Tag) {
            throw new Error("Tag type " + tagType + " is not supported by this module yet.");
        }

        let tag = new Tag();
        let len = tag._readBodyFromBuffer(buff, offset);
        this.value.push(tag)
        return len;
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = {};

        let nextOffset = offset;
        while(true) {
            let len = this._getNextTag(buff, nextOffset);
            if(len === -1) break;
            nextOffset += len;
        }
        return nextOffset - offset;
    }
    calcBufferLength() {
        let len = 0;
        for(let i=0;i<this.value.length;i++) {
            len += 1;
            len += this.value[i].calcBufferLength();
        }
        len += 1;
        return len;
    }
    setValue(value) {
        if(typeof value !== "object") {
            throw new Error("Invalid Tag_Complex value.");
        }
        for(let i=0;i<this.value.length;i++) {
            let object = value[i];
            if(!(object instanceof BinaryBase)) {
                throw new Error("Invalid Tag_Complex element in key \"" + key + "\".");
            }
            this.addValue(i,object);
        }
    }
    addValue(value) {
        if(typeof value !== "object") {
            throw new Error("Invalid TAG_Compound value.");
        }

        if(!(value instanceof BinaryBase)) {
            throw new Error("Invalid TAG_Compound element.");
        }
        this.value.push(value);
    }
    clean() {
        this.value = [];
        this.length = 0;
    }
    writeBuffer(buff, offset) {
        // no element
        if(!this.length) {
            buff.writeUInt32BE(0, offset);
            return 4;
        }

        buff.writeUInt32BE(this.value.length, offset);
        let len = 0;
        let baseOffset = offset + 4;
        for(let i = 0; i < this.value.length; i++) {
            buff.writeUInt8(this.value[i].getTypeId(), baseOffset+len);
            len += 1;
            len += this.value[i].writeBuffer(buff, baseOffset + len);
        }
        len += 4;
        return len;
    }
    getSize() {
        return this.value.length;
    }
    at(index) {
        return this.value[index];
    }
    get size(){
        return this.getSize();
    }
}

module.exports = TAGComplex;
