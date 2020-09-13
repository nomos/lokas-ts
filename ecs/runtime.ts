import {log} from "../utils/logger";
import {Entity} from "./entity";
import {Group} from "./group";
import {ISystem} from "./system";
import {Connection} from "./connection";
import {IComponent} from "./default_component";
import {ComponentPool, IComponentPool} from "./component_pool";
import {ComponentSingleton} from "./component_singleton";
import {Timer} from "./ecs_timer";
import {EventEmitter} from "../utils/event_emitter";
import {util} from "../utils/util";
import * as bt from "../protocol/bt"
import {TAGComplex} from "../protocol/complex";
import {TAGLongArray} from "../protocol/long_array";
import {TAGList} from "../protocol/list";
import {Int} from "../protocol/bt";

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
export class Runtime extends EventEmitter{
    private _entityPool: Map<number, Entity> = new Map<number, Entity>()
    private _componentPools: Map<string, IComponentPool> = new Map<string, IComponentPool>()
    private _groups: Map<string, Group> = new Map<string, Group>() //单个组件<Component>为键值的集合<Group>缓存
    private _cachedGroups: Map<string, Array<Group>> = new Map<string, Array<Group>>()
    private _systemIndexes: Map<string, number> = new Map<string, number>()           //系统的名字索引
    private _systems: Array<ISystem> = new Array<ISystem>()
    /**ID分配和生命周期变量*/
    private _index = 0                            //实体<Entity>ID分配变量
    private _indexClient = 0                      //实体<Entity>ID分配变量
    private _server: boolean
    private _needCheckDepends: boolean
    private _turned: boolean = false
    private _enabled: boolean = false
    private _paused: boolean = false
    private _readyDestroy: boolean = false
    /**定时器变量和回调函数*/
    private _tick = 0                     //步数
    private _updateInterval:number
    private _timeScale:number
    private _timer:Timer
    private _timeOffset = 0
    private _dirty = true                //整个系统的脏标记d
    private _dirtyEntities: Array<Entity> = []           //这轮的脏标记entity
    public dirtyComponents: Array<Entity> = []         //脏Component
    private _newEntities: Array<Entity> = []
    private _toDestroyEntities: Array<Entity> = []        //在这轮遍历中要删除的entity队列
    private _toDestroyEntityIDs: Array<number> = []
    private _snapInterval: number = 0    //全实体快照时间
    private _prevSnap: boolean = false                //实体快照

    private scheduleId = 0

    private _step = 0                 //step是同步状态计数,从服务器的tick同步,客户端的tick只是自己使用
    private _steps = []               //步数队列
    private _snapshotDeltas = {}      //帧差异快照
    private _snapshotSteps = []       //快照步数队列
    private _snapshots = {}           //全实体快照
    private _lastSnapshot = null
    /**模块和组件映射表*/
    private _modules = []                 //已加载的模块
    private _addSystemCount = 0           //加载的系统order数
    private _componentDefineArray = []    //组件:ID 服务器,当前组件:ID映射
    private _componentDefineMap = {}      //hash ID:组件映射表
    private _componentDefineHash = 0      //服务器组件hash
    private _compCode:boolean      //是否加密组件名
    private rendererMap = {}
    private rendererArray = []
    private _dependsPair = {}
    private _dependsPairInverse = {}

    private _commands = {}                //注册的命令组件
    private _commandQueueMaps = []        //以命令名为键的队列
    private _commandListener = new EventEmitter() //命令注册
    private _connections: Map<string, Connection> = new Map<string, Connection>()           //客户端连接
    private _renderUpdateQueue = []       //客户端脏数据view更新队列
    private _lateAddQueue = []            //延迟Add队列
    //其他绑定函数
    private _uniqueSchedules = {}         //仅一次的任务标记
    private _spawners = {}
    private _objContainer = {}
    private _state = 'null'
    private destroyCb:()=>void
    private _cmdAddPriority:number = 0

    private alSize:number = 0
    private lastSync:TAGComplex

    constructor(updateTime, timeScale, opt) {
        super()
        opt = opt || {}

        if (updateTime === 0) {
            this._turned = true;
        }
        /**基础变量*/

        this. _updateInterval = updateTime || 1000 / 60.0
        this. _timeScale = Math.min(timeScale, 20) || 1.0
        this._timer = new Timer(this._updateInterval, this._timeScale)
        this._server = opt.server || false;           //客户端的ID从Max_Long开始自减,服务器的ID从0开始自增
        this._needCheckDepends = opt.strict || false;

        /**定时器变量和回调函数*/
        this._snapInterval = opt.snapInterval || 0;    //全实体快照时间
        this._prevSnap = opt.canReverse || false;                //实体快照

        this._compCode = opt.compCode;      //是否加密组件名
    }

    get enabled() {
        return this._enabled;
    }

    get entityCount() {
        return Object.keys(this._entityPool).length;
    }

    get needCheckDepends(){
        return this._needCheckDepends
    }

    addDepends(a, b) {
        a = util.getComponentType(a);
        b = util.getComponentType(b);
        this._dependsPair[a] = this._dependsPair[a] || [];
        this._dependsPair[a].push(b);
        this._dependsPairInverse[b] = this._dependsPairInverse[b] || [];
        this._dependsPairInverse[b].push(a);
    }

    isDepend(a, b) {
        a = util.getComponentType(a);
        b = util.getComponentType(b);
        return (this._dependsPair[a] || []).indexOf(b) !== -1;
    }

    getDependsBy(a) {
        a = util.getComponentType(a);
        return this._dependsPairInverse[a] || [];
    }

    getDepends(a) {
        a = util.getComponentType(a);
        return this._dependsPair[a] || [];
    }

    _sortDepends(a, b) {
        a = util.getComponentType(a);
        b = util.getComponentType(b);
        this._dependsPair[a] = this._dependsPair[a] || [];
        if (this._dependsPair[a].indexOf(b) !== -1) {
            return 1;
        }
        this._dependsPair[b] = this._dependsPair[b] || [];
        if (this._dependsPair[b].indexOf(a) !== -1) {
            return -1;
        }
        return 0;
    }

