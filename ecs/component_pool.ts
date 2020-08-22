/**
 * 管理组件<Component>生命周期,并维护一个当前类型组件<Component>的对象池
 * @param ComponentType
 * @param maxSize
 * @param minSize
 * @constructor
 */
export class ComponentPool {
    constructor(ComponentType, maxSize, minSize, ecs) {
        this._component = ComponentType;            //给对象赋值
        this._name = ComponentType.prototype.__classname;  //名称为对象定义的原型名
        this._pool = [];
        this._itemCount = 0;
        this._maxSize = maxSize;
        this._minSize = minSize;
        this._ecs = ecs;
    }

    /**
     * 创建一个组件<Component>并尝试调用它的onCreate方法
     * @returns Component
     */
    create() {
        let args = [].slice.call(arguments);
        let ret = Object.create(this._component.prototype);
        ret._ecs = this._ecs;
        this._component.prototype.constructor.apply(ret, args);
        ret._dirty = true;
        if (ret.onCreate) {
            ret.onCreate(this._ecs);
        }
        this._itemCount++;
        return ret;
    }

    /**
     * 删除对象池中最后一个组件<Component>并调用它的onDestroy方法
     */
    popAndDestroy() {
        let comp = this._pool.pop();
        if (comp.onDestroy) {
            comp.onDestroy(this._ecs);
        }
        this._itemCount--;
        comp = null;
    }

    /**
     * 回收一个组件<Component>到对象池
     * @param comp
     */
    recycle(comp) {
        // comp.__proto__.constructor();
        this._pool.push(comp);
    }

    /**
     * 从对象池的末尾pop一个组件<Component>,如果没有就创建一个
     * @returns {*}
     */
    get() {
        let args = [].slice.call(arguments);
        if (this._pool.length === 0) {
            if (args.length > 0) {
                return this.create.apply(this, args);
            } else {
                return this.create();
            }
        } else {
            let ret = this._pool.pop();
            ret._dirty = true;
            if (args.length > 0) {
                ret.__proto__.constructor.apply(ret, args);
            }
            return ret;
        }
    }

    /**
     * 销毁组件池
     */
    destroy() {
        while (this._pool.length > 0) {
            this.popAndDestroy();
        }
    }

    /**
     * update函数,动态规划组件<Component>池的大小
     */
    update(dt) {
        let poolLength = this._pool.length;
        if (this._maxSize > 0 && this._itemCount > this._maxSize) {
            let minSize = this._minSize > 0 ? this._minSize : 10;
            if (poolLength > minSize) {
                this.popAndDestroy();
            }
        }
        if (this._minSize > 0) {
            if (poolLength < this._minSize) {
                let obj = this.create();
                this._pool.push(obj);
            }
        }
    }
}

