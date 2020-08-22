"use strict";

import {Runtime} from "./runtime";

import {log} from "../utils/logger";
import {EventEmitter} from "../utils/event_emitter";
import {ECSUtil} from "./ecs_util";

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

export class Entity {
    private _runtime:Runtime
    constructor(ea, id){
        this._components = {}          //组件<Component>数组
        this._runtime = ea;                 //实体管理器<ECS>对象引用
        this._id = id;                  //实体<Entity>ID对象的标记
        this._step = 0;                 //当前步数
        this._dirty = true;            //脏标记
        this._tags = [];                //标签
        this._owner = 0;
        this._lastStep = 0;             //上一次的步数
        this._lastSnapshot = null;      //上一步的快照
        this._snapshot = null;          //当前步的快照
        this._onDestroy = false;        //移除标记
        this._removeMarks = [];
        this._addMarks = [];
        this._modifyMarks = [];
        this._groupHashes = [];
        this.__unserializeEntityCount = 0;
        this._eventListener = new EventEmitter();
    }
    getECS() {
        return this._runtime;
    }
    debug() {
        let ret = {}
        ret.id = this.id;
        ret.dirty = this._dirty;
        ret.step = this._step;
        ret.components = {}
        for (let i in this._components) {
            let comp = this._components[i];
            let compObj = {}
            let comName = ECSUtil.getComponentType(comp);
            //TODO:这里要更新
            let nbtFormat = comp.defineData?comp.defineData:comp.nbtFormat;
            if (!nbtFormat) {
                return;
            }
            for (let j in nbtFormat) {
                let type = nbtFormat[j];
                if (type!=='Entity'||type!=='EntityMap'||type!=='EntityArray') {
                    compObj[j] = comp[j];
                }
                if (type!=='Entity'&&comp[j]) {
                    compObj[j] =comp[j].id;
                }
                if (type!=='EntityMap'&&comp[j]) {
                    compObj[j] ={}
                    for (let k in comp[j]) {
                        compObj[j][k] = comp[j][k]?comp[j][k].id:'null';
                    }
                }
                if (type!=='Entity'&&comp[j]) {
                    compObj[j] =[];
                    for (let k in comp[j]) {
                        compObj[j].push(comp[j][k]?comp[j][k].id:'null');
                    }
                }
            }
            ret.components[comName] = compObj;
        }
        return ret;
    }

    addGroup(hash) {
        let index = this._groupHashes.indexOf(hash);
        if (index===-1) {
            this._groupHashes.push(hash);
        }
    }
    removeGroup(hash) {
        let index = this._groupHashes.indexOf(hash);
        if (index!==-1) {
            this._groupHashes.splice(index,1);
        }
    }



    clean() {
        this._dirty = false;
        this._removeMarks = [];
        this._addMarks = [];
        this._modifyMarks = [];
    }

//脏标记实体,并记录更新当前步数
    dirty() {
        if (this._dirty) {
            return;
        }
        this._runtime.markDirtyEntity(this);
        this._dirty = true;
        if (this._runtime._server) {
            this._lastStep = this._step;
            this._step = this._runtime._tick;
        }
    }

    markDirty(comp) {
        this.dirty();
        if (comp.nosync) {
            return;
        }
        let name = ECSUtil.getComponentType(comp);
        if (this._modifyMarks.indexOf(name)===-1&&this._addMarks.indexOf(name)===-1) {
            this._modifyMarks.push(name);
        }
    }

    addMark(comp) {
        this.dirty();
        if (comp.nosync) {
            return;
        }
        let name = ECSUtil.getComponentType(comp);
        if (this._addMarks.indexOf(name)===-1) {
            let modIndex = this._modifyMarks.indexOf(name);
            if (modIndex!==-1) {
                this._modifyMarks.splice(modIndex,1);
            }
            this._addMarks.push(name);
        }
    }

