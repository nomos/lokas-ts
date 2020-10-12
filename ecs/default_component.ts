import {Entity} from "./entity";
import {IRuntime, Runtime} from "./runtime";
import {TypeRegistry} from "../protocol/types";
import {ISerializable} from "../protocol/protocol";
import ByteBuffer from "bytebuffer";


export class IComponent extends ISerializable{
    protected dirty: boolean = true
    protected entity: Entity = null
    protected runtime: IRuntime = null

    get SyncAble():boolean{
        return TypeRegistry.GetInstance().IsValid(this)
    }

    constructor() {
        super()
    }

    Reset(){
        this.dirty = true
    }

    SetRuntime(runtime:IRuntime){
        this.runtime = runtime
    }

    GetRuntime():IRuntime {
        return this.runtime;
    }

    getComponentName():string {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    getSibling<T extends IComponent>(comp:{ DefineDepends:IComponentCtor[];OnRegister(runtime:Runtime);DefineName:string;new():T }):T {
        if (this.entity) {
            return this.entity.Get(comp);
        }
    }

    SetEntity(ent:Entity) {
        this.entity = ent;
    }

    IsClient():boolean {
        return !this.runtime.IsServer();
    }

    GetEntity():Entity {
        return this.entity;
    }

    MarkDirty() {
        this.dirty = true;
        this.OnDirty && this.OnDirty(this.entity, this.entity.GetRuntime());
        if (this.entity) {
            this.entity.ModifyMark(this);
        }
        this.runtime.MarkDirtyEntity(this.entity)
    }

    IsDirty() {
        return this.dirty;
    }

    Clean() {
        this.dirty = false;
    }

    OnAdd(ent:Entity, runtime:IRuntime) {

    }

    OnRemove(ent:Entity, runtime:IRuntime) {

    }

    OnCreate(runtime:IRuntime) {

    }

    OnDestroy(runtime:IRuntime) {

    }

    OnDirty(ent:Entity, runtime:IRuntime) {

    }

    OnRegister(runtime:IRuntime) {

    }

    UnmarshalFrom(buff:ByteBuffer) {

    }

    MarshalTo():ByteBuffer {
        return null
    }

    static OnRegister(runtime:Runtime){

    }

    static get DefineDepends(): IComponentCtor[] {
        return Object.getPrototypeOf(this).constructor.defineDepends;
    }

    get DefineDepends(): IComponentCtor[] {
        return TypeRegistry.GetInstance().GetClassDef(this.DefineName).Depends;
    }
}

export type IComponentCtor = {DefineDepends:IComponentCtor[];OnRegister(runtime:Runtime);DefineName:string;new():IComponent}