/**
 * 管理组件<Component>生命周期,并维护一个当前类型组件<Component>的对象池
 * @param ComponentType
 * @param maxSize
 * @param minSize
 * @constructor
 */
import {IComponent,IComponentCtor} from "./default_component";
import {IRuntime, Runtime} from "./runtime";
import {TypeRegistry} from "../protocol/types";

export interface IComponentPool {
    Size:number
    Create():IComponent
    GetCtor():IComponentCtor
    PopAndDestroy()
    Recycle(comp:IComponent)
    Get():IComponent
    Destroy()
    Update(dt?:number)
}

export class ComponentPool<T extends IComponent> implements IComponentPool{
    public Name:string
    public Size:number
    public MaxSize:number
    public MinSize:number

    private readonly runtime:IRuntime
    private readonly component:{ DefineDepends:IComponentCtor[];OnRegister(runtime:Runtime);DefineName:string;new():T }
    private pool:T[] = []

    constructor(ComponentType:{ DefineDepends:IComponentCtor[];OnRegister(runtime:Runtime);DefineName:string;new():T }, maxSize, minSize, ecs:IRuntime) {
        this.component = ComponentType;            //给对象赋值
        this.Name = TypeRegistry.GetInstance().GetAnyName(ComponentType);  //名称为对象定义的原型名
        this.Size = 0;
        this.MaxSize = maxSize;
        this.MinSize = minSize;
        this.runtime = ecs;
    }

    /**
     * 创建一个组件<Component>并尝试调用它的onCreate方法
     */
    Create(...args):T {
        let ret = <T>Object.create(this.component.prototype);
        this.component.apply(ret, args);
        ret.SetRuntime(this.runtime);
        if (ret.OnCreate) {
            ret.OnCreate(this.runtime);
        }
        ret.MarkDirty();
        this.Size++;
        return ret;
    }
    GetCtor():{ DefineDepends:IComponentCtor[];OnRegister(runtime:Runtime);DefineName:string;new():T } {
        return this.component
    }
    /**
     * 删除对象池中最后一个组件<Component>并调用它的onDestroy方法
     */
    PopAndDestroy() {
        let comp = this.pool.pop();
        if (comp.OnDestroy) {
            comp.OnDestroy(this.runtime);
        }
        this.Size--;
        comp = null;
    }

    /**
     * 回收一个组件<Component>到对象池
     * @param comp
     */
    Recycle(comp:T) {
        comp.Reset()
        this.pool.push(comp);
    }

    Get(...args):T {
        if (this.pool.length === 0) {
            if (args.length > 0) {
                return this.Create.apply(this, args);
            } else {
                return this.Create();
            }
        } else {
            let ret = this.pool.pop();
            if (args.length > 0) {
                this.component.apply(ret,args)
            }
            ret.MarkDirty();
            return ret;
        }
    }

    /**
     * 销毁组件池
     */
    Destroy() {
        while (this.pool.length > 0) {
            this.PopAndDestroy();
        }
    }

    /**
     * update函数,动态规划组件<Component>池的大小
     */
    Update() {
        let poolLength = this.pool.length;
        if (this.MaxSize > 0 && this.Size > this.MaxSize) {
            let minSize = this.MinSize > 0 ? this.MinSize : 10;
            if (poolLength > minSize) {
                this.PopAndDestroy();
            }
        }
        if (this.MinSize > 0) {
            if (poolLength < this.MinSize) {
                let obj = this.Create();
                this.pool.push(obj);
            }
        }
    }
}