    removeMark(comp) {
        this.dirty();
        if (comp.nosync) {
            return;
        }
        let name = ECSUtil.getComponentType(comp);
        if (this._removeMarks.indexOf(name)===-1) {
            this._removeMarks.push(name);
        }
    }

//获取当前步与上一步差异值
    snapCurrent() {
        let ret = nbt.Complex();
        ret.addValue(nbt.Long(this._id));
        ret.addValue(nbt.Long(this._step));
        let modComps = nbt.List();
        let addComps = nbt.List();
        let remComps = nbt.List();
        for (let i=0;i<this._modifyMarks.length;i++) {
            let comp = this._components[this._modifyMarks[i]];
            modComps.push(this.comp2NBT(comp));
        }
        for (let i=0;i<this._addMarks.length;i++) {
            let comp = this._components[this._addMarks[i]];
            addComps.push(this.comp2NBT(comp));
        }
        for (let i=0;i<this._removeMarks.length;i++) {
            // let id = this._runtime.getComponentID(this._addMarks[i]);
            let id = this._modifyMarks[i];
            remComps.push(nbt.String(id));
        }
        ret.addValue(modComps);
        ret.addValue(addComps);
        ret.addValue(remComps);
        return ret;
    }
//获取上一步与当前步差值
    snapPrevious() {
        if (!this._lastSnapshot) {
            return;
        }
        let ret = nbt.Complex();
        ret.addValue(this._lastSnapshot.at(0));
        ret.addValue(this._lastSnapshot.at(1));
        let modComps = nbt.List();
        let addComps = nbt.List();
        let remComps = nbt.List();
        let compList = this._lastSnapshot.at(2);
        for (let i=0;i<this._modifyMarks.length;i++) {
            // let id = this._runtime.getComponentID(this._modifyMarks[i]);
            let id = this._modifyMarks[i];
            for (let j=0;j<compList.getSize();j++) {
                if (id === compList.at(j).at(0).value) {
                    modComps.push(compList.at(j));
                    break;
                }
            }
        }
        for (let i=0;i<this._addMarks.length;i++) {
            let id = this._removeMarks[i];
            // let id = this._runtime.getComponentID(this._removeMarks[i]);
            for (let j=0;j<compList.getSize();j++) {
                if (id === compList.at(j).at(0).value) {
                    addComps.push(compList.at(j));
                    break;
                }
            }
        }
        for (let i=0;i<this._removeMarks.length;i++) {
            let id = this._addMarks[i];
            // let id = this._runtime.getComponentID(this._addMarks[i]);
            remComps.push(nbt.String(id));
        }
        ret.addValue(modComps);
        ret.addValue(addComps);
        ret.addValue(remComps);
        return ret;
    }


    comp2NBT(comp,connData) {
        if (comp.nosync) {
            return;
        }
        if (comp.onSync&&connData) {
            comp = comp.onSync(this,this._runtime,connData);
        }
        let compComplex = nbt.Complex();
        // compComplex.addValue(nbt.Int(this._runtime.getComponentID(comp)));
        let ecs = this._runtime;
        compComplex.addValue(ecs.getComponentDefineToNbt(comp));
        if (Object.keys(comp).length === 0) {
            compComplex.addValue(nbt.Complex());
            return compComplex;
        }
        if (comp.toNBT) {
            compComplex.addValue(comp.toNBT());
            return compComplex;
        }

        let nbtFormat = comp.defineData?comp.defineData:comp.nbtFormat;
        if (!nbtFormat) {
            throw new Error(comp.getComponentName?comp.getComponentName():comp.__proto__.__classname+' dont have nbtFormat');
        }
        if (Object.keys(nbtFormat).length === 0) {
            compComplex.addValue(nbt.Complex());
            return compComplex;
        }
        let dataComplex = nbt.Complex();
        for (let i in nbtFormat) {
            if (!nbtFormat.hasOwnProperty(i)) {
                return;
            }
            let type = nbtFormat[i];
            if (type === 'EntityArray') {
                let arr = comp[i];
                let entArr = [];
                for (let j = 0; j < arr.length; j++) {
                    let id = arr[j]?arr[j].id:0;
                    entArr.push(id);
                }
                dataComplex.addValue(nbt.LongArray(entArr));
            } else if (type === 'EntityMap') {
                let obj = comp[i];
                let nbtObj = new nbt.Compound();
                for (let j in obj) {
                    if (!obj.hasOwnProperty(j)) {
                        continue;
                    }
                    let id = obj[j]?obj[j].id:0;
                    nbtObj.addValue(j, nbt.Long(id));
                }
                dataComplex.addValue(nbtObj);
            } else if (type==='Entity') {
                let eid = comp[i]?comp[i].id:0;
                dataComplex.addValue(nbt.Long(eid))
            } else if (type==='JSObject'||type==='Object') {
                dataComplex.addValue(nbt.createFromJSObject(comp[i]))
            } else {
                dataComplex.addValue(nbt[type](comp[i]));
            }
        }
        compComplex.addValue(dataComplex);
        if (comp.onSyncFinish) {
            comp.onSyncFinish(this,this._runtime,connData);
        }
        return compComplex;
    }

