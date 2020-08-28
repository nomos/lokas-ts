import {Singleton} from "../utils/singleton";
import {log} from "../utils/logger";

export enum Tag {
    End,
    Bool,
    Byte,
    Short,
    Int,
    Long,
    Float,
    Double,
    String,
    Bool_Array,
    Byte_Array,
    Short_Array,
    Int_Array,
    Long_Array,
    Float_Array,
    Double_Array,
    List,
    Compound,
    Complex,
    Null,
    Buffer,
    Entity,
    EntityArray,
    EntityMap,
}

export class TypeRegistry extends Singleton{
    constructor() {
        super();
    }
    registerMemberDef(){

    }
}

export function format(typeName:Tag) {
    return function (target:any,propertyKey:string) {
        log.warn("format",typeName,"target",target,propertyKey)
        TypeRegistry.getInstance().registerMemberDef()
    }
}

export function comp(compName:string) {
    return function (target:Function) {
        Object.getPrototypeOf(target).__defineName = compName
    }
}
