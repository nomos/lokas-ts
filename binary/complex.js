let Buffer = require('buffer').Buffer;
let BinaryBase = require("./binary_base");

class TAGComplex extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Complex";
        this.$tags = require("./nbt");
        this.value     = {};
        this.length = 0;
    }
    _readBodyFromBuffer(buff, offset) {
        let len = buff.readUInt32BE(offset);
        this.length = len;

        this.value = {};
        let nextOffset = offset + 4;
        for(let i = 0; i < len; i++) {
            let typeId = buff.readUInt8(nextOffset);
            nextOffset +=1;
            let Tag = this.$tags[typeId];
            let element = (typeId === 0) ? undefined : new Tag();
            let elementLength = (typeId === 0) ? 0 : element._readBodyFromBuffer(buff, nextOffset);
            nextOffset += elementLength;
            this.value[i] = element;
        }
        return nextOffset - offset;
    }
    calcBufferLength() {
        let len = 0;
        for(let i=0;i<this.length;i++) {
            len += 1;
            len += this.value[i].calcBufferLength();
        }
        len += 4;
        return len;
    }
    getSize() {
        return this.length;
    }
    setValue(value) {

        if(typeof value !== "object") {
            throw new Error("Invalid Tag_Complex value.");
        }
        for(let i=0;i<this.length;i++) {
            if(!value.hasOwnProperty(i)) continue;
            let object = value[i];
            if(!(object instanceof BinaryBase)) {
                throw new Error("Invalid Tag_Complex element in key \"" + key + "\".");
            }
            this.addValue(i,value);
        }
    }
    addValue(value) {
        if(typeof value !== "object") {
            throw new Error("Invalid TAG_Compound value.");
        }

        if(!(value instanceof BinaryBase)) {
            throw new Error("Invalid TAG_Compound element.");
        }
        this.length++;
        this.value[this.length-1] = value;
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

        buff.writeUInt32BE(this.length, offset);
        let len = 0;
        let baseOffset = offset + 4;
        for(let i = 0; i < this.length; i++) {
            buff.writeUInt8(this.value[i].getTypeId(), baseOffset+len);
            len += 1;
            len += this.value[i].writeBuffer(buff, baseOffset + len);
        }
        len += 4;
        return len;
    }
    getSize() {
        return this.length;
    }
    at(index) {
        return this.value[index];
    }
    get size(){
        return this.getSize();
    }
}

module.exports = TAGComplex;
