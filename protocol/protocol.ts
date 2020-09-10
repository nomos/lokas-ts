import {Buffer} from "../thirdparty/buffer";
import {comp, format, Tag} from "./types";
import {marshalToBytes} from "./encode";

export interface Serializable {
    defineName:string
    unmarshalFrom(buff:Buffer)
    marshalTo():Buffer
}

@comp("ComposeData")
export class ComposeData implements Serializable{
    defineName:string = "ComposeData"
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
    defineName:string = "ErrMsg"
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

export class BinaryMessage implements Serializable {
    defineName:string = "BinaryMessage"
    public transId: number
    public msgId: number
    public len: number
    public data: any

    unmarshalFrom(buff: Buffer) {

    }

    marshalTo(): Buffer {
        return marshalToBytes(this.transId,this.data)
    }
}