/**
 * Pool Manager for singleton <Component>,replace <ComponentPool> when a component is registered with maxsize==0
 * @param ComponentType
 * @param ecs
 * @constructor
 */
import {defineName,IComponent} from "./default_component";
import {Runtime} from "./runtime";

export class ComponentSingleton<T extends IComponent>{
    public name:string
    public instance:T
    public runtime:Runtime
    private readonly component:{new():T}
    constructor(ComponentType:{new():T}, ecs) {
        this.component = ComponentType;            //给对象赋值
        this.instance = null;
        this.name = Object.getPrototypeOf(ComponentType).defineName;  //名称为对象定义的原型名
        this.runtime = ecs;
    }

    /**
     * create a <Component> and call it's onCreate method
     * @returns Component
     */
    create() {
        let args = [].slice.call(arguments);
        this.instance = new this.component();
        this.component.apply(this.instance, args);
        this.instance.markDirty();
        this.instance.setRuntime(this.runtime)
        if (this.instance.onCreate) {
            this.instance.onCreate(this.runtime);
        }
        return this.instance;
    }

    /**
     * recycle <Component>
     * @param comp
     */
    recycle(comp) {
        if (this.instance) {
            this.instance.onDestroy && this.instance.onDestroy(this.runtime);
        }
        this.instance = null;
    }

    /**
     * pop a <Component> or create one
     * @returns {*}
     */
    get() {
        let args = [].slice.call(arguments);
        if (this.instance) {
            if (args.length > 0) {
                this.component.apply(this.instance, args);
            }
            return this.instance;
        } else {
            return this.create.apply(this, args);
        }
    }

    update(dt) {

    }

    destroy() {
        if (this.instance) {
            this.instance.onDestroy(this.runtime);
        }
        this.instance = null;
    }
}


