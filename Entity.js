"use strict";

const logger = require('../logger/Logger')||console;
const ECSUtil = require('./ECSUtil');
const nbt = require('./binary/nbt');
const EventEmitter = require('./event-emmiter');

/**
 * 实体<Entity>是组件<Component>的容器,负责组件<Component>生命周期的管理
 * @param ea
 * @param id
 * @param sync
 * @constructor
 *  客户端生成的<0   存放与实际逻辑无关的辅助游戏实体
 *  服务器生成的Entity ID>0   实际逻辑的实体
 *  Entity从服务器单向同步到客户端
 *  客户端的Entity用于本地逻辑处理,不同步到服务器
 */

let Entity = function (ea, id, sync) {
    this._components = {};          //组件<Component>数组
    this._ecs = ea;                 //实体管理器<ECS>对象引用
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
    this.__unserializeEntityCount = 0;
    this._eventListener = new EventEmitter();
};

Entity.prototype.getECS = function () {
    return this._ecs;
};

Entity.prototype.debug = function () {
    let ret = {};
    ret.id = this.id;
    ret.dirty = this._dirty;
    ret.step = this._step;
    ret.components = {};
    for (let i in this._components) {
        let comp = this._components[i];
        let compObj = {};
        let comName = ECSUtil.getComponentType(comp);
        //TODO:这里要更新
        let nbtFormat = comp.defineData?comp.defineData():comp.nbtFormat;
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
                compObj[j] ={};
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
};

Entity.prototype.addTag = function (tag) {
    if (this._tags.indexOf(tag)===-1) {
        this._tags.push(tag);
        return true;
    }
    return false;
};

Entity.prototype.hasTag = function (tag) {
    return this._tags.indexOf(tag)!==-1;
};

Entity.prototype.removeTag = function (tag) {
    let index = this._tags.indexOf(tag);
    if (index!==-1) {
        this._tags.splice(index,1);
        return true;
    }
    return false;
};

Entity.prototype.getAllTags = function () {
    return this._tags;
};

Entity.prototype.clean = function () {
    this._dirty = false;
    this._removeMarks = [];
    this._addMarks = [];
    this._modifyMarks = [];
};

//脏标记实体,并记录更新当前步数
Entity.prototype.dirty = function () {
    if (this._dirty) {
        return;
    }
    if (this._ecs._dirtyEntities.indexOf(this)===-1&&this._ecs._newEntities.indexOf(this)===-1) {
        this._ecs._dirtyEntities.push(this);
    }
    this._ecs._dirty = true;
    this._dirty = true;
    if (this._ecs._server) {
        this._lastStep = this._step;
        this._step = this._ecs._tick;
    }
    // if (this._ecs.isClient()) {
    //     for (let i in this._components) {
    //         let comp = this._components[i];
    //         comp.dirty();
    //     }
    // }
};

Entity.prototype.markDirty = function (comp) {
    this.dirty();
    if (comp.nosync) {
        return;
    }
    let name = ECSUtil.getComponentType(comp);
    if (this._modifyMarks.indexOf(name)===-1&&this._addMarks.indexOf(name)===-1) {
        this._modifyMarks.push(name);
    }
};

Entity.prototype.addMark = function (comp) {
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
};

Entity.prototype.removeMark = function (comp) {
    this.dirty();
    if (comp.nosync) {
        return;
    }
    let name = ECSUtil.getComponentType(comp);
    if (this._removeMarks.indexOf(name)===-1) {
        this._removeMarks.push(name);
    }
};

//获取当前步与上一步差异值
Entity.prototype.snapCurrent = function () {
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
        // let id = this._ecs.getComponentID(this._addMarks[i]);
        let id = this._modifyMarks[i];
        remComps.push(nbt.String(id));
    }
    ret.addValue(modComps);
    ret.addValue(addComps);
    ret.addValue(remComps);
    return ret;
};
//获取上一步与当前步差值
Entity.prototype.snapPrevious = function () {
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
        // let id = this._ecs.getComponentID(this._modifyMarks[i]);
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
        // let id = this._ecs.getComponentID(this._removeMarks[i]);
        for (let j=0;j<compList.getSize();j++) {
            if (id === compList.at(j).at(0).value) {
                addComps.push(compList.at(j));
                break;
            }
        }
    }
    for (let i=0;i<this._removeMarks.length;i++) {
        let id = this._addMarks[i];
        // let id = this._ecs.getComponentID(this._addMarks[i]);
        remComps.push(nbt.String(id));
    }
    ret.addValue(modComps);
    ret.addValue(addComps);
    ret.addValue(remComps);
    return ret;
};


