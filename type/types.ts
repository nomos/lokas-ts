import {Singleton} from "../utils/singleton";
import {log} from "../utils/logger";

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
    Compound,
    Complex,
    Buffer,
    Null,
    //-------ECS Struct-------
    Entity=31,
    EntityArray,
    EntityMap,
    //-------System Struct-------
    ErrMsg = 41,
    ComposeData,
    //-------Physic Component-------
    Vector=51,
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
    public key:string
    public tag:number
    public tag1:number
    public tag2:number

    constructor(key,tag:number,tag1:number,tag2:number) {
        this.key = key
        this.tag = tag
        this.tag1 = tag1
        this.tag2 = tag2
    }

}

export class ClassDef {
    public name:string
    public ctor:{new():any}
    public membersMap:Map<string,MemberDef>
    public members:Array<MemberDef>
    constructor(name:string,ctor:{new():any}) {
        this.name = name
        this.ctor = ctor
    }
    registerMember(key:string,tag:number,tag1?:number,tag2?:number){
        if (this.members[key]) {
            throw new Error("duplicated member key:"+key)
        }
        this.membersMap[key] = new MemberDef(key,tag,tag1,tag2)
        this.members.push(this.membersMap[key])
    }
}

export class TypeRegistry extends Singleton{
    private classDefs:Map<string,ClassDef>
    private tagMap:Map<string,number>
    private typeMap:Map<number,string>
    static getInstance():TypeRegistry{
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
    registerMemberDef(c:any,name:string,type:Tag,type1?:Tag,type2?:Tag){
        let classDef = this.classDefs[name]
        if (classDef) {
            classDef.registerMember(name,type,type1,type2)
        } else {
            throw new Error("class def not exist:"+name+" "+type)
        }
    }
    registerClassDef(c:any,name:string){
        if (this.classDefs[name]) {
            throw new Error("class def already exist:"+name)
        }
        this.classDefs[name] = new ClassDef(name,c)
    }
    registerCustomTag(typeName:string,tagId:number){
        if (tagId<=127) {
            throw new Error("not a custom tag:"+tagId+" "+typeName)
        }
        this.registerTag(typeName,tagId)
    }
    registerSystemTag(typeName:string,tagId:number){
        if (tagId>127||tagId<=Tag.Null) {
            throw new Error("not a system tag:"+tagId+" "+typeName)
        }
        this.registerTag(typeName,tagId)
    }
    private registerTag(typeName:string,tagId:number){
        if (this.tagMap[typeName] != 0) {
            throw new Error("typeName already exist:"+typeName+" "+tagId)
        }
        if (this.typeMap[tagId] != 0) {
            throw new Error("tagId already exist:"+tagId+" "+typeName)
        }
        this.tagMap[typeName] = tagId
        this.typeMap[tagId] = typeName
    }
    getClassDef(name:string):ClassDef {
        return this.classDefs[name]
    }
    getClassDefByTag(tag:number):ClassDef {
        return this.classDefs[this.typeMap[tag]]
    }
}

export function format(typeName:Tag,nestingType?:Tag) {
    return function (target:any,propertyKey:string) {
        log.warn("format",typeName,"target",target,propertyKey)
        TypeRegistry.getInstance().registerMemberDef(target,propertyKey,typeName,nestingType)
    }
}

export function comp(compName:string) {
    return function (target:Function) {
        Object.getPrototypeOf(target).__defineName = compName
        TypeRegistry.getInstance().registerClassDef(target,compName)
    }
}
