
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGDoubleArray extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Double_Array";
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len * 8;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i += 8) {
            this.value.push(buff.readDoubleBE(i));
        }

        return 4 + len * 8;
    }

    calcBufferLength() {
        return 4 + this.value.length * 8;
    }

    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Double_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(parseFloat(array[i]));
            if(isNaN(newArray[i])) {
                throw new Error("Each value for TAG_Double_Array must be Number.");
            }
        }

        this.value = newArray;
    }

    shift() {
        return this.value.shift();
    }

    unshift(value) {
        value = parseFloat(value);
        if(isNaN(value)) {
            throw new Error("Bad value for TAG_Double_Array.");
        }
        return this.value.unshift(value);
    }

    push(value) {
        value = parseFloat(value);
        if(isNaN(value)) {
            throw new Error("Bad value for TAG_Double_Array.");
        }
        return this.value.push(value);
    }

    pop() {
        return this.value.pop();
    }

    insert(value, pos) {
        value = parseFloat(value);
        if(isNaN(value)) {
            throw new Error("Bad value for TAG_Double_Array.");
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
            buff.writeDoubleBE(this.value[i], offset + 4 + i * 8);
        }

        return 4 + this.value.length * 8;
    }

    at(index) {
        return this.value[index];
    }

    getSize() {
        return this.value.length;
    }
}



module.exports = TAGDoubleArray;
