import {BinaryBase} from "./binary_base";
import {Tag} from "../type/types";

export class TAGBool extends BinaryBase{
    public value:boolean
    constructor(){
        super();
        this.type =  Tag.Bool;
    }
    _readBodyFromBuffer(buff, offset):number {
        this.value = !!(buff.readInt8(offset));
        return 1;
    }
    calcBufferLength():number{
        return 1;
    }
    writeBuffer(buff, offset):number {
        let data = this.value?1:0;
        buff.writeInt8(data, offset);
        return 1;
    }
    setValue(value:boolean) {
        this.value = value;
    }
}
