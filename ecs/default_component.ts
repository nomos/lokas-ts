import {Entity} from "./entity";
import {Runtime} from "./runtime";

export class IComponent{
    
    static get defineName(): string {
        return 'Component'
    }

    static get defineDepends(): Array<string> {
        return []
    }

    static get defineData(): Object {
        return {}
    }

    private dirty: boolean = true
    private entity: Entity = null
    private runtime: Runtime = null

    get defineDepends(): Array<string> {
        return Object.getPrototypeOf(this).constructor.defineDepends;
    }

    get defineName(): string {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    get defineData(): Object {
        return Object.getPrototypeOf(this).constructor.defineData;
    }

    constructor() {

    }

    setRuntime(runtime:Runtime){
        this.runtime = runtime
    }

    getComponentName() {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    getSibling(comp) {
        if (this.entity) {
            return this.entity.get(comp);
        }
    }

    setEntity(ent) {
        this.entity = ent;
    }

    isClient() {
        return this.runtime.isClient();
    }

    getEntity() {
        return this.entity;
    }

    getECS() {
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
                renderComp && renderComp.dirty();
            }
        }
        if (this.entity) {
            this.entity.markDirty(this);
        }
        if (this.runtime && this.runtime._dirtyComponents.indexOf(this) === -1) {
            this.runtime._dirtyComponents.push(this);
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