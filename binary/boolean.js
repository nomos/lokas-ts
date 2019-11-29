let BinaryBase = require("./binary_base");

class TAGBool extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Bool";
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = !!(buff.readInt8(offset));
        return 1;
    }
    calcBufferLength(){
        return 1;
    }
    writeBuffer(buff, offset) {
        let data = this.value?1:0;
        buff.writeInt8(data, offset);
        return 1;
    }
    setValue(value) {
        let value1;
        if (value==='true') {
            value1 = true;
        } else if (value==='false') {
            value1 = false;
        } else {
            if (value) {
                value1 = true;
            } else {
                value1 = false;
            }
        }
        if(value1 !==true&&value1!==false) {
            throw new Error("Value of TAG_Bool should be boolean");
        }
        this.value = value1;
    }
}

module.exports = TAGBool;
