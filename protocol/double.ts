import {BinaryBase} from "./binary_base";
import {Tag} from "./types"


export class TAGDouble extends BinaryBase{
    constructor(){
        super();
        this.type =  Tag.Double;
    }
    _readBodyFromBuffer(buff, offset) {
        this.value = buff.readDoubleBE(offset);
        return 8;
    }
    calcBufferLength(){
        return 8;
    }
    writeBuffer(buff, offset) {
        buff.writeDoubleBE(this.value, offset);
        return 8;
    }
    setValue(value) {
        value = parseFloat(value);
        if(isNaN(value)) {
            throw new Error("Bad value for TAG_Double.");
        }
        this.value = value;
    }
}
