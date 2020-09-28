import {IComponent} from "../ecs/default_component";
import {Entity} from "../ecs/entity";
import {Collider} from "./collider"
import {define} from "../protocol/types";

@define("Contact")
export class Contact extends IComponent{
    public a:Entity
    public b:Entity
    public time:number
    public collision:boolean
    public a_in_b:boolean
    public b_in_a:boolean
    public overlap:number
    public overlap_x:number
    public overlap_y:number
    constructor(a?:Entity,b?:Entity,time?:number){
        super();
        this.a = a;
        this.b = b;
        this.time = time;
        this.collision = false;
        this.a_in_b = false;
        this.b_in_a = false;
        this.overlap = 0;
        this.overlap_x = 0;
        this.overlap_y = 0;
    }
    getCollider(ent:Entity):Entity {
        return this.a===ent?this.b:this.b===ent?this.a:null;
    }
    //TODO:是否需要发布事件?
    dispatchEnterEvent() {
        let codA = this.a.Get(Collider);
        let codB = this.b.Get(Collider);
    }
    //TODO:是否需要发布事件?
    dispatchStayEvent() {
        let codA = this.a.Get(Collider);
        let codB = this.b.Get(Collider);
    }
    //TODO:是否需要发布事件?
    dispatchExitEvent() {
        let codA = this.a.Get(Collider);
        let codB = this.b.Get(Collider);
    }
}



