
let BinaryBase = require("./binary_base");

class TAGInt extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Int";
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = buff.readInt32BE(offset);
        return 4;
    }

    calcBufferLength(){
        return 4;
    }

    writeBuffer(buff, offset) {
        buff.writeInt32BE(this.value, offset);
        return 4;
    }

    setValue(value) {
        value = parseInt(value);
        if(value < -2147483648 || value > 2147483647 || isNaN(value)) {
            throw new Error("Value of TAG_Int should between -2147483648 and 2147483647.");
        }
        this.value = value;
    }
}

module.exports = TAGInt;
