'use strict'
import {Singleton} from "../utils/singleton";
import {log} from "../utils/logger";
import {readTag} from "./bt";
import {Serializable} from "./protocol";

export enum Tag {
    //-------Base Tag-------
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
    Map,
    Buffer,
    Complex,
    Time,
    Null,
    //-------ECS Struct-------
    Entity = 31,
    EntityArray,
    EntityMap,
    //-------System Struct-------
    ErrMsg = 41,
    ComposeData,
    //-------Physic Component-------
    Vector = 51,
    Position,
    Velocity,
    Acceleration,
    AngularMovement,
    Size,
    Polygon,
    Point,
    Rect,
    Circle,
    Collider,
    Contact,
    BVBranch,
    BVTree,
    QuadBranch,
    QuadTree,
}

export class MemberDef {
    public key: string
    public tag: number
    public tag1: number
    public tag2: number

    constructor(key, tag: number, tag1: number, tag2: number) {
        this.key = key
        this.tag = tag
        this.tag1 = tag1
        this.tag2 = tag2
    }
}

let __tempMemberMap = new Array<{ctor:any,member:MemberDef}>()

export class ClassDef {
    public name: string
    public ctor: { new(): any }
    public membersMap: Map<string, MemberDef> = new Map<string, MemberDef>()
    public members: Array<MemberDef> = new Array<MemberDef>()

    constructor(name: string, ctor: { new(): any }) {
        this.name = name
        this.ctor = ctor
    }
    get tag():number {
        return TypeRegistry.getInstance().getTagByName(this.name)
    }
    registerMember(key: string, tag: number, tag1?: number, tag2?: number) {
        log.warn("register member def",this.name,key,tag)
        if (this.membersMap.get(key)) {
            throw new Error("duplicated member key:" + key)
        }
        this.membersMap.set(key,new MemberDef(key, tag, tag1, tag2))
        this.members.push(this.membersMap.get(key))
    }
}

export class TypeRegistry extends Singleton {
    private classDefs: Map<string, ClassDef> = new Map<string, ClassDef>()
    private classDefsInverse: Map<any, string> = new Map<any, string>()
    private classProto:Map<string,any> = new Map<string, any>()
    private tagMap: Map<string, number> = new Map<string, number>()
    private typeMap: Map<number, string> = new Map<number, string>()

    static getInstance(): TypeRegistry {
        return <TypeRegistry>super.getInstance()
    }

    constructor() {
        super();
        this.registerSystemTag("ErrMsg", Tag.ErrMsg)
        this.registerSystemTag("ComposeData", Tag.ComposeData)
        this.registerSystemTag("Vector", Tag.Vector)
        this.registerSystemTag("Position", Tag.Position)
        this.registerSystemTag("Velocity", Tag.Velocity)
        this.registerSystemTag("Acceleration", Tag.Acceleration)
        this.registerSystemTag("AngularMovement", Tag.AngularMovement)
        this.registerSystemTag("Size", Tag.Size)
        this.registerSystemTag("Polygon", Tag.Polygon)
        this.registerSystemTag("Point", Tag.Point)
        this.registerSystemTag("Rect", Tag.Rect)
        this.registerSystemTag("Circle", Tag.Circle)
        this.registerSystemTag("Collider", Tag.Collider)
        this.registerSystemTag("Contact", Tag.Contact)
        this.registerSystemTag("BVBranch", Tag.BVBranch)
        this.registerSystemTag("BVTree", Tag.BVTree)
        this.registerSystemTag("QuadBranch", Tag.QuadBranch)
        this.registerSystemTag("QuadTree", Tag.QuadTree)
    }

    registerMemberDef(c: any, name: string, type: Tag, type1?: Tag, type2?: Tag) {
        let classDef = this.classDefs.get(this.classDefsInverse.get(c))
        if (classDef) {
            classDef.registerMember(name, type, type1, type2)
        } else {
            __tempMemberMap.push({ctor:c,member:new MemberDef(name, type, type1, type2)})
        }
    }

    getProtoName(c:any):string {
        let ret = "error"
        this.classDefsInverse.forEach(function (v,k,map) {
            if (k==c) {
                ret = v
                return
            }
        })
        return ret
    }

    registerClassDef(c: any, name: string) {
        log.warn("registerClassDef", name)
        if (this.classDefs.get(name)) {
            throw new Error("class def already exist:" + name)
        }
        this.classDefs.set(name,new ClassDef(name, c))
        this.classDefsInverse.set(c,name)
        this.classProto.set(name,c)
        let map1 = __tempMemberMap.slice()
        __tempMemberMap = []
        map1.forEach((v,index,arr)=>{
            this.registerMemberDef(v.ctor,v.member.key,v.member.tag,v.member.tag1,v.member.tag2)
        })
    }

    registerCustomTag(typeName: string, tagId: number) {
        if (tagId <= 32768) {
            throw new Error("not a custom tag:" + tagId + " " + typeName+ " must be >32767")
        }
        this.registerTag(typeName, tagId)
    }

    registerSystemTag(typeName: string, tagId: number) {
        if (tagId > 127 || tagId <= Tag.Null) {
            throw new Error("not a system tag:" + tagId + " " + typeName)
        }
        this.registerTag(typeName, tagId)
    }

    private registerTag(typeName: string, tagId: number) {
        if (this.tagMap.get(typeName) != undefined) {
            throw new Error("typeName already exist:" + typeName + " " + tagId)
        }
        if (this.typeMap.get(tagId) != undefined) {
            throw new Error("tagId already exist:" + tagId + " " + typeName)
        }
        this.tagMap.set(typeName,tagId)
        this.typeMap.set(tagId,typeName)
    }

    getClassDef(name: string): ClassDef {
        log.warn(this.classDefs,name,this.classDefs.get(name))
        return this.classDefs.get(name)
    }

    getClassDefByTag(tag: number): ClassDef {
        return this.classDefs.get(this.typeMap.get(tag))
    }

    getProtoByTag(tag: number): ClassDef {
        return this.classProto.get(this.typeMap.get(tag))
    }

    getTagByName(name:string):number {
        return this.tagMap.get(name)
    }

    getInstanceByTag(tag: number): any {
        let proto = this.classProto.get(this.typeMap.get(tag))
        if (!proto) {
            log.panic("tag is not registered")
        }
        return Object.create(proto)
    }
}

export function format(typeName: Tag, nestingType1?: Tag, nestingType2?: Tag) {
    return function (target: Serializable, propertyKey: string) {
        TypeRegistry.getInstance().registerMemberDef(target, propertyKey, typeName, nestingType1,nestingType2)
    }
}

export function comp(compName: string) {
    return function (target: {new():Serializable}) {
        TypeRegistry.getInstance().registerClassDef(target.prototype, compName)
    }
}
