const ECSUtil=require('./ECSUtil');
const Entity=require('./Entity');
const Group=require('./Group');
const System=require('./System');
const Connection = require('./Connection');
const ComponentPool=require('./ComponentPool');
const ComponentSingleton=require('./ComponentSingleton');
const logger=require('../logger/Logger')||console;
const Timer=require('./ECSTimer');
const nbt=require('./binary/nbt');
const EventEmitter=require('./event-emmiter');
const Long=require('long');

/**
 * 实体管理器<ECS>是一个ECS系统的实例,管理组件<Component>,系统<System>,集合<Group>,监听器<Observer>,处理器<Handler>的注册
 * 维护实体<Entity>的对象池,负责集合<Group>,组件池<ComponentPool>,
 * 组件单例<ComponentSingleton>的创建
 * 负责处理帧更新和事件传递
 * @param {Number} updateTime
 * @param {Number} timeScale
 * @param {Object} opt
 * @constructor
 */
class ECS {

    constructor(updateTime, timeScale, opt) {
        opt = opt || {};

        if (updateTime === 0) {
            this._turned = true;
        }
        this._eventListener = new EventEmitter();
        /**基础变量*/
        this._entityPool = {};              //实体<Entity>池
        this._componentPools = {};          //各种组件池<ComponentPool>容器
        this._groups = {};                  //各种集合<Group>容器,组件<Component>数组为键值
        this._cachedGroups = {};            //单个组件<Component>为键值的集合<Group>缓存
        this._systems = [];                 //各个系统和监听集合
        this._systemIndexes = {};           //系统的名字索引
        this._singleton = null;

        /**ID分配和生命周期变量*/
        this._index = 0;                            //实体<Entity>ID分配变量
        this._indexClient = 0;                      //实体<Entity>ID分配变量
        this._server = opt.server || false;           //客户端的ID从Max_Long开始自减,服务器的ID从0开始自增
        this._enabled = false;
        this._ecsReadyDestroy = false;

        /**定时器变量和回调函数*/
        this._tick = 0;                     //步数
        this._updateInterval = updateTime || 1000 / 60.0;
        this._timeScale = Math.min(timeScale, 20) || 1.0;
        this._timer = new Timer(this._updateInterval, this._timeScale);
        this._timeOffset = 0;
        this._dirty = true;                //整个系统的脏标记d
        this._dirtyEntities = [];           //这轮的脏标记entity
        this._newEntities = [];
        this._toDestroyEntities = [];        //在这轮遍历中要删除的entity队列
        this._toDestroyEntityIDs = [];
        this.setupUpdateFunc();

        this._snapInterval = opt.snapInterval || 0;    //全实体快照时间
        this._prevSnap = opt.canReverse || false;                //实体快照

        this._step = 0;                 //step是同步状态计数,从服务器的tick同步,客户端的tick只是自己使用
        this._steps = [];               //步数队列
        this._snapshotDeltas = {};      //帧差异快照
        this._snapshotSteps = [];       //快照步数队列
        this._snapshots = {};           //全实体快照
        this._lastSnapshot = null;
        this._connections = {};         //连接表

        /**模块和组件映射表*/
        this._modules = [];                 //已加载的模块
        this._addSystemCount = 0;           //加载的系统order数
        this._componentsMap = {};           //组件:ID 服务器,当前组件:ID映射
        this._componentsIndexMap = {};      //hash ID:组件映射表
        this._componentDefineArray = [];
        this._componentDefineMap = {};
        this._componentDefineHash = 0;      //服务器组件hash
        this._compCode = opt.compCode;   //是否加密组件名
        this.rendererMap = {};
        this.rendererArray = [];
        this.modelMap = {};

        this._commands = {};                //注册的命令组件
        this._commandQueueMaps = [];        //以命令名为键的队列
        this._commandListener = new EventEmitter(); //命令注册
        this._connections = {};             //客户端连接
        this._renderUpdateQueue = [];       //客户端脏数据view更新队列
        this._lateAddQueue = [];            //延迟Add队列

        //其他绑定函数
        this._uniqueSchedules = {};         //仅一次的任务标记
        this._spawners = {};
        this._spawnerCb = {};
        this._objContainer = {};
        this._stateMachine = 'null';
    }
    get enabled(){
        return this._enabled;
    }
    get entityCount(){
        return Object.keys(this._entityPool).length;
    }

}

let pro=ECS.prototype;

pro.getRoleString = function () {
    if (this.isClient()) {
        return '客户端';
    } else {
        return '服务器';
    }
};

pro.setupUpdateFunc=function () {
    this._timer.onUpdate=function (dt) {
        if (!this._enabled) {
            if (this._ecsReadyDestroy) {
                this._ecsReadyDestroy=false;
                this._destroy();
                this.destroyCb&&this.destroyCb();
            }
            return;
        }

        this.emit('_beforeUpdate');
        this.emit('beforeUpdate');
        this._tick++;
        this.update(dt, this._turned);
    }.bind(this);


    this._timer.onLateUpdate=function (dt) {
        if (!this._enabled) {
            return;
        }
        this.lateUpdate(dt);
        if (this._dirty&&this._server) {
            //TODO:这里还有问题
            // if (this._tick>1) {
            //     this.snapStep();
            // }
            // if (this._tick===1) {
            //     this.snapshot();
            // } else {
            //     this.snapshot(true);
            // }
            this._step=this._tick;
        }
        this.cleanBuffer();
        this.emit('afterUpdate');
        this.emit('_afterUpdate');
    }.bind(this);

    this.cleanBuffer=function () {

        //遍历集合删除实体队列
        for (let i in this._groups) {
            this._groups[i].removeEntityArray(this._toDestroyEntities);
        }
        //彻底删除实体并调用onDestroy方法删除所有组件
        for (let i=0; i<this._toDestroyEntities.length; i++) {
            let ent=this._toDestroyEntities[i];
            let index=this._newEntities.indexOf(ent);
            if (index!== -1) {
                this._newEntities.splice(index, 1);
            }
            index=this._dirtyEntities.indexOf(ent);
            if (index!== -1) {
                this._dirtyEntities.splice(index, 1);
            }
            let entId = ent.id;
            delete this._entityPool[entId];
            ent.onDestroy();
            ent=null;
        }
        //重置实体队列
        this._toDestroyEntities=[];
        this._dirty=false;
        for (let i=0; i<this._dirtyEntities.length; i++) {
            this._dirtyEntities[i].clean();
        }
        for (let i=0; i<this._newEntities.length; i++) {
            this._newEntities[i].clean();
        }
        this._dirtyEntities=[];
        this._newEntities=[];
        for (let i=0;i<this._renderUpdateQueue.length;i++) {
            let comp = this._renderUpdateQueue[i];
            comp&&comp._entity&&comp.updateView(comp._entity,this);
        }
        this._renderUpdateQueue = [];
    }.bind(this);
};

