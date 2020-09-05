import {BinaryBase} from "../binary/binary_base";
import {Buffer} from "../thirdparty/buffer";
import {comp, format, Tag} from "../type/types";

export interface Serializable {
    unmarshalFrom(buff:Buffer)
    marshalTo():Buffer
}

@comp("ComposeData")
export class ComposeData implements Serializable{
    @format(Tag.Byte)
    public id:number
    @format(Tag.Buffer)
    public data:Buffer
    unmarshalFrom(buff:Buffer){

    }
    marshalTo():Buffer{
        return null
    }
}

@comp("ErrMsg")
export class ErrMsg implements Serializable{
    @format(Tag.Int)
    public transId:number
    @format(Tag.Short)
    public code:number
    @format(Tag.String)
    public msg:string
    unmarshalFrom(buff:Buffer){

    }
    marshalTo():Buffer{
        return null

    }
}

export class BinaryMessage implements Serializable{
    public transId:number
    public msgId:number
    public data:Buffer
    unmarshalFrom(buff:Buffer) {

    }
    marshalTo():Buffer {
        return null
    }
}