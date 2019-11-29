let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");
let ObjectID = this?require('bson').ObjectId:require('./objectid');
let Buffer = require('buffer').Buffer;

class TAGObjectID extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_ObjectID";
    }
    _readBodyFromBuffer(buff, offset) {
        let tempbuff = Buffer.alloc(12);
        buff.copy(tempbuff,0,offset,offset+12);
        this.value = ObjectID(tempbuff);
        return 12;
    }
    calcBufferLength(){
        return 12;
    }
    writeBuffer(buff, offset) {
        this.value.id.copy(buff,offset,0,12);
        return 12;
    }
    setValue(value) {
        if(!value instanceof ObjectID) {
            throw new Error("Value must be ObjectID");
        }
        this.value = value;
    }
}

module.exports = TAGObjectID;