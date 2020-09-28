import {Polygon} from "./polygon"
import {define} from "../protocol/types";

@define("Point")
export class Point extends Polygon{
    constructor(){
        super([[0,0]],0,1,1);
    }
}