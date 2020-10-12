'use strict'
import {Connection, SyncFrame, SyncManager, SyncReq} from "./sync";
import {ComponentPool, IComponentPool} from "./component_pool";
import {ISystem, SystemUpdater} from "./system";
import {Entity, EntityData} from "./entity";
import {ComponentSingleton} from "./component_singleton";
import {DependManager} from "./depend";
import {EventEmitter} from "../utils/event_emitter";
import {IComponent, IComponentCtor} from "./default_component";
import {IContext} from "../common/context";
import {Group} from "./group";
import {Timer} from "./ecs_timer";
import {util} from "../utils/util";
import {log} from "../utils/logger";
import {TypeRegistry} from "../protocol/types";
import {IdGenerator} from "./id_generator";

export interface IDependMgr {
    AddDepends(a: IComponentCtor, b: IComponentCtor)

    IsDepend(a: IComponentCtor, b: IComponentCtor): boolean

    GetDependsBy(a: IComponentCtor): IComponentCtor[]

    GetDepends(a: IComponentCtor): IComponentCtor[]

    SortDepends(a: IComponent, b: IComponent): number

    SortDependsInverse(a: IComponent, b: IComponent): number
}

export interface IConnectionMgr {
    GetConnection(uid: string): Connection

    GetConnections(): Connection[]

    GetConnectionNum(): number

    AddConnection(uid: string): Connection

    RemoveConnection(uid: string): Connection

    SetSyncStep(step: number)

    SnapShot(): SyncFrame

    SnapStep(): SyncFrame

    FetchEntitySyncData(): SyncReq

    FullSyncFromServer(snapshot: SyncFrame)

    SyncFrameFromServer(snapshot: SyncFrame)

    PushFrameToClient(uid: string): SyncFrame

    RSyncToClient(syncData: SyncReq, uid: string): SyncFrame
}

export interface IRuntime extends IDependMgr, IContext, EventEmitter {
    Tick: number
    Turned: boolean
    Enabled: boolean
    Strict: boolean
    State: string
    TimeScale: number
    ConnMgr: IConnectionMgr

    SetTimeScale(timeScale: number)

    IsServer(): boolean

    Get(key: string): any

    Set(key: string, v: any)

    SetState(state: string)

    CreateComponent<T extends IComponent>(comp: { new(): T }, ...args: any): T

    HasEntity(id: string): boolean

    GetEntity(id: string): Entity

    RemoveEntity(id: string): Entity

    RemoveEntityInstant(id: string): Entity

    MarkDirtyEntity(ent: Entity)

    RecycleComponent(comp: IComponent)

    AssignEntity(compName: string, ent: Entity)

    ReassignEntity(comp: IComponentCtor, ent)

    GetEntities(comps: IComponentCtor[], optComps?: IComponentCtor[], excludes?: IComponentCtor[]): Entity[]

    ForEachEntity(func: (ent: Entity) => void)

    ForEachNewEntity(func: (ent: Entity) => void)

    ForEachDirtyEntity(func: (ent: Entity) => void)

    ForEachDestroyEntity(func: (ent: Entity) => void)

    EntityDataToEntity(entData: EntityData): Entity
}

export class RuntimeOption {
    UpdateTime: number = 0
    TimeScale: number = 0


    constructor() {
    }
}

/**
 * 实体管理器<ECS>是一个ECS系统的实例,管理组件<Component>,系统<System>,集合<Group>,监听器<Observer>,处理器<Handler>的注册
 * 维护实体<Entity>的对象池,负责集合<Group>,组件池<ComponentPool>,
 * 组件单例<ComponentSingleton>的创建
 * 负责处理帧更新和事件传递
 */

export class Runtime extends EventEmitter implements IRuntime {
    private entityPool: Map<string, Entity> = new Map<string, Entity>()
    private componentPools: Map<string, IComponentPool> = new Map<string, IComponentPool>()
    private groups: Map<string, Group> = new Map<string, Group>() //单个组件<Component>为键值的集合<Group>缓存
    private cachedGroups: Map<string, Group[]> = new Map<string, Group[]>()
    private systemIndexes: Map<string, number> = new Map<string, number>()           //系统的名字索引
    private systems: ISystem[] = []
    /**ID分配和生命周期变量*/

