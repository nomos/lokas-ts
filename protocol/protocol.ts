import {Buffer} from "../thirdparty/buffer";
import {define, format, Tag, TypeRegistry} from "./types";
import {marshalMessage} from "./encode";
import {unmarshalMessageBody, unmarshalMessageHeader} from "./decode";

export class Serializable {
    UnmarshalFrom(buff: Buffer) {

    }

    MarshalTo(): Buffer {
        return null
    }

    get DefineName(): string {
        return TypeRegistry.GetInstance().GetProtoName(Object.getPrototypeOf(this))
    }
}

@define("ComposeData")
export class ComposeData extends Serializable {
    @format(Tag.Byte)
    public id: number
    @format(Tag.Buffer)
    public data: Buffer

    UnmarshalFrom(buff: Buffer) {

    }

    MarshalTo(): Buffer {
        return null
    }
}

@define("ErrMsg")
export class ErrMsg extends Serializable {
    @format(Tag.Short)
    public code: number
    @format(Tag.String)
    public msg: string

    constructor(code = 0, msg = "") {
        super()
        this.code = code
        this.msg = msg
    }

    UnmarshalFrom(buff: Buffer) {

    }

    MarshalTo(): Buffer {
        return null
    }
}

export class BinaryMessage implements Serializable {
    DefineName: string = "BinaryMessage"
    public transId: number
    public len: number
    public msgId: number
    public data: any

    constructor(buff?:Buffer) {
        if (buff){
            this.UnmarshalFrom(buff)
        }
    }

    UnmarshalFrom(buff: Buffer) {
        let header = unmarshalMessageHeader(buff)
        this.transId = header[0]
        this.len = header[1]
        this.msgId = header[2]
        this.data = unmarshalMessageBody(buff,this.msgId)
    }

    MarshalTo(): Buffer {
        return marshalMessage(this.transId, this.data)
    }
}