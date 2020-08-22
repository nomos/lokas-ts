import {Entity} from "./entity";
import {Runtime} from "./runtime";

export interface IComponent {

}

export class DefaultComponent implements IComponent {
    
    static get defineName(): string {
        return 'Component'
    }

    static get defineDepends(): Array<string> {
        return []
    }

    static get defineData(): Object {
        return {}
    }

    private _dirty: boolean = true
    private _entity: Entity = null
    private _runtime: Runtime = null

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

    getComponentName() {
        return Object.getPrototypeOf(this).constructor.defineName;
    }

    getSibling(comp) {
        if (this._entity) {
            return this._entity.get(comp);
        }
    }

    setEntity(ent) {
        this._entity = ent;
    }

    isClient() {
        return this._runtime.isClient();
    }

    getEntity() {
        return this._entity;
    }

    getECS() {
        return this._runtime;
    }

    dirty() {
        this._dirty = true;
        this.onDirty && this.onDirty(this._entity, this._entity.getECS());
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
        if (this._entity) {
            this._entity.markDirty(this);
        }
        if (this._runtime && this._runtime._dirtyComponents.indexOf(this) === -1) {
            this._runtime._dirtyComponents.push(this);
        }
    }

    isDirty() {
        return this._dirty;
    }

    clean() {
        this._dirty = false;
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