    private readonly turned: boolean = false
    private readonly updateInterval: number
    private readonly server: boolean
    private readonly strict: boolean
    private enabled: boolean = false
    private paused: boolean = false
    private readyDestroy: boolean = false
    /**定时器变量和回调函数*/
    private tick = 0                     //步数
    private timeScale: number
    private timer: Timer
    private dirty = true                //整个系统的脏标记d
    private dirtyEntities: Entity[] = []           //这轮的脏标记entity
    private newEntities: Entity[] = []
    private toDestroyEntities: Entity[] = []        //在这轮遍历中要删除的entity队列
    private snapInterval: number = 0    //全实体快照时间
    private scheduleId = 0

    public ConnMgr: IConnectionMgr = new SyncManager(this)

    private dependManager: DependManager = new DependManager(this)
    private context: Map<string, any> = new Map<string, any>()
    private idGenerator: IdGenerator

    /**模块和组件映射表*/
    private modules = []                 //已加载的模块
    private addSystemCount = 0           //加载的系统order数
    private lateAddQueue = []            //延迟Add队列
    //其他绑定函数
    private _uniqueSchedules = {}         //仅一次的任务标记
    private _spawners = {}
    private state = 'null'

    constructor(updateTime, timeScale, opt) {
        super()
        opt = opt || {}

        if (updateTime === 0) {
            this.turned = true;
        }
        /**基础变量*/

        this.updateInterval = updateTime || 1000 / 60.0
        this.timeScale = Math.min(timeScale, 20) || 1.0
        this.timer = new Timer(this.updateInterval, this.timeScale)
        this.server = opt.server || false;           //客户端的ID从Max_Long开始自减,服务器的ID从0开始自增
        this.strict = opt.strict || false;
        this.idGenerator = new IdGenerator(this.server)
        /**定时器变量和回调函数*/
        this.snapInterval = opt.snapInterval || 0;    //全实体快照时间
    }

    Set(name: string, obj: any) {
        this.context.set(name, obj)
    }

    Get(name: string): any {
        return this.context.get(name)
    }

    get Tick(): number {
        return this.tick
    }

    get Enabled() {
        return this.enabled;
    }

    SetTimeScale(timeScale: number) {
        this.timeScale = Math.min(timeScale, 20) || 1.0;
        this.timer.TimeScale = timeScale;
    }

    get TimeScale(): number {
        return this.timeScale
    }

    get Turned() {
        return this.turned
    }

    SetState(state) {
        if (this.state !== state) {
            this.offStateSystems(this.state);
            this.state = state;
            this.onStateSystems(state);
            this.dirty = true;
        }
    }

    get State(): string {
        return this.state;
    }

    IsState(state) {
        return this.state === state;
    }

    get Size() {
        return this.entityPool.size;
    }

    IsServer(): boolean {
        return this.server;
    }

    get Strict() {
        return this.strict
    }

    getRoleString() {
        if (!this.IsServer()) {
            return '客户端';
        } else {
            return '服务器';
        }
    }

    AddDepends(a: IComponentCtor, b: IComponentCtor) {
        return this.dependManager.AddDepends(a, b)
    }

    IsDepend(a: IComponentCtor, b: IComponentCtor): boolean {
        return this.dependManager.IsDepend(a, b)
    }

    GetDependsBy(a: IComponentCtor): IComponentCtor[] {
        return this.dependManager.GetDependsBy(a)
    }

    GetDepends(a: IComponentCtor): IComponentCtor[] {
        return this.dependManager.GetDepends(a)
    }

    SortDepends(a: any, b: any): number {
        return this.dependManager.SortDepends(a, b)
    }

