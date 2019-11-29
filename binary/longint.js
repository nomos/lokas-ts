let BinaryBase = require("./binary_base");
let Long = require("long");

let _longBound = {
    min: Long.fromString("-9223372036854775808"),
    max: Long.fromString("9223372036854775807")
};

class TAGLong extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Long";
    }
    _readBodyFromBuffer(buff, offset) {
        let sliced = buff.slice(offset, offset + 8);
        this.value = Long.fromBytesBE(sliced, true);
        return 8;
    }

    calcBufferLength(){
        return 8;
    }

    writeBuffer(buff, offset) {
        let bytes = this.value.toBytesBE();
        for(let i = 0, j = offset; i < 8; i++, j++) {
            buff.writeUInt8(bytes[i], j);
        }
        return 8;
    }

    toJSON() {
        if(!this.value.greaterThan(9007199254740992)) {
            return this.value.toNumber();
        } else {
            return this.value.toString();
        }
    }

    setValue(value) {
        let temp = null;
        if(value instanceof Long) {
            temp = value;
        } else if(typeof value === "string") {
            temp = Long.fromString(value);
        } else if(value instanceof Long) {
            temp = Long.fromString(value.toString());
        } else if(typeof value === "number" && !isNaN(value)) {
            temp = Long.fromNumber(value);
        }
        if(null === temp) {
            console.log(value);
            throw new Error("Wrong type to set TAG_Long's value.");
        }

        if(temp.lessThan(_longBound.min) || temp.greaterThan(_longBound.max)) {
            throw new Error("Value of TAG_Long should between " +
                "-9223372036854775808 and 9223372036854775807");
        }

        this.value = temp;
    }
}



module.exports = TAGLong;
