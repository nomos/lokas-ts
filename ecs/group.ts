import {Runtime} from "./runtime";
import {Entity} from "./entity";
import {IComponent} from "./default_component";
import {util} from "../utils/util";

/**
 * 集合<Group>是包含特定类型组件<Component>组合的实体<Entity>的集合,系统<System>,监听器<Observer>,处理器<Handler>函数处理的对象
 */

export class Group {
    private hash: Array<string>
    private componentTypes: Array<string>
    private entityIndexes: Array<number>
    private dirtyEntities: Array<Entity>
    private runtime: Runtime

    constructor(compGroup: Array<{ new(): IComponent }>, ecs: Runtime) {
        this.hash = [];
        this.runtime = ecs;
        this.componentTypes = [];
        for (let i = 0; i < compGroup.length; i++) {
            let comp = compGroup[i];
            if (!comp) {
                throw new Error('组件不存在,可能未注册');
            }
            this.componentTypes.push(Object.getPrototypeOf(comp).defineName);
        }
        this.componentTypes.sort();
        this.entityIndexes = [];
        this.dirtyEntities = [];

    }

    addDirtyEntity(ent: Entity) {
        if (ent.getGroupHashes().indexOf(this.hash) === -1) {
            return;
        }
        let index = this.dirtyEntities.indexOf(ent);
        if (index === -1) {
            this.dirtyEntities.push(ent);
        }
    }

    removeDirtyEntity(ent) {
        let index = this.dirtyEntities.indexOf(ent);
        if (index !== -1) {
            this.dirtyEntities.splice(index, 1);
        }
    }


    clean() {
        this.dirtyEntities = [];
    }

    /**
     * 尝试往集合<Group>中添加一个实体<Entity>(只有包含集合<Group>中所有组件<Component>类型的实体<Entity>会被添加到Group中)
     * @param ent
     */
    addEntity(ent: Entity) {
        if (ent.includes(this.componentTypes)) {
            if (!this.hasEntity(ent)) {
                ent.addGroup(this.hash);
                this.entityIndexes.push(ent.id);
            }
        }
    }

    /**
     * 尝试立即移除一个实体<Entity>
     */
    removeEntity(ent: Entity) {
        //如果实体中不包含集合的组件,提前跳出
        if (!ent.includes(this.componentTypes)) {
            return;
        }
        if (this.entityIndexes) {
            ent.removeGroup(this.hash);
            util.remove(this.entityIndexes, function (n) {
                return n === ent.id;
            });
        }
    }

    /**
     * 移除一个实体<Entity>ID队列,通常在每一帧更新的最后做
     */
    removeEntityArray(arr) {
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
    hasEntity(ent): boolean {
        let id = ent.id;
        let index = this.entityIndexes.indexOf(id);
        return index !== -1;
    }

    /**
     * 检查集合<Group>中是否有这个实体<Entity>ID
     */
    hasEntityByID(id): boolean {
        let index = this.entityIndexes.indexOf(id);
        return index !== -1;
    }

    getEntities(): Array<Entity> {
        let ret = [];
        for (let i = 0; i < this.entityIndexes.length; i++) {
            let id = this.entityIndexes[i];
            let ent = this.runtime.getEntity(id);
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
    getSingletonEntity(): Entity {

        let id = this.entityIndexes[0];
        if (id === undefined) {
            return;
        }
        return this.runtime.getEntity(id);
    }

    /**
     * 检查集合<Group>是否包含该类型的组件<Component>,接受多个参数
     */
    match(...comp: Array<string | IComponent>) {
        let args = [].slice.call(arguments);
        let compStrArr = [];
        if (args.length === 0) {
            return false;
        } else {
            if (!util.isString(args[0])) {
                for (let arg of args) {
                    compStrArr.push((<IComponent>arg).defineName)
                }
            } else {
                compStrArr = args;
            }
        }
        return util.includes(this.componentTypes, compStrArr);
    }

    length() {
        return this.entityIndexes.length;
    }
}



