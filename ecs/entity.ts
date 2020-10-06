"use strict";

import {IRuntime} from "./runtime";

import {log} from "../utils/logger";
import {EventEmitter} from "../utils/event_emitter";
import {util} from "../utils/util";
import {IComponent} from "./default_component";
import {Serializable} from "../protocol/protocol";
import * as ByteBuffer from "bytebuffer";
import {define, Tag, TypeRegistry} from "../protocol/types";
import {marshal} from "../protocol/encode";
import {unmarshal, unmarshalMessageHeader} from "../protocol/decode";

/**
 * 实体<Entity>是组件<Component>的容器,负责组件<Component>生命周期的管理
 * @param ea
 * @param id
 * @constructor
 *  客户端生成的<0   存放与实际逻辑无关的辅助游戏实体
 *  服务器生成的Entity ID>0   实际逻辑的实体
 *  Entity从服务器单向同步到客户端
 *  客户端的Entity用于本地逻辑处理,不同步到服务器
 */


@define("EntityData")
export class EntityData extends Serializable {
    public Id:string
    public SyncAll:boolean
    public Step:number
    public AddComps:ByteBuffer[] = []
    public ModComps:ByteBuffer[] = []
    public RemComps:number[] = []
}

@define("EntityRef",[
    ["Id",Tag.Long],
])
export class EntityRef extends Serializable{
    Id:string

    private runtime:IRuntime
}

export class Entity extends EventEmitter {
    get defineName(): string {
        return "Entity";
    }

    private readonly runtime: IRuntime
    private readonly id: string
    public Step: number = 0
    private _lastStep: number = 0
    private _dirty: boolean = true
    private _onDestroy: boolean = false
    private _components: Map<string, IComponent> = new Map<string, IComponent>()
    private _groupHashes: Array<string> = Array<string>()
    private _removeMarks: Array<string> = new Array<string>()
    private _addMarks: Array<string> = new Array<string>()
    private _modifyMarks: Array<string> = new Array<string>()
    private _lastSnapshot: EntityData
    private _snapshot: EntityData

    constructor(ea:IRuntime, id:string) {
        super()
        this.runtime = ea;                 //实体管理器<ECS>对象引用
        this.id = id;                  //实体<Entity>ID对象的标记
        this._lastSnapshot = null;      //上一步的快照
        this._snapshot = null;          //当前步的快照
    }
    IsDirty() {
        return this._dirty;
    }

    get Id() {
        return this.id
    }

    GetGroupHashes(): Array<string> {
        return this._groupHashes
    }

    GetRuntime() {
        return this.runtime;
    }

    Debug() {
        let ret = {}
        ret["id"] = this.Id;
        ret["dirty"] = this._dirty;
        ret["step"] = this.Step;
        ret["components"] = {}
        this._components.forEach(function (value, key, map) {
            let comp = value;
            let comName = comp.DefineName;
            let classDef = TypeRegistry.GetInstance().GetClassDef(comName)
            ret["components"][comName] = classDef.Members;
        })
        return ret;
    }

    AddGroup(hash:string) {
        let index = this._groupHashes.indexOf(hash);
        if (index === -1) {
            this._groupHashes.push(hash);
        }
    }

    RemoveGroup(hash) {
        let index = this._groupHashes.indexOf(hash);
        if (index !== -1) {
            this._groupHashes.splice(index, 1);
        }
    }


    Clean() {
        this._dirty = false;
        this._removeMarks = [];
        this._addMarks = [];
        this._modifyMarks = [];
    }

//脏标记实体,并记录更新当前步数
    MarkDirty() {
        if (this._dirty) {
            return;
        }
        this.runtime.MarkDirtyEntity(this);
        this._dirty = true;
        if (this.runtime.IsServer()) {
            this._lastStep = this.Step;
            this.Step = this.runtime.Tick;
        }
    }

    ModifyMark(comp: IComponent) {
        this.MarkDirty();
        if (comp.SyncAble) {
            return;
        }
        let name = comp.DefineName;
        if (this._modifyMarks.indexOf(name) === -1 && this._addMarks.indexOf(name) === -1) {
            this._modifyMarks.push(name);
        }
    }

    AddMark(comp: IComponent) {
        this.MarkDirty();
        if (comp.SyncAble) {
            return;
        }
        let name = comp.DefineName;
        if (this._addMarks.indexOf(name) === -1) {
            let modIndex = this._modifyMarks.indexOf(name);
            if (modIndex !== -1) {
                this._modifyMarks.splice(modIndex, 1);
            }
            this._addMarks.push(name);
        }
    }

