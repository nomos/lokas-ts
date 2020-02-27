const ECSUtil = require('./ECSUtil');
/**
 * 集合<Group>是包含特定类型组件<Component>组合的实体<Entity>的集合,系统<System>,监听器<Observer>,处理器<Handler>函数处理的对象
 * @param compGroup
 * @constructor
 */
const Group = function (compGroup,ecs) {
    this._hash = [];
    this._ecs = ecs;
    this._componentTypes=[];
    for (let i=0;i<compGroup.length;i++) {
        let comp = compGroup[i];
        if (!comp) {
            throw new Error('组件不存在,可能未注册');
        }
        this._componentTypes.push(ECSUtil.getComponentType(comp));
    }
    this._componentTypes.sort();
    this._entityIndexes = [];
    this._dirtyEntities = [];
};

Group.prototype.addDirtyEntity=function (ent) {
    if (ent._groupHashes.indexOf(this._hash)===-1) {
        return;
    }
    let index = this._dirtyEntities.indexOf(ent);
    if (index===-1) {
        this._dirtyEntities.push(ent);
    }
};

Group.prototype.removeDirtyEntity=function (ent) {
    let index = this._dirtyEntities.indexOf(ent);
    if (index!==-1) {
        this._dirtyEntities.splice(index,1);
    }
};



Group.prototype.clean = function(){
    this._dirtyEntities = [];
};
/**
 * 尝试往集合<Group>中添加一个实体<Entity>(只有包含集合<Group>中所有组件<Component>类型的实体<Entity>会被添加到Group中)
 * @param ent
 */
Group.prototype.addEntity=function (ent) {
    if (ent.includes(this._componentTypes)) {
        if (!this.hasEntity(ent)) {
            ent.addGroup(this._hash);
            this._entityIndexes.push(ent.id);
        }
    }
};
/**
 * 尝试立即移除一个实体<Entity>
 * @param {Entity}ent
 */
Group.prototype.removeEntity=function (ent) {
    //如果实体中不包含集合的组件,提前跳出
    if (!ent.includes(this._componentTypes)){
        return;
    }
    if (this._entityIndexes) {
        ent.removeGroup(this._hash);
        ECSUtil.remove(this._entityIndexes,function (n) {
            return n===ent.id;
        });
    }
};
/**
 * 移除一个实体<Entity>ID队列,通常在每一帧更新的最后做
 * @param {Array<Number>}arr
 */
Group.prototype.removeEntityArray=function (arr) {
    let removeArr = [];
    for (let i=0;i<arr.length;i++) {
        if (arr[i].includes(this._componentTypes)){
            removeArr.push(arr[i].id);
        }
    }
    for (let i=0;i<removeArr.length;i++) {
        let id = removeArr[i];
        ECSUtil.remove(this._entityIndexes,function (n) {
            return n===id;
        });
    }
};
/**
 * 检查集合<Group>中是否有这个实体<Entity>
 * @param {Entity}ent
 * @returns {*}
 */
Group.prototype.hasEntity=function (ent) {
    let id = ent.id;
    let index = this._entityIndexes.indexOf(id);
    return index!==-1;
};
/**
 * 检查集合<Group>中是否有这个实体<Entity>ID
 * @param {Number}id
 * @returns {*}
 */
Group.prototype.hasEntityByID=function (id) {
    let index = this._entityIndexes.indexOf(id);
    return index!==-1;
};

Group.prototype.getEntities = function () {
    let ret = [];
    for (let i=0;i<this._entityIndexes.length;i++) {
        let id = this._entityIndexes[i];
        let ent = this._ecs._entityPool[id];
        if (!ent) {
            throw new Error('entity must not be null');
        }
        ret.push(ent);
    }
    return ret;
};
/**
 *  获取单例实体
 */
Group.prototype.getSingletonEntity = function () {

    let id = this._entityIndexes[0];
    if (id ===undefined) {
        return;
    }
    return this._ecs._entityPool[id];
};
/**
 * 检查集合<Group>是否包含该类型的组件<Component>,接受多个参数
 * @param comp string|[string]|string,string,string
 */
Group.prototype.match=function (comp) {
    let args = [].slice.call(arguments);
    let compStrArr = [];
    if (args.length===0) {
        return false;
    } else if (args.length===1) {
        compStrArr = ECSUtil.isArray(comp)?comp.slice():[comp];
    } else {
        compStrArr = args;
    }
    return ECSUtil.includes(this._componentTypes,compStrArr);
};

Group.prototype.length = function () {
    return this._entityIndexes.length;
};

module.exports=Group;
