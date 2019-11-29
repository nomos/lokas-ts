let Buffer = require('buffer').Buffer;
let BinaryBase = require("./binary_base");

class TAGCompound extends BinaryBase{
    constructor(){
        super();
        this.value={};
        this.type = "TAG_Compound";
    }
    _getNextTag(buff, offset) {
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
        let len = tag.readFromBuffer(buff, offset);
        this.value[tag.id] = tag;
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

        return nextOffset - offset + 1;
    }
    calcBufferLength() {
        let len = 0;
        for(let key in this.value) {
            if(!this.value.hasOwnProperty(key)) continue;

            // child type id for 1 byte, child name length for 2 bytes and child
            // name for (child name length) byte(s).
            len += 1;
            len += 2;
            len += Buffer.byteLength(this.value[key].id, "utf8");

            // add the child body's length
            len += this.value[key].calcBufferLength();
        }

        // TAG_End
        len += 1;

        return len;
    }
    writeBuffer(buff, offset) {
        let len = 0;
        for(let key in this.value) {
            if(!this.value.hasOwnProperty(key)) continue;

            let object = this.value[key];
            buff.writeUInt8(object.getTypeId(), offset + len);

            let nameBuff = Buffer.from(object.id, "utf8");
            nameBuff.copy(buff, offset + len + 1 + 2);
            buff.writeUInt16BE(nameBuff.length, offset + len + 1);

            len += object.writeBuffer(buff, offset + len + 1 + 2 + nameBuff.length);
            len += (1 + 2 + nameBuff.length);
        }

        buff.writeUInt8(0, offset + len);
        len += 1;
        return len;
    }
    setValue(value) {
        if(typeof value !== "object") {
            throw new Error("Invalid TAG_Compound value.");
        }
        for(let key in value) {
            if(!value.hasOwnProperty(key)) continue;
            let object = value[key];
            if(!(object instanceof BinaryBase)) {
                throw new Error("Invalid TAG_Compound element in key \"" + key + "\".");
            }
            this.addValue(key,value);
        }
    }
    addValue(name,value,replace){
        if (typeof name !== 'string') {
            replace = value;
            value = name;
            name = value.id;
        }
        if(this.value[name] !== undefined && !replace) {
            throw new Error("Existing TAG_Compound value's name.");
        }

        if(typeof value !== "object") {
            throw new Error("Invalid TAG_Compound value.");
        }

        if(!(value instanceof BinaryBase)) {
            throw new Error("Invalid TAG_Compound element.");
        }
        value.id = name;
        this.value[name] = value;
    }
    getNames() {
        return Object.keys(this.value);
    }
    deleteByName(name) {
        delete this.value[name];
    }
    fetchValue(name) {
        let ret = this.value[name];
        delete this.value[name];
        return ret;
    }
    clean() {
        this.value = {};
    }
}

module.exports = TAGCompound;