    RemoveMark(comp: IComponent) {
        this.MarkDirty();
        if (comp.SyncAble) {
            return;
        }
        let name = comp.DefineName;
        if (this._removeMarks.indexOf(name) === -1) {
            this._removeMarks.push(name);
        }
    }


    SnapShot(connData?): EntityData {
        let ret = new EntityData()
        ret.Id = this.id
        ret.SyncAll = true
        ret.Step = this.Step
        let toSyncComponents = [];
        this._components.forEach((v)=>{
            toSyncComponents.push(v);
        })
        toSyncComponents.sort(this.runtime.SortDepends);
        for (let comp of toSyncComponents) {
            ret.AddComps.push(comp.MarshalTo())
        }
        this._lastSnapshot = this._snapshot;
        this._snapshot = ret;
        return ret;
    }
//获取当前步与上一步差异值
    SnapCurrent():EntityData {
        let ret = new EntityData();
        ret.Id = this.Id
        ret.SyncAll = false
        ret.Step = this.Step
        for (let i = 0; i < this._modifyMarks.length; i++) {
            let comp = this._components.get(this._modifyMarks[i]);
            ret.ModComps.push(marshal(comp))
        }
        for (let i = 0; i < this._addMarks.length; i++) {
            let comp = this._components.get(this._addMarks[i]);
            ret.AddComps.push(marshal(comp))
        }
        for (let i = 0; i < this._removeMarks.length; i++) {
            // let id = this._runtime.getComponentID(this._addMarks[i]);
            let id = this._modifyMarks[i];
            ret.RemComps.push(TypeRegistry.GetInstance().GetTagByName(id))
        }
        return ret;
    }

    UnmarshalCompFromBuffer(step:number, comp:IComponent, buff:ByteBuffer) {
        unmarshal(buff,comp)
        comp.MarkDirty()
    }

    FromEntityData(entData:EntityData) {
        if (this.Id != entData.Id) {
            log.panic("")
        }
        this.Step = entData.Step
        if (entData.SyncAll) {
            entData.AddComps.forEach((buff)=>{
                let header = unmarshalMessageHeader(buff)
                let compDefine = TypeRegistry.GetInstance().GetProtoByTag(header[0]).constructor
                let comp = this.Get(compDefine) || this.add(compDefine);
                unmarshal(buff,comp)
                comp.MarkDirty()
            })
        } else {
            entData.ModComps.forEach((buff)=>{
                let header = unmarshalMessageHeader(buff)
                let compDefine = TypeRegistry.GetInstance().GetProtoByTag(header[0]).constructor
                let comp = this.Get(compDefine) || this.add(compDefine);
                unmarshal(buff,comp)
                comp.MarkDirty()
            })
            entData.AddComps.forEach((buff)=>{
                let header = unmarshalMessageHeader(buff)
                let compDefine = TypeRegistry.GetInstance().GetProtoByTag(header[0]).constructor
                let comp = this.add(compDefine);
                unmarshal(buff,comp)
                comp.MarkDirty()
            })
            entData.RemComps.forEach((tag)=>{
                let compDefine = TypeRegistry.GetInstance().GetProtoByTag(tag)
                this.remove(compDefine)
            })
        }

    }

    FromBuffer(buff:ByteBuffer) {
        let entData = new EntityData()
        unmarshal(buff,entData)
        this.FromEntityData(entData)
    }

    SnapStep():EntityData {
        let ret = new EntityData()
        ret.Id = this.Id
        ret.SyncAll = false
        ret.Step = this.Step
        this._modifyMarks.forEach((name)=>{
            ret.AddComps.push(marshal(this._components[name]))
        })
        this._addMarks.forEach((name)=>{
            ret.AddComps.push(marshal(this._components[name]))
        })
        this._removeMarks.forEach((name)=>{
            ret.AddComps.push(marshal(this._components[name]))
        })
        return ret
    }


    /**
     * 获取一个组件<Component>
     * @param comp 可以是一个string或者Component实例
     * @returns {Component}
     */
    Get<T extends IComponent>(comp: { new(): T }): T {
        return <T>this._components.get(TypeRegistry.GetInstance().GetAnyName(comp))
    }

    getOneOf(comps: Array<{ new(): any }>): any {
        comps.forEach((comp) => {
            let t = this._components.get(TypeRegistry.GetInstance().GetAnyName(comp))
            if (t) {
                return t
            }
        })
        return null
    }

