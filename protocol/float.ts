import {BinaryBase} from "./binary_base";
import {Tag} from "./types"

export class TAGFloat extends BinaryBase{
    constructor(){
        super();
        this.type =  Tag.Float;
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = buff.readFloatBE(offset);
        return 4;
    }

    calcBufferLength(){
        return 4;
    }

    writeBuffer(buff, offset) {
        buff.writeFloatBE(this.value, offset);
        return 4;
    }

    setValue(value) {
        value = parseFloat(value);
        if(value < -3.4e+38 || value > 3.4e+38 || isNaN(value)) {
            throw new Error("Value of TAG_Float should between -3.4E+38 and 3.4E+38.");
        }
        this.value = value;
    }
}