    compFormatFromNBT(step,comp, nbt) {
        let self = this;
        if (nbt.length === 0) {
            return;
        }
        if (comp.fromNBT) {
            comp.fromNBT(nbt);
            comp.dirty();
            return;
        }
        let nbtFormat = comp.defineData?comp.defineData:comp.nbtFormat;
        if (!nbtFormat) {
            throw new Error('comp dont have nbtFormat');
        }
        let count = 0;
        for (let i in nbtFormat) {
            if (!nbtFormat.hasOwnProperty(i)) {
                continue;
            }
            let type = nbtFormat[i];
            if (type === 'EntityArray') {
                let entarr = nbt.at(count);
                comp[i] = [];
                for (let j = 0; j < entarr.getSize(); j++) {
                    let id = entarr.at(j).toNumber();
                    let ent = this._runtime.getEntity(id);
                    if (id === 0) {
                        comp[i].push(null);
                    } else if (ent) {
                        comp[i].push(ent);
                    } else {
                        comp[i].push(new Entity(null,id));
                        self.__unserializeEntityCount++;
                        this._runtime.once('__unserializeEntity'+step+id,function (idx,ent) {
                            self.__unserializeEntityCount--;
                            if (idx === id) {
                                comp[i][j] = ent;
                            }
                            if (self.__unserializeEntityCount===0) {
                                comp.dirty();
                            }
                        });
                    }
                }

            } else if (type === 'EntityMap') {
                let entmap = nbt.at(count);
                comp[i] = {}
                let names = entmap.getNames();
                for (let j = 0; j < names.length; j++) {
                    let id = entmap.fetchValue(names[j]).value.toNumber();
                    let ent = this._runtime.getEntity(id);
                    if (id === 0) {
                        comp[i][names[j]] = null;
                    }else if (ent) {
                        comp[i][names[j]] = ent;
                    } else {
                        self.__unserializeEntityCount++;
                        this._runtime.once('__unserializeEntity'+step+id,function (idx,ent) {
                            self.__unserializeEntityCount--;
                            if (idx === id) {
                                comp[i][names[j]] = ent;
                            }
                            if (self.__unserializeEntityCount===0) {
                                comp.dirty();
                            }
                        });
                    }
                }
            } else if (type === 'Entity') {
                let eid = nbt.at(count).value.toNumber();
                if (eid === 0) {
                    comp[i] = null;
                } else {
                    let ent = this._runtime.getEntity(eid);
                    if (ent) {
                        comp[i] = ent;
                    } else {

                        self.__unserializeEntityCount++;
                        this._runtime.once('__unserializeEntity'+step+eid,function (idx,ent) {
                            self.__unserializeEntityCount--;
                            if (idx === eid) {
                                comp[i] = ent;
                            }
                            if (self.__unserializeEntityCount===0) {
                                comp.dirty();
                            }
                        });
                    }
                }

            } else if (type === 'JSObject'||'Object') {
                comp[i] = nbt.at(count).toJSObject();
            } else {
                comp[i] = nbt.at(count).value;
            }
            count++;
        }
        comp.dirty();
    }

    nbt2Command(nbt) {
        let count = 0;
        let nbtFormat = nbt.defineData?nbt.defineData:nbt.nbtFormat;
        for (let i in nbtFormat) {
            if (!nbtFormat.hasOwnProperty(i)) {
                continue;
            }

        }
    }

    command2Nbt(command) {

    }

