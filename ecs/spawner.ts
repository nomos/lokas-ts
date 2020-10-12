import {Entity} from "./entity";
import {IContext} from "../common/context";

export interface ISpawner {
    Spawn(id:string,context:IContext):Entity
}

export class Spawner{
    Spawn(id:string):Entity {
        return null
    }
}
