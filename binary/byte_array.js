
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGByteArray extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Byte_Array";
        this.unsigned = false;
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i++) {
            if (this.unsigned) {
                this.value.push(buff.readUInt8(i));
            } else {
                this.value.push(buff.readInt8(i));
            }
        }

        return 4 + len;
    }
    calcBufferLength() {
        return 4 + this.value.length;
    }
    writeBuffer(buff, offset) {
        buff.writeUInt32BE(this.value.length, offset);
        for(let i = 0; i < this.value.length; i++) {
            if (this.unsigned) {
                buff.writeUInt8(this.value[i], offset + 4 + i);
            } else {
                buff.writeInt8(this.value[i], offset + 4 + i);
            }
        }
        return 4 + this.value.length;
    }
    shift() {
        return this.value.shift();
    }
    unshift(value) {
        value = parseInt(value);
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        return this.value.unshift(value);
    }
    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Byte_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(parseInt(array[i]));
            if (this.unsigned) {
                if(newArray[i] < 0 || newArray[i] > 255 || isNaN(newArray[i])) {
                    throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
                }
            } else {
                if(newArray[i] < -128 || newArray[i] > 127 || isNaN(newArray[i])) {
                    throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
                }
            }
        }

        this.value = newArray;
    }
    push(value) {
        value = parseInt(value);
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        return this.value.push(value);
    }
    pop() {
        return this.value.pop();
    }
    insert(value, pos) {
        value = parseInt(value);
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        this.value.push([]);
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }
    at(index) {
        return this.value[index];
    }
    getSize() {
        return this.value.length;
    }
}

module.exports = TAGByteArray;