pro.setTimeScale = function (timeScale) {
    this._timeScale=Math.min(timeScale, 20)||1.0;
    this._timer.timeScale = timeScale;
};

pro.getTimeScale = function () {
    return this._timeScale;
};

pro.getCCTime = function (time) {
    return time/1000/this._timeScale;
};

pro.isState=function (state) {
    return this._stateMachine===state;
};

pro.setState=function (state) {
    if (this._stateMachine!==state) {
        this.offStateSystems(this._stateMachine);
        this._stateMachine=state;
        this.onStateSystems(state);
        this._dirty=true;
    }
};

pro.offStateSystems = function (state) {
    for (let i=0; i<this._systems.length; i++) {
        let system=this._systems[i];
        if (system.stateOnly&&system.stateOnly===state&&system.offState) {
            system.doOffState(this._timer.runningTime, this);
        }
    }
};

pro.onStateSystems=function (state) {
    for (let i=0; i<this._systems.length; i++) {
        let system=this._systems[i];
        if (system.stateOnly&&system.stateOnly===state&&system.onState) {
            system.doOnState(this._timer.runningTime, this);
        }
    }
};

pro.getState=function () {
    return this._stateMachine;
};

pro.onState=function (state, cb) {
    this._stateMachine.on(state, cb);
};

pro.offState=function (state, cb) {
    this._stateMachine.off(state, cb);
};

pro.once=function (evt, cb) {
    return this._eventListener.once(evt, cb)
};

pro.on=function (evt, cb) {
    return this._eventListener.on(evt, cb)
};

pro.off=function (evt, cb) {
    if (cb) {
        return this._eventListener.off(evt,cb);
    }
    return this._eventListener.removeAllListeners(evt);
};

pro.emit=function (evt) {
    return this._eventListener.emit.apply(this._eventListener, arguments);
};

pro.set=function (name, obj) {
    this._objContainer[name]=obj;
};

pro.get=function (name) {
    return this._objContainer[name];
};

pro.setSpawner=function (name, func) {
    this._spawners[name]=func.bind(null, this);
};

pro.spawnEntity=function (name) {
    let spawnFunc=this._spawners[name];
    let args = [].slice.call(arguments);
    args.splice(0,1);
    return spawnFunc&&spawnFunc.apply(null,args);
};

pro.createTimer=function (interval, timeScale) {
    return new Timer(interval, timeScale);
};

pro.adjustTimer=function (time) {

};

//事件监听'__unserializeEntity'+step每次客户端更新后从事件列表删除
pro.offUnserializeEntityEvent = function (step) {
    this.off(new RegExp("__unserializeEntity"+step));
};

pro.nbt2Entity=function (step,nbt) {
    let id=nbt.at(0).value.toNumber();
    let ent=this.getEntity(id);
    if (!ent) {
        ent=this.createEntity(id);
    }
    ent.fromNBT(step,nbt);
    this.emit('__unserializeEntity'+step+id, id, ent);
    ent.dirty();
    return ent;
};

//服务器保存全局快照
pro.snapshot=function (temp) {
    let ret=nbt.Complex();
    let entityIndexes=nbt.LongArray();
    let entities=nbt.List();
    ret.addValue(nbt.Long(this._tick));
    ret.addValue(nbt.String(this._stateMachine));
    for (let i in this._entityPool) {
        let ent=this._entityPool[i];
        let snapEnt=ent.snapshot();
        entities.push(snapEnt);
        entityIndexes.push(ent.id);
    }
    ret.addValue(entityIndexes);
    ret.addValue(entities);

    if (!temp) {
        this._snapshotSteps.push(this._tick);
        this._snapshots[this._tick]=ret;
    }
    this._lastSnapshot = ret;
    return ret;
};

//从服务器更新全局快照
pro.syncSnapshotFromServer=function (nbt) {
    let step = this._step=nbt.at(0).value.toNumber();
    this.setState(nbt.at(1).value);
    let nbtEntArray=nbt.at(3);
    for (let i=0; i<nbtEntArray.getSize(); i++) {
        let entNbt=nbtEntArray.at(i);
        this.nbt2Entity(this._step,entNbt);
    }
    this.offUnserializeEntityEvent(step);
};

//差异快照切片
pro.snapStep=function () {
    let ret=nbt.Complex();

    ret.addValue(nbt.Long(this._tick));
    ret.addValue(nbt.String(this._stateMachine));

    let modEntArr=nbt.List();
    let newEntArr=nbt.List();
    let remEntArr=nbt.List();
    for (let i=0; i<this._dirtyEntities.length; i++) {
        let ent=this._dirtyEntities[i];
        if (false&&ent.id<0) {
            continue;
        }
        let entComplex=nbt.Complex();
        let entSnapCur=ent.snapCurrent();
        entComplex.addValue(entSnapCur);
        if (this._prevSnap) {
            let entSnapPrev=ent.snapPrevious();
            if (entSnapPrev) {
                entComplex.addValue(entSnapPrev);
            }
        }
        modEntArr.push(entComplex);
    }
    for (let i=0; i<this._newEntities.length; i++) {
        let ent=this._newEntities[i];
        if (false&&ent.id<0) {
            continue;
        }
        let entSnap=ent.snapshot();
        newEntArr.push(entSnap);
    }
    for (let i=0; i<this._toDestroyEntityIDs.length; i++) {
        let id=this._toDestroyEntityIDs[i];
        if (false&&id<0) {
            continue;
        }
        remEntArr.push(this.getPrevSnapEntity(id));
    }
    //nbtcomplex-2
    ret.addValue(modEntArr);
    //nbtcomplex-3
    ret.addValue(newEntArr);
    //nbtcomplex-4
    ret.addValue(remEntArr);
    this._steps.push(this._tick);
    this._snapshotDeltas[this._tick]=ret;
    return ret;
};

