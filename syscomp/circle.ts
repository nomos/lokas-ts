import {IComponent} from "../ecs/default_component";
import {define, Tag} from "../protocol/types";
import {Position} from "./base_components";

@define("Circle", [
    ["Radius", Tag.Double],
    ["Scale", Tag.Double],
], "Position")
export class Circle extends IComponent {
    public Radius: number
    public Scale: number
    constructor(radius = 0, scale = 1) {
        super();
        this.Radius = radius;
        this.Scale = scale;
    }

    get x() {
        return this.getSibling(Position).X;
    }

    set x(x) {
        this.getSibling(Position).X = x;
    }

    get y() {
        return this.getSibling(Position).Y;
    }

    set y(y) {
        this.getSibling(Position).Y = y;
    }

    draw(context, scale) {
        scale = scale || 1;
        context.circle(this.x * scale, this.y * scale, this.Radius * this.Scale * scale * scale);
    }
}