    _sortDependsInverse(a, b) {
        return -this._sortDepends(a, b);
    }

    getRoleString() {
        if (this.isClient()) {
            return '客户端';
        } else {
            return '服务器';
        }
    }

    setupUpdateFunc() {
        this._timer.onUpdate((dt)=>
        {
            if (!this._enabled) {
                if (this._readyDestroy) {
                    this._readyDestroy = false;
                    this._destroy();
                    this.destroyCb && this.destroyCb();
                }
                return;
            }

            this.emit('_beforeUpdate');
            this.emit('beforeUpdate');
            this._tick++;
            this.update(dt, this._turned);
        });


        this._timer.onLateUpdate((dt)=>
        {
            if (!this._enabled) {
                return;
            }
            this.lateUpdate(dt);
            if (this._dirty && this._server) {
                //TODO:这里还有问题
                // if (this._tick>1) {
                //     this.snapStep();
                // }
                // if (this._tick===1) {
                //     this.snapshot();
                // } else {
                //     this.snapshot(true);
                // }
                this._step = this._tick;
            }
            this.cleanBuffer();
            this.emit('afterUpdate');
            this.emit('_afterUpdate');
        });
    }

    cleanBuffer() {
        //遍历集合删除实体队列
        for (let i in this._groups) {
            this._groups[i].removeEntityArray(this._toDestroyEntities);
        }
        //彻底删除实体并调用onDestroy方法删除所有组件
        for (let i = 0; i < this._toDestroyEntities.length; i++) {
            let ent = this._toDestroyEntities[i];
            let index = this._newEntities.indexOf(ent);
            if (index !== -1) {
                this._newEntities.splice(index, 1);
            }
            index = this._dirtyEntities.indexOf(ent);
            if (index !== -1) {
                this._dirtyEntities.splice(index, 1);
            }
            let entId = ent.id;
            delete this._entityPool[entId];
            ent.onDestroy();
            ent = null;
        }
        //重置实体队列
        this._toDestroyEntities = [];
        this._dirty = false;

        for (let i = 0; i < this.dirtyComponents.length; i++) {
            this.dirtyComponents[i] && this.dirtyComponents[i].clean();
        }
        for (let i = 0; i < this._dirtyEntities.length; i++) {
            this._dirtyEntities[i].clean();
        }
        for (let i = 0; i < this._newEntities.length; i++) {
            this._newEntities[i].clean();
        }

        for (let i in this._groups) {
            this._groups[i].clean();
        }
        this.dirtyComponents = [];
        this._dirtyEntities = [];
        this._newEntities = [];
        if (this.isClient()) {
            for (let i = 0; i < this._renderUpdateQueue.length; i++) {
                let comp = this._renderUpdateQueue[i];
                comp && comp._entity && comp.updateView(comp._entity, this);
            }
            this._renderUpdateQueue = [];
        }
    }

    setTimeScale(timeScale) {
        this._timeScale = Math.min(timeScale, 20) || 1.0;
        this._timer.timeScale = timeScale;
    }

    getTimeScale() {
        return this._timeScale;
    }

    getScaledTimeBySecond(time) {
        return time / 1000 / this._timeScale;
    }

    isState(state) {
        return this._state === state;
    }

    setState(state) {
        if (this._state !== state) {
            this.offStateSystems(this._state);
            this._state = state;
            this.onStateSystems(state);
            this._dirty = true;
        }
    }

    offStateSystems(state) {
        for (let i = 0; i < this._systems.length; i++) {
            let system = this._systems[i];
            if (system.stateOnly && system.stateOnly === state) {
                this.once('_afterUpdate',function () {
                    system.offState(Date.now(), this);
                }.bind(this));
            }
        }
    }

    onStateSystems(state) {
        for (let i = 0; i < this._systems.length; i++) {
            let system = this._systems[i];
            if (system.stateOnly && system.stateOnly === state) {
                this.once('_afterUpdate',function () {
                    system.onState(Date.now(), this);
                }.bind(this));
            }
        }
    }

    getState():string {
        return this._state;
    }

    set(name, obj) {
        this._objContainer[name] = obj;
    }

    get(name) {
        return this._objContainer[name];
    }

    setSpawner(name, func) {
        this._spawners[name] = func.bind(null, this);
    }

    spawnEntity(name) {
        let spawnFunc = this._spawners[name];
        let args = [].slice.call(arguments);
        args.splice(0, 1);
        return spawnFunc && spawnFunc.apply(null, args);
    }

    adjustTimer(time) {

    }

//事件监听'__unserializeEntity'+step每次客户端更新后从事件列表删除
    offUnserializeEntityEvent(step) {
        this.off(new RegExp("__unserializeEntity" + step));
    }

