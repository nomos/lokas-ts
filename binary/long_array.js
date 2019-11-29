let BinaryBase = require("./binary_base");
let Long = require("long");

let _longBound = {
    min: Long.fromString("-9223372036854775808"),
    max: Long.fromString("9223372036854775807")
}

class TAGLongArray extends BinaryBase{
    constructor(){
        super();
        this.type = "TAG_Long_Array";
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len * 8;
        this.value     = [];

        for(let i = 0; i < endOffset-nextOffset; i += 8) {
            let high =  buff.readInt32BE(nextOffset + i);
            let low = buff.readInt32BE(nextOffset + i+4);
            this.value.push(new Long(low,high));
        }

        return 4 + len * 8;
    }

    toJSON() {
        let ret = [];
        for(let i=0;i<this.value.length;i++) {
            ret.push(this.value[i].toString());
        }
        return ret;
    }

    calcBufferLength() {
        return 4 + this.value.length * 8;
    }

    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Int_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            let value = array[i];
            let temp = null;
            if(typeof value === "string") {
                temp = Long.fromString(value);
            } else if(value instanceof Long) {
                temp = Long.fromString(value.toString());
            } else if(typeof value === "number" && !isNaN(value)) {
                temp = Long.fromNumber(value);
            }

            if(null === temp) {
                throw new Error("Wrong type to set TAG_Long_Array's value.");
            }

            if(temp.lessThan(_longBound.min) || temp.greaterThan(_longBound.max)) {
                throw new Error("Value of TAG_Long_Array should between " +
                    "-9223372036854775808 and 9223372036854775807");
            }
            newArray.push(temp);
        }

        this.value = newArray;
    }

    shift() {
        return this.value.shift();
    }

    unshift(value) {
        let temp = -1;
        if(typeof value === "string") {
            temp = Long.fromString(value);
        } else if(value instanceof Long) {
            temp = Long.fromString(value.toString());
        } else if(typeof value === "number" && !isNaN(value)) {
            temp = Long.fromNumber(value);
        }

        if(-1 === temp) {
            throw new Error("Wrong type to set TAG_Long_Array's value.");
        }

        if(temp.lessThan(_longBound.min) || temp.greaterThan(_longBound.max)) {
            throw new Error("Value of TAG_Long_Array should between " +
                "-9223372036854775808 and 9223372036854775807");
        }
        return this.value.unshift(temp);
    }

    push(value) {
        let temp = -1;
        if(typeof value === "string") {
            temp = Long.fromString(value);
        } else if(value instanceof Long) {
            temp = Long.fromString(value.toString());
        } else if(typeof value === "number" && !isNaN(value)) {
            temp = Long.fromNumber(value);
        }

        if(-1 === temp) {
            throw new Error("Wrong type to set TAG_Long_Array's value.");
        }

        if(temp.lessThan(_longBound.min) || temp.greaterThan(_longBound.max)) {
            throw new Error("Value of TAG_Long_Array should between " +
                "-9223372036854775808 and 9223372036854775807");
        }
        return this.value.push(temp);
    }

    pop() {
        return this.value.pop();
    }

    insert(value, pos) {
        let temp = -1;
        if(typeof value === "string") {
            temp = Long.fromString(value);
        } else if(value instanceof Long) {
            temp = Long.fromString(value.toString());
        } else if(typeof value === "number" && !isNaN(value)) {
            temp = Long.fromNumber(value);
        }

        if(-1 === temp) {
            throw new Error("Wrong type to set TAG_Long_Array's value.");
        }

        if(temp.lessThan(_longBound.min) || temp.greaterThan(_longBound.max)) {
            throw new Error("Value of TAG_Long_Array should between " +
                "-9223372036854775808 and 9223372036854775807");
        }

        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        this.value.push([]);
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = temp;
    }

    writeBuffer(buff, offset) {
        buff.writeUInt32BE(this.value.length, offset);
        for(let i = 0; i < this.value.length; i++) {
            let high = this.value[i].high;
            let low = this.value[i].low;
            buff.writeInt32BE(high,offset + 4 + i * 8);
            buff.writeInt32BE(low,offset + 4 + i * 8+4);
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

module.exports = TAGLongArray;
