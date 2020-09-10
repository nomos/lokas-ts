import {BinaryBase} from "./binary_base";
import {util} from "../utils/util";
import {Tag} from "./types"

export class TAGBoolArray extends BinaryBase {
    public value:Array<boolean> = []
    constructor(){
        super();
        this.type =  Tag.Bool_Array;
    }
    _readBodyFromBuffer(buff, offset):number {
        let len        = buff.readUInt32BE(offset);
        let trueLen = Math.ceil(len/8.0);
        let nextOffset = offset + 4;
        let endOffset  = nextOffset + trueLen;
        this.value     = [];

        let u256s = [];
        for(let i = nextOffset; i < endOffset; i++) {
            u256s.push(buff.readUInt8(i));
        }
        for (let i =0;i<len;i++) {
            let bi = Math.floor(i/8);
            let si = i%8;
            let bNumber = u256s[bi];
            let data = bNumber>>si&1;
            if (data ===1) {
                this.value.push(true);
            } else {
                this.value.push(false);
            }
        }
        return 4 + trueLen;
    }
    calcBufferLength():number {
        return 4 + Math.ceil(this.value.length/8.0);
    }
    writeBuffer(buff, offset):number {
        buff.writeUInt32BE(this.value.length, offset);
        let trueLen = Math.ceil(this.value.length/8.0);
        let u256s = [];
        for(let i = 0; i < this.value.length; i++) {
            let bi = Math.floor(i/8);
            let si = i%8;
            if (u256s.length<=bi) {
                u256s.push(0);
            }

            let data = this.value[i];
            if (data) {
                u256s[bi]+=Math.pow(2,si);
            }
        }
        for(let i = 0; i < trueLen; i++) {
            buff.writeUInt8(u256s[i], offset + 4 + i);
        }

        return 4 + trueLen;
    }
    setValue(array:Array<boolean>) {
        this.value = array;
    }
    shift():boolean {
        return this.value.shift();
    }
    unshift(value:boolean) {
        return this.value.unshift(value);
    }
    push(value:boolean) {
        return this.value.push(value);
    }
    pop():boolean {
        return this.value.pop();
    }
    insert(value:boolean, pos:number) {
        if(pos < 0) pos = 0;
        if(pos > this.value.length) pos = this.value.length;
        //FIXME:insert
        for(let i = this.value.length - 1; i >= pos; i--) {
            this.value[i + 1] = this.value[i];
        }
        this.value[pos] = value;
    }
    at(index):boolean {
        return this.value[index];
    }
    getSize():number {
        return this.value.length;
    }
}