pro.syncSnapDeltaFromServer=function (nbt, backward) {
    let step=nbt.at(0).value.toNumber();
    if (this._step===step) {
        return;
    } else {
        this._step=step;
    }
    this.setState(nbt.at(1).value);
    let modArr=nbt.at(2);
    let addArr=nbt.at(3);
    let remArr=nbt.at(4);
    for (let i=0; i<modArr.getSize(); i++) {
        let modNbtEnt=modArr.at(i);
        this.nbt2Entity(step,modNbtEnt.at(0));
    }
    for (let i=0; i<addArr.getSize(); i++) {
        let addNbtEnt=addArr.at(i);
        this.nbt2Entity(step,addNbtEnt);
    }
    for (let i=0; i<remArr.getSize(); i++) {
        let remId=remArr.at(i).at(0).value.toNumber();
        this.removeEntity(remId);
    }
    this.offUnserializeEntityEvent(step);
};

//获取上一次的实体切片
pro.getPrevSnapEntity=function (id) {
    if (this._lastSnapshot) {
        let entIndex=this._lastSnapshot.at(2).toJSON().indexOf(''+id);
        return this._lastSnapshot.at(3).at(entIndex);
    }
};


//同步到客户端(时间片同步)
pro.syncToClient=function (curStep) {
    if (curStep===this._step) {
        return;
    }
    let ret=nbt.Complex();
    ret.addValue(nbt.Float(this._timeScale));
    ret.addValue(nbt.Long(this._step));
    let startStep;
    let snapshot;
    let init=false;
    if (curStep===0) {
        init=true;
        startStep=this.getNearestSnapshot(curStep);
        if (!startStep) {
            return;
        }
        snapshot=this._snapshots[startStep];
        curStep=startStep;
    }

    //获取step之后的所有steps
    let toSyncStepsIndex=this._steps.indexOf(curStep);
    if (toSyncStepsIndex=== -1) {
        logger.error('客户端超过Step限制');
    }
    let length=this._steps.length;
    if (toSyncStepsIndex===length-1) {
        // logger.debug('客户端已经是最新',curStep);
    }
    let toSyncSteps=[];
    for (let i=toSyncStepsIndex+1; i<length; i++) {
        toSyncSteps.push(this._steps[i]);
    }
    ret.addValue(nbt.LongArray(toSyncSteps));
    let syncFrames=nbt.List();
    for (let i=0; i<toSyncSteps.length; i++) {
        let syncFrameNbt=this._snapshotDeltas[toSyncSteps[i]];
        syncFrames.push(syncFrameNbt);
    }
    ret.addValue(syncFrames);
    if (init) {
        ret.addValue(nbt.Long(startStep));
        ret.addValue(snapshot);
    }
    return ret.writeToBuffer();
};

pro.syncFromServer=function (buff) {
    if (!buff) {
        return;
    }
    this.alSize=this.alSize||0;
    this.alSize+=buff.length;
    logger.log('总发送字节数', this.alSize/1000.0+'k');
    let nbtdata=nbt.readFromBuffer(buff);
    if (!nbtdata||this._step===nbtdata.at(1).value.toNumber()) {
        return;
    }
    this.setTimeScale(nbtdata.at(0).value);
    if (nbtdata.getSize()==5) {
        this.syncSnapshotFromServer(nbtdata.at(5));
    }
    let snapSteps=nbtdata.at(3);
    for (let i=0; i<snapSteps.getSize(); i++) {
        this.syncSnapDeltaFromServer(snapSteps.at(i));
    }
};

pro.getNearestSnapshot=function (curStep) {
    if (!this._snapshotSteps.length) {
        logger.error('服务器未初始化');
        return 0;
    }
    if (this._snapshotSteps.length===1) {
        return this._snapshotSteps[0];
    }
    for (let i=this._snapshotSteps.length-1; i>=0; i--) {
        let step=this._snapshotSteps[i];
        if (curStep>=step) {
            logger.error('错误,超出最大限制');
        }
        if (step>curStep) {
            return step;
        }
    }
};

pro.getConnection = function (uid) {
    return this._connections[uid]
};

pro.getConnections = function () {
    return this._connections;
};

pro.getConnectionNum = function () {
    return Object.keys(this._connections).length;
};

pro.addConnection = function (uid) {
    if (this.getConnection(uid)) {
        logger.error('已存在连接',uid);
        return;
    }
    let conn = new Connection(uid,this);
    this._connections[uid] = conn;
};

pro.removeConnection = function (uid) {
    delete this._connections[uid];
};


pro.getComponentDefinesToNbt = function () {
    let ret = new nbt.List();
    for (let i=0;i<this._componentDefineArray.length;i++) {
        let comp = this._componentDefineArray[i];
        let strNbt = nbt.String(comp);
        ret.push(strNbt);
    }
    return ret;
};

pro.setComponentDefinesFromNbt = function (nbtdata) {
    if (nbtdata.getSize()===0) {
        return;
    }
    let defines = nbtdata.toJSON();
    this._componentDefineArray = defines;
    this._componentDefineMap = {};
    for (let i=0;i<defines.length;i++) {
        this._componentDefineMap[defines[i]] = true;
    }
    this.genComponentDefineHash();
};

pro.getComponentNameFromDefine = function (define) {
    if (typeof define==='string') {
        return define;
    }
    return this._componentDefineArray[define];
};

pro.getComponentDefine = function (comp) {
    if (typeof comp!=='string') {
        comp = ECSUtil.getComponentType(comp);
    }
    return this._componentDefineMap[comp];
};

pro.getComponentDefineToNbt = function (comp) {
    if (this._compCode) {
        return nbt.Byte(this.getComponentDefine(comp));
    } else {
        return nbt.String(ECSUtil.getComponentType(comp));
    }
};

pro.genComponentDefineHash = function () {
    let ret = this._componentDefineArray.length*10000;
    for (let i=0;i<this._componentDefineArray.length;i++) {
        let comp = this._componentDefineArray[i];
        for (let j=0;j<comp.length;j++) {
            ret+=comp[j].charCodeAt();
        }
    }
    this._componentDefineHash = ret;
};

pro.setComponentDefine = function (comp) {
    if (this.isClient()) {
        return;
    }
    if (this._componentDefineArray.indexOf(comp)!==-1) {
        throw new Error('comp already defined');
    }
    this._componentDefineArray.push(comp);
    this._componentDefineMap[comp] = this._componentDefineArray.length-1;
    this.genComponentDefineHash();
};

