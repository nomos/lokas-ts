
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGShortArray extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Short_Array";
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len * 2;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i += 2) {
            this.value.push(buff.readInt16BE(i));
        }

        return 4 + len * 2;
    }
    calcBufferLength() {
        return 4 + this.value.length * 2;
    }
    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Short_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(parseInt(array[i]));
            if(newArray[i] < -32768 || newArray[i] > 32767 || isNaN(newArray[i])) {
                throw new Error("Each element in TAG_Short_Array should between " +
                    "-32768 and 32767.");
            }
        }

        this.value = newArray;
    }
    shift() {
        return this.value.shift();
    }
    unshift(value) {
        value = parseInt(value);
        if(value < -32768 || value > 32767 || isNaN(value)) {
            throw new Error("Each element in TAG_Short_Array should between " +
                "-32768 and 32767.");
        }
        return this.value.unshift(value);
    }

    push(value) {
        value = parseInt(value);
        if(value < -32768 || value > 32767 || isNaN(value)) {
            throw new Error("Each element in TAG_Short_Array should between " +
                "-32768 and 32767.");
        }
        return this.value.push(value);
    }

    pop() {
        return this.value.pop();
    }

    insert(value, pos) {
        value = parseInt(value);
        if(value < -32768 || value > 32767 || isNaN(value)) {
            throw new Error("Each element in TAG_Short_Array should between " +
                "-32768 and 32767.");
        }
        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        this.value.push([]);
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }

    writeBuffer(buff, offset) {
        buff.writeUInt32BE(this.value.length, offset);

        for(let i = 0; i < this.value.length; i++) {
            buff.writeInt16BE(this.value[i], offset + 4 + i * 2);
        }

        return 4 + this.value.length * 2;
    }

    at(index) {
        return this.value[index];
    }

    getSize() {
        return this.value.length;
    }
}



module.exports = TAGShortArray;
