
let BinaryBase = require("./binary_base");

class TAGList extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_List";
        this.childType = "TAG_End";
        this.$tags = require("./nbt");
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let typeId = buff.readUInt8(offset);
        let len = buff.readUInt32BE(offset + 1);

        let Tag = this.$tags[typeId];
        if((null === Tag || undefined === Tag) && 0 !== typeId) {
            throw new Error("Tag type " + typeId + " is not supported yet in list.");
        }

        if(0 !== typeId) {
            for(let key in this.$tags) {
                if(!this.$tags.hasOwnProperty(key)) continue;
                if(this.$tags[key] === typeId) {
                    this.childType = key;
                }
            }
        }

        this.value = [];
        let nextOffset = offset + 1 + 4;
        for(let i = 0; i < len; i++) {
            let element =(typeId === 0) ? undefined : new Tag();
            let elementLength =(typeId === 0) ? 0 : element._readBodyFromBuffer(buff, nextOffset);
            nextOffset += elementLength;

            this.value.push(element);
        }

        return nextOffset - offset;
    }

    calcBufferLength() {
        return this.value.reduce(function(sum, child) {
            return sum + child.calcBufferLength();
        }, 1 + 4);
    }

    setValue(value) {
        if(!util.isArray(value)) {
            throw new Error("Value of TAG_List should be an array.");
        }

        if(value.length === 0) {
            this.value = value;
            return;
        }

        let typeName = this.childType;
        let typeId = this.childType === "TAG_End" ? 0 : this.$tags[typeName];
        if(!typeId) {
            typeName = value[0].type;
            typeId = this.$tags[typeName];
            if(!typeId) {
                throw new Error("Invalid TAG_List element.");
            }
        }

        let TagType = this.$tags[typeId];
        let array = [];
        for(let i = 0; i < value.length; i++) {
            if(!(value[i] instanceof TagType)) {
                throw new Error("Inconsistent TAG_List element type at position " + i + ".");
            }

            array.push(value[i]);
        }

        this.childType = typeName;
        this.value = array;
    }

    shift() {
        return this.value.shift();
    }

    unshift(value) {
        let typeName = this.childType;
        let typeId = this.childType === "TAG_End" ? 0 : this.$tags[typeName];
        if(!typeId) {
            typeName = value.type;
            typeId = this.$tags[typeName];
            if(!typeId) {
                throw new Error("Invalid TAG_List element.");
            }
        }

        let TagType = this.$tags[typeId];
        if(!(value instanceof TagType)) {
            throw new Error("Element does not TAG_List's current type.");
        }

        this.childType = typeName;
        return this.value.unshift(value);
    }

    push(value) {
        let typeName = this.childType;
        let typeId = this.childType === "TAG_End" ? 0 : this.$tags[typeName];
        if(!typeId) {
            typeName = value.type;
            typeId = this.$tags[typeName];
            if(!typeId) {
                throw new Error("Invalid TAG_List element.");
            }
        }

        let TagType = this.$tags[typeId];
        if(!(value instanceof TagType)) {
            throw new Error("Element does not TAG_List's current type.");
        }

        this.childType = typeName;
        return this.value.push(value);
    }

    pop() {
        return this.value.pop();
    }

    at(index) {
        return this.value[index];
    }

    insert(value, pos) {
        let typeName = this.childType;
        let typeId = this.childType === "TAG_End" ? 0 : this.$tags[typeName];
        if(!typeId) {
            typeName = value.type;
            typeId = this.$tags[typeName];
            if(!typeId) {
                throw new Error("Invalid TAG_List element.");
            }
        }

        let TagType = this.$tags[typeId];
        if(!(value instanceof TagType)) {
            throw new Error("Element does not TAG_List's current type.");
        }

        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        this.value.push([]);
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }

    clean() {
        this.value = [];
    }

    writeBuffer(buff, offset) {
        // no element
        if(!this.value.length) {
            buff.writeUInt8(0, offset);
            buff.writeUInt32BE(0, offset + 1);
            return 1 + 4;
        }

        buff.writeUInt8(this.value[0].getTypeId(), offset);
        buff.writeUInt32BE(this.value.length, offset + 1);
        let len = 0;
        let baseOffset = offset + 1 + 4;
        for(let i = 0; i < this.value.length; i++) {
            len += this.value[i].writeBuffer(buff, baseOffset + len);
        }

        return len + 1 + 4;
    }

    getSize() {
        return this.value.length;
    }
}

module.exports = TAGList;
