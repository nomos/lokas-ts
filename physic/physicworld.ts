import {Entity} from "../ecs/entity";
import {Collider} from "./collider";
import {BVBranch} from "./bvtree";
import {QuadBranch} from "./quadtree";

export interface PhysicWorld {
    insert(collider:Entity|Collider,updating:boolean)
    remove(collider, updating:boolean)
    potentials(collider:Collider)
    traverse(cb:BVBranch|QuadBranch)
    draw(context)
}

export