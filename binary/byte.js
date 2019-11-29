
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGByte extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Byte";
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = buff.readInt8(offset);
        return 1;
    }
    calcBufferLength(){
        return 1;
    }
    writeBuffer(buff, offset) {
        buff.writeInt8(this.value, offset);
        return 1;
    }
    setValue (value) {
        value = parseInt(value);
        if(value < -128 || value > 127 || isNaN(value)) {
            throw new Error("Value of TAG_Byte should between -128 and 127.");
        }
        this.value = value;
    }
}

module.exports = TAGByte;
