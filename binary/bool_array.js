
let BinaryBase = require("./binary_base");
let util = require("../ECSUtil");

class TAGBoolArray extends BinaryBase {
    constructor(){
        super();
        this.type = "TAG_Bool_Array";
        this.value     = [];
    }
    _readBodyFromBuffer(buff, offset) {
        let len        = buff.readUInt32BE(offset);
        let trueLen = Math.ceil(len/8.0);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + trueLen;
        this.value     = [];

        let u256s = [];
        for(let i = nextOffset; i < endOffset; i++) {
            u256s.push(buff.readUInt8(i));
        }
        for (let i =0;i<len;i++) {
            let bi = Math.floor(i/8);
            let si = i%8;
            let bNumber = u256s[bi];
            let data = bNumber>>si&1;
            if (data ===1) {
                this.value.push(true);
            } else {
                this.value.push(false);
            }
        }
        return 4 + trueLen;
    }
    calcBufferLength() {
        return 4 + Math.ceil(this.value.length/8.0);
    }
    writeBuffer(buff, offset) {
        buff.writeUInt32BE(this.value.length, offset);
        let trueLen = Math.ceil(this.value.length/8.0);
        let u256s = [];
        for(let i = 0; i < this.value.length; i++) {
            let bi = Math.floor(i/8);
            let si = i%8;
            if (u256s.length<=bi) {
                u256s.push(0);
            }

            let data = this.value[i];
            if (data) {
                u256s[bi]+=Math.pow(2,si);
            }
        }
        for(let i = 0; i < trueLen; i++) {
            buff.writeUInt8(u256s[i], offset + 4 + i);
        }

        return 4 + trueLen;
    }
    setValue(array) {
        if(!util.isArray(array)) {
            throw new Error("Value of TAG_Bool_Array should be an array.");
        }

        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push((array[i]));
            if(typeof value !== 'boolean') {
                throw new Error("Each element in TAG_Bool_Array should be boolean");
            }
        }

        this.value = newArray;
    }
    shift() {
        return this.value.shift();
    }
    unshift(value) {
        value = (value);
        if(typeof value !== 'boolean') {
            throw new Error("Each element in TAG_Bool_Array should be boolean");
        }
        return this.value.unshift(value);
    }
    push(value) {
        value = (value);
        if(typeof value !== 'boolean') {
            throw new Error("Each element in TAG_Bool_Array should be boolean");
        }
        return this.value.push(value);
    }
    pop() {
        return this.value.pop();
    }
    insert(value, pos) {
        value = (value);
        if(typeof value !== 'boolean') {
            throw new Error("Each element in TAG_Bool_Array should be boolean");
        }
        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        this.value.push([]);
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }
    at(index) {
        return this.value[index];
    }
    getSize() {
        return this.value.length;
    }
}

module.exports = TAGBoolArray;
