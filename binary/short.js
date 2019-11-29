
let BinaryBase = require("./binary_base");

class TAGShort extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Short";
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = buff.readInt16BE(offset);
        return 2;
    }
    calcBufferLength(){
        return 2;
    }
    writeBuffer(buff, offset) {
        buff.writeInt16BE(this.value, offset);
        return 2;
    }
    setValue(value) {
        value = parseInt(value);
        if(value < -32768 || value > 32767 || isNaN(value)) {
            throw new Error("Value of TAG_Short should between -32768 and 32767.");
        }
        this.value = value;
    }
}

module.exports = TAGShort;
