import {RectBox} from "./rectbox"
import {Collider} from "./collider"
import {IComponent} from "../ecs/default_component";
import {Polygon} from "./polygon"
import {define, Tag} from "../protocol/types";
import {Point} from "./point";
import {Circle} from "./circle";

const branch_pool = [];

export interface BVNode extends RectBox {
    parent: BVBranch     //父节点永远只能是BVBranch
    world: BVTree
    branch: boolean      //是否BVBranch
}

@define("BVBranch", [
    ["MinX", Tag.Float],
    ["MinY", Tag.Float],
    ["MaxX", Tag.Float],
    ["MaxY", Tag.Float],
])
export class BVBranch extends RectBox implements BVNode {
    public parent: BVBranch
    public left: BVNode
    public right: BVNode
    public branch: boolean
    public world: BVTree

    constructor(minX = 0, maxX = 0, minY = 0, maxY = 0, world = null) {
        super(minX, maxX, minY, maxY);
        this.parent = null;
        this.left = null;
        this.right = null;
        this.branch = true;
        this.world = world;
    }
}

@define("BVTree")
export class BVTree extends IComponent {
    public branches: BVNode[]
    public root: BVNode

    static recycle(branch: BVBranch) {
        branch.parent = null;
        branch.left = null;
        branch.right = null;
        branch_pool.push(branch);
    }

    constructor() {
        super();
        this.branches = [];
        this.root = null;
    }

    createBVBranch(minX = 0, maxX = 0, minY = 0, maxY = 0) {
        let ret;
        if (branch_pool.length) {
            ret = branch_pool.pop();
        } else {
            ret = new BVBranch(minX, maxX, minY, maxY);
        }
        ret.world = this;
        return ret;
    }