//从服务器差异更新(根据客户端联网实体的step信息)
pro.rSyncFromServer=function (buff) {
    logger.debug('aaaa');
    if (!buff) {
        return;
    }
    this.alSize=this.alSize||0;
    this.alSize+=buff.length;
    let nbtdata=nbt.readFromBuffer(buff);
    //TODO:临时赋值
    this.lastSync = nbtdata;
    // logger.debug('总发送字节数', this.alSize/1000.0+'k',nbtdata.at(4).toJSON());
    this.setComponentDefinesFromNbt(nbtdata.at(1));
    let compHash = nbtdata.at(0).value;
    if (compHash!==this._componentDefineHash) {
        return 2;
    }
    let timescale=nbtdata.at(2).value;
    let oldStep=nbtdata.at(3).value.toNumber();
    let step=nbtdata.at(4).value.toNumber();
    if (this._step===step) {
        return 0;   //无需更新,丢弃帧数据
    } else if (this._step!==oldStep) {
        return 2;   //需要更新,上传元数据
    } else {
        this._step=step;
    }
    this.setTimeScale(timescale);
    this.setState(nbtdata.at(5).value);
    let modArr=nbtdata.at(6);
    let addArr=nbtdata.at(7);
    let remArr=nbtdata.at(8);
    for (let i=0; i<modArr.getSize(); i++) {
        let modNbtEnt=modArr.at(i);
        this.nbt2Entity(step,modNbtEnt);
    }
    for (let i=0; i<addArr.getSize(); i++) {
        let addNbtEnt=addArr.at(i);
        this.nbt2Entity(step,addNbtEnt);
    }
    for (let i=0; i<remArr.getSize(); i++) {
        let remId=remArr.at(i).toNumber();
        this.removeEntity(remId);
    }
    this.offUnserializeEntityEvent(step);
    return 1;   //更新成功
};

pro.rPushToClient = function (uid) {
    let conn = this.getConnection(uid);
    if (!conn) {
        logger.error('Connection is not exist:',uid);
    }
    if (conn.step > this._step) {
        logger.error('Client Step Error');
        return;
    }
    //帧号相等,不需要更新
    if (conn.step === this._step) {
        return;
    }
    let curStep = conn.step;
    let clientData = conn.entitySteps;
    return this.getRSyncData(curStep,clientData,conn);
};
//客户端获取所有联网实体的step信息
pro.fetchEntitySyncData=function () {
    let ret=nbt.Complex();
    //加入客户端当前tick,如果tick和服务器一致就不需要同步
    ret.addValue(nbt.Int(this._componentDefineHash));
    ret.addValue(nbt.Long(this._step));
    let entarr=nbt.LongArray();
    for (let i in this._entityPool) {
        let ent=this._entityPool[i];
        if (ent._id>0) {
            entarr.push(ent._id);
            entarr.push(ent._step);
        }
    }
    ret.addValue(entarr);
    return ret.writeToBuffer();
};

//差异同步到客户端,客户端提供所有的实体entity stepID
pro.rSyncToClient=function (buff,uid) {
    //获取客户端的step
    let conn = this.getConnection(uid);
    if (!conn) {
        logger.error('player not exist',uid);
        return;
    }
    let nbtdata=nbt.readFromBuffer(buff);
    conn.compHash =  nbtdata.at(0).value;
    let curStep=nbtdata.at(1).value.toNumber();
    let entArr=nbtdata.at(2);
    let clientData={};
    for (let i=0; i<entArr.getSize(); i+=2) {
        let index=entArr.at(i).toNumber();
        let step=entArr.at(i+1).toNumber();
        clientData[index]=step;
    }
    return this.getRSyncData(curStep,clientData,conn);
};

pro.getRSyncData = function (curStep,clientData,connection) {
    if (curStep===this._step) {
        return;
    }
    let ret=nbt.Complex();

    let compDefineNbt = nbt.List();
    ret.addValue(nbt.Int(this._componentDefineHash));
    if (connection.compHash!==this._componentDefineHash) {
        compDefineNbt = this.getComponentDefinesToNbt();
        connection.compHash = this._componentDefineHash;
    }
    //nbtcomplex-0
    ret.addValue(compDefineNbt);
    //nbtcomplex-1
    ret.addValue(nbt.Float(this._timeScale));
    //nbtcomplex-2
    ret.addValue(nbt.Long(curStep));
    //nbtcomplex-3
    ret.addValue(nbt.Long(this._step));
    //nbtcomplex-4
    ret.addValue(nbt.String(this._stateMachine));

    let modEntArr=nbt.List();
    let newEntArr=nbt.List();
    let remEntArr=nbt.LongArray();

    for (let index in clientData) {
        let ent=this._entityPool[index];
        //如果有且当前实体的step小于服务器step
        if (ent) {
            if (clientData[index]<ent._step) {
                let entSnapCur=ent.snapshot(connection);
                modEntArr.push(entSnapCur);
            }
            clientData[index] = ent._step;
        } else {
            //如果没有记录则直接销毁
            remEntArr.push(index);
            delete clientData[index];
        }
    }
    for (let i in this._entityPool) {
        let ent=this._entityPool[i];
        if (clientData[ent._id]===undefined) {
            let entSnap=ent.snapshot(connection);
            newEntArr.push(entSnap);
            clientData[ent._id] = ent._step;
        }
    }
    //连接管理更新状态
    connection&&connection.sync(this._step,clientData);
    //nbtcomplex-5
    ret.addValue(modEntArr);
    //nbtcomplex-6
    ret.addValue(newEntArr);
    //nbtcomplex-7
    ret.addValue(remEntArr);
    return ret.writeToBuffer();
};


/**
 * 加载模块
 */
pro.loadModule=function (mod) {
    if (!mod.name) {
        logger.error('载入失败,模组没有名字', mod);
        return;
    }
    if (mod.onLoad) {
        let str='#载入模组:'+mod.name+'------';
        if (mod.desc) {
            str+='\n';
            str+=mod.desc;
        }
        logger.log(str);
        mod.onLoad(this);
        logger.log('模组:'+mod.name+'载入结束------\n');
    }
    this._modules[mod.name]={
        name:mod.name,
        mod:mod
    };
};


