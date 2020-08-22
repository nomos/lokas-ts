import {Polygon} from "./polygon"
export class Point extends Polygon{
    static get defineName(){
        return 'Point';
    }
    constructor(){
        super([[0,0]],0,1,1);
    }
}