    forceAdd(comp, ...args) {
        let type = TypeRegistry.GetInstance().GetAnyName(comp);
        comp._entity = this;
        if (args.length > 0) {
            Object.getPrototypeOf(comp).constructor.apply(comp, args);
        }
        this._components.set(type,comp)
        this.AddMark(comp);
        this.runtime.AssignEntity(type, this);
        comp.dirty();
        this.runtime.MarkDirtyEntity(this);
        this.GetRuntime().emit('add component', comp, this, this.runtime);
        this.emit('add component', comp, this, this.runtime);
        return comp;

    }

    /**
     * 为Entity添加一个组件<Component>并初始化属性
     */
    add<T extends IComponent>(iComp: { new(): T }, ...args):T {
        let type = TypeRegistry.GetInstance().GetAnyName(iComp)
        if (this.runtime.Strict) {
            let depends = this.runtime.GetDepends(iComp);
            for (let dependComp of depends) {
                if (!this.Get(dependComp)) {
                    throw new Error('component type <' + type + ' > depends <' + dependComp + '> not found');
                }
            }
        }
        let comp = this.Get(iComp);

        let isApply = false;
        let isExist = false;
        if (comp) {
            isExist = true;
            log.error('已经存在Component:' + type);
        } else {
            if (args.length > 0) {
                args = [iComp].concat(args);
                isApply = true;
                comp = this.runtime.CreateComponent.apply(this.runtime, args);
            } else {

                comp = <T>this.runtime.CreateComponent(iComp);
            }

        }
        if (!comp) {
            throw new Error('Component参数错误,可能未注册');
        }
        if (comp.GetEntity() && comp.GetEntity() !== this) {
            log.error('组件已经绑定有实体', comp, comp.GetEntity);
        }
        comp.SetEntity(this);
        if (args.length > 0 && !isApply) {
            iComp.apply(comp, args)
        }
        if (!isExist) {
            comp.OnAdd(this, this.runtime);
            comp.MarkDirty();
        }
        this._components.set(comp.DefineName,comp)
        this.AddMark(comp);
        this.runtime.AssignEntity(comp.DefineName, this);
        this.runtime.MarkDirtyEntity(this);
        this.GetRuntime().emit('add component', comp, this, this.runtime);
        this.emit('add component', comp, this, this.runtime);
        return <T>comp;
    }

    isComponentDirty(compName) {
        return this._modifyMarks.indexOf(compName) !== -1 || this._addMarks.indexOf(compName) !== -1 || this._removeMarks.indexOf(compName) !== -1;
    }

    /**
     * 移除实体的一个组件
     */
    remove(_comp: ({ new(): IComponent })) {
        let comp = this.Get(_comp);
        if (comp) {
            if (this.runtime.Strict) {
                let depends = this.runtime.GetDependsBy(_comp);
                if (depends)
                    for (let dependComp of depends) {
                        if (!this.Get(dependComp)) {
                            throw new Error('component type <' + dependComp + ' > depends <' + comp + '> cannot remove now');
                        }
                    }
            }

            this.GetRuntime().emit('remove component', comp, this, this.runtime);
            this.emit('remove component', comp, this, this.runtime);
            if (comp.OnRemove) {
                comp.OnRemove(this, this.runtime);
            }
            comp.SetEntity(null);
            this.RemoveMark(comp);
            this.runtime.RecycleComponent(comp);
            this.runtime.AssignEntity(comp.DefineName, this);
            this._components.delete(comp.DefineName)
            return;
        }
        log.error('组件不存在');
    }

    /**
     * 标记一个实体<Entity>为删除状态
     */
    destroy() {
        this._onDestroy = true;
        this.runtime.RemoveEntity(this.Id);
    }

    destroyInstant() {
        this._onDestroy = true;
        this.runtime.RemoveEntityInstant(this.Id);
    }

    isOnDestroy() {
        return this._onDestroy
    }

    /**
     * 调用组件<Component>的销毁方法并销毁所有组件<Component>
     */
    onDestroy() {
        let keys = Object.keys(this._components);

        keys.sort(this.runtime.SortDependsInverse.bind(this.runtime));
        for (let i = keys.length - 1; i >= 0; i--) {
            let comp = this._components.get(keys[i]);
            comp.OnRemove(this, this.runtime);
            comp.SetEntity(null);
            this.runtime.RecycleComponent(comp);
        }
        this._groupHashes = [];
        this._components = new Map<string, IComponent>()
    }

    getComponentTypes() {
        let ret = [];
        this._components.forEach((comp)=>{
            ret.push(comp.getComponentName());

        })
        return ret;
    }

    /**
     *  Entity是否包含这些实体组件
     */
    includes(componentTypes) {
        return util.includes(this.getComponentTypes(), componentTypes);
    }

    marshalTo(): ByteBuffer {
        return null
    }

    unmarshalFrom(buff: ByteBuffer) {

    }
}