pro.reloadModules=function () {

};
/**
 * 卸载模块
 * @param name
 */
pro.unloadModule=function (name) {
    let mod=this._modules[name];
    if (!mod) {
        logger.error('模组 '+name+' 未找到');
        return;
    }
    if (mod.unLoad) {
        mod.unLoad(this);
    }
};

pro.asyncSystemExecute=function (name, cb) {
    let system=this.getSystem(name);
    if (!system) {
        return;
    }
    system._asyncExecutions=system._asyncExecutions||[];
    system._asyncExecutions.push(cb);
};

pro.registerCommand=function (name, command,priority) {
    this._cmdAddPriority = this._cmdAddPriority||0;
    this._cmdAddPriority++;
    command.priority = (priority?priority*100000:0)+this._cmdAddPriority;
    this._commands[name]=command;
};

pro.onCommand = function (name,cb) {
    return this._commandListener.on(name,cb);
};

pro.offCommand = function (name,cb) {
    if (cb) {
        return this._commandListener.off(name,cb);
    }
    return this._commandListener.removeAllListeners(name);
};

//更新客户端命令 //在System里调用防止在加速的更新时间穿越系统更新导致系统收不到onCommand变化
pro.updateCommands = function () {
    while (this._commandQueueMaps.length) {
        let cmd = this._commandQueueMaps.shift();
        this._commandListener.emit(cmd.task,cmd);
    }
};

//生成命令
pro.processCommand=function (cmd) {
    let cmdClass = this._commands[cmd.task];
    if (cmdClass) {
        return new this._commands[cmd.task](cmd);
    } else {
        logger.error('命令格式错误或者未注册',cmd);
    }
};

//接收命令
pro.receiveCommand=function (cmd) {
    cmd=this.processCommand(cmd);
    if (!cmd) {
        logger.error('command is nil');
        return;
    }
    this._commandQueueMaps.push(cmd);
};


/**
 * 注册一个组件<Component>
 * @param name       组件别名,创建相同类型的组件可以指定不同别名
 * @param Component  组件
 * @param minSize    池里可用对象最小值
 * @param maxSize    使用中对象+池里可用对象的最大值
 */
pro.registerComponent=function (name, Component, maxSize, minSize) {
    let NewComponent;
    if (!name) {
        logger.error('名称或组件不存在');
    }
    if (typeof name!=='string') {
        minSize=maxSize;
        maxSize=Component;
        NewComponent=name;
        if (!name.defineName) {
            throw Error('组件:未定义');
        }
        name=name.defineName?name.defineName():name.prototype.__classname;
    } else {
        if (!Component) {
            throw Error('组件:'+name+'未定义');
        }
        NewComponent=Component;
        //TODO:这里要更新了
        if (NewComponent.prototype.defineName) {
            NewComponent.prototype.defineName = function () {
                return name;
            }
        } else {
            NewComponent.prototype.__classname=name;
        }
    }
    if (!ECSUtil.isString(name)) {
        logger.error(this.getRoleString()+' 注册组件失败,组件名称为空');
        return;
    }
    //FIXME:这里准备更新
    NewComponent.prototype.getComponentName = NewComponent.prototype.getComponentName||function () {
        return this.__classname;
    };
    NewComponent.prototype.getECS = NewComponent.prototype.getECS||function () {
        if (this._entity) {
            return this._entity._ecs;
        }
    };
    NewComponent.prototype.getRenderer = NewComponent.prototype.getRenderer||function () {
        return this.getECS().getComponentRenderer(this);
    };
    NewComponent.prototype.isRenderer = NewComponent.prototype.isRenderer||function () {
        return this.getECS().rendererArray.indexOf(this.getComponentName())!==-1;
    };
    NewComponent.prototype.getEntity = NewComponent.prototype.getEntity||function () {
        return this._entity;
    };
    NewComponent.prototype.getSibling=NewComponent.prototype.getSibling||function (comp) {
        if (this._entity) {
            return this._entity.get(comp);
        }
    };
    NewComponent.prototype.dirty=NewComponent.prototype.dirty||function () {
        this.onDirty&&this.onDirty(this._entity, this._entity._ecs);
        let renderer = this.getRenderer();
        if (renderer) {
            let renderComp = this.getSibling(renderer);
            renderComp&&renderComp.dirty();
        }
        this.getECS().addRenderQueue(this);
        if (this._entity) {
            this._entity.markDirty(this);
        }
    };

    let pool=this._componentPools[name];

    maxSize=(maxSize&&maxSize>0) ? maxSize:100;
    minSize=(minSize&&minSize>0) ? minSize:10;
    if (pool) {
        logger.warn(this.getRoleString()+' 已存在组件:'+name+',不重新注册组件');
        pool._maxSize=Math.max(pool._maxSize, maxSize||0);
        pool._minSize=Math.max(pool._minSize, maxSize||0);
        return;
    }
    if (NewComponent.prototype.onRegister) {
        NewComponent.prototype.onRegister(this);
    }
    this._componentPools[name]=new ComponentPool(NewComponent, maxSize, minSize, this);
    logger.info(this.getRoleString()+" 注册组件池:"+name+" 成功,最小保留对象数:"+minSize+" 最大对象数:"+maxSize);

    this.setComponentDefine(name);
};

/**
 * 注册单例组件
 */
