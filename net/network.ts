import {Logger,log} from "../utils/logger";
import {EventEmitter} from "../utils/event_emitter";
import {Serializable} from "../protocol/protocol";
import {marshalMessage} from "../protocol/encode";
import {IContext} from "../common/context";
import * as ByteBuffer from "bytebuffer";
import {Tag} from "../protocol/types";

const DEFAULT_TIMEOUT = 15000



export class WsClient extends EventEmitter {
    public addr: string = "ws://127.0.0.1/ws";//内网测试
    private ws: any = null;
    private idGen: number = 0;
    private reqContexts: Map<number, IContext> = new Map<number, IContext>()
    private _composeData: any;

    constructor(addr) {
        super();
        this.ws = null;
        if (addr != "") {
            this.addr = addr
        }
    }

    GenId(): number {
        this.idGen++
        return this.idGen
    }

    ConnectServer(_addr ?: any) {
        let addr = this.addr = _addr || this.addr;
        log.info("addr", addr)
        // 创建客户端
        let ws = new WebSocket(addr);
        ws.binaryType = "arraybuffer";
        ws.onerror = this.onerror.bind(this);
        ws.onclose = this.onclose.bind(this);
        ws.onopen = this.onopen.bind(this);
        ws.onmessage = this.onmessage.bind(this);
        this.ws = ws;
    }

    async Open(): Promise<any> {
        this.ConnectServer()
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                log.error("connect timeout")
                reject()
            }, DEFAULT_TIMEOUT)
            this.on("open", () => {
                clearTimeout(timeout)
                resolve()
            })
        })
    }

    async Close() {
        this.ws.close();
        return new Promise<void>((resolve, reject) => {
            let timeout = setTimeout(() => {
                reject("close timeout")
            }, DEFAULT_TIMEOUT)
            this.on("close", () => {
                clearTimeout(timeout)
                resolve()
            })
        })
    }

    protected onerror(error: any) {
        log.error("Connection Error: ", error.toString());
    }

    protected onclose() {
        this.emit("close", this);
    };

    protected onmessage(e) {
        log.warn("on message",e)
        // let buff = dcodeIO.ByteBuffer.wrap(e.data);
        // while (buff.offset < buff.limit) {
        //     let cmdId = buff.readUInt16();
        //     let transId = buff.readUInt32();
        //     let len = buff.readUint16();
        //     let className = pb.idMap[cmdId];
        //     let obj = getSignletonProto(className);
        //     let msg = pb[className].decode(buff.readBytes(len - 8), -1, NaN, obj);
        //     this.onRecvMessage(cmdId, msg, transId)
        // }
    }

    protected onRecvMessage?(cmdId: Tag, data: any, transId: number): boolean {
        // console.log(' Received msg', cmdId, data, transId);
        // let className = pb.idMap[cmdId];
        // if (!className || !pb[className])
        //     return;
        // if (className == "ComposeDataAck") {
        //     this.appendComposeData(<pb.ComposeDataAck>data);
        // } else {
        //     let context = this.getContext(transId)
        //     if (context) {
        //         context.setData(data)
        //         if (this["on" + className]) {
        //             this["on" + className](data, transId)
        //         } else {
        //             console.log("on" + className + " is no registered");
        //         }
        //         context.resolveFunc()
        //         this.emit("on" + className, data);
        //     } else {
        //         if (this["on" + className]) {
        //             this["on" + className](data, transId)
        //         } else {
        //             console.log("on" + className + " is no registered");
        //         }
        //         this.emit("on" + className, data);
        //     }
        // }
        return true
    }

    protected appendComposeData(data: any) {
        this._composeData || (this._composeData = new ByteBuffer());
        this._composeData.append(data.data);
        data.idx == 0 && this.touchComposeData();
    }

    private touchComposeData() {
        // if (this._composeData) {
        //     this._composeData.flip();
        //     let cmdId = this._composeData.readUInt16();
        //     let transId = this._composeData.readUInt32();
        //     let len = this._composeData.readUint16();
        //     len = this._composeData.limit;
        //
        //     let className = pb.idMap[cmdId];
        //     if (!className || !pb[className])
        //         return;
        //
        //     let obj = getSignletonProto(className);
        //     let msg = pb[className].decode(this._composeData.readBytes(len - 8), -1, NaN, obj);
        //     this.onRecvMessage(pb.nameMap[className], msg, transId)
        //     this._composeData = null;
        // }
    }

    protected onopen(...args) {
        log.info('Connection Opened', this.addr);
        this.emit("open", ...args);
    }

    // async recive(proto: any, wait: number): Promise<Context> {
    //     let name = ""
    //     for (let i in pb.idMap) {
    //         if (pb[pb.idMap[i]] == proto) {
    //             name = pb.idMap[i]
    //         }
    //     }
    //     let context = new Context()
    //     return new Promise<Context>((resolve, reject) => {
    //
    //         if (name == "") {
    //             reject("proto not registered")
    //         }
    //         let listener = (data, transId) => {
    //             this.off("on" + name, listener)
    //             context.data = data
    //             context.transId = transId
    //             context.resolveFunc()
    //         }
    //         setTimeout(() => {
    //             this.off("on" + name, listener)
    //         }, wait * 1000)
    //         this.on("on" + name, listener)
    //         let timeout = setTimeout(() => {
    //             reject(name + " on recive timeout")
    //         }, wait * 1000)
    //
    //         context.resolveFunc = () => {
    //             clearTimeout(timeout)
    //             resolve(context)
    //         }
    //         context.rejectFunc = (err: string) => {
    //             clearTimeout(timeout)
    //             reject(err)
    //         }
    //     })
    // }


    async Send(transId:number, data:Serializable): Promise<any> {
        let buff = marshalMessage(transId,data)
        this.ws.send(buff)
        // let className = data['$type'].name;
        // let id = pb.nameMap[className];
        // let msg = data['encode']();
        // let buf = new dcodeIO.ByteBuffer();
        // let len = msg.limit + 8;
        // if (len >= 65536) {
        //     return null;
        // }
        // buf.writeUint16(id)
        // let transId = this.genId()
        // buf.writeUint32(transId)
        // buf.writeUint16(len)
        // // 这个需要和服务器对清楚，有时候服务器并不作数据的旋转
        // buf.append(msg)
        // buf.flip();
        // let buffData = buf.toArrayBuffer();
        // let resolveFunc = (resolve) => {
        //     return (data: pb.ProtoBufModel) => {
        //         resolve(data)
        //     }
        // }
        // this.reqContexts[transId] =
        //     this.ws.send(buffData);
        // console.log(`Client 发送${className}成功`);
        //
        //
        // return new Promise<Context>((resolve, reject) => {
        //     let timeout = setTimeout(() => {
        //         reject("connect timeout")
        //     }, DEFAULT_TIMEOUT)
        //     let context = new Context()
        //     context.transId = transId
        //     context.resolveFunc = () => {
        //         clearTimeout(timeout)
        //         resolve(context)
        //     }
        //     context.rejectFunc = (err: string) => {
        //         clearTimeout(timeout)
        //         reject(err)
        //     }
        //     this.reqContexts[transId] = context
        // })
    }

    // onErrorAck(data: pb.ErrorAck, transId: number) {
    //     let context = this.getContext(transId)
    //     console.log("context", context)
    //     // this.close()
    //     if (context) {
    //         context.rejectFunc(`code:${data.code},message:${data.message}`)
    //     } else {
    //         throw new Error("errAck not handled")
    //     }
    // }
}