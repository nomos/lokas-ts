import {Buffer} from "../thirdparty/buffer";
import {define, format, Tag, TypeRegistry} from "./types";
import {marshalToBytes} from "./encode";
import {log} from "../utils/logger";

export class Serializable {
    unmarshalFrom(buff: Buffer) {

    }

    marshalTo(): Buffer {
        return null
    }

    get defineName(): string {
        let ret = TypeRegistry.getInstance().getProtoName(Object.getPrototypeOf(this))
        return ret
    }
}

@define("ComposeData")
export class ComposeData extends Serializable {
    @format(Tag.Byte)
    public id: number
    @format(Tag.Buffer)
    public data: Buffer

    unmarshalFrom(buff: Buffer) {

    }

    marshalTo(): Buffer {
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

    unmarshalFrom(buff: Buffer) {

    }

    marshalTo(): Buffer {
        return null
    }
}

export class BinaryMessage implements Serializable {
    defineName: string = "BinaryMessage"
    public transId: number
    public msgId: number
    public len: number
    public data: any

    unmarshalFrom(buff: Buffer) {

    }

    marshalTo(): Buffer {
        return marshalToBytes(this.transId, this.data)
    }
}