import {BinaryBase} from "../binary/binary_base";
import {Buffer} from "../thirdparty/buffer";

export interface Serializable {
    unmarshalFrom(buff:Buffer)
    marshalTo():Buffer
    type():BinaryType
}

enum BinaryType{
    NONE,
    BT,
    CP,
    ERR
}

export class ComposeData implements Serializable{
    public id:number
    public data:Buffer
    type():BinaryType{
        return BinaryType.CP
    }
    unmarshalFrom(buff:Buffer){

    }
    marshalTo():Buffer{
        return null
    }
}

export class ErrMsg implements Serializable{
    public transId:number
    public code:number
    public msg:number
    type():BinaryType{
        return BinaryType.ERR
    }
    unmarshalFrom(buff:Buffer){

    }
    marshalTo():Buffer{
        return null

    }
}

export class BinaryMessage implements Serializable{
    public transId:number
    public msgId:number
    public data:BinaryBase
    type():BinaryType{
        return BinaryType.BT
    }
    unmarshalFrom(buff:Buffer) {

    }
    marshalTo():Buffer {
        return null
    }
}