Entity.prototype.comp2NBT = function (comp,connData) {
    if (comp.nosync) {
        return;
    }
    if (comp.onSync&&connData) {
        comp = comp.onSync(this,this._ecs,connData);
    }
    let compComplex = nbt.Complex();
    // compComplex.addValue(nbt.Int(this._ecs.getComponentID(comp)));
    let ecs = this._ecs;
    compComplex.addValue(ecs.getComponentDefineToNbt(comp));
    if (Object.keys(comp).length === 0) {
        compComplex.addValue(nbt.Complex());
        return compComplex;
    }
    if (comp.toNBT) {
        compComplex.addValue(comp.toNBT());
        return compComplex;
    }

    let nbtFormat = comp.defineData?comp.defineData():comp.nbtFormat;
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
                let id = arr[j].id;
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
                let id = obj[j].id;
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
        comp.onSyncFinish(this,this._ecs,connData);
    }
    return compComplex;
};

Entity.prototype.compFormatFromNBT = function (step,comp, nbt) {
    let self = this;
    if (nbt.length === 0) {
        return;
    }
    if (comp.fromNBT) {
        comp.fromNBT(nbt);
        comp.dirty();
        return;
    }
    let nbtFormat = comp.defineData?comp.defineData():comp.nbtFormat;
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
                let ent = this._ecs.getEntity(id);
                if (ent) {
                    comp[i].push(ent);
                } else {
                    comp[i].push(new Entity(null,id));
                    self.__unserializeEntityCount++;
                    this._ecs.once('__unserializeEntity'+step+id,function (idx,ent) {
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
            comp[i] = {};
            let names = entmap.getNames();
            for (let j = 0; j < names.length; j++) {
                let id = entmap.fetchValue(names[j]).value.toNumber();
                let ent = this._ecs.getEntity(id);
                if (ent) {
                    comp[i][names[j]] = ent;
                } else {
                    self.__unserializeEntityCount++;
                    this._ecs.once('__unserializeEntity'+step+id,function (idx,ent) {
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
                let ent = this._ecs.getEntity(eid);
                if (ent) {
                    comp[i] = ent;
                } else {

                    self.__unserializeEntityCount++;
                    this._ecs.once('__unserializeEntity'+step+eid,function (idx,ent) {
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
};

Entity.prototype.nbt2Command = function (nbt) {
    let count = 0;
    let nbtFormat = nbt.defineData?nbt.defineData():nbt.nbtFormat;
    for (let i in nbtFormat) {
        if (!nbtFormat.hasOwnProperty(i)) {
            continue;
        }

    }
};

Entity.prototype.command2Nbt = function (command) {

};

Entity.prototype.fromNBT = function (step,nbt) {
    if (nbt.getSize()===3) {
        this._step = nbt.at(1).value.toNumber();
        let comps = nbt.at(2);
        let syncCompArr = [];
        for (let i=0;i<comps.getSize();i++) {
            let compNbt = comps.at(i);
            let compName = this._ecs.getComponentNameFromDefine(compNbt.at(0).value);
            syncCompArr.push(compName);
            let comp = this.get(compName)||this.add(compName);
            this.compFormatFromNBT(step,comp,compNbt.at(1));
            comp.dirty();
        }
        for (let i in this._components) {
            if (syncCompArr.indexOf(i)===-1) {
                let comp = this._components[i];
                if (this._ecs.getComponentDefine(comp)!==undefined) {
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
            let compName = this._ecs.getComponentNameFromDefine(compNbt.at(0).value);
            let comp = this.get(compName)||this.add(compName);
            let compParams = compNbt.at(1);
            this.compFormatFromNBT(step,comp,compParams);
            comp.dirty();
        }
        let addComps = nbt.at(3);
        for (let i=0;i<addComps.getSize();i++) {
            let compNbt = addComps.at(i);
            let compName = this._ecs.getComponentNameFromDefine(compNbt.at(0).value);
            let comp = this.add(compName);
            let compParams = compNbt.at(1);
            this.compFormatFromNBT(step,comp,compParams);
            comp.dirty();
        }
        let removeComps = nbt.at(4);
        for (let i=0;i<removeComps.getSize();i++) {
            let compName = this._ecs.getComponentNameFromDefine(removeComps.at(i).value);
            this.remove(compName);
        }
    }
};

Entity.prototype.snapshot = function (connData) {
    let ret = nbt.Complex();
    ret.addValue(nbt.Long(this._id));
    ret.addValue(nbt.Long(this._step));
    let components = nbt.List();
    for (let i in this._components) {
        if (!this._components.hasOwnProperty(i)) {
            continue;
        }
        let comp = this._components[i];
        if (comp.nosync) {
            continue;
        }
        components.push(this.comp2NBT(comp,connData));
    }
    ret.addValue(components);
    this._lastSnapshot = this._snapshot;
    this._snapshot = ret;
    // this.processSyncOption(ret);

    return ret;
};

Entity.prototype.isDirty = function () {
    return this._dirty;
};

Object.defineProperty(Entity.prototype, 'id', {
    get: function () {
        return this._id;
    }
});

Object.defineProperty(Entity.prototype, 'entityAdmin', {
    get: function () {
        return this._ecs;
    }
});

/**
 * 获取一个组件<Component>
 * @param comp 可以是一个string或者Component实例
 * @returns {Component}
 */
Entity.prototype.get = function (comp) {

    let name = ECSUtil.getComponentType(comp);
    if (!name) {
        throw new Error('Component参数错误,可能未注册');

    }

    return this._components[name];
};
/**
 * 为Entity添加一个组件<Component>并初始化属性
 * @param comp 可以是一个string或者组件<Component>实例
 * @returns {Component}
 */
Entity.prototype.add = function (comp) {
    let args = [].slice.call(arguments);
    comp = args[0];
    args.splice(0, 1);
    let type = ECSUtil.getComponentType(comp);
    if (!type) {
        logger.error('Component参数错误,可能未注册', comp);
        return null;
    }
    comp = this.get(comp);
    let isApply = false;
    let isExist = false;
    if (comp) {
        isExist = true;
        logger.error('已经存在Component:' + type);
    } else {
        if (args.length > 0) {
            args = [type].concat(args);
            isApply = true;
            comp = this._ecs.createComponent.apply(this._ecs, args);
        } else {

            comp = this._ecs.createComponent(type);
        }

    }
    if (comp._entity&&comp._entity!==this) {
        logger.error('组件已经绑定有实体',comp,comp._entity);
        // throw new Error();
    }
    comp._entity = this;
    if (args.length > 0 && !isApply) {
        comp.__proto__.constructor.apply(comp, args);
    }
    if (!isExist) {
        if (comp.isRenderer()) {
            if (comp['onAdd']) {
                this._ecs.lateAdd(comp);
            }
        } else {
            if (comp['onAdd']) {
                if (ECSUtil.getComponentType(comp)=='ControlButton') {
                    logger.debug('添加ControlButton组件');
                }
                comp.onAdd(this, this._ecs);
            }
        }
        comp.dirty();
    }
    this._components[type] = comp;
    this.addMark(comp);
    this._ecs.assignEntity(type, this);
    let renderer = comp.getRenderer();
    if (renderer) {
        this.add(renderer);
    }
    this.getECS().emit('add component',comp,this,this._ecs);
    this.emit('add component',comp,this,this._ecs);
    return comp;
};


Entity.prototype.once=function (evt, cb) {
    return this._eventListener.once(evt, cb)
};

Entity.prototype.on=function (evt, cb) {
    return this._eventListener.on(evt, cb)
};

Entity.prototype.off=function (evt, cb) {
    if (cb) {
        return this._eventListener.off(evt,cb);
    }
    return this._eventListener.removeAllListeners(evt);
};

Entity.prototype.emit=function (evt) {
    return this._eventListener.emit.apply(this._eventListener, arguments);
};

Entity.prototype.isComponentDirty = function (compName) {
    return this._modifyMarks.indexOf(compName)!==-1||this._addMarks.indexOf(compName)!==-1||this._removeMarks.indexOf(compName)!==-1;
};
/**
 * 移除实体的一个组件
 */
Entity.prototype.remove = function (comp) {
    let type = ECSUtil.getComponentType(comp);
    if (!type) {
        logger.error('Component参数错误');
        return;
    }
    comp = this.get(comp);
    if (comp) {
        let renderer = comp.getRenderer();
        if (renderer) {
            this.remove(renderer);
        }

        if (ECSUtil.getComponentType(comp)=='ControlButton') {
            logger.debug('移除ControlButton组件');
        }
        this.getECS().emit('remove component',comp,this,this._ecs);
        this.emit('remove component',comp,this,this._ecs);
        if (comp['onRemove']) {
            comp.onRemove(this, this._ecs);
        }
        comp._entity = null;
        this.removeMark(comp);
        this._ecs.recycleComponent(comp);
        this._ecs.reassignEntity(type, this);
        delete this._components[type];
        return;
    }
    logger.error('组件不存在');
};
/**
 * 标记一个实体<Entity>为删除状态
 */
Entity.prototype.destroy = function () {
    this._onDestroy = true;
    this._ecs.removeEntity(this);
};
Entity.prototype.destroyInstant = function () {
    this._onDestroy = true;
    this._ecs.removeEntityInstant(this);
};
/**
 * 调用组件<Component>的销毁方法并销毁所有组件<Component>
 */
Entity.prototype.onDestroy = function () {
    let keys = Object.keys(this._components);
    for (let i = keys.length - 1; i >= 0; i--) {
        let comp = this._components[keys[i]];
        comp._entity = null;
        if (comp['onRemove']) {
            comp.onRemove(this, this._ecs);
        }
        this._ecs.recycleComponent(comp);
    }
    this._components = {};
};

Entity.prototype.getComponentTypes = function () {
    let ret = [];
    for (let i in this._components) {
        let comp = this._components[i];
        ret.push(comp.getComponentName?comp.getComponentName():comp.__proto__.__classname);
    }
    //ret.sort();
    return ret;
};
/**
 *  Entity是否包含这些实体组件
 */
Entity.prototype.includes = function (componentTypes) {
    return ECSUtil.includes(this.getComponentTypes(), componentTypes);
};


module.exports = Entity;
