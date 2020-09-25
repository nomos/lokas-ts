'use strict'
import {Singleton} from "../utils/singleton";
import {log} from "../utils/logger";
import {Serializable} from "./protocol";
import {util} from "../utils/util";

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
    Time,
    Proto,
    Null,
    //-------ECS Struct-------
    EntityRef = 31,
    EntityData,
    Connection,
    SyncCmd,
    SyncReq,
    SyncFrame,
    SyncStream,
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
    public Key: string
    public Tag: number
    public Tag1: number
    public Tag2: number
    public Tag3: number
    constructor(key, tag: number, tag1: number, tag2: number, tag3: number) {
        this.Key = key
        this.Tag = tag
        this.Tag1 = tag1
        this.Tag2 = tag2
        this.Tag3 = tag3
    }
}

let __tempMemberMap = new Array<{ ctor: any, member: MemberDef }>()

export class ClassDef {
    public Name: string
    public Ctor: { new(): any }
    public MembersMap: Map<string, MemberDef> = new Map<string, MemberDef>()
    public Members: Array<MemberDef> = new Array<MemberDef>()

    constructor(name: string, ctor: { new(): any }) {
        this.Name = name
        this.Ctor = ctor
    }

    get Tag(): number {
        return TypeRegistry.GetInstance().GetTagByName(this.Name)
    }

    RegisterMember(key: string, tag: number, tag1?: number, tag2?: number, tag3?: number) {
        log.warn("register member def", this.Name, key, tag)
        if (this.MembersMap.get(key)) {
            throw new Error("duplicated member key:" + key)
        }
        this.MembersMap.set(key, new MemberDef(key, tag, tag1, tag2, tag3))
        this.Members.push(this.MembersMap.get(key))
    }
}

export class TypeRegistry extends Singleton {
    private classDefs: Map<string, ClassDef> = new Map<string, ClassDef>()
    private classDefsInverse: Map<any, string> = new Map<any, string>()
    private classProto: Map<string, any> = new Map<string, any>()
    private tagMap: Map<string, number> = new Map<string, number>()
    private typeMap: Map<number, string> = new Map<number, string>()

    static GetInstance(): TypeRegistry {
        return <TypeRegistry>super.GetInstance()
    }

    constructor() {
        super();
        this.RegisterSystemTag("ErrMsg", Tag.ErrMsg)
        this.RegisterSystemTag("ComposeData", Tag.ComposeData)
        this.RegisterSystemTag("Vector", Tag.Vector)
        this.RegisterSystemTag("Position", Tag.Position)
        this.RegisterSystemTag("Velocity", Tag.Velocity)
        this.RegisterSystemTag("Acceleration", Tag.Acceleration)
        this.RegisterSystemTag("AngularMovement", Tag.AngularMovement)
        this.RegisterSystemTag("Size", Tag.Size)
        this.RegisterSystemTag("Polygon", Tag.Polygon)
        this.RegisterSystemTag("Point", Tag.Point)
        this.RegisterSystemTag("Rect", Tag.Rect)
        this.RegisterSystemTag("Circle", Tag.Circle)
        this.RegisterSystemTag("Collider", Tag.Collider)
        this.RegisterSystemTag("Contact", Tag.Contact)
        this.RegisterSystemTag("BVBranch", Tag.BVBranch)
        this.RegisterSystemTag("BVTree", Tag.BVTree)
        this.RegisterSystemTag("QuadBranch", Tag.QuadBranch)
        this.RegisterSystemTag("QuadTree", Tag.QuadTree)
    }

    RegisterMemberDef(c: any, name: string, type: Tag, type1?: Tag, type2?: Tag, type3?: Tag) {
        let classDef = this.classDefs.get(this.classDefsInverse.get(c))
        if (classDef) {
            classDef.RegisterMember(name, type, type1, type2, type3)
        } else {
            __tempMemberMap.push({ctor: c, member: new MemberDef(name, type, type1, type2, type3)})
        }
    }

    GetProtoTag(c: any): Tag {
        let ret = "error"
        this.classDefsInverse.forEach( (v, k) =>{
            if (k == c) {
                ret = v
                return this.GetTagByName(k)
            }
        })
        return 0
    }

    GetAnyName(c:string|{new():Serializable}|Serializable):string {
        if (util.isString(c)) {
            return <string>c
        }
        if (c instanceof Serializable) {
            return (<Serializable>c).DefineName
        }
        return this.GetProtoName(c)
    }

    GetProtoName(c: any): string {
        let ret = "error"
        this.classDefsInverse.forEach(function (v, k) {
            if (k == c) {
                ret = v
                return ret
            }
        })
        return ret
    }

    RegisterClassDef(c: any, name: string) {
        log.warn("registerClassDef", name)
        if (this.classDefs.get(name)) {
            throw new Error("class def already exist:" + name)
        }
        this.classDefs.set(name, new ClassDef(name, c))
        this.classDefsInverse.set(c, name)
        this.classProto.set(name, c)
        let map1 = __tempMemberMap.slice()
        __tempMemberMap = []
        map1.forEach((v) => {
            this.RegisterMemberDef(v.ctor, v.member.Key, v.member.Tag, v.member.Tag1, v.member.Tag2)
        })
    }

    RegisterCustomTag(typeName: string, tagId: number) {
        if (tagId <= 32768) {
            throw new Error("not a custom tag:" + tagId + " " + typeName + " must be >32767")
        }
        this.registerTag(typeName, tagId)
    }

    RegisterSystemTag(typeName: string, tagId: number) {
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
        this.tagMap.set(typeName, tagId)
        this.typeMap.set(tagId, typeName)
    }

    GetClassDef(name: string): ClassDef {
        return this.classDefs.get(name)
    }

    GetClassDefByTag(tag: number): ClassDef {
        return this.classDefs.get(this.typeMap.get(tag))
    }

    GetProtoByTag(tag: number): any {
        return this.classProto.get(this.typeMap.get(tag))
    }

    GetCtorByName(name: string): { new(): Serializable } {
        return this.classProto.get(name).constructor
    }

    GetCtorByTag(tag: number): { new(): Serializable } {
        return this.classProto.get(this.typeMap.get(tag)).constructor
    }

    GetTagByName(name: string): number {
        return this.tagMap.get(name)
    }

    GetInstanceByTag(tag: number): Serializable {
        let proto = this.classProto.get(this.typeMap.get(tag))
        if (!proto) {
            log.panic("tag is not registered")
        }
        return Object.create(proto)
    }

    IsValid(data: any): boolean {
        let proto = Object.getPrototypeOf(data)
        return this.GetProtoName(proto) !== "error"
    }
}

export function formats(tags: Array<[string, Tag, Tag?, Tag?, Tag?]>) {
    return function (target: { new(): Serializable }) {
        tags.forEach((v) => {
            TypeRegistry.GetInstance().RegisterMemberDef(target.prototype, v[0], v[1], v[2], v[3], v[4])
        })
    }
}

export function format(tag: Tag, tag1?: Tag, tag2?: Tag) {
    return function (target: Serializable, propertyKey: string) {
        TypeRegistry.GetInstance().RegisterMemberDef(target, propertyKey, tag, tag1, tag2)
    }
}

export function define(typename: string) {
    return function (target: { new(): Serializable }) {
        TypeRegistry.GetInstance().RegisterClassDef(target.prototype, typename)
    }
}
