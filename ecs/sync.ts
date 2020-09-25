import {Serializable} from "../protocol/protocol";
import {define, formats, Tag, TypeRegistry} from "../protocol/types";
import {EntityData} from "./entity";
import {IConnectionMgr, IRuntime} from "./runtime";
import {log} from "../utils/logger";
import {Long} from "../utils/long";
import {marshal} from "../protocol/encode";
import {Buffer} from "../thirdparty/buffer";
import {unmarshal} from "../protocol/decode";

@define("SyncReq")
@formats([
    ["Step", Tag.Long, Tag.Int],
    ["EntitySteps", Tag.Map, Tag.String, Tag.Long, Tag.Int],
])
export class SyncReq extends Serializable {
    public Step: number
    public EntitySteps: Map<string, number> = new Map<string, number>()
}


@define("SyncFrame")
@formats([
    ["OldStep", Tag.Long, Tag.Int],
    ["CurStep", Tag.Long, Tag.Int],
    ["SyncAll", Tag.Bool],
    ["TimeScale", Tag.Float],
    ["State", Tag.String],
    ["EntityIndexes", Tag.Long_Array],
    ["Entities", Tag.List, Tag.EntityData],
    ["ModEntArr", Tag.List, Tag.EntityData],
    ["AddEntities", Tag.List, Tag.EntityData],
    ["RemEntities", Tag.List, Tag.EntityData],
])
export class SyncFrame extends Serializable {
    public SyncAll: boolean
    public OldStep: number
    public CurStep: number
    public TimeScale: number
    public State: string
    public EntityIndexes: string[]
    public Entities: EntityData[] = []
    public ModEntities: EntityData[] = []
    public AddEntities: EntityData[] = []
    public RemEntities: string[] = []

    constructor(syncAll: boolean = true) {
        super();
        this.SyncAll = syncAll
    }
}

@define("SyncStream")
@formats([
    ["SnapShots", Tag.List, Tag.SyncFrame],
])
export class SyncStream extends Serializable {
    public SnapShots: SyncFrame[]
}

@define("Connection")
@formats([
    ["Uid", Tag.String],
    ["Step", Tag.Long, Tag.Int],
    ["EntitySteps", Tag.Map, Tag.Long, Tag.Long, Tag.Int],
])
export class Connection extends Serializable {
    public Uid: string
    public Step: number
    public EntitySteps: Map<string, number> = new Map<string, number>()
    public runtime: IRuntime

    constructor(uid?: string, runtime?: IRuntime) {
        super()
        this.Uid = uid;
        this.Step = -1;
        this.runtime = runtime;
    }

    Reset() {
        this.Step = -1;
        this.EntitySteps = new Map<string, number>();

    }

    Sync(step, entitySteps: Map<string, number>) {
        this.Step = step;
        this.EntitySteps = entitySteps;
    }
}

@define("SyncCmd")
@formats([
    ["Uid",Tag.String],
    ["Msg",Tag.Buffer],
])
export class SyncCmd extends Serializable {
    public Uid:string
    public Msg:Buffer
}

export class SyncManager implements IConnectionMgr {
    private readonly runtime: IRuntime
    private syncStep = 0                        //syncStep,从服务器的tick同步,客户端的tick只是自己使用
    private syncSteps = []                      //步数队列
    private snapshotSteps: number[] = []       //快照步数队列
    private snapshots: Map<number, Buffer> = new Map<number, Buffer>()           //全实体快照
    private lastSnapshot: SyncFrame          //服务器保存上一次快照
    private lastSnapshotId: number = 0          //服务器保存上一次快照
    private lastSnapStep: SyncFrame          //服务器保存上一次快照
    private lastSync: SyncFrame              //客户端保存上一次快照
    private connections: Map<string, Connection> = new Map<string, Connection>()           //客户端连接

    private commandHandler:Map<number,(msg:Serializable,conn:Connection)=>Serializable> = new Map<number, (msg:Serializable,conn:Connection)=> Serializable>()                //注册的命令组件
    private commandQueues:SyncCmd[] = []        //以命令名为键的队列

    constructor(runtime: IRuntime) {
        this.runtime = runtime
    }

    SetSyncStep(step: number) {
        this.syncStep = step
    }

