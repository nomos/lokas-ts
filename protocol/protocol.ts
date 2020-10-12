import * as ByteBuffer from "bytebuffer";
import {define, format, Tag, TypeRegistry} from "./types";
import {marshalMessage} from "./encode";
import {unmarshalMessageBody, unmarshalMessageHeader} from "./decode";
import {log} from "../utils/logger";

export class ISerializable {
    UnmarshalFrom(buff: ByteBuffer) {

    }

    MarshalTo(): ByteBuffer {
        return null
    }

    get DefineName(): string {
        return TypeRegistry.GetInstance().GetCtorName(Object.getPrototypeOf(this).constructor)
    }

    static get DefineName(): string {
        return TypeRegistry.GetInstance().GetCtorName(this)
    }
}

export type ISerializableCtor = {DefineName:string;new():ISerializable}

@define("ComposeData",[
    ["Idx",Tag.Byte],
    ["Data",Tag.Buffer],
])
export class ComposeData extends ISerializable {
    public Idx: number
    public Data: ByteBuffer

    UnmarshalFrom(buff: ByteBuffer) {

    }

    MarshalTo(): ByteBuffer {
        return null
    }
}

@define("ErrMsg",[
    ["Code",Tag.Short],
    ["Msg",Tag.String],
])
export class ErrMsg extends ISerializable {
    public Code: number
    public Msg: string

    constructor(code = 0, msg = "") {
        super()
        this.Code = code
        this.Msg = msg
    }

    UnmarshalFrom(buff: ByteBuffer) {

    }

    MarshalTo(): ByteBuffer {
        return null
    }
}

export class BinaryMessage implements ISerializable {
    DefineName: string = "BinaryMessage"
    static DefineName: string = "BinaryMessage"
    public TransId: number
    public Len: number
    public MsgId: number
    public Data: any

    constructor(buff?:ByteBuffer) {
        if (buff){
            this.UnmarshalFrom(buff)
        }
    }

    UnmarshalFrom(buff: ByteBuffer) {
        let header = unmarshalMessageHeader(buff)
        this.TransId = header[0]
        this.Len = header[1]
        this.MsgId = header[2]
        this.Data = unmarshalMessageBody(buff,this.MsgId)
    }

    MarshalTo(): ByteBuffer {
        return marshalMessage(this.TransId, this.Data)
    }
}