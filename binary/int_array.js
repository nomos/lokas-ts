
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGIntArray extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Int_Array";
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len * 4;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i += 4) {
            this.value.push(buff.readInt32BE(i));
        }

        return 4 + len * 4;
    }

    calcBufferLength() {
        return 4 + this.value.length * 4;
    }

    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Int_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(parseInt(array[i]));
            if(newArray[i] < -2147483648 || newArray[i] > 2147483647 || isNaN(newArray[i])) {
                throw new Error("Each element in TAG_Int_Array should between " +
                    "-2147483648 and 2147483647.");
            }
        }

        this.value = newArray;
    }

    shift() {
        return this.value.shift();
    }

    unshift(value) {
        value = parseInt(value);
        if(value < -2147483648 || value > 2147483647 || isNaN(value)) {
            throw new Error("Each element in TAG_Int_Array should between " +
                "-2147483648 and 2147483647.");
        }
        return this.value.unshift(value);
    }

    push(value) {
        value = parseInt(value);
        if(value < -2147483648 || value > 2147483647 || isNaN(value)) {
            throw new Error("Each element in TAG_Int_Array should between " +
                "-2147483648 and 2147483647.");
        }
        return this.value.push(value);
    }

    pop() {
        return this.value.pop();
    }

    insert(value, pos) {
        value = parseInt(value);
        if(value < -2147483648 || value > 2147483647 || isNaN(value)) {
            throw new Error("Each element in TAG_Int_Array should between " +
                "-2147483648 and 2147483647.");
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
            buff.writeInt32BE(this.value[i], offset + 4 + i * 4);
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



module.exports = TAGIntArray;
