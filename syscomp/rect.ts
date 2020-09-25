import {IComponent} from "../ecs/default_component";
import {define, formats, Tag} from "../protocol/types";

@define('Rect')
@formats([
    ["MinX",Tag.Float],
    ["MinY",Tag.Float],
    ["MaxX",Tag.Float],
    ["MaxY",Tag.Float],
])
export class Rect extends IComponent {
    static get defineDepends() {
        return [].concat(super.defineDepends);
    }
    public MinX:number
    public MinY:number
    public MaxX:number
    public MaxY:number
    constructor(minX = 0, minY = 0, maxX = 0, maxY = 0) {
        super();
        this.MinX = minX;
        this.MinY = minY;
        this.MaxX = maxX;
        this.MaxY = maxY;
    }

    get X() {
        return this.MinX / 2 + this.MaxX / 2;
    }

    get Y() {
        return this.MinY / 2 + this.MaxY / 2;
    }

    set W(width) {
        this.MinX = this.X - width / 2;
        this.MaxX = this.X + width / 2;
    }

    get W() {
        return this.MaxX - this.MinX;
    }

    set H(height) {
        this.MinY = this.Y - height / 2;
        this.MaxY = this.Y + height / 2;
    }

    get H() {
        return this.MaxY - this.MinY;
    }

    IntersectionWithRect (a) {
        return !(this.MinY > a.maxY || this.MinX > a.maxX || this.MaxY < a.minY || this.MaxX < a.minX);
    }

    Draw(color, fill, graphic) {
        graphic.rect(this.MinX, this.MinY, this.W, this.H);
        graphic.strokeColor = cc.color(color);
        graphic.fillColor = cc.color(color);
        fill ? graphic.fill() : graphic.stroke();
    }
}
