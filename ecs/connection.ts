import {Runtime} from "./runtime";

export class Connection {
    public uid:string
    public step:number
    public entitySteps:object
    public ecs:Runtime
    public compHash:number
    constructor(uid,ecs) {
        this.uid = uid;
        this.step = -1;
        this.entitySteps = {};
        this.ecs = ecs;
        this.compHash = 0;
    }
    reset() {
        this.step = -1;
        this.entitySteps = [];

    }
    sync(step,entMap){
        this.step = step;
        this.entitySteps = entMap;
    }
}