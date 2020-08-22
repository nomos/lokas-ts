// let ObjectID = this?require('bson').ObjectId:require('./objectid');
// import {Buffer} from "../thirdparty/buffer";
// import {BinaryBase} from "./binary_base";
// import {Type} from "./tags"
//
// export class TAGObjectID extends BinaryBase{
//     constructor(){
//         super();
//         // this.type =  Type.TAG_ObjectID;
//     }
//     _readBodyFromBuffer(buff, offset) {
//         let tempbuff = Buffer.alloc(12);
//         buff.copy(tempbuff,0,offset,offset+12);
//         this.value = ObjectID(tempbuff);
//         return 12;
//     }
//     calcBufferLength(){
//         return 12;
//     }
//     writeBuffer(buff, offset) {
//         this.value.id.copy(buff,offset,0,12);
//         return 12;
//     }
//     setValue(value) {
//         if(!(value instanceof ObjectID)) {
//             throw new Error("Value must be ObjectID");
//         }
//         this.value = value;
//     }
// }