    SnapShot(temp?: boolean): SyncFrame {
        let ret = new SyncFrame()
        ret.CurStep = this.runtime.Tick
        ret.TimeScale = this.runtime.TimeScale
        ret.State = this.runtime.State

        this.runtime.ForEachEntity((ent) => {
            ret.Entities.push(ent.SnapShot())
            ret.EntityIndexes.push(ent.Id)

        })
        if (!temp) {
            this.snapshotSteps.push(this.runtime.Tick);
            this.snapshots.set(this.runtime.Tick,marshal(ret));
        }
        this.lastSnapshot = ret;
        this.lastSnapshotId = this.runtime.Tick
        return ret;
    }

    FullSyncFromServer(snapshot: SyncFrame) {
        if (!snapshot.SyncAll) {
            log.panic("wrong snapshot type")
        }
        this.syncStep = snapshot.CurStep
        this.runtime.SetState(snapshot.State)
        snapshot.AddEntities.forEach((entData) => {
            this.runtime.EntityDataToEntity(entData)
        })
    }

    SnapStep(): SyncFrame {
        let ret = new SyncFrame(false)
        ret.CurStep = this.runtime.Tick
        ret.State = this.runtime.State

        this.runtime.ForEachDirtyEntity((ent) => {
            if (Long.fromString(ent.Id).lessThan(Long.ZERO)) {
            } else {
                ret.ModEntities.push(ent.SnapCurrent());
            }
        })

        this.runtime.ForEachNewEntity((ent) => {
            if (Long.fromString(ent.Id).lessThan(Long.ZERO)) {
            } else {
                ret.AddEntities.push(ent.SnapShot())
            }
        })

        this.runtime.ForEachDestroyEntity((ent) => {
            if (Long.fromString(ent.Id).lessThan(Long.ZERO)) {
            } else {
                ret.RemEntities.push(ent.Id)
            }
        })

        this.syncSteps.push(this.runtime.Tick);
        this.snapshots.set(this.runtime.Tick,marshal(ret));
        this.lastSnapStep = ret
        return ret;
    }

    SyncSnapDeltaFromServer(snapshot: SyncFrame, backward?) {
        if (this.syncStep == snapshot.CurStep) {
            return
        }
        if (snapshot.SyncAll) {
            log.panic("wrong type snapshot")
        }
        this.syncSnapStep(snapshot)
    }

    private getRSyncData(clientStep: number, entitySteps: Map<string, number>, conn: Connection): SyncFrame {
        if (clientStep === this.syncStep) {
            return null;
        }
        let ret = new SyncFrame()
        ret.OldStep = clientStep
        ret.CurStep = this.runtime.Tick
        ret.SyncAll = false
        ret.TimeScale = this.runtime.TimeScale
        ret.State = this.runtime.State

        entitySteps.forEach((v, k, map) => {
            let ent = this.runtime.GetEntity(k)
            if (ent) {
                if (v < ent.Step) {
                    ret.ModEntities.push(ent.SnapShot(conn))
                }
                map[k] = ent.Step;
            } else {
                ret.RemEntities.push(k)
                entitySteps.delete(k)
            }
        })
        this.runtime.ForEachEntity((ent) => {
            if (entitySteps.get(ent.Id) === undefined) {
                ret.AddEntities.push(ent.SnapShot(conn));
                entitySteps.set(ent.Id, ent.Step)
            }
        })
        conn.Sync(this.syncStep, entitySteps)
        return ret;
    }

    FetchEntitySyncData(): SyncReq {
        let ret = new SyncReq()
        ret.Step = this.syncStep
        this.runtime.ForEachEntity((ent) => {
            if (Long.fromString(ent).greaterThan(Long.ZERO)) {
                ret.EntitySteps.set(ent.Id, ent.Step)
            }
        })
        return ret
    }

    SyncFrameFromServer(snapshot: SyncFrame) {
        this.lastSync = snapshot;
        if (this.syncStep === snapshot.CurStep) {
            return 0;   //无需更新,丢弃帧数据
        } else if (this.syncStep !== snapshot.OldStep) {
            return 2;   //需要更新,上传元数据
        } else {
            this.syncStep = snapshot.CurStep;
        }
        this.syncSnapStep(snapshot)
        return 1;   //更新成功
    }

    PushFrameToClient(uid: string): SyncFrame {
        let conn = this.GetConnection(uid);
        if (!conn) {
            log.error('Connection is not exist:', uid);
        }
        if (conn.Step > this.syncStep) {
            log.error('Client Step Error');
            return;
        }
        //帧号相等,不需要更新
        if (conn.Step === this.syncStep) {
            return;
        }
        return this.getRSyncData(conn.Step, conn.EntitySteps, conn);
    }

    RSyncToClient(syncData: SyncReq, uid: string): SyncFrame {
        //获取客户端的step
        let conn = this.GetConnection(uid);
        if (!conn) {
            log.error('player not exist', uid);
            return;
        }
        return this.getRSyncData(syncData.Step, syncData.EntitySteps, conn)
    }

    private syncSnapStep(snapshot: SyncFrame) {
        this.runtime.SetTimeScale(snapshot.TimeScale);
        this.syncStep = snapshot.CurStep;
        this.runtime.SetState(snapshot.State);

        snapshot.ModEntities.forEach((entData) => {
            this.runtime.EntityDataToEntity(entData)
        })
        snapshot.AddEntities.forEach((entData) => {
            this.runtime.EntityDataToEntity(entData)
        })
        snapshot.RemEntities.forEach((id) => {
            this.runtime.RemoveEntity(id);
        })
    }

    SyncSnapStreamsToClient(curStep: number, uid: string) {
        if (curStep === this.syncStep) {
            return;
        }
        let ret = new SyncStream()

        let startStep;
        if (curStep === 0||curStep<this.lastSnapshotId) {
            startStep = this.getNearestSnapshot(curStep);
            if (!startStep) {
                return;
            }
            ret.SnapShots.push(this.snapshots[startStep])
            curStep = startStep;
        }

        //获取step之后的所有steps
        let toSyncStepsIndex = this.syncSteps.indexOf(curStep);
        if (toSyncStepsIndex === -1) {
            log.error('客户端超过Step限制');
        }
        let length = this.syncSteps.length;
        if (toSyncStepsIndex === length - 1) {
            // log.debug('客户端已经是最新',curStep);
        }
        let toSyncSteps = [];
        for (let i = toSyncStepsIndex + 1; i < length; i++) {
            toSyncSteps.push(this.syncSteps[i]);
        }
        for (let i = 0; i < toSyncSteps.length; i++) {
            ret.SnapShots.push(this.snapshots[toSyncSteps[i]])
        }
        return ret
    }

    SyncSnapStreamFromServer(snapStream: SyncStream) {
        snapStream.SnapShots.forEach((snapshot) => {
            if (snapshot.SyncAll) {
                this.FullSyncFromServer(snapshot);
            } else {
                this.syncSnapStep(snapshot)
            }
        })
    }

    private getNearestSnapshot(curStep: number) {
        if (!this.snapshotSteps.length) {
            log.error('服务器未初始化');
            return 0;
        }
        if (this.snapshotSteps.length === 1) {
            return this.snapshotSteps[0];
        }
        for (let i = this.snapshotSteps.length - 1; i >= 0; i--) {
            let step = this.snapshotSteps[i];
            if (curStep >= step) {
                log.error('错误,超出最大限制');
            }
            if (step > curStep) {
                return step;
            }
        }
    }

    GetConnection(uid: string): Connection {
        return this.connections.get(uid)
    }

    GetConnections(): Connection[] {
        let ret: Connection[] = []
        this.connections.forEach((conn) => {
            ret.push(conn)
        })
        return ret;
    }

    GetConnectionNum(): number {
        return this.connections.size;
    }

    AddConnection(uid: string): Connection {
        if (this.GetConnection(uid)) {
            log.error('已存在连接', uid);
            return;
        }
        let ret = new Connection(uid, this.runtime)
        this.connections.set(uid, ret)
        return ret
    }

    RemoveConnection(uid: string): Connection {
        let ret = this.connections.get(uid)
        this.connections.delete(uid)
        return ret
    }

    RegisterCommand(command: { new(): Serializable }, handler: (cmd: Serializable, conn: Connection) => Serializable) {
        let tag = TypeRegistry.GetInstance().GetProtoTag(command.prototype)
        if (tag == 0) {
            log.panic("unregistered tag",command)
        }
        this.commandHandler.set(tag,handler)
    }

//更新客户端命令 //在System里调用防止在加速的更新时间穿越系统更新导致系统收不到onCommand变化
    UpdateCommands() {
        while (this.commandQueues.length) {
            let cmd = this.commandQueues.shift();
            let conn = this.GetConnection(cmd.Uid)
            let msg = unmarshal(cmd.Msg)
            let tag = TypeRegistry.GetInstance().GetTagByName(msg.DefineName)
            let handler = this.commandHandler.get(tag)
            if (handler) {
                handler(msg,conn)
            }
        }
    }

//接收命令
    ReceiveCommand(cmd:SyncCmd) {
        if (!cmd) {
            log.error('command is nil');
            return;
        }
        this.commandQueues.push(cmd);
    }
}