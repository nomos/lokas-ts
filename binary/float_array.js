
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGFloatArray extends BinaryBase {
    constructor() {
        super();
        this.type = "TAG_Float_Array";
        this.value = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len * 4;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i += 4) {
            this.value.push(buff.readFloatBE(i));
        }

        return 4 + len * 4;
    }
    calcBufferLength() {
        return 4 + this.value.length * 4;
    }

    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Float_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(parseFloat(array[i]));
            if(newArray[i] < -3.4e+38 || newArray[i] > 3.4e+38 || isNaN(newArray[i])) {
                throw new Error("Each element in TAG_Float_Array should between " +
                    "-3.4e+38 and 3.4e+38.");
            }
        }

        this.value = newArray;
    }

    shift() {
        return this.value.shift();
    }

    unshift(value) {
        value = parseFloat(value);
        if(value < -3.4e+38 || value > 3.4e+38 || isNaN(value)) {
            throw new Error("Each element in TAG_Float_Array should between " +
                "-3.4e+38 and 3.4e+38.");
        }
        return this.value.unshift(value);
    }

    push(value) {
        value = parseFloat(value);
        if(value < -3.4e+38 || value > 3.4e+38 || isNaN(value)) {
            throw new Error("Each element in TAG_Float_Array should between " +
                "-3.4e+38 and 3.4e+38.");
        }
        return this.value.push(value);
    }

    pop() {
        return this.value.pop();
    }

    insert(value, pos) {
        value = parseFloat(value);
        if(value < -3.4e+38 || value > 3.4e+38 || isNaN(value)) {
            throw new Error("Each element in TAG_Float_Array should between " +
                "-3.4e+38 and 3.4e+38.");
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
            buff.writeFloatBE(this.value[i], offset + 4 + i * 4);
        }

        return 4 + this.value.length * 4;
    }

    at(index) {
        return this.value[index];
    }

    getSize() {
        return this.value.length;
    }
}



module.exports = TAGFloatArray;