    SortDependsInverse(a: any, b: any): number {
        return this.dependManager.SortDependsInverse(a, b)
    }

    setupUpdateFunc() {
        this.timer.OnUpdate(() => {
            if (!this.enabled) {
                if (this.readyDestroy) {
                    this.readyDestroy = false;
                    this._destroy();
                    this.emit("__destroy")
                }
                return;
            }
            this.emit('_beforeUpdate');
            this.emit('beforeUpdate');
            this.tick++;
            this.update();
        });


        this.timer.OnLateUpdate(() => {
            if (!this.enabled) {
                return;
            }
            this.lateUpdate();
            if (this.dirty && this.server) {
                //TODO:这里还有问题
                // if (this._tick>1) {
                //     this.snapStep();
                // }
                // if (this._tick===1) {
                //     this.snapshot();
                // } else {
                //     this.snapshot(true);
                // }
                this.ConnMgr.SetSyncStep(this.Tick);
            }
            this.cleanBuffer();
            this.emit('afterUpdate');
            this.emit('_afterUpdate');
        });
    }

    private cleanBuffer() {
        //遍历集合删除实体队列
        this.groups.forEach((v) => {
            v.RemoveEntityArray(this.toDestroyEntities)
        })
        //彻底删除实体并调用onDestroy方法删除所有组件
        for (let i = 0; i < this.toDestroyEntities.length; i++) {
            let ent = this.toDestroyEntities[i];
            let index = this.newEntities.indexOf(ent);
            if (index !== -1) {
                this.newEntities.splice(index, 1);
            }
            index = this.dirtyEntities.indexOf(ent);
            if (index !== -1) {
                this.dirtyEntities.splice(index, 1);
            }
            let entId = ent.Id;
            delete this.entityPool[entId];
            ent.onDestroy();
            ent = null;
        }
        //重置实体队列
        this.toDestroyEntities = [];
        this.dirty = false;

        for (let i = 0; i < this.dirtyEntities.length; i++) {
            this.dirtyEntities[i].Clean();
        }
        for (let i = 0; i < this.newEntities.length; i++) {
            this.newEntities[i].Clean();
        }

        this.groups.forEach((v) => {
            v.Clean()
        })
        this.dirtyEntities = [];
        this.newEntities = [];
    }

    getScaledTimeBySecond(time) {
        return time / 1000 / this.timeScale;
    }

    offStateSystems(state) {
        for (let i = 0; i < this.systems.length; i++) {
            let system = this.systems[i];
            if (system.StateOnly && system.StateOnly === state) {
                this.once('_afterUpdate', function () {
                    system.OffState(Date.now(), this);
                }.bind(this));
            }
        }
    }

