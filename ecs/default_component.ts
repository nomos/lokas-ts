import {Entity} from "./entity";
import {IRuntime} from "./runtime";
import {TypeRegistry} from "../protocol/types";
import {Serializable} from "../protocol/protocol";
import {Buffer} from "../thirdparty/buffer";

export class IComponent extends Serializable{
    protected dirty: boolean = true
    protected entity: Entity = null
    protected runtime: IRuntime = null



    get SyncAble():boolean{
        return TypeRegistry.GetInstance().IsValid(this)
    }

    get defineDepends(): Array<string> {
        return Object.getPrototypeOf(this).constructor.defineDepends;
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

    getSibling<T extends IComponent>(comp:{new():T}):T {
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

    UnmarshalFrom(buff:Buffer) {

    }

    MarshalTo():Buffer {
        return null
    }
}