pro.registerSingleton=function (name, Component) {
    let pool=this._componentPools[name];
    if (pool) {
        logger.warn(this.getRoleString()+' 已存在组件单例:'+name+',不重新注册组件');
        return;
    }

    let NewComponent;
    if (typeof name!=='string') {
        NewComponent=name;
        if (!name.defineName) {
            throw Error('组件:未定义');
        }
        name=name.defineName?name.defineName():name.prototype.__classname;
    } else {
        if (!Component) {
            throw Error('组件:'+name+'未定义');
        }
        NewComponent=Component;
        //TODO:这里要更新了
        if (NewComponent.prototype.defineName) {
            NewComponent.prototype.defineName = function () {
                return name;
            }
        } else {
            NewComponent.prototype.__classname=name;
        }
    }
    NewComponent.prototype.getComponentName = NewComponent.prototype.getComponentName||function () {
        return this.__classname;
    };
    NewComponent.prototype.getECS = NewComponent.prototype.getECS||function () {
        if (this._entity) {
            return this._entity._ecs;
        }
    };
    NewComponent.prototype.isRenderer = NewComponent.prototype.isRenderer||function () {
        return this.getECS().rendererArray.indexOf(this.getComponentName())!==-1;
    };
    NewComponent.prototype.getRenderer = NewComponent.prototype.getRenderer||function () {
        return this.getECS().getComponentRenderer(this);
    };
    NewComponent.prototype.getEntity = NewComponent.prototype.getEntity||function () {
        return this._entity;
    };
    NewComponent.prototype.getSibling=NewComponent.prototype.getSibling||function (comp) {
        if (this._entity) {
            return this._entity.get(comp);
        }
    };
    this._componentPools[name]=new ComponentSingleton(NewComponent, this);
    this.setComponentDefine(name);
    if (NewComponent.prototype.onRegister) {
        NewComponent.prototype.onRegister(this);
    }
    NewComponent.prototype.dirty=function () {
        this.onDirty&&this.onDirty(this._entity, this._entity._ecs);
        let renderer = this.getRenderer();
        if (renderer) {
            let renderComp = this.getSibling(renderer);
            renderComp&&renderComp.dirty();
        }
        this.getECS().addRenderQueue(this);
        if (this._entity) {
            this._entity.markDirty(this);
        }
    };
    logger.info(this.getRoleString()+" 注册组件单例:"+name+" 成功");
};

pro.addRenderQueue = function (comp) {
    if (comp.updateView) {
        if (this._renderUpdateQueue.indexOf(comp)===-1) {
            this._renderUpdateQueue.push(comp);
        }
    }
};

pro.lateAdd = function (comp) {
    if (this._lateAddQueue.indexOf(comp)===-1) {
        this._lateAddQueue.push(comp);
    }
};

pro.getComponentRenderer = function (comp) {
    return this.rendererMap[ECSUtil.getComponentType(comp)];
};

pro.bindRenderer = function (compName,rendererName) {
    //TODO:这里的绑定关系应该在ECS里建表
    this.rendererMap[ECSUtil.getComponentType(compName)] = ECSUtil.getComponentType(rendererName);
    this.rendererArray.push(ECSUtil.getComponentType(rendererName));
};

//获取一个单例组件force强制创建
pro.getSingleton=function (Component, force) {
    let args=[].slice.call(arguments);
    if (args.length>0) {
        args.splice(0, 1);
    }
    let name;
    if (typeof Component==='string') {
        name=Component;
    } else if (Component.defineName) {
        name=Component.defineName();
    } else {
        name=Component.getComponentName?Component.getComponentName():Component.prototype.__classname;
    }
    if (!this._componentPools[name]) {
        logger.error(this.getRoleString()+' 单例组件:'+name+'不存在');
        return;
    }
    // if (args.length > 0) {
    //     return this._componentPools[name].get.apply(this._componentPools[name], args);
    // }
    let comp=this._componentPools[name].get();
    if (!comp._entity) {
        if (!(force||this._server)) {
            return;
        }
        let ent = this.createEntity();
        ent.add(comp);
    }
    return comp;
};

/**
 * 生成一个新的ID来创建一个实体<Entity>
 * @returns {Entity}
 */
pro.createEntity=function (id) {
    id=id||this.generateID();
    if (this._entityPool[id]) {
        throw new Error(id+' entity already exist');
    }
    this._dirty=true;
    let ent=new Entity(this, id);
    this._newEntities.push(ent);
    this._entityPool[id]=ent;
    return ent
};

/**
 *
 * @param id
 * @return {*}
 */
pro.hasEntity=function (id) {
    return this._entityPool[id];
};

pro.getEntity=function (id,a) {
    return this._entityPool[id];
};

/**
 * 立即移除一个实体<Entity>,并从所有集合<Group>中移除
 * @param ent
 */
pro.removeEntityInstant=function (ent) {
    let entity=ent;
    if (ECSUtil.isNumber(ent)) {
        entity=this._entityPool[ent];
    }
    if (!entity) {
        //logger.error('Entity不存在');
        return;
    }
    let id=entity.id;
    for (let i in this._groups) {
        if (!this._groups.hasOwnProperty(i)) {
            continue;
        }
        this._groups[i].removeEntity(entity);
    }
    entity.onDestroy();
    entity=null;
    delete this._entityPool[id];
};

pro.removeEntity=function (ent) {
    let entity=ent;
    if (ECSUtil.isNumber(ent)) {
        entity=this._entityPool[ent];
    }
    if (!entity) {
        //logger.error('Entity不存在');
        return;
    }
    this._dirty=true;
    this._toDestroyEntities.push(entity);
    this._toDestroyEntityIDs.push(entity.id);
    return entity;
};

pro.getComponentPrototype = function (name) {
    return this.getComponentPool(name)._component;
};
/**
 * 获取一个组件池<ComponentPool>
 * @param comp
 * @returns {*}
 */
pro.getComponentPool=function (comp) {
    let name=ECSUtil.getComponentType(comp);
    if (!name) {
        logger.error(this.getRoleString()+' 组件错误或未注册',comp);
        return;
    }
    let pool=this._componentPools[name];
    if (!pool) {
        logger.error(this.getRoleString()+' ComponentPool:'+name+'不存在');
        return null;
    }
    return pool;
};
/**
 * 创建组件
 * @param comp
 * @returns {null}
 */
pro.createComponent=function (comp) {
    let args=[].slice.call(arguments);
    comp=args[0];
    args.splice(0, 1);
    let pool=this.getComponentPool(comp);
    if (pool) {
        if (args.length>0) {
            return pool.get.apply(pool, args);
        }
        return pool.get();
    }
    logger.error(this.getRoleString()+' 参数出错');
    return null;
};

/**
 * 找出包含该组件<Component>的集合<Group>并缓存到对象this._cachedGroups中
 * @param comp <string>
 */
pro.cacheGroups=function (comp) {
    let ret=[];
    for (let i in this._groups) {
        if (!this._groups.hasOwnProperty(i)) {
            continue;
        }
        if (ECSUtil.includes(i, comp)) {
            ret.push(this._groups[i]);
        }
    }
    this._cachedGroups[comp]=ret;
    return ret;
};

/**
 * 当一个实体<Entity>增加一个组件<Component>时,实体管理器<ECS>遍历所有的集合<Group>然后添加实体<Entity>到合适的集合<Group>
 * @param comp <string> 要增加的组件<Component>名称
 * @param ent
 */