    insert(collider: Collider, updating = false) {
        if (!updating) {
            const world = collider.world;
            if (world && world !== this) {
                throw new Error('Collider belongs to another collision system');
            }
            this.branches.push(collider);
            collider.world = this;
        }
        let cPolygon = collider.getSibling(Polygon) || collider.getSibling(Point);
        let cCircle = collider.getSibling(Circle);

        const body_x = cPolygon ? cPolygon.x : cCircle.x;
        const body_y = cPolygon ? cPolygon.y : cCircle.y;
        if (cPolygon) {
            if (collider.GetEntity().IsDirty()) {
                cPolygon._calculateCoords();

            }
        }
        const padding = collider.getSibling(Collider).padding;
        const radius = cPolygon ? 0 : cCircle.Radius * cCircle.Scale;
        const body_min_x = (cPolygon ? cPolygon.minX : body_x - radius) - padding;
        const body_max_x = (cPolygon ? cPolygon.maxX : body_x + radius) + padding;
        const body_min_y = (cPolygon ? cPolygon.minY : body_y - radius) - padding;
        const body_max_y = (cPolygon ? cPolygon.maxY : body_y + radius) + padding;
        collider.MinX = body_min_x;
        collider.MaxX = body_max_x;
        collider.MinY = body_min_y;
        collider.MaxY = body_max_y;
        let current = this.root;
        if (!current) {
            this.root = collider.parent;
            return;
        }
        while (true) {
            if (current.branch) {
                const left = (<BVBranch>current).left;
                const left_min_x = left.MinX;
                const left_min_y = left.MinY;
                const left_max_x = left.MaxX;
                const left_max_y = left.MaxY;
                const left_new_min_x = body_min_x < left_min_x ? body_min_x : left_min_x;
                const left_new_min_y = body_min_y < left_min_y ? body_min_y : left_min_y;
                const left_new_max_x = body_max_x > left_max_x ? body_max_x : left_max_x;
                const left_new_max_y = body_max_y > left_max_y ? body_max_y : left_max_y;
                const left_volume = (left_max_x - left_min_x) * (left_max_y - left_min_y);
                const left_new_volume = (left_new_max_x - left_new_min_x) * (left_new_max_y - left_new_min_y);
                const left_difference = left_new_volume - left_volume;

                const right = (<BVBranch>current).right;
                const right_min_x = right.MinX;
                const right_min_y = right.MinY;
                const right_max_x = right.MaxX;
                const right_max_y = right.MaxY;
                const right_new_min_x = body_min_x < right_min_x ? body_min_x : right_min_x;
                const right_new_min_y = body_min_y < right_min_y ? body_min_y : right_min_y;
                const right_new_max_x = body_max_x > right_max_x ? body_max_x : right_max_x;
                const right_new_max_y = body_max_y > right_max_y ? body_max_y : right_max_y;
                const right_volume = (right_max_x - right_min_x) * (right_max_y - right_min_y);
                const right_new_volume = (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
                const right_difference = right_new_volume - right_volume;

                current.MinX = left_new_min_x < right_new_min_x ? left_new_min_x : right_new_min_x;
                current.MinY = left_new_min_y < right_new_min_y ? left_new_min_y : right_new_min_y;
                current.MaxX = left_new_max_x > right_new_max_x ? left_new_max_x : right_new_max_x;
                current.MaxY = left_new_max_y > right_new_max_y ? left_new_max_y : right_new_max_y;
                current = left_difference <= right_difference ? left : right;
            } else {
                const grandparent = current.parent;
                const parent_min_x = current.MinX;
                const parent_min_y = current.MinY;
                const parent_max_x = current.MaxX;
                const parent_max_y = current.MaxY;
                const new_parent = current.parent = collider.parent = this.createBVBranch();
                new_parent.parent = grandparent;
                new_parent.left = current;
                new_parent.right = collider;
                new_parent.minX = body_min_x < parent_min_x ? body_min_x : parent_min_x;
                new_parent.minY = body_min_y < parent_min_y ? body_min_y : parent_min_y;
                new_parent.maxX = body_max_x > parent_max_x ? body_max_x : parent_max_x;
                new_parent.maxY = body_max_y > parent_max_y ? body_max_y : parent_max_y;
                if (!grandparent) {
                    this.root = new_parent;
                } else if (grandparent.left === current) {
                    grandparent.left = new_parent;
                } else {
                    grandparent.right = new_parent;
                }
                break;
            }
        }
    }

    remove(collider: Collider, updating = false) {
        if (!updating) {
            const world = collider.world;
            if (world && world !== this) {
                throw new Error('Collider belongs to another collision system');
            }
            collider.world = null;
            this.branches.splice(this.branches.indexOf(collider), 1);
        }
        if (this.root === collider) {
            this.root = null;
            return;
        }
        const parent = collider.parent;
        const grandparent = parent.parent;
        const parent_left = parent.left;
        const parent_right = parent.right;
        const sibling = parent_left === collider ? parent_right : parent_left;
        sibling.parent = grandparent;
        if (grandparent) {
            if (grandparent.left === parent) {
                grandparent.left = sibling;
            } else {
                grandparent.right = sibling;
            }
            let branch = grandparent;
            while (branch) {
                const left = branch.left;
                const left_min_x = left.MinX;
                const left_min_y = left.MinY;
                const left_max_x = left.MaxX;
                const left_max_y = left.MaxY;

                const right = branch.right;
                const right_min_x = right.MinX;
                const right_min_y = right.MinY;
                const right_max_x = right.MaxX;
                const right_max_y = right.MaxY;

                branch.MinX = left_min_x < right_min_x ? left_min_x : right_min_x;
                branch.MinY = left_min_y < right_min_y ? left_min_y : right_min_y;
                branch.MaxX = left_max_x > right_max_x ? left_max_x : right_max_x;
                branch.MaxY = left_max_y > right_max_y ? left_max_y : right_max_y;
                branch = branch.parent;
            }
        } else {
            this.root = sibling;
        }
        BVTree.recycle(parent);
    }

    update() {
        const nodes = this.branches;
        const count = nodes.length;
        for (let i = 0; i < count; i++) {
            const node = nodes[i];
            let update = false;

            if (!update) {

                let cPolygon = node.getSibling(Polygon) || node.getSibling(Point);
                let cCircle = node.getSibling(Circle);

                if (cPolygon && node.GetEntity().IsDirty()) {
                    cPolygon._calculateCoords();
                }

                const x = cPolygon ? cPolygon.x : cCircle.x;
                const y = cPolygon ? cPolygon.y : cCircle.y;
                const radius = cPolygon ? 0 : cCircle.Radius * cCircle.Scale;
                const min_x = cPolygon ? cPolygon.minX : x - radius;
                const min_y = cPolygon ? cPolygon.minY : y - radius;
                const max_x = cPolygon ? cPolygon.maxX : x + radius;
                const max_y = cPolygon ? cPolygon.maxY : y + radius;

                update = min_x < node.MinX || min_y < node.MinY || max_x > node.MaxX || max_y > node.MaxY;
            }

            if (update) {
                if (node.branch) {
                    this.remove(<Collider>node, true);
                    this.insert(<Collider>node, true);
                }
            }

        }
    }

    potentials(collider: Collider) {
        const results = [];
        const min_x = collider.MinX;
        const min_y = collider.MinY;
        const max_x = collider.MaxX;
        const max_y = collider.MaxY;
        let current = this.root;
        let traverse_left = true;
        if (!current || !current.branch) {
            return results;
        }
        while (current) {
            if (traverse_left) {
                traverse_left = false;

                let left = current.branch ? (<BVBranch>current).left : null;

                while (
                    left &&
                    left.MaxX >= min_x &&
                    left.MaxY >= min_y &&
                    left.MinX <= max_x &&
                    left.MinY <= max_y
                    ) {
                    current = left;
                    left = current.branch ? (<BVBranch>current).left : null;
                }
            }

            const branch = current.branch;
            const right = branch ? (<BVBranch>current).right : null;

            if (
                right &&
                right.MaxX > min_x &&
                right.MaxY > min_y &&
                right.MinX < max_x &&
                right.MinY < max_y
            ) {
                current = right;
                traverse_left = true;
            } else {
                if (!branch && current !== collider) {
                    results.push(current);
                }

                let parent = current.parent;

                if (parent) {
                    while (parent && parent.right === current) {
                        current = parent;
                        parent = current.parent;
                    }

                    current = parent;
                } else {
                    break;
                }
            }
        }
        return results;
    }

    traverse(cb) {
        let current = this.root;
        let traverse_left = true;

        while (current) {
            if (traverse_left) {
                traverse_left = false;

                let left = current.branch ? (<BVBranch>current).left : null;

                while (left) {
                    current = left;
                    left = current.branch ? (<BVBranch>current).left : null;
                }
            }

            cb(current);
            const branch = current.branch;
            const right = branch ? (<BVBranch>current).right : null;

            if (right) {
                current = right;
                traverse_left = true;
            } else {
                let parent = current.parent;

                if (parent) {
                    while (parent && parent.right === current) {
                        current = parent;
                        parent = current.parent;
                    }

                    current = parent;
                } else {
                    break;
                }
            }
        }

    }

    draw(context, scale_x, scale_y) {
        this.traverse(function (branch) {
            scale_x = scale_x || 1;
            scale_y = scale_y || scale_x || 1;
            const min_x = branch.minX * scale_x;
            const min_y = branch.minY * scale_y;
            const max_x = branch.maxX * scale_x;
            const max_y = branch.maxY * scale_y;
            context.moveTo(min_x, min_y);
            context.lineTo(max_x, min_y);
            context.lineTo(max_x, max_y);
            context.lineTo(min_x, max_y);
            context.lineTo(min_x, min_y);
            context.close();
        })
    }
}
