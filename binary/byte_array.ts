import {BinaryBase} from "./binary_base";
import {Tag} from "../type/types"

export class TAGByteArray extends BinaryBase{
    public value:Array<number> = []
    public unsigned:boolean = false
    constructor(){
        super();
        this.type =  Tag.Byte_Array;
    }
    _readBodyFromBuffer(buff, offset):number {
        let len        = buff.readUInt32BE(offset);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + len;
        this.value     = [];

        for(let i = nextOffset; i < endOffset; i++) {
            if (this.unsigned) {
                this.value.push(buff.readUInt8(i));
            } else {
                this.value.push(buff.readInt8(i));
            }
        }

        return 4 + len;
    }
    calcBufferLength():number {
        return 4 + this.value.length;
    }
    writeBuffer(buff, offset):number {
        buff.writeUInt32BE(this.value.length, offset);
        for(let i = 0; i < this.value.length; i++) {
            if (this.unsigned) {
                buff.writeUInt8(this.value[i], offset + 4 + i);
            } else {
                buff.writeInt8(this.value[i], offset + 4 + i);
            }
        }
        return 4 + this.value.length;
    }
    shift():number {
        return this.value.shift();
    }
    unshift(value:number) {
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        return this.value.unshift(value);
    }
    setValue(array:Array<number>) {
        let newArray = [];
        for(let i = 0; i < array.length; i++) {
            newArray.push(array[i]);
            if (this.unsigned) {
                if(newArray[i] < 0 || newArray[i] > 255 || isNaN(newArray[i])) {
                    throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
                }
            } else {
                if(newArray[i] < -128 || newArray[i] > 127 || isNaN(newArray[i])) {
                    throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
                }
            }
        }

        this.value = newArray;
    }
    push(value:number) {
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        return this.value.push(value);
    }
    pop():number {
        return this.value.pop();
    }
    insert(value:number, pos:number) {
        value = parseInt(value);
        if (this.unsigned) {
            if(value < 0 || value > 255 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array unsigned should between 0 and 255.");
            }
        } else {
            if(value < -128 || value > 127 || isNaN(value)) {
                throw new Error("Each element in TAG_Byte_Array signed should between -128 and 127.");
            }
        }
        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }
    at(index):number {
        return this.value[index];
    }
    getSize():number {
        return this.value.length;
    }
}