pro.assignEntity=function (comp, ent) {
    let cachedGroups=this._cachedGroups[comp] ? this._cachedGroups[comp]:this.cacheGroups(comp);
    for (let i=0; i<cachedGroups.length; i++) {
        cachedGroups[i].addEntity(ent);
    }
};

/**
 * 当一个实体<Entity>删除一个组件<Component>时,实体管理器<ECS>遍历所有的集合<Group>然后从包含该实体的集合<Group>中删除该实体<Entity>
 * @param comp
 * @param ent
 */
pro.reassignEntity=function (comp, ent) {
    let cachedGroups=this._cachedGroups[comp] ? this._cachedGroups[comp]:this.cacheGroups(comp);
    for (let i=0; i<cachedGroups.length; i++) {
        cachedGroups[i].removeEntity(ent);
    }
};

/**
 * 回收一个Component
 * @param comp
 */
pro.recycleComponent=function (comp) {
    let pool=this.getComponentPool(comp);
    if (pool) {
        pool.recycle(comp);
    }
};

/**
 * 获得几个集合<Group>的hash值
 * @param compGroup
 * @returns {[string]}
 */
pro.hashGroups=function (compGroup) {
    if (!ECSUtil.isArray(compGroup)) {
        compGroup=[compGroup];
    }
    let retArr = [[]];
    for (let i=0; i<compGroup.length; i++) {
        let comp = compGroup[i];
        if (ECSUtil.isArray(comp)) {
            let tempArr = [];
            for (let j=0;j<comp.length;j++) {
                for (let k=0;k<retArr.length;k++) {
                    let arr = retArr[k].slice();
                    arr.push(ECSUtil.getComponentType(comp[j]));
                    tempArr.push(arr);
                }
            }
            retArr = [];
            retArr = tempArr;
        } else {
            for (let j=0;j<retArr.length;j++) {
                retArr[j].push(ECSUtil.getComponentType(comp));
            }
        }
    }
    for (let i=0;i<retArr.length;i++) {
        retArr[i].sort();
    }
    return retArr;
    // let arr = compGroup.slice();
    // arr.sort();
    // let ret = '';
    // for (let i=0;i<arr.length;i++) {
    //     ret+=arr[i];
    // }
    // return ret;
};

/**
 * 向实体管理器<ECS>注册多个集合<Group>
 * @param compGroups
 * @returns {*}
 */
pro.registerGroups=function (compGroups) {
    if (!compGroups||compGroups.length===0) {
        return [];
    }
    let hashes=this.hashGroups(compGroups);
    //获取注册相关的集合<Group>,如果有就作为updater方法的参数,没有就创建一个
    let groups = [];
    for (let i=0;i<hashes.length;i++) {
        let hash = hashes[i];
        let group=this._groups[hash];
        if (!group) {
            group=new Group(hashes[i]);
            this._groups[hash]=group;
        }
        if (this._index>0) {
            for (let i in this._entityPool) {
                // if (!this._entityPool.hasOwnProperty(i)) {
                //     continue;
                // }
                group.addEntity(this._entityPool[i]);
            }
        }
        groups.push(group);
    }
    return groups;
};
/**
 * 注册系统到<ECS>
 * @param system
 */
pro.registerSystem=function (system) {
    //如果是数组则分别添加其中的子系统
    if (ECSUtil.isArray(system)) {
        for (let i=0; i<system.length; i++) {
            this.registerSystem(system[i]);
        }
        return;
    }
    let sys;
    if (ECSUtil.isObject(system)) {
        sys=new System(this, system);
    }

    if (ECSUtil.isFunction(system)) {
        sys=new System(this, new system());

    }
    if (!sys.name) {
        logger.error(this.getRoleString()+' System无名称不合法', sys, sys.name);
        return;
    }

    sys.onRegister&&sys.onRegister(this);
    if (sys.enabled) {
        sys.onEnable&&sys.onEnable(this);
    }

    this._addSystemCount++;
    sys.setAddOrder(this._addSystemCount);
    this._systemIndexes[sys.name]=this._systems.length;
    this._systems.push(sys);
    let desc=sys.desc&&ECSUtil.isString(sys.desc) ? "\n"+"说明: "+sys.desc:'';
    if (!sys.components||sys.components.length===0) {
        logger.warn(this.getRoleString()+' 系统:'+sys.name+'不存在监听组件');
        sys.components=[];
    }
    let hashs=this.hashGroups(sys.components);
    let compstr='监听组件:';
    for (let i=0; i<hashs.length; i++) {
        compstr+='{';
        for (let j=0;j<hashs[i].length;j++) {
            compstr+='[';
            compstr+=hashs[i][j];
            compstr+=']';
        }
        compstr+='}';
    }
    logger.info(this.getRoleString()+"\n添加系统: "+sys.name+" 优先级: "+(sys.priority ? sys.priority:0)+" 添加次序: "+sys._addOrder+desc+'\n'+compstr);
    this.sortSystems();
};

/**
 * 按照优先级对系统进行排序
 */
pro.sortSystems=function () {
    this._systems.sort(function (a, b) {
        if (!a.priority&& !b.priority) {
            return a._addOrder>b._addOrder;
        }
        if (a.priority===b.priority) {
            return a._addOrder>b._addOrder;
        }
        return a.priority>b.priority
    });
    this._systemIndexes={};
    for (let i=0; i<this._systems.length; i++) {
        let system=this._systems[i];
        this._systemIndexes[system.name]=i;
    }
};

pro.sortOrder=function (a, b) {
    if (a.activeTime===b.activeTime) {
        if (!a.system.priority&& !b.system.priority) {
            return a.system._addOrder-b.system._addOrder;
        }
        if (a.system.priority===b.system.priority) {
            return a.system._addOrder-b.system._addOrder;
        }
        return a.system.priority-b.system.priority;
    }
    if (a.activeTime<b.activeTime) {
        return -1;
    }
    if (a.activeTime>b.activeTime) {
        return 1;
    }
};

pro.getSystem=function (name) {
    let index=this._systemIndexes[name];
    if (index!==undefined) {
        return this._systems[index];
    }
};

pro.generateID=function () {
    if (this._server) {
        this._index++;
        return this._index;
    } else {
        this._indexClient--;
        return this._indexClient;
    }
};