    onStateSystems(state) {
        for (let i = 0; i < this.systems.length; i++) {
            let system = this.systems[i];
            if (system.StateOnly && system.StateOnly === state) {
                this.once('_afterUpdate', function () {
                    system.OnState(Date.now(), this);
                }.bind(this));
            }
        }
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

    adjustTimer() {

    }

    EntityDataToEntity(entData: EntityData): Entity {
        let id = entData.Id;
        let ent = this.GetEntity(id);
        if (!ent) {
            ent = this.createEntity(id);
        }
        ent.FromEntityData(entData);
        ent.MarkDirty();
        return ent;
    }

    ForEachEntity(func: (ent: Entity) => void) {
        this.entityPool.forEach((v) => {
            func(v)
        })
    }

    ForEachNewEntity(func: (ent: Entity) => void) {
        this.newEntities.forEach((v) => {
            func(v)
        })
    }

    ForEachDirtyEntity(func: (ent: Entity) => void) {
        this.dirtyEntities.forEach((v) => {
            func(v)
        })
    }

    ForEachDestroyEntity(func: (ent: Entity) => void) {
        this.toDestroyEntities.forEach((v) => {
            func(v)
        })
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
        this.modules[mod.name] = {
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
        let mod = this.modules[name];
        if (!mod) {
            log.error('模组 ' + name + ' 未找到');
            return;
        }
        if (mod.unload) {
            mod.unload(this);
        }
    }


    /**
     * 注册一个组件<Component>
     */
    registerComponent(Component: IComponentCtor, maxSize?: number, minSize?: number) {
        let name = Component.DefineName
        let pool = this.componentPools[name];

        maxSize = (maxSize && maxSize > 0) ? maxSize : 100;
        minSize = (minSize && minSize > 0) ? minSize : 10;
        if (pool) {
            log.warn(this.getRoleString() + ' 已存在组件:' + name + ',不重新注册组件');
            pool._maxSize = Math.max(pool._maxSize, maxSize || 0);
            pool._minSize = Math.max(pool._minSize, maxSize || 0);
            return;
        }
        for (let depend of Component.DefineDepends) {
            this.AddDepends(Component, depend);
        }
        Component.OnRegister(this);
        this.componentPools[name] = new ComponentPool(Component, maxSize, minSize, this);
        log.info(this.getRoleString() + " 注册组件池:" + name + " 成功,最小保留对象数:" + minSize + " 最大对象数:" + maxSize);
    }

    /**
     * 注册单例组件
     */
    registerSingleton(Component: IComponentCtor) {
        let name = Component.DefineName
        let pool = this.componentPools[name];
        if (pool) {
            log.warn(this.getRoleString() + ' 已存在组件单例:' + name + ',不重新注册组件');
            return;
        }
        for (let depend of Component.DefineDepends) {
            this.AddDepends(Component, depend);
        }
        this.componentPools[name] = new ComponentSingleton(Component, this);

        log.info(this.getRoleString() + " 注册组件单例:" + name + " 成功");
    }

    lateAdd(comp) {
        if (this.lateAddQueue.indexOf(comp) === -1) {
            this.lateAddQueue.push(comp);
        }
    }

    createSingleton(Component: IComponentCtor, ...args: any) {
        let name = TypeRegistry.GetInstance().GetAnyName(Component)
        if (!this.componentPools[name]) {
            log.error(this.getRoleString() + ' 单例组件:' + name + '不存在');
            return;
        }

        let comp: IComponent = this.componentPools.get(name).Get.apply(this.componentPools.get(name), args);
        if (!comp.GetEntity()) {
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
        if (!this.componentPools[name]) {
            log.error(this.getRoleString() + ' 单例组件:' + name + '不存在');
            return;
        }
        // if (args.length > 0) {
        //     return this._componentPools[name].get.apply(this._componentPools[name], args);
        // }
        let comp = this.componentPools[name].get();
        if (!comp._entity) {
            if (!(force || this.server)) {
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
    createEntity(id?: string) {
        let eid = id || this.generateID();
        if (this.entityPool.get(eid)) {
            throw new Error(eid + ' entity already exist');
        }
        this.dirty = true;
        let ent = new Entity(this, eid);
        this.newEntities.push(ent);

        this.entityPool.set(eid, ent);
        return ent
    }

    /**
     *
     * @param id
     * @return {*}
     */
    HasEntity(id: string): boolean {
        return !!this.entityPool.get(id);
    }

    GetEntity(id: string): Entity {
        return this.entityPool.get(id);
    }

    /**
     * 立即移除一个实体<Entity>,并从所有集合<Group>中移除
     */
    RemoveEntityInstant(id: string): Entity {
        let entity = this.entityPool.get(id);
        if (!entity) {
            //log.error('Entity不存在');
            return;
        }
        this.groups.forEach((group) => {
            group.RemoveEntity(entity)
        })
        this.dirty = true;
        entity.onDestroy();
        entity = null;
        this.entityPool.delete(id)
        let decoy = this.createEntity(id);
        this.toDestroyEntities.push(decoy);
    }

    RemoveEntity(id: string): Entity {
        let entity = this.entityPool.get(id);
        if (!entity) {
            //log.error('Entity不存在');
            return;
        }
        this.dirty = true;
        this.toDestroyEntities.push(entity);
        return entity;
    }

    getComponentPrototype(name) {
        return this.getComponentPool(name).GetCtor().prototype;
    }

    /**
     * 获取一个组件池<ComponentPool>
     * @param comp
     * @returns {*}
     */
    getComponentPool<T extends IComponent>(comp: { DefineDepends: IComponentCtor[]; OnRegister(runtime: Runtime); DefineName: string; new(): T }): IComponentPool {
        let name = TypeRegistry.GetInstance().GetAnyName(comp)
        if (!name) {
            log.error(this.getRoleString() + ' 组件错误或未注册', comp);
            return;
        }
        let pool = this.componentPools[name];
        if (!pool) {
            log.error(this.getRoleString() + ' ComponentPool:' + name + '不存在');
            return null;
        }
        return pool;
    }

    /**
     * 创建组件
     */
    CreateComponent<T extends IComponent>(comp: { DefineDepends: IComponentCtor[]; OnRegister(runtime: Runtime); DefineName: string; new(): T }, ...args: any): T {
        let pool = this.getComponentPool(comp);
        if (pool) {
            if (args.length > 0) {
                return <T>pool.Get.apply(pool, args);
            }
            return <T>(pool.Get());
        }
        log.error(this.getRoleString() + ' 参数出错');
        return null;
    }

    /**
     * 找出包含该组件<Component>的集合<Group>并缓存到this._cachedGroups中
     * @param comp <string>
     */
    cacheGroups(comp: string | IComponent): Group[] {
        let ret = [];
        if (typeof comp !== "string") {
            comp = <string>(comp.DefineName)
        }
        this.groups.forEach((v) => {
            if (v.Includes(comp)) {
                ret.push(v)
            }
        })
        this.cachedGroups[comp] = ret
        return ret
    }

    /**
     * 当一个实体<Entity>增加一个组件<Component>时,实体管理器<ECS>遍历所有的集合<Group>然后添加实体<Entity>到合适的集合<Group>
     */
    AssignEntity(compName: string, ent: Entity) {
        let cachedGroups = this.cachedGroups[compName] ? this.cachedGroups[compName] : this.cacheGroups(compName);
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
    ReassignEntity(comp: IComponentCtor, ent) {
        let compName = TypeRegistry.GetInstance().GetAnyName(comp)
        let cachedGroups = this.cachedGroups[compName] ? this.cachedGroups[compName] : this.cacheGroups(compName);
        for (let i = 0; i < cachedGroups.length; i++) {
            cachedGroups[i].removeEntity(ent);
            cachedGroups[i].removeDirtyEntity(ent);
        }
    }

    MarkDirtyEntity(ent: Entity) {
        if (this.dirtyEntities.indexOf(ent) === -1 && this.newEntities.indexOf(ent) === -1) {
            this.dirtyEntities.push(ent);
        }
        this.dirty = true;
        for (let hash of ent.GetGroupHashes()) {
            this.groups.get(hash).AddDirtyEntity(ent)
        }
    }

    IsDirtyEntity(ent: Entity): boolean {
        return this.dirtyEntities.indexOf(ent) !== -1
    }

    /**
     * 回收一个Component
     */
    RecycleComponent(comp: IComponent) {
        let pool = this.getComponentPool(Object.getPrototypeOf(comp).constructor);
        if (pool) {
            pool.Recycle(comp);
        }
    }

    /**
     * 获得几个集合<Group>的hash值
     */
    private static hashGroup(compGroup: IComponentCtor[]): string[] {
        let retArr: string[] = [];
        for (let i = 0; i < compGroup.length; i++) {
            retArr.push(TypeRegistry.GetInstance().GetAnyName(compGroup[i]));
        }
        retArr.sort();
        return retArr
    }

    /**
     * 向实体管理器<ECS>注册多个集合<Group>
     * @param compGroups
     * @returns {*}
     */
    private registerGroup(compGroups: IComponentCtor[]): Group {
        if (!compGroups || compGroups.length === 0) {
            return null;
        }
        let hash = Runtime.hashGroup(compGroups);
        let hash_str = hash.join("_")
        let group = this.groups.get(hash_str);
        if (!group) {
            group = new Group(compGroups, this);
            group.Hash = hash;
            this.groups.set(hash_str, group)
            this.cachedGroups.forEach((v, k) => {
                if (util.includes(hash, k)) {
                    if (v.indexOf(group) === -1) {
                        v.push(group);
                    }
                }
            })
            this.entityPool.forEach((ent) => {
                group.AddEntity(ent);
            })
            this.newEntities.forEach((ent) => {
                group.AddDirtyEntity(ent)
            })
            this.dirtyEntities.forEach((ent) => {
                group.AddDirtyEntity(ent)
            })
        }
        return group
    }

    getGroup(comps: IComponentCtor[]): Group {
        return this.registerGroup(comps);
    }

    GetEntities(comps: IComponentCtor[], optComps?: IComponentCtor[], excludes?: IComponentCtor[]): Entity[] {
        let entities: Entity[] = []
        if (optComps) {
            let compGroupsArr: Array<IComponentCtor[]> = new Array<IComponentCtor[]>()
            optComps.forEach((v) => {
                let newArr = comps.slice()
                newArr.push(v)
                compGroupsArr.push(newArr)
            })
            compGroupsArr.forEach((v) => {
                entities.concat(this.getGroup(v).GetEntities())
            })
        } else {
            entities.concat(this.getGroup(comps).GetEntities())
        }
        if (excludes) {
            excludes.forEach((v) => {
                entities = util.exclude(entities, this.getGroup([v]).GetEntities())
            })
        }
        return entities
    }

    /**
     * 注册系统到<ECS>
     */
    registerSystem(system: ISystem) {
        system.OnRegister(this)
        if (system.Enabled) {
            system.OnEnable(this)
        }
        this.addSystemCount++;

        system.AddOrder = this.addSystemCount

        this.systemIndexes[system.Name] = this.systems.length;
        this.systems.push(system);
        let desc = system.Desc && util.isString(system.Desc) ? "\n" + "description: " + system.Desc : '';
        log.info(this.getRoleString() + "\nAdd System: " + system.Name + " 优先级: " + (system.Priority) + " 添加次序: " + system.AddOrder + desc);
        this.sortSystems();
    }

    /**
     * 按照优先级对系统进行排序
     */
    sortSystems() {
        this.systems.sort(function (a, b) {
            if (!a.Priority && !b.Priority) {
                return a.AddOrder - b.AddOrder;
            }
            if (a.Priority === b.Priority) {
                return a.AddOrder - b.AddOrder;
            }
            return a.Priority - b.Priority
        });
        this.systemIndexes = new Map<string, number>()
        for (let i = 0; i < this.systems.length; i++) {
            let system = this.systems[i];
            this.systemIndexes[system.Name] = i;
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

    getSystem(name): ISystem {
        let index = this.systemIndexes[name];
        if (index !== undefined) {
            return this.systems[index];
        }
    }

    generateID(): string {
        return this.idGenerator.Generate()
    }

    update() {
//按照顺序来迭代系统
        let systemReadyToUpdate: SystemUpdater[] = [];
        for (let i = 0; i < this.systems.length; i++) {
            let system = this.systems[i];
            let updates = system.CalUpdate(this.updateInterval, this.timer.RunningTime);
            for (let j = 0; j < updates.length; j++) {
                systemReadyToUpdate.push(updates[j])
            }
        }

        systemReadyToUpdate.sort(this.sortOrder.bind(this));

        for (let i = 0; i < systemReadyToUpdate.length; i++) {
            let system = systemReadyToUpdate[i].System;
            let dt = systemReadyToUpdate[i].Interval;
            let now = systemReadyToUpdate[i].ActiveTime;
            system.DoUpdates(dt, now, this);
        }

        this.componentPools.forEach((v) => {
            v.Update()
        })
        // log.debug('entity:'+this._entityCount+' component:'+this.getComponentCount());
    }

    getComponentCount() {
        let ret = 0;
        this.componentPools.forEach((pool) => {
            if (pool.Size) {
                ret += pool.Size;
            }
        })
        return ret;
    }

    lateUpdate() {
        for (let i = 0; i < this.lateAddQueue.length; i++) {
            let addComp = this.lateAddQueue[i];
            addComp.onAdd(addComp._entity, this);
        }
        this.lateAddQueue = [];
        let systemReadyToUpdate: SystemUpdater[] = [];
        this.systems.forEach((system) => {
            let updates = system.CalUpdate(this.updateInterval, this.timer.RunningTime);
            for (let j = 0; j < updates.length; j++) {
                systemReadyToUpdate.push(updates[j])
            }
        })

        systemReadyToUpdate.sort(this.sortOrder.bind(this));

        for (let i = systemReadyToUpdate.length - 1; i >= 0; i--) {
            let system = systemReadyToUpdate[i].System;
            let dt = systemReadyToUpdate[i].Interval;
            let now = systemReadyToUpdate[i].ActiveTime;
            system.DoLateUpdates(dt, now, this);
        }
    }

    async destroy() {
        return new Promise<void>((resolve) => {
            log.debug('ECS destroy');
            this.cleanBuffer && this.cleanBuffer();
            this.enabled = false;
            this.onDisable();
            this.readyDestroy = true;
            this.once("__destroy", () => {
                resolve()
            })
        })
    }

    onDisable() {

    }

    onEnable() {

    }

    _destroy() {
        this.enabled = false;
        this.unscheduleAll();
        this.timer.Destroy();
        this.entityPool.forEach((ent) => {
            this.RemoveEntityInstant(ent.Id);
        })

        for (let i = 0; i < this.toDestroyEntities.length; i++) {
            let ent = this.toDestroyEntities[i];
            delete this.entityPool[ent.Id];
            ent.onDestroy();
            ent = null;
        }
        this.toDestroyEntities = [];

        this.componentPools.forEach((pool) => {
            pool.Destroy()
        })
        this.entityPool = new Map<string, Entity>()            //实体<Entity>池
        this.componentPools = new Map<string, IComponentPool>()        //各种组件池<ComponentPool>容器
        this.groups = new Map<string, Group>()                //各种集合<Group>容器,组件<Component>数组为键值
        this.cachedGroups = new Map<string, Group[]>()          //单个组件<Component>为键值的集合<Group>缓存
        this.systems = [];               //各个系统和监听集合
        this.toDestroyEntities = [];    //在这轮遍历中要删除的entity队列
        this.addSystemCount = 0;
        this.context = new Map<string, any>()

        this.readyDestroy = true;

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
        this.timer.Schedule(name, callback, interval, repeat, delay, 0);
    }

    getSchedule(name) {
        return this.timer.GetSchedule(name);
    }

    unschedule(name, callback_fn) {
        if (name) {
            this.timer.Unschedule(name);
        } else if (callback_fn) {
            this.timer.Unschedule(callback_fn);
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
        this.timer.UnscheduleAll();
    }

    disableSystem(name) {
        let sys = this.getSystem(name);
        if (sys && sys.Enabled) {
            sys.Enabled = false;
            sys.OnDisable(this);
        }
    }

    enableSystem(name) {
        let sys = this.getSystem(name);
        if (sys && !sys.Enabled) {
            sys.Enabled = true;
            sys.OnEnable(this);
        }
    }

    start() {
        if (!this.enabled) {
            this.setupUpdateFunc();
            this.enabled = true;
            this.onEnable();
            if (this.turned) {
                this.timer.Tick();
            } else {
                this.timer.Start();
            }
            log.error('ecs start');
        } else {
            this.resume();
        }
    }

    pause() {
        this.paused = true;
        this.timer.Pause();
    }

    resume() {
        if (this.paused) {
            this.paused = false;
            this.timer.Resume();
        }
    }
}