    fromNBT(step,nbt) {
        if (nbt.getSize()===3) {
            this._step = nbt.at(1).value.toNumber();
            let comps = nbt.at(2);
            let syncCompArr = [];
            for (let i=0;i<comps.getSize();i++) {
                let compNbt = comps.at(i);
                let compName = this._runtime.getComponentNameFromDefine(compNbt.at(0).value);
                syncCompArr.push(compName);
                let comp = this.get(compName)||this.add(compName);
                this.compFormatFromNBT(step,comp,compNbt.at(1));
                comp.dirty();
            }
            for (let i in this._components) {
                if (syncCompArr.indexOf(i)===-1) {
                    let comp = this._components[i];
                    if (this._runtime.getComponentDefine(comp)!==undefined) {
                        this.remove(comp);
                    }
                }
            }
        }
        if (nbt.getSize()===5) {
            this._step = nbt.at(1).value.toNumber();
            let modComps = nbt.at(2);
            for (let i=0;i<modComps.getSize();i++) {
                let compNbt = modComps.at(i);
                let compName = this._runtime.getComponentNameFromDefine(compNbt.at(0).value);
                let comp = this.get(compName)||this.add(compName);
                let compParams = compNbt.at(1);
                this.compFormatFromNBT(step,comp,compParams);
                comp.dirty();
            }
            let addComps = nbt.at(3);
            for (let i=0;i<addComps.getSize();i++) {
                let compNbt = addComps.at(i);
                let compName = this._runtime.getComponentNameFromDefine(compNbt.at(0).value);
                let comp = this.add(compName);
                let compParams = compNbt.at(1);
                this.compFormatFromNBT(step,comp,compParams);
                comp.dirty();
            }
            let removeComps = nbt.at(4);
            for (let i=0;i<removeComps.getSize();i++) {
                let compName = this._runtime.getComponentNameFromDefine(removeComps.at(i).value);
                this.remove(compName);
            }
        }
    }

    snapshot(connData) {
        let ret = nbt.Complex();
        ret.addValue(nbt.Long(this._id));
        ret.addValue(nbt.Long(this._step));
        let components = nbt.List();
        let toSyncComponents = [];
        for (let i in this._components) {
            if (!this._components.hasOwnProperty(i)) {
                continue;
            }
            let comp = this._components[i];
            if (comp.nosync) {
                continue;
            }
            toSyncComponents.push(comp);
        }
        components.sort(this.getECS._sortDepends);
        for (let comp of toSyncComponents) {
            components.push(this.comp2NBT(comp,connData));
        }
        ret.addValue(components);
        this._lastSnapshot = this._snapshot;
        this._snapshot = ret;
        return ret;
    }

    isDirty() {
        return this._dirty;
    }

    get id(){
        return this._id
    }

    get engine(){
        return this._runtime
    }

    /**
     * 获取一个组件<Component>
     * @param comp 可以是一个string或者Component实例
     * @returns {Component}
     */
    get(comp) {

        if (ECSUtil.isArray(comp)) {
            for (let comp_1 of comp) {
                let name = ECSUtil.getComponentType(comp_1);
                let ret = this._components[name];
                if (ret) {
                    return ret;
                }
            }
            log.error('Entity:get:cant find comp',comp);
            return null;
        }
        let name = ECSUtil.getComponentType(comp);
        if (!name) {
            throw new Error('Component参数错误,可能未注册');

        }

        return this._components[name];
    }
    forceAdd(comp) {
        let args = [].slice.call(arguments);
        args.splice(0, 1);
        let type = ECSUtil.getComponentType(comp);
        comp._entity = this;
        if (args.length > 0) {
            comp.__proto__.constructor.apply(comp, args);
        }
        this._components[type] = comp;
        this.addMark(comp);
        this._runtime.assignEntity(type, this);
        comp.dirty();
        this._runtime.markDirtyEntity(this);
        this.getECS().emit('add component',comp,this,this._runtime);
        this.emit('add component',comp,this,this._runtime);
        return comp;

    }
    /**
     * 为Entity添加一个组件<Component>并初始化属性
     * @param comp 可以是一个string或者组件<Component>实例
     * @returns {Component}
     */
    add(comp) {
        let args = [].slice.call(arguments);
        comp = args[0];
        args.splice(0, 1);
        let type = ECSUtil.getComponentType(comp);
        if (!type) {
            log.error('Component参数错误,可能未注册', comp);
            return null;
        }
        if (this._runtime._needCheckDepends) {
            let depends = this._runtime.getDepends(type);
            for (let dependComp of depends) {
                if (!this.get(dependComp)) {
                    throw new Error('component type <'+type+' > depends <'+dependComp+'> not found');
                }
            }
        }
        comp = this.get(comp);

        let isApply = false;
        let isExist = false;
        if (comp) {
            isExist = true;
            log.error('已经存在Component:' + type);
        } else {
            if (args.length > 0) {
                args = [type].concat(args);
                isApply = true;
                comp = Reflect.apply(this._runtime.createComponent,this._runtime, args);
            } else {

                comp = this._runtime.createComponent(type);
            }

        }
        if (!comp) {
            throw new Error('Component参数错误,可能未注册');
        }
        if (comp._entity&&comp._entity!==this) {
            log.error('组件已经绑定有实体',comp,comp._entity);
        }
        comp._entity = this;
        if (args.length > 0 && !isApply) {
            comp.__proto__.constructor.apply(comp, args);
        }
        if (!isExist) {
            if (comp.isRenderer()) {
                if (comp.onAdd) {
                    this._runtime.lateAdd(comp);
                }
            } else {
                if (comp.onAdd) {
                    if (ECSUtil.getComponentType(comp)=='ControlButton') {
                        log.debug('添加ControlButton组件');
                    }
                    comp.onAdd(this, this._runtime);
                }
            }
            comp.dirty();
        }
        this._components[type] = comp;
        this.addMark(comp);
        this._runtime.assignEntity(type, this);
        this._runtime.markDirtyEntity(this);
        let renderer = comp.getRenderer();
        if (renderer) {
            this.add(renderer);
        }
        this.getECS().emit('add component',comp,this,this._runtime);
        this.emit('add component',comp,this,this._runtime);
        return comp;
    }