pro.update=function (dt) {
//按照顺序来迭代系统
    let systemReadyToUpdate=[];
    for (let i=0; i<this._systems.length; i++) {
        let system=this._systems[i];
        let updates=system.calUpdate(this._updateInterval, this._timer.runningTime, this);
        for (let j=0; j<updates.length; j++) {
            systemReadyToUpdate.push({
                interval:updates[j].interval,
                activeTime:updates[j].activeTime,
                system:system
            })
        }
    }

    systemReadyToUpdate.sort(this.sortOrder.bind(this));

    for (let i=0; i<systemReadyToUpdate.length; i++) {
        let system=systemReadyToUpdate[i].system;
        let dt=systemReadyToUpdate[i].interval;
        let now=systemReadyToUpdate[i].activeTime;
        system.doUpdates(dt, now, this);
    }

    for (let i in this._componentPools) {
        this._componentPools[i].update(dt);
    }
    // logger.debug('entity:'+this._entityCount+' component:'+this.getComponentCount());
};

pro.getComponentCount=function () {
    let ret=0;
    for (let i in this._componentPools) {
        if (this._componentPools[i]._itemCount) {
            ret+=this._componentPools[i]._itemCount;
        }
    }
    return ret;
};

pro.lateUpdate=function () {
    for (let i=0;i<this._lateAddQueue.length;i++) {
        let addComp = this._lateAddQueue[i];
        addComp.onAdd(addComp._entity,this);
    }
    this._lateAddQueue = [];
    let systemReadyToUpdate=[];
    for (let i=0; i<this._systems.length; i++) {
        let system=this._systems[i];
        let updates=system.calUpdate(this._updateInterval, this._timer.runningTime, this);
        for (let j=0; j<updates.length; j++) {
            systemReadyToUpdate.push({
                interval:updates[j].interval,
                activeTime:updates[j].activeTime,
                system:system
            })
        }
    }

    systemReadyToUpdate.sort(this.sortOrder.bind(this));

    for (let i=systemReadyToUpdate.length-1; i>=0; i--) {
        let system=systemReadyToUpdate[i].system;
        let dt=systemReadyToUpdate[i].interval;
        let now=systemReadyToUpdate[i].activeTime;
        system.doLateUpdates(dt, now, this);
    }
};

pro.destroy=function (cb) {
    this.cleanBuffer();
    this._enabled=false;
    this.onDisable&&this.onDisable();
    this._ecsReadyDestroy=true;
    this.destroyCb = cb;
};

pro._destroy=function () {
    this._enabled=false;
    this.unscheduleAll();
    this._timer.destroy();
    for (let i in this._entityPool) {
        this.removeEntityInstant(this._entityPool[i]);
    }

    for (let i=0; i<this._toDestroyEntities; i++) {
        let ent=this._toDestroyEntities[i];
        delete this._entityPool[ent.id];
        ent.onDestroy();
        ent=null;
    }
    this._toDestroyEntities=[];

    for (let i in this._componentPools) {
        this._componentPools[i].destroy();
    }
    this._entityPool={};            //实体<Entity>池
    this._commands={};                //注册的命令组件
    this._commandQueueMaps=[];        //以命令名为键的队列
    this._singleton=null;
    this._componentPools={};        //各种组件池<ComponentPool>容器
    this._groups={};                //各种集合<Group>容器,组件<Component>数组为键值
    this._cachedGroups={};          //单个组件<Component>为键值的集合<Group>缓存
    this._systems=[];               //各个系统和监听集合
    this._toDestroyEntities=[];    //在这轮遍历中要删除的entity队列
    this._index=0;                  //实体<Entity>ID分配变量
    this._entityCount=0;            //实体数量
    this._addSystemCount=0;
    this._objContainer={};

    this._ecsDestroyed=true;

};

pro.schedule=function (name, callback, interval, repeat, delay) {
    if (ECSUtil.isFunction(name)){
        delay = repeat;
        repeat = interval;
        interval = callback;
        callback = name;
        this.scheduleId=this.scheduleId||0;
        this.scheduleId++;
        name=this.scheduleId;
    }
    if (callback<0) {
        logger.error(this.getRoleString()+' 参数为空');
        throw Error;
    }
    if (interval<0) {
        logger.error(this.getRoleString()+' 时间间隔不能小于0');
        throw Error;
    }

    interval=interval||0;
    repeat=isNaN(repeat) ? Number.MAX_VALUE-1:repeat;
    delay=delay||0;
    this._timer.schedule(name, callback, interval, repeat, delay, 0);
};

pro.getSchedule=function (name) {
    return this._timer.getSchedule(name);
};

pro.unschedule=function (name, callback_fn) {
    if (name) {
        this._timer.unschedule(name);
    } else if (callback_fn) {
        this._timer.unschedule(callback_fn);
    }
};

pro.scheduleUnique=function (name, callback, delay) {
    if (!name||typeof name !== 'string') {
        logger.error(this.getRoleString()+' 唯一任务必须有名称!');
        return;
    }
    if (this._uniqueSchedules[name]) {
        return;
    }
    this._uniqueSchedules[name] = true;
    this.schedule(name, callback, 0, 1, delay, 0);
};

pro.scheduleOnce=function (name, callback, delay) {
    this.schedule(name,callback,0,1,delay);
};

pro.unscheduleAll=function () {
    this._timer.unscheduleAll();
};

pro.disableSystem=function (name) {
    let sys=this.getSystem(name);
    if (sys&&sys.enabled) {
        sys.enabled=false;
        sys.onDisable&&sys.onDisable(this);
    }
};

pro.enableSystem=function (name) {
    let sys=this.getSystem(name);
    if (sys&&!sys.enabled) {
        sys.enabled=true;
        sys.onDisable&&sys.onDisable(this);
    }
};

pro.isServer=function () {
    return this._server;
};

pro.isClient=function () {
    return !this._server;
};

pro.start=function () {
    if (!this._enabled) {
        this._enabled=true;
        this.onEnable&&this.onEnable();
        if (this._turned) {
            this.tick();
        } else {
            this._timer.start();
        }
        logger.error('ecs start');
    }
};

pro.stop = function () {
    this._enabled=false;
    this._timer.stop();
    this.onDisable&&this.onDisable();
};

pro.pause = function () {
    this._timer.pause();
};

pro.resume = function () {
    this._timer.resume();
};

module.exports=ECS;
