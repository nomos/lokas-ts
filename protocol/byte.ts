
import {BinaryBase} from "./binary_base";
import {Tag} from "./types"

export class TAGByte extends BinaryBase{
    public value:number
    constructor(){
        super();
        this.type =  Tag.Byte;
    }
    _readBodyFromBuffer(buff, offset):number {
        this.value = buff.readInt8(offset);
        return 1;
    }
    calcBufferLength():number{
        return 1;
    }
    writeBuffer(buff, offset):number {
        buff.writeInt8(this.value, offset);
        return 1;
    }
    setValue (value:number) {
        if(value < -128 || value > 127 || isNaN(value)) {
            throw new Error("Value of TAG_Byte should between -128 and 127.");
        }
        this.value = value;
    }
}