    once=function (evt, cb) {
        return this._eventListener.once(evt, cb)
    }

    on=function (evt, cb) {
        return this._eventListener.on(evt, cb)
    }

    off=function (evt, cb) {
        if (cb) {
            return this._eventListener.off(evt,cb);
        }
        return this._eventListener.removeAllListeners(evt);
    }

    emit=function (evt) {
        return this._eventListener.emit.apply(this._eventListener, arguments);
    }

    isComponentDirty(compName) {
        return this._modifyMarks.indexOf(compName)!==-1||this._addMarks.indexOf(compName)!==-1||this._removeMarks.indexOf(compName)!==-1;
    }
    /**
     * 移除实体的一个组件
     */
    remove(comp) {
        let type = ECSUtil.getComponentType(comp);
        if (!type) {
            log.error('Component参数错误');
            return;
        }
        comp = this.get(comp);
        if (comp) {

            if (this._runtime._needCheckDepends) {
                let depends = this._runtime.getDependsBy(type);
                if (depends)
                    for (let dependComp of depends) {
                        if (!this.get(dependComp)) {
                            throw new Error('component type <'+dependComp+' > depends <'+type+'> cannot remove now');
                        }
                    }
            }

            let renderer = comp.getRenderer();
            if (renderer) {
                this.remove(renderer);
            }
            this.getECS().emit('remove component',comp,this,this._runtime);
            this.emit('remove component',comp,this,this._runtime);
            if (comp.onRemove) {
                comp.onRemove(this, this._runtime);
            }
            comp._entity = null;
            this.removeMark(comp);
            this._runtime.recycleComponent(comp);
            this._runtime.reassignEntity(type, this);
            delete this._components[type];
            return;
        }
        log.error('组件不存在');
    }
    /**
     * 标记一个实体<Entity>为删除状态
     */
    destroy() {
        this._onDestroy = true;
        this._runtime.removeEntity(this);
    }
    destroyInstant() {
        this._onDestroy = true;
        this._runtime.removeEntityInstant(this);
    }
    /**
     * 调用组件<Component>的销毁方法并销毁所有组件<Component>
     */
    onDestroy() {
        let keys = Object.keys(this._components);

        keys.sort(this._runtime._sortDependsInverse.bind(this._runtime));
        for (let i = keys.length - 1; i >= 0; i--) {
            let comp = this._components[keys[i]];
            if (comp.onRemove) {
                comp.onRemove(this, this._runtime);
            }
            comp._entity = null;
            this._runtime.recycleComponent(comp);
        }
        this._groupHashes = [];
        this._components = {}
    }

    getComponentTypes() {
        let ret = [];
        for (let i in this._components) {
            let comp = this._components[i];
            ret.push(comp.getComponentName?comp.getComponentName():comp.__proto__.__classname);
        }
        return ret;
    }
    /**
     *  Entity是否包含这些实体组件
     */
    includes(componentTypes) {
        return ECSUtil.includes(this.getComponentTypes(), componentTypes);
    }

}



