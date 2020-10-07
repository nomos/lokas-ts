import {Contact} from "./contact";
import {RectBox} from "./rectbox";
import {collision} from "./collision";
import {QuadBranch, QuadTree} from "./quadtree";
import {BVBranch, BVNode, BVTree} from "./bvtree";
import {Entity} from "../ecs/entity";
import {Polygon} from "./polygon";
import {Point} from "./point";
import {Circle} from "./circle"
import {define, Tag} from "../protocol/types";

@define("Collider",[
    ["MinX", Tag.Float],
    ["MinY", Tag.Float],
    ["MaxX", Tag.Float],
    ["MaxY", Tag.Float],
])
export class Collider extends RectBox implements BVNode{
    public padding:number
    public MinX:number
    public MaxX:number
    public MinY:number
    public MaxY:number
    public tag:number
    public branch = false   //标识不是一个BVBranch节点
    public parent:BVBranch
    public world:BVTree
    public quadBranch:QuadBranch
    public quadTree:QuadTree
    public contacts:Entity[]
    public collideCount:number
    public isCollide:boolean
    constructor(minX=0,minY=0,maxX=0,maxY=0,padding=0){
        super(minX,minY,maxX,maxY);
        this.padding = padding;
        this.MinX = 0;
        this.MaxX = 0;
        this.MinY = 0;
        this.MaxY = 0;
        this.tag = 0;
        this.quadBranch = null;   //所在的四叉树节点
        this.quadTree = null;  //所在的四叉树世界
        this.parent = null;     //层次包围盒父节点
        this.world = null;      //层次包围盒世界节点
        this.contacts = [];
        this.collideCount = 0;
        this.isCollide = false;
    }
    addContact(entity,contact){
        if (this.contacts[entity.id]) {
            return;
        }
        this.contacts[entity.id] = contact;
        let cod = entity.get(Collider);
        cod.contacts[this.entity.Id] = contact;
        cod.collideCount++;
        this.collideCount++;
    }
    removeAllContacts() {
        for (let i in this.contacts) {
            this.removeContact(i);
        }
    }
    checkIsCollidable(a,b,world) {
        if (!a||!b) {
            return false;
        }
        if (!a.tag&&!b.tag) {
            return true;
        }
        return world.config[a.tag]?world.config[a.tag][b.tag]:false;
    }
    createContact(ecs,A,B) {
        let contact = this.isContact(A,B);
        if (contact) {
            contact.get(Contact).dispatchStayEvent();
            return;
        }
        let codA = A.get(Collider);


        let cent = ecs.createEntity();
        contact = cent.add(Contact,A,B);
        codA.addContact(B,cent);
        contact.dispatchEnterEvent();
    }
    isContact(A,B) {
        return A.get(Collider).contacts[B.id];
    }
    deleteContactfunction (A,B) {
        let contact = this.isContact(A,B);
        if (!contact) {
            return;
        }
        contact.get(Contact).dispatchExitEvent();
        let codA = A.get(Collider);
        codA.removeContact(B);
    }
    getFirstContactEntity():Entity {
        return this.contacts[0]
    }
    getFirstColliderEntity():Entity {
        let ent =this.getFirstContactEntity();
        if (!ent) return;
        let contact = ent.Get(Contact);
        if (!contact) return;
        return contact.getCollider(this.GetEntity());
    }
    removeContact(id){
        let contact = this.contacts[id];
        if (contact) {
            this.collideCount--;
            contact.destroy();
            let ent = this.GetEntity();
            let cod = contact.Get(Contact).getCollider(ent).Get(Collider);
            cod.collideCount--;
            delete cod.contacts[ent.Id];
            delete this.contacts[id];
        }
    }
    setTag(){
        return this.tag;
    }
    collide(collider,result=null,aabb = true) {
        return collision(this, collider, result, aabb);
    }
    OnRemove(ent, ecs){
        if (this.world) {
            this.world.remove(this);
        }
    }
    updateBorder(){
        let cPolygon =this.getSibling(Polygon)||this.getSibling(Point);
        let cCircle = this.getSibling(Circle);
        cPolygon&&cPolygon._calculateCoords();
        this.MinX = cPolygon?cPolygon.minX:cCircle.x-cCircle.Radius*cCircle.Scale-this.padding;
        this.MaxX = cPolygon?cPolygon.maxX:cCircle.x+cCircle.Radius*cCircle.Scale+this.padding;
        this.MinY = cPolygon?cPolygon.minY:cCircle.y-cCircle.Radius*cCircle.Scale-this.padding;
        this.MaxY = cPolygon?cPolygon.maxY:cCircle.y+cCircle.Radius*cCircle.Scale+this.padding;
    }
    draw(context) {
        const min_x  = this.MinX;
        const min_y  = this.MinY;
        const max_x  = this.MaxX;
        const max_y  = this.MaxY;

        context.moveTo(min_x, min_y);
        context.lineTo(max_x, min_y);
        context.lineTo(max_x, max_y);
        context.lineTo(min_x, max_y);
        context.lineTo(min_x, min_y);
        context.close();
    }
}