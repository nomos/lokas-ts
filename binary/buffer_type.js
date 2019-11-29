let BinaryBase = require("./binary_base");
let Buffer = require('buffer').Buffer;

class TAGBuffer extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Buffer";
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let vbuff = Buffer.alloc(len);
        buff.copy(vbuff,0,nextOffset,nextOffset+len);
        this.value = vbuff;
        return 4 + len;
    }
    calcBufferLength() {
        return 4 + this.value.length;
    }
    writeBuffer(buff, offset) {
        buff.writeUInt32BE(this.value.length, offset);
        this.value.copy(buff,offset+4);

        return 4 + this.value.length;
    }
    setValue(value) {
        if (value instanceof ArrayBuffer) {
            value = Buffer.from(value);
        }
        if(!value instanceof Buffer) {
            throw new Error("Value of TAG_Buffer must be Buffer");
        }
        this.value = value;
    }
}

module.exports = TAGBuffer;