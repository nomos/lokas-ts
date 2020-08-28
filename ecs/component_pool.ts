/**
 * 管理组件<Component>生命周期,并维护一个当前类型组件<Component>的对象池
 * @param ComponentType
 * @param maxSize
 * @param minSize
 * @constructor
 */
import {IComponent} from "./default_component";
import {Runtime} from "./runtime";

export interface IComponentPool {
    create():IComponent
    popAndDestroy()
    recycle(comp:IComponent)
    get():IComponent
    destroy()
    update()
}

export class ComponentPool<T extends IComponent> implements IComponentPool{
    public name:string
    public size:number
    public maxSize:number
    public minSize:number
    public runtime:Runtime


    private readonly component:{new():T}
    private pool:Array<T> = []

    constructor(ComponentType:{new():T}, maxSize, minSize, ecs) {
        this.component = ComponentType;            //给对象赋值
        this.name = Object.getPrototypeOf(ComponentType).defineName;  //名称为对象定义的原型名
        this.size = 0;
        this.maxSize = maxSize;
        this.minSize = minSize;
        this.runtime = ecs;
    }

    /**
     * 创建一个组件<Component>并尝试调用它的onCreate方法
     * @returns Component
     */
    create() {
        let args = [].slice.call(arguments);
        let ret = new this.component();
        ret.setRuntime(this.runtime);
        this.component.prototype.constructor.apply(ret, args);
        if (ret.onCreate) {
            ret.onCreate(this.runtime);
        }
        ret.markDirty();
        this.size++;
        return ret;
    }

    /**
     * 删除对象池中最后一个组件<Component>并调用它的onDestroy方法
     */
    popAndDestroy() {
        let comp = this.pool.pop();
        if (comp.onDestroy) {
            comp.onDestroy(this.runtime);
        }
        this.size--;
        comp = null;
    }

    /**
     * 回收一个组件<Component>到对象池
     * @param comp
     */
    recycle(comp) {
        comp.reset()
        this.pool.push(comp);
    }

    get():T {
        let args = [].slice.call(arguments);
        if (this.pool.length === 0) {
            if (args.length > 0) {
                return this.create.apply(this, args);
            } else {
                return this.create();
            }
        } else {
            let ret = this.pool.pop();
            if (args.length > 0) {
                this.component.apply(ret,args)
            }
            ret.markDirty();
            return ret;
        }
    }

    /**
     * 销毁组件池
     */
    destroy() {
        while (this.pool.length > 0) {
            this.popAndDestroy();
        }
    }

    /**
     * update函数,动态规划组件<Component>池的大小
     */
    update() {
        let poolLength = this.pool.length;
        if (this.maxSize > 0 && this.size > this.maxSize) {
            let minSize = this.minSize > 0 ? this.minSize : 10;
            if (poolLength > minSize) {
                this.popAndDestroy();
            }
        }
        if (this.minSize > 0) {
            if (poolLength < this.minSize) {
                let obj = this.create();
                this.pool.push(obj);
            }
        }
    }
}

