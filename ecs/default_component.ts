import {Entity} from "./entity";
import {Runtime} from "./runtime";

export function defineName(name:string) {
    return function (target:Function) {
        target.prototype.defineName = name
    }
}

export class IComponent{
    protected dirty: boolean = true
    protected entity: Entity = null
    protected runtime: Runtime = null

    static get defineName(): string {
        return 'Component'
    }

    static get defineDepends(): Array<string> {
        return []
    }

    static get defineData(): Object {
        return {}
    }

    static nosync:boolean = false


    get nosync():boolean{
        return Object.getPrototypeOf(this).constructor.nosync;
    }

    get defineDepends(): Array<string> {
        return Object.getPrototypeOf(this).constructor.defineDepends;
    }

    get defineName(): string {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    constructor() {

    }

    reset(){
        this.dirty = true
    }

    setRuntime(runtime:Runtime){
        this.runtime = runtime
    }

    getComponentName():string {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    getSibling<T extends IComponent>(comp:{new():T}):T {
        if (this.entity) {
            return this.entity.get(comp);
        }
    }

    setEntity(ent) {
        this.entity = ent;
    }

    isClient():boolean {
        return this.runtime.isClient();
    }

    getEntity():Entity {
        return this.entity;
    }

    getECS():Runtime {
        return this.runtime;
    }

    markDirty() {
        this.dirty = true;
        this.onDirty && this.onDirty(this.entity, this.entity.getECS());
        if (this.isClient()) {

            if (this.updateView) {
                this.getECS().addRenderQueue(this);
            }
            let renderer = this.getRenderer();
            if (renderer) {
                let renderComp = this.getSibling(renderer);
                renderComp && renderComp.markDirty();
            }
        }
        if (this.entity) {
            this.entity.markDirty(this);
        }
        if (this.runtime && this.runtime.dirtyComponents.indexOf(this.entity) === -1) {
            this.runtime.dirtyComponents.push(this.entity);
        }
    }

    isDirty() {
        return this.dirty;
    }

    clean() {
        this.dirty = false;
    }

    getRenderer() {
        return this.getECS().getComponentRenderer(this);
    }

    isRenderer() {
        return this.getECS().rendererArray.indexOf(this.getComponentName()) !== -1;
    }

    onAdd(ent, ecs) {

    }

    onRemove(ent, ecs) {

    }

    onDirty(ent, ecs) {

    }

    onCreate(ecs) {

    }

    onDestroy(ecs) {

    }

    onRegister(ecs) {

    }
}