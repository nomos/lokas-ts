
let BinaryBase = require("./binary_base");
let Buffer = require('buffer').Buffer;

class TAGString extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_String";
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt16BE(offset);
        let nextOffset = offset + 2;
        this.value     = buff.toString("utf8", nextOffset, nextOffset + len);
        return 2 + len;
    }
    calcBufferLength() {
        return 2 + Buffer.byteLength(this.value, "utf8");
    }
    writeBuffer(buff, offset) {
        let strBuff = Buffer.from(this.value, "utf8");

        strBuff.copy(buff, offset + 2);
        buff.writeUInt16BE(strBuff.length, offset);

        return 2 + strBuff.length;
    }
    setValue(value) {
        if(typeof value !== "string") value = value.toString();
        if(value.length > 65536) {
            throw new Error("Value of TAG_String's length should greater than 65536.");
        }
        this.value = value;
    }
}

module.exports = TAGString;