    nbt2Entity(step, nbtObj) {
        let id = nbtObj.at(0).value.toNumber();
        let ent = this.getEntity(id);
        if (!ent) {
            ent = this.createEntity(id);
        }
        ent.fromNBT(step, nbtObj);
        this.emit('__unserializeEntity' + step + id, id, ent);
        ent.dirty();
        return ent;
    }

//服务器保存全局快照
    snapshot(temp) {
        let ret = bt.Complex();
        let entityIndexes = bt.LongArray();
        let entities = bt.List();
        ret.addValue(bt.Long(this._tick));
        ret.addValue(bt.String(this._state));
        for (let i in this._entityPool) {
            let ent = this._entityPool[i];
            let snapEnt = ent.snapshot();
            entities.push(snapEnt);
            entityIndexes.push(ent.id);
        }
        ret.addValue(entityIndexes);
        ret.addValue(entities);

        if (!temp) {
            this._snapshotSteps.push(this._tick);
            this._snapshots[this._tick] = ret;
        }
        this._lastSnapshot = ret;
        return ret;
    }

//从服务器更新全局快照
    syncSnapshotFromServer(btObj) {
        let step = this._step = btObj.at(0).value.toNumber();
        this.setState(btObj.at(1).value);
        let nbtEntArray = btObj.at(3);
        for (let i = 0; i < nbtEntArray.getSize(); i++) {
            let entNbt = nbtEntArray.at(i);
            this.nbt2Entity(this._step, entNbt);
        }
        this.offUnserializeEntityEvent(step);
    }

//差异快照切片
    snapStep() {
        let ret = bt.Complex();

        ret.addValue(bt.Long(this._tick));
        ret.addValue(bt.String(this._state));

        let modEntArr = bt.List();
        let newEntArr = bt.List();
        let remEntArr = bt.LongArray();
        for (let i = 0; i < this._dirtyEntities.length; i++) {
            let ent = this._dirtyEntities[i];
            if (false && ent.id < 0) {
                continue;
            }
            let entComplex = bt.Complex();
            let entSnapCur = ent.snapCurrent();
            entComplex.addValue(entSnapCur);
            if (this._prevSnap) {
                let entSnapPrev = ent.snapPrevious();
                if (entSnapPrev) {
                    entComplex.addValue(entSnapPrev);
                }
            }
            modEntArr.push(entComplex);
        }
        for (let i = 0; i < this._newEntities.length; i++) {
            let ent = this._newEntities[i];
            if (false && ent.id < 0) {
                continue;
            }
            let entSnap = ent.snapshot();
            newEntArr.push(entSnap);
        }
        for (let i = 0; i < this._toDestroyEntityIDs.length; i++) {
            let id = this._toDestroyEntityIDs[i];
            if (false && id < 0) {
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
        this._snapshotDeltas[this._tick] = ret;
        return ret;
    }

    syncSnapDeltaFromServer(btObj, backward?) {
        let step = btObj.at(0).value.toNumber();
        if (this._step === step) {
            return;
        } else {
            this._step = step;
        }
        this.setState(btObj.at(1).value);
        let modArr = btObj.at(2);
        let addArr = btObj.at(3);
        let remArr = btObj.at(4);
        for (let i = 0; i < modArr.getSize(); i++) {
            let modNbtEnt = modArr.at(i);
            this.nbt2Entity(step, modNbtEnt.at(0));
        }
        for (let i = 0; i < addArr.getSize(); i++) {
            let addNbtEnt = addArr.at(i);
            this.nbt2Entity(step, addNbtEnt);
        }
        for (let i = 0; i < remArr.getSize(); i++) {
            let remId = remArr.at(i).at(0).value.toNumber();
            this.removeEntity(remId);
        }
        this.offUnserializeEntityEvent(step);
    }

//获取上一次的实体切片
    getPrevSnapEntity(id) {
        if (this._lastSnapshot) {
            let entIndex = this._lastSnapshot.at(2).toJSON().indexOf('' + id);
            return this._lastSnapshot.at(3).at(entIndex);
        }
    }

//同步到客户端(时间片同步)
    syncToClient(curStep) {
        if (curStep === this._step) {
            return;
        }
        let ret = bt.Complex();
        ret.addValue(bt.Float(this._timeScale));
        ret.addValue(bt.Long(this._step));
        let startStep;
        let snapshot;
        let init = false;
        if (curStep === 0) {
            init = true;
            startStep = this.getNearestSnapshot(curStep);
            if (!startStep) {
                return;
            }
            snapshot = this._snapshots[startStep];
            curStep = startStep;
        }

        //获取step之后的所有steps
        let toSyncStepsIndex = this._steps.indexOf(curStep);
        if (toSyncStepsIndex === -1) {
            log.error('客户端超过Step限制');
        }
        let length = this._steps.length;
        if (toSyncStepsIndex === length - 1) {
            // log.debug('客户端已经是最新',curStep);
        }
        let toSyncSteps = [];
        for (let i = toSyncStepsIndex + 1; i < length; i++) {
            toSyncSteps.push(this._steps[i]);
        }
        ret.addValue(bt.LongArray(toSyncSteps));
        let syncFrames = bt.List();
        for (let i = 0; i < toSyncSteps.length; i++) {
            let syncFrameNbt = this._snapshotDeltas[toSyncSteps[i]];
            syncFrames.push(syncFrameNbt);
        }
        ret.addValue(syncFrames);
        if (init) {
            ret.addValue(bt.Long(startStep));
            ret.addValue(snapshot);
        }
        return ret.writeToBuffer();
    }

    syncFromServer(buff) {
        if (!buff) {
            return;
        }
        this.alSize += buff.length;
        log.info('总发送字节数', this.alSize / 1000.0 + 'k');
        let nbtdata = <TAGComplex>bt.readFromBuffer(buff);
        if (!nbtdata || this._step === nbtdata.at(1).value.toNumber()) {
            return;
        }
        this.setTimeScale(nbtdata.at(0).value);
        if (nbtdata.getSize() == 5) {
            this.syncSnapshotFromServer(nbtdata.at(5));
        }
        let snapSteps = <TAGLongArray>nbtdata.at(3);
        for (let i = 0; i < snapSteps.getSize(); i++) {
            this.syncSnapDeltaFromServer(snapSteps.at(i));
        }
    }

    getNearestSnapshot(curStep) {
        if (!this._snapshotSteps.length) {
            log.error('服务器未初始化');
            return 0;
        }
        if (this._snapshotSteps.length === 1) {
            return this._snapshotSteps[0];
        }
        for (let i = this._snapshotSteps.length - 1; i >= 0; i--) {
            let step = this._snapshotSteps[i];
            if (curStep >= step) {
                log.error('错误,超出最大限制');
            }
            if (step > curStep) {
                return step;
            }
        }
    }

    getConnection(uid) {
        return this._connections[uid]
    }

    getConnections() {
        return this._connections;
    }

    getConnectionNum() {
        return Object.keys(this._connections).length;
    }

    addConnection(uid) {
        if (this.getConnection(uid)) {
            log.error('已存在连接', uid);
            return;
        }
        this._connections[uid] = new Connection(uid, this);
    }

    removeConnection(uid) {
        delete this._connections[uid];
    }


    getComponentDefinesToNbt() {
        let ret = bt.List();
        for (let i = 0; i < this._componentDefineArray.length; i++) {
            let comp = this._componentDefineArray[i];
            let strNbt = bt.String(comp);
            ret.push(strNbt);
        }
        return ret;
    }

    setComponentDefinesFromNbt(nbtdata) {
        if (nbtdata.getSize() === 0) {
            return;
        }
        let defines = nbtdata.toJSON();
        this._componentDefineArray = defines;
        this._componentDefineMap = {}
        for (let i = 0; i < defines.length; i++) {
            this._componentDefineMap[defines[i]] = true;
        }
        this.genComponentDefineHash();
    }

    getComponentNameFromDefine(define) {
        if (typeof define === 'string') {
            return define;
        }
        return this._componentDefineArray[define];
    }

    getComponentDefine(comp) {
        if (typeof comp !== 'string') {
            comp = util.getComponentType(comp);
        }
        return this._componentDefineMap[comp];
    }

    getComponentDefineToNbt(comp) {
        if (this._compCode) {
            return bt.Byte(this.getComponentDefine(comp));
        } else {
            return bt.String(util.getComponentType(comp));
        }
    }

    genComponentDefineHash() {
        let ret = this._componentDefineArray.length * 10000;
        for (let i = 0; i < this._componentDefineArray.length; i++) {
            let comp = this._componentDefineArray[i];
            for (let j = 0; j < comp.length; j++) {
                ret += comp[j].charCodeAt();
            }
        }
        this._componentDefineHash = ret;
    }

    setComponentDefine(comp) {
        if (this.isClient()) {
            return;
        }
        if (this._componentDefineArray.indexOf(comp) !== -1) {
            throw new Error('comp already defined');
        }
        this._componentDefineArray.push(comp);
        this._componentDefineMap[comp] = this._componentDefineArray.length - 1;
        this.genComponentDefineHash();
    }

//从服务器差异更新(根据客户端联网实体的step信息)
    rSyncFromServer(buff) {
        if (!buff) {
            return;
        }
        this.alSize = this.alSize || 0;
        this.alSize += buff.length;
        let nbtdata = <TAGComplex>bt.readFromBuffer(buff);
        //TODO:临时赋值
        this.lastSync = nbtdata;
        // log.debug('总发送字节数', this.alSize/1000.0+'k',nbtdata.at(4).toJSON());
        this.setComponentDefinesFromNbt(nbtdata.at(1));
        let compHash = nbtdata.at(0).value;
        if (compHash !== this._componentDefineHash) {
            return 2;
        }
        let timescale = nbtdata.at(2).value;
        let oldStep = nbtdata.at(3).value.toNumber();
        let step = nbtdata.at(4).value.toNumber();
        if (this._step === step) {
            return 0;   //无需更新,丢弃帧数据
        } else if (this._step !== oldStep) {
            return 2;   //需要更新,上传元数据
        } else {
            this._step = step;
        }
        this.setTimeScale(timescale);
        this.setState(nbtdata.at(5).value);
        let modArr = <TAGList>nbtdata.at(6);
        let addArr = <TAGList>nbtdata.at(7);
        let remArr = <TAGLongArray>nbtdata.at(8);
        for (let i = 0; i < modArr.getSize(); i++) {
            let modNbtEnt = modArr.at(i);
            this.nbt2Entity(step, modNbtEnt);
        }
        for (let i = 0; i < addArr.getSize(); i++) {
            let addNbtEnt = addArr.at(i);
            this.nbt2Entity(step, addNbtEnt);
        }
        for (let i = 0; i < remArr.getSize(); i++) {
            let remId = remArr.at(i).toNumber();
            this.removeEntity(remId);
        }
        this.offUnserializeEntityEvent(step);
        return 1;   //更新成功
    }

    rPushToClient(uid) {
        let conn = this.getConnection(uid);
        if (!conn) {
            log.error('Connection is not exist:', uid);
        }
        if (conn.step > this._step) {
            log.error('Client Step Error');
            return;
        }
        //帧号相等,不需要更新
        if (conn.step === this._step) {
            return;
        }
        let curStep = conn.step;
        let clientData = conn.entitySteps;
        return this.getRSyncData(curStep, clientData, conn);
    }

//客户端获取所有联网实体的step信息
    fetchEntitySyncData() {
        let ret = bt.Complex();
        //加入客户端当前tick,如果tick和服务器一致就不需要同步
        ret.addValue(bt.Int(this._componentDefineHash));
        ret.addValue(bt.Long(this._step));
        let entarr = bt.LongArray();
        for (let i in this._entityPool) {
            let ent = this._entityPool[i];
            if (ent._id > 0) {
                entarr.push(ent._id);
                entarr.push(ent._step);
            }
        }
        ret.addValue(entarr);
        return ret.writeToBuffer();
    }

//差异同步到客户端,客户端提供所有的实体entity stepID
    rSyncToClient(buff, uid) {
        //获取客户端的step
        let conn = this.getConnection(uid);
        if (!conn) {
            log.error('player not exist', uid);
            return;
        }
        let nbtdata = <TAGComplex>bt.readFromBuffer(buff);
        conn.compHash = nbtdata.at(0).value;
        let curStep = nbtdata.at(1).value.toNumber();
        let entArr = <TAGLongArray>nbtdata.at(2);
        let clientData = new Map<number,number>()
        for (let i = 0; i < entArr.getSize(); i += 2) {
            let index = entArr.at(i).toNumber();
            let step = entArr.at(i + 1).toNumber();
            clientData[index] = step;
        }
        return this.getRSyncData(curStep, clientData, conn);
    }

    getRSyncData(curStep, clientData:Map<number,number>, connection) {
        if (curStep === this._step) {
            return;
        }
        let ret = bt.Complex();

        let compDefineNbt = bt.List();
        ret.addValue(bt.Int(this._componentDefineHash));
        if (connection.compHash !== this._componentDefineHash) {
            compDefineNbt = this.getComponentDefinesToNbt();
            connection.compHash = this._componentDefineHash;
        }
        //nbtcomplex-0
        ret.addValue(compDefineNbt);
        //nbtcomplex-1
        ret.addValue(bt.Float(this._timeScale));
        //nbtcomplex-2
        ret.addValue(bt.Long(curStep));
        //nbtcomplex-3
        ret.addValue(bt.Long(this._step));
        //nbtcomplex-4
        ret.addValue(bt.String(this._state));

        let modEntArr = bt.List();
        let newEntArr = bt.List();
        let remEntArr = bt.LongArray();

        clientData.forEach( (value,index,map)=> {
            let ent = this._entityPool.get(index);
            //如果有且当前实体的step小于服务器step
            if (ent) {
                if (value < ent.step) {
                    let entSnapCur = ent.snapshot(connection);
                    modEntArr.push(entSnapCur);
                }
                map[index] = ent.step;
            } else {
                //如果没有记录则直接销毁
                remEntArr.push(index);
                delete clientData[index];
            }
        })
        this._entityPool.forEach((ent,id,map)=>{
            if (clientData[id] === undefined) {
                let entSnap = ent.snapshot(connection);
                newEntArr.push(entSnap);
                clientData[id] = ent.step;
            }
        })
        //连接管理更新状态
        connection && connection.sync(this._step, clientData);
        //nbtcomplex-5
        ret.addValue(modEntArr);
        //nbtcomplex-6
        ret.addValue(newEntArr);
        //nbtcomplex-7
        ret.addValue(remEntArr);
        return ret.writeToBuffer();
    }


    /**
     * 加载模块
     */
    loadModule(mod) {
        if (!mod.name) {
            log.error('载入失败,模组没有名字', mod);
            return;
        }
        if (mod.onLoad) {
            let str = '#载入模组:' + mod.name + '------';
            if (mod.desc) {
                str += '\n';
                str += mod.desc;
            }
            log.info(str);
            mod.onLoad(this);
            log.info('模组:' + mod.name + '载入结束------\n');
        }
        this._modules[mod.name] = {
            name: mod.name,
            mod: mod
        }
    }


    reloadModules() {

    }

    /**
     * 卸载模块
     * @param name
     */
    unloadModule(name) {
        let mod = this._modules[name];
        if (!mod) {
            log.error('模组 ' + name + ' 未找到');
            return;
        }
        if (mod.unload) {
            mod.unload(this);
        }
    }

    registerCommand(name, command, priority) {
        this._cmdAddPriority++;
        command.priority = (priority ? priority * 100000 : 0) + this._cmdAddPriority;
        this._commands[name] = command;
    }

    onCommand(name, cb) {
        return this._commandListener.on(name, cb);
    }

    offCommand(name, cb) {
        if (cb) {
            return this._commandListener.off(name, cb);
        }
        return this._commandListener.removeAllListeners(name);
    }

//更新客户端命令 //在System里调用防止在加速的更新时间穿越系统更新导致系统收不到onCommand变化
    updateCommands() {
        while (this._commandQueueMaps.length) {
            let cmd = this._commandQueueMaps.shift();
            this._commandListener.emit(cmd.task, cmd);
        }
    }

//生成命令
    essCommand(cmd) {
        let cmdClass = this._commands[cmd.task];
        if (cmdClass) {
            return new this._commands[cmd.task](cmd);
        } else {
            log.error('命令格式错误或者未注册', cmd);
        }
    }

//接收命令
    receiveCommand(cmd) {
        cmd = this.essCommand(cmd);
        if (!cmd) {
            log.error('command is nil');
            return;
        }
        this._commandQueueMaps.push(cmd);
    }


    /**
     * 注册一个组件<Component>
     * @param name       组件别名,创建相同类型的组件可以指定不同别名
     * @param Component  组件
     * @param minSize    池里可用对象最小值
     * @param maxSize    使用中对象+池里可用对象的最大值
     */
    registerComponent(name, Component, maxSize, minSize) {
        let NewComponent;
        if (!name) {
            log.error('名称或组件不存在');
        }
        if (typeof name !== 'string') {
            minSize = maxSize;
            maxSize = Component;
            NewComponent = name;
            if (!name.defineName) {
                throw Error('组件:未定义');
            }
            name = name.defineName
        } else {
            if (!Component) {
                throw Error('组件:' + name + '未定义');
            }
            NewComponent = Component;
        }

        if (!util.isString(name)) {
            log.error(this.getRoleString() + ' 注册组件失败,组件名称为空');
            return;
        }

        let pool = this._componentPools[name];

        maxSize = (maxSize && maxSize > 0) ? maxSize : 100;
        minSize = (minSize && minSize > 0) ? minSize : 10;
        if (pool) {
            log.warn(this.getRoleString() + ' 已存在组件:' + name + ',不重新注册组件');
            pool._maxSize = Math.max(pool._maxSize, maxSize || 0);
            pool._minSize = Math.max(pool._minSize, maxSize || 0);
            return;
        }
        for (let depend of NewComponent.defineDepends) {
            this.addDepends(name, depend);
        }
        if (Object.getPrototypeOf(NewComponent).onRegister) {
            Object.getPrototypeOf(NewComponent).onRegister(this);
        }
        this._componentPools[name] = new ComponentPool(NewComponent, maxSize, minSize, this);
        log.info(this.getRoleString() + " 注册组件池:" + name + " 成功,最小保留对象数:" + minSize + " 最大对象数:" + maxSize);

        this.setComponentDefine(name);
    }

    /**
     * 注册单例组件
     */
    registerSingleton(name, Component:{new():IComponent}) {
        let NewComponent;
        if (typeof name !== 'string') {
            NewComponent = name;
            if (!name.defineName) {
                throw Error('组件:未定义');
            }
            name = name.defineName
        } else {
            if (!Component) {
                throw Error('组件:' + name + '未定义');
            }
            NewComponent = Component;
        }


        let pool = this._componentPools[name];
        if (pool) {
            log.warn(this.getRoleString() + ' 已存在组件单例:' + name + ',不重新注册组件');
            return;
        }
        for (let depend of NewComponent.defineDepends) {
            this.addDepends(name, depend);
        }
        this._componentPools[name] = new ComponentSingleton(NewComponent, this);
        this.setComponentDefine(name);

        log.info(this.getRoleString() + " 注册组件单例:" + name + " 成功");
    }

    addRenderQueue(comp) {
        if (this._renderUpdateQueue.indexOf(comp) === -1) {
            this._renderUpdateQueue.push(comp);
        }
    }

    lateAdd(comp) {
        if (this._lateAddQueue.indexOf(comp) === -1) {
            this._lateAddQueue.push(comp);
        }
    }

    getComponentRenderer(comp) {
        return this.rendererMap[util.getComponentType(comp)];
    }

    bindRenderer(compName, rendererName) {
        //TODO:这里的绑定关系应该在ECS里建表
        this.rendererMap[util.getComponentType(compName)] = util.getComponentType(rendererName);
        this.rendererArray.push(util.getComponentType(rendererName));
    }

    createSingleton(Component) {
        let name;
        if (typeof Component === 'string') {
            name = Component;
        } else if (Component.defineName) {
            name = Component.defineName;
        } else {
            name = Component.getComponentName ? Component.getComponentName() : Component.otype.__classname;
        }
        if (!this._componentPools[name]) {
            log.error(this.getRoleString() + ' 单例组件:' + name + '不存在');
            return;
        }

        let args = [].slice.call(arguments);
        args.splice(0, 1);
        let comp = this._componentPools[name].get.apply(this._componentPools[name], args);
        if (!comp._entity) {
            let ent = this.createEntity();
            ent.forceAdd(comp);
            log.debug(ent);
        }
        return comp;
    }

//获取一个单例组件force强制创建
    getSingleton(Component, force) {
        let args = [].slice.call(arguments);
        if (args.length > 0) {
            args.splice(0, 1);
        }
        let name;
        if (typeof Component === 'string') {
            name = Component;
        } else if (Component.defineName) {
            name = Component.defineName;
        } else {
            name = Component.getComponentName ? Component.getComponentName() : Component.otype.__classname;
        }
        if (!this._componentPools[name]) {
            log.error(this.getRoleString() + ' 单例组件:' + name + '不存在');
            return;
        }
        // if (args.length > 0) {
        //     return this._componentPools[name].get.apply(this._componentPools[name], args);
        // }
        let comp = this._componentPools[name].get();
        if (!comp._entity) {
            if (!(force || this._server)) {
                return;
            }
            let ent = this.createEntity();
            ent.add(comp);
        }
        return comp;
    }

    /**
     * 生成一个新的ID来创建一个实体<Entity>
     * @returns {Entity}
     */
    createEntity(id?) {
        id = id || this.generateID();
        if (this._entityPool[id]) {
            throw new Error(id + ' entity already exist');
        }
        this._dirty = true;
        let ent = new Entity(this, id);
        this._newEntities.push(ent);
        this._entityPool[id] = ent;
        return ent
    }

    /**
     *
     * @param id
     * @return {*}
     */
    hasEntity(id):boolean {
        return this._entityPool[id];
    }

    getEntity(id):Entity {
        return this._entityPool[id];
    }

    /**
     * 立即移除一个实体<Entity>,并从所有集合<Group>中移除
     * @param ent
     */
    removeEntityInstant(ent) {
        let entity = ent;
        if (util.isNumber(ent)) {
            entity = this._entityPool[ent];
        }
        if (!entity) {
            //log.error('Entity不存在');
            return;
        }
        let id = entity.id;
        for (let i in this._groups) {
            if (!this._groups.hasOwnProperty(i)) {
                continue;
            }
            this._groups[i].removeEntity(entity);
        }
        this._dirty = true;
        entity.onDestroy();
        entity = null;
        delete this._entityPool[id];
        let decoy = this.createEntity(id);
        this._toDestroyEntities.push(decoy);
        this._toDestroyEntityIDs.push(id);
    }

    removeEntity(ent) {
        let entity = ent;
        if (util.isNumber(ent)) {
            entity = this._entityPool[ent];
        }
        if (!entity) {
            //log.error('Entity不存在');
            return;
        }
        this._dirty = true;
        this._toDestroyEntities.push(entity);
        this._toDestroyEntityIDs.push(entity.id);
        return entity;
    }

    getComponentPrototype(name) {
        return this.getComponentPool(name)._component;
    }

    /**
     * 获取一个组件池<ComponentPool>
     * @param comp
     * @returns {*}
     */
    getComponentPool(comp:{new():IComponent}) {
        let name = util.getComponentType(comp);
        if (!name) {
            log.error(this.getRoleString() + ' 组件错误或未注册', comp);
            return;
        }
        let pool = this._componentPools[name];
        if (!pool) {
            log.error(this.getRoleString() + ' ComponentPool:' + name + '不存在');
            return null;
        }
        return pool;
    }

    /**
     * 创建组件
     * @param comp
     * @returns {null}
     */
    createComponent(comp:{new():IComponent},...args:any) {
        let pool = this.getComponentPool(comp);
        if (pool) {
            if (args.length > 0) {
                return pool.get.apply(pool, args);
            }
            return pool.get();
        }
        log.error(this.getRoleString() + ' 参数出错');
        return null;
    }

    /**
     * 找出包含该组件<Component>的集合<Group>并缓存到this._cachedGroups中
     * @param comp <string>
     */
    cacheGroups(comp:string|IComponent):Array<Group> {
        let ret = [];
        if (typeof comp !=="string") {
            comp = <string>(comp.defineName)
        }
        this._groups.forEach((v,k,map)=>{
            if (v.includes(comp)) {
                ret.push(v)
            }
        })
        this._cachedGroups[comp] = ret
        return ret
    }

    /**
     * 当一个实体<Entity>增加一个组件<Component>时,实体管理器<ECS>遍历所有的集合<Group>然后添加实体<Entity>到合适的集合<Group>
     * @param comp <string> 要增加的组件<Component>名称
     * @param ent
     */
    assignEntity(comp, ent) {
        let cachedGroups = this._cachedGroups[comp] ? this._cachedGroups[comp] : this.cacheGroups(comp);
        for (let i = 0; i < cachedGroups.length; i++) {
            cachedGroups[i].addEntity(ent);
            cachedGroups[i].addDirtyEntity(ent);
        }
    }

    /**
     * 当一个实体<Entity>删除一个组件<Component>时,实体管理器<ECS>遍历所有的集合<Group>然后从包含该实体的集合<Group>中删除该实体<Entity>
     * @param comp
     * @param ent
     */
    reassignEntity(comp:{new():IComponent}, ent) {
        let compName = util.getComponentType(comp)
        let cachedGroups = this._cachedGroups[compName] ? this._cachedGroups[compName] : this.cacheGroups(compName);
        for (let i = 0; i < cachedGroups.length; i++) {
            cachedGroups[i].removeEntity(ent);
            cachedGroups[i].removeDirtyEntity(ent);
        }
    }

    markDirtyEntity(ent) {
        if (this._dirtyEntities.indexOf(ent) === -1 && this._newEntities.indexOf(ent) === -1) {
            this._dirtyEntities.push(ent);
        }
        this._dirty = true;
        for (let hash of ent._groupHashes) {
            this._groups[hash].addDirtyEntity(ent);
        }
    }

    /**
     * 回收一个Component
     * @param comp
     */
    recycleComponent(comp) {
        let pool = this.getComponentPool(comp);
        if (pool) {
            pool.recycle(comp);
        }
    }

    /**
     * 获得几个集合<Group>的hash值
     */
    private hashGroup(compGroup:Array<{new():IComponent}>):Array<string> {
        let retArr:Array<string> = [];
        for (let i = 0; i < compGroup.length; i++) {
            retArr.push(util.getComponentType(compGroup[i]));
        }
        retArr.sort();
        return retArr
    }

    /**
     * 向实体管理器<ECS>注册多个集合<Group>
     * @param compGroups
     * @returns {*}
     */
    registerGroup(compGroups:Array<{new():IComponent}>):Group {
        if (!compGroups || compGroups.length === 0) {
            return null;
        }
        let hash = this.hashGroup(compGroups);
        let hash_str = hash.join("_")
        let group = this._groups[hash_str];
        if (!group) {
            group = new Group(compGroups, this);
            group.hashStr = hash;
            this._groups[hash_str] = group;
            this._cachedGroups.forEach((v,k,m)=>{
                if (util.includes(hash, k)) {
                    if (v.indexOf(group) === -1) {
                        v.push(group);
                    }
                }
            })
            this._entityPool.forEach((ent,id,map)=>{
                group.addEntity(ent);
            })
            this._newEntities.forEach((ent,id,arr)=>{
                group.addDirtyEntity(ent)
            })
            this._dirtyEntities.forEach((ent,id,arr)=>{
                group.addDirtyEntity(ent)
            })
        }
        return group
    }

    getGroup(comps:Array<{new():IComponent}>):Group {
        return this.registerGroup(comps);
    }

    getEntities(comps:Array<{new():IComponent}>,optComps?:Array<{new():IComponent}>,excludes?:Array<{new():IComponent}>):Array<Entity> {
        let entities = new Array<Entity>()
        if (optComps) {
            let compGroupsArr:Array<Array<{new():IComponent}>> = new Array<Array<{new(): IComponent}>>()
            optComps.forEach((v,i,arr)=>{
                let newArr = comps.slice()
                newArr.push(v)
                compGroupsArr.push(newArr)
            })
            compGroupsArr.forEach((v,i,arr)=>{
                entities.concat(this.getGroup(v).getEntities())
            })
        } else {
            entities.concat(this.getGroup(comps).getEntities())
        }
        if (excludes) {
            excludes.forEach((v,i,k)=>{
                entities = util.exclude(entities,this.getGroup([v]).getEntities())
            })
        }
        return entities
    }

    /**
     * 注册系统到<ECS>
     */
    registerSystem(system:ISystem) {
        system.onRegister(this)
        if (system.enabled) {
            system.onEnable(this)
        }
        this._addSystemCount++;

        system.addOrder = this._addSystemCount

        this._systemIndexes[system.name] = this._systems.length;
        this._systems.push(system);
        let desc = system.desc && util.isString(system.desc) ? "\n" + "description: " + system.desc : '';
        log.info(this.getRoleString() + "\nAdd System: " + system.name + " 优先级: " + (system.priority) + " 添加次序: " + system.addOrder + desc);
        this.sortSystems();
    }

    /**
     * 按照优先级对系统进行排序
     */
    sortSystems() {
        this._systems.sort(function (a, b) {
            if (!a.priority && !b.priority) {
                return a.addOrder - b.addOrder;
            }
            if (a.priority === b.priority) {
                return a.addOrder - b.addOrder;
            }
            return a.priority - b.priority
        });
        this._systemIndexes = new Map<string, number>()
        for (let i = 0; i < this._systems.length; i++) {
            let system = this._systems[i];
            this._systemIndexes[system.name] = i;
        }
    }

    sortOrder(a, b) {
        if (a.activeTime === b.activeTime) {
            if (!a.system.priority && !b.system.priority) {
                return a.system.addOrder - b.system.addOrder;
            }
            if (a.system.priority === b.system.priority) {
                return a.system.addOrder - b.system.addOrder;
            }
            return a.system.priority - b.system.priority;
        }
        if (a.activeTime < b.activeTime) {
            return -1;
        }
        if (a.activeTime > b.activeTime) {
            return 1;
        }
    }

    getSystem(name) {
        let index = this._systemIndexes[name];
        if (index !== undefined) {
            return this._systems[index];
        }
    }

    generateID() {
        if (this._server) {
            this._index++;
            return this._index;
        } else {
            this._indexClient--;
            return this._indexClient;
        }
    }

    update(dt,turned?) {
//按照顺序来迭代系统
        let systemReadyToUpdate = [];
        for (let i = 0; i < this._systems.length; i++) {
            let system = this._systems[i];
            let updates = system.calUpdate(this._updateInterval, this._timer.runningTime);
            for (let j = 0; j < updates.length; j++) {
                systemReadyToUpdate.push({
                    interval: updates[j].interval,
                    activeTime: updates[j].activeTime,
                    system: system
                })
            }
        }

        systemReadyToUpdate.sort(this.sortOrder.bind(this));

        for (let i = 0; i < systemReadyToUpdate.length; i++) {
            let system = systemReadyToUpdate[i].system;
            let dt = systemReadyToUpdate[i].interval;
            let now = systemReadyToUpdate[i].activeTime;
            system.doUpdates(dt, now, this);
        }

        for (let i in this._componentPools) {
            this._componentPools[i].update(dt);
        }
        // log.debug('entity:'+this._entityCount+' component:'+this.getComponentCount());
    }

    getComponentCount() {
        let ret = 0;
        for (let i in this._componentPools) {
            if (this._componentPools[i]._itemCount) {
                ret += this._componentPools[i]._itemCount;
            }
        }
        return ret;
    }

    lateUpdate(dt:number) {
        for (let i = 0; i < this._lateAddQueue.length; i++) {
            let addComp = this._lateAddQueue[i];
            addComp.onAdd(addComp._entity, this);
        }
        this._lateAddQueue = [];
        let systemReadyToUpdate = [];
        for (let i = 0; i < this._systems.length; i++) {
            let system = this._systems[i];
            let updates = system.calUpdate(this._updateInterval, this._timer.runningTime);
            for (let j = 0; j < updates.length; j++) {
                systemReadyToUpdate.push({
                    interval: updates[j].interval,
                    activeTime: updates[j].activeTime,
                    system: system
                })
            }
        }

        systemReadyToUpdate.sort(this.sortOrder.bind(this));

        for (let i = systemReadyToUpdate.length - 1; i >= 0; i--) {
            let system = systemReadyToUpdate[i].system;
            let dt = systemReadyToUpdate[i].interval;
            let now = systemReadyToUpdate[i].activeTime;
            system.doLateUpdates(dt, now, this);
        }
    }

    destroy(cb) {
        log.debug('ECS destroy');
        this.cleanBuffer && this.cleanBuffer();
        this._enabled = false;
        this.onDisable();
        this._readyDestroy = true;
        this.destroyCb = cb;
    }

    onDisable(){

    }

    _destroy() {
        this._enabled = false;
        this.unscheduleAll();
        this._timer.destroy();
        for (let i in this._entityPool) {
            this.removeEntityInstant(this._entityPool[i]);
        }

        for (let i = 0; i < this._toDestroyEntities.length; i++) {
            let ent = this._toDestroyEntities[i];
            delete this._entityPool[ent.id];
            ent.onDestroy();
            ent = null;
        }
        this._toDestroyEntities = [];

        for (let i in this._componentPools) {
            this._componentPools[i].destroy();
        }
        this._entityPool = new Map<number, Entity>()            //实体<Entity>池
        this._commands = {}                //注册的命令组件
        this._commandQueueMaps = [];        //以命令名为键的队列
        this._componentPools = new Map<string, IComponentPool>()        //各种组件池<ComponentPool>容器
        this._groups = new Map<string, Group>()                //各种集合<Group>容器,组件<Component>数组为键值
        this._cachedGroups = new Map<string, Array<Group>>()          //单个组件<Component>为键值的集合<Group>缓存
        this._systems = [];               //各个系统和监听集合
        this._toDestroyEntities = [];    //在这轮遍历中要删除的entity队列
        this._index = 0;                  //实体<Entity>ID分配变量
        this._addSystemCount = 0;
        this._objContainer = {}

        this._readyDestroy = true;

    }

    schedule(name, callback, interval, repeat, delay) {
        if (util.isFunction(name)) {
            delay = repeat;
            repeat = interval;
            interval = callback;
            callback = name;
            this.scheduleId++;
            name = this.scheduleId;
        }
        if (callback < 0) {
            log.error(this.getRoleString() + ' 参数为空');
            throw Error;
        }
        if (interval < 0) {
            log.error(this.getRoleString() + ' 时间间隔不能小于0');
            throw Error;
        }

        interval = interval || 0;
        repeat = isNaN(repeat) ? Number.MAX_VALUE - 1 : repeat;
        delay = delay || 0;
        this._timer.schedule(name, callback, interval, repeat, delay, 0);
    }

    getSchedule(name) {
        return this._timer.getSchedule(name);
    }

    unschedule(name, callback_fn) {
        if (name) {
            this._timer.unschedule(name);
        } else if (callback_fn) {
            this._timer.unschedule(callback_fn);
        }
    }

    scheduleUnique(name, callback, delay) {
        if (!name || typeof name !== 'string') {
            log.error(this.getRoleString() + ' 唯一任务必须有名称!');
            return;
        }
        if (this._uniqueSchedules[name]) {
            return;
        }
        this._uniqueSchedules[name] = true;
        this.schedule(name, callback, 0, 1, delay);
    }

    scheduleOnce(name, callback, delay) {
        this.schedule(name, callback, 0, 1, delay);
    }

    unscheduleAll() {
        this._timer.unscheduleAll();
    }

    disableSystem(name) {
        let sys = this.getSystem(name);
        if (sys && sys.enabled) {
            sys.enabled = false;
            sys.onDisable(this);
        }
    }

    enableSystem(name) {
        let sys = this.getSystem(name);
        if (sys && !sys.enabled) {
            sys.enabled = true;
            sys.onDisable(this);
        }
    }

    isServer() {
        return this._server;
    }

    isClient() {
        return !this._server;
    }

    getTick(){
        return this._tick
    }

    onEnable(){

    }

    start() {
        if (!this._enabled) {
            this.setupUpdateFunc();
            this._enabled = true;
            this.onEnable();
            if (this._turned) {
                this._timer.tick();
            } else {
                this._timer.start();
            }
            log.error('ecs start');
        } else {
            this.resume();
        }
    }

    pause() {
        this._paused = true;
        this._timer.pause();
    }

    resume() {
        if (this._paused) {
            this._paused = false;
            this._timer.resume();
        }
    }
}




