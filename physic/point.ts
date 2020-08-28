import {Polygon} from "./polygon"
import {comp} from "../type/types";

@comp('Point')
export class Point extends Polygon{
    constructor(){
        super([[0,0]],0,1,1);
    }
}