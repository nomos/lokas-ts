import {IRuntime} from "./runtime";
import {Entity} from "./entity";
import {IComponent,IComponentCtor} from "./default_component";
import {util} from "../utils/util";

/**
 * 集合<Group>是包含特定类型组件<Component>组合的实体<Entity>的集合,系统<System>,监听器<Observer>,处理器<Handler>函数处理的对象
 */

export class Group {
    public Hash: string[]
    public HashStr: string

    private readonly componentTypes: string[] = []
    private entityIndexes: string[] = []
    private dirtyEntities: Entity[] = []
    private runtime: IRuntime

    constructor(compGroup: IComponentCtor[], runtime: IRuntime) {
        this.Hash = [];
        this.runtime = runtime;
        this.componentTypes = [];
        for (let i = 0; i < compGroup.length; i++) {
            let comp = compGroup[i];
            if (!comp) {
                throw new Error('组件不存在,可能未注册');
            }
            this.componentTypes.push(Object.getPrototypeOf(comp).defineName);
        }
        this.componentTypes.sort();
    }

    Includes(compName:string|IComponent):boolean{
        if (typeof compName !== "string") {
            compName = <string>(compName.DefineName)
        }
        return this.componentTypes.includes(compName)
    }

    AddDirtyEntity(ent: Entity) {
        if (ent.GetGroupHashes().indexOf(this.HashStr) === -1) {
            return;
        }
        let index = this.dirtyEntities.indexOf(ent);
        if (index === -1) {
            this.dirtyEntities.push(ent);
        }
    }

    RemoveDirtyEntity(ent) {
        let index = this.dirtyEntities.indexOf(ent);
        if (index !== -1) {
            this.dirtyEntities.splice(index, 1);
        }
    }


    Clean() {
        this.dirtyEntities = [];
    }

    /**
     * 尝试往集合<Group>中添加一个实体<Entity>(只有包含集合<Group>中所有组件<Component>类型的实体<Entity>会被添加到Group中)
     * @param ent
     */
    AddEntity(ent: Entity) {
        if (ent.includes(this.componentTypes)) {
            if (!this.HasEntity(ent)) {
                ent.AddGroup(this.HashStr);
                this.entityIndexes.push(ent.Id);
            }
        }
    }

    /**
     * 尝试立即移除一个实体<Entity>
     */
    RemoveEntity(ent: Entity) {
        //如果实体中不包含集合的组件,提前跳出
        if (!ent.includes(this.componentTypes)) {
            return;
        }
        if (this.entityIndexes) {
            ent.RemoveGroup(this.Hash);
            util.remove(this.entityIndexes, function (n) {
                return n === ent.Id;
            });
        }
    }

    /**
     * 移除一个实体<Entity>ID队列,通常在每一帧更新的最后做
     */
    RemoveEntityArray(arr) {
        let removeArr = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].includes(this.componentTypes)) {
                removeArr.push(arr[i].id);
            }
        }
        for (let i = 0; i < removeArr.length; i++) {
            let id = removeArr[i];
            util.remove(this.entityIndexes, function (n) {
                return n === id;
            });
        }
    }

    /**
     * 检查集合<Group>中是否有这个实体<Entity>
     */
    HasEntity(ent): boolean {
        let id = ent.id;
        let index = this.entityIndexes.indexOf(id);
        return index !== -1;
    }

    /**
     * 检查集合<Group>中是否有这个实体<Entity>ID
     */
    HasEntityByID(id): boolean {
        let index = this.entityIndexes.indexOf(id);
        return index !== -1;
    }

    GetEntities(): Entity[] {
        let ret = [];
        for (let i = 0; i < this.entityIndexes.length; i++) {
            let id = this.entityIndexes[i];
            let ent = this.runtime.GetEntity(id);
            if (!ent) {
                throw new Error('entity must not be null');
            }
            ret.push(ent);
        }
        return ret;
    }

    /**
     *  获取单例实体
     */
    GetSingletonEntity(): Entity {

        let id = this.entityIndexes[0];
        if (id === undefined) {
            return;
        }
        return this.runtime.GetEntity(id);
    }

    /**
     * 检查集合<Group>是否包含该类型的组件<Component>,接受多个参数
     */
    Match(...comps: Array<string | IComponent>) {
        let compStrArr = [];
        if (comps.length === 0) {
            return false;
        } else {
            if (!util.isString(comps[0])) {
                for (let arg of comps) {
                    compStrArr.push((<IComponent>arg).DefineName)
                }
            } else {
                compStrArr = comps;
            }
        }
        return util.includes(this.componentTypes, compStrArr);
    }

    get length() {
        return this.entityIndexes.length;
    }
}



