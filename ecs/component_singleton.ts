import {IComponent} from "./default_component";
import {IRuntime} from "./runtime";

export class ComponentSingleton<T extends IComponent>{
    public Name:string
    public Instance:T

    private readonly runtime:IRuntime
    private readonly component:{new():T}
    constructor(ComponentType:{new():T}, runtime:IRuntime) {
        this.component = ComponentType;            //给对象赋值
        this.Instance = null;
        this.Name = Object.getPrototypeOf(ComponentType).defineName;  //名称为对象定义的原型名
        this.runtime = runtime;
    }

    /**
     * create a <Component> and call it's onCreate method
     */
    Create(...args):T {
        this.Instance = Object.create(Object.getPrototypeOf(this.component));
        this.component.apply(this.Instance, args);
        this.Instance.MarkDirty();
        this.Instance.SetRuntime(this.runtime)
        if (this.Instance.OnCreate) {
            this.Instance.OnCreate(this.runtime);
        }
        return this.Instance;
    }

    /**
     * recycle <Component>
     * @param comp
     */
    Recycle(comp:T) {
        if (this.Instance) {
            this.Instance.OnDestroy && this.Instance.OnDestroy(this.runtime);
        }
        this.Instance = null;
    }

    /**
     * pop a <Component> or create one
     */
    Get(...args):T {
        if (this.Instance) {
            if (args.length > 0) {
                this.component.apply(this.Instance, args);
            }
            return this.Instance;
        } else {
            return this.Create.apply(this, args);
        }
    }

    Update(dt) {

    }

    Destroy() {
        if (this.Instance) {
            this.Instance.OnDestroy(this.runtime);
        }
        this.Instance = null;
    }
}


