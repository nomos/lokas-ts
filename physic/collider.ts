import {Contact} from "./contact";
import {Rect} from "./rect";
import {collision} from "./collision";
import {PhysicWorld} from "./physicworld";
import {QuadBranch, QuadTree} from "./quadtree";
import {BVBranch, BVTree} from "./bvtree";
import {Entity} from "../ecs/entity";
import {Polygon} from "./polygon";
import {Circle} from "./circle"

export class Collider extends Rect{
    public padding:number
    public minX:number
    public maxX:number
    public minY:number
    public maxY:number
    public tag:number
    public branch:QuadBranch
    public quadTree:QuadTree
    public parent:BVBranch
    public world:BVTree
    public contacts:Array<Entity>
    public collideCount:number
    public isCollide:boolean
    static get defineName(){
        return 'Collider';
    }
    constructor(minX=0,minY=0,maxX=0,maxY=0,padding=0){
        super(minX,minY,maxX,maxY);
        this.padding = padding;
        this.minX = 0;
        this.maxX = 0;
        this.minY = 0;
        this.maxY = 0;
        this.tag = 0;
        this.branch = null;   //所在的四叉树节点
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
        cod.contacts[this.entity.id] = contact;
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
        let contact = ent.get(Contact);
        if (!contact) return;
        return contact.getCollider(this.getEntity());
    }
    removeContact(id){
        let contact = this.contacts[id];
        if (contact) {
            this.collideCount--;
            contact.destroy();
            let ent = this.getEntity();
            let cod = contact.get(Contact).getCollider(ent).get(Collider);
            cod.collideCount--;
            delete cod.contacts[ent.id];
            delete this.contacts[id];
        }
    }
    setTag(){
        return this.tag;
    }
    collide(collider,result=null,aabb = true) {
        return collision(this, collider, result, aabb);
    }
    onRemove(ent,ecs){
        if (this.world) {
            this.world.remove(this);
        }
    }
    updateBorder(){
        let cPolygon = <Polygon>(this.getSibling('Polygon')||this.getSibling('Point'));
        let cCircle = <Circle>this.getSibling('Circle');
        cPolygon&&cPolygon._calculateCoords();
        this.minX = cPolygon?cPolygon.minX:cCircle.x-cCircle.radius*cCircle.scale-this.padding;
        this.maxX = cPolygon?cPolygon.maxX:cCircle.x+cCircle.radius*cCircle.scale+this.padding;
        this.minY = cPolygon?cPolygon.minY:cCircle.y-cCircle.radius*cCircle.scale-this.padding;
        this.maxY = cPolygon?cPolygon.maxY:cCircle.y+cCircle.radius*cCircle.scale+this.padding;
    }
    draw(context) {
        const min_x  = this.minX;
        const min_y  = this.minY;
        const max_x  = this.maxX;
        const max_y  = this.maxY;

        context.moveTo(min_x, min_y);
        context.lineTo(max_x, min_y);
        context.lineTo(max_x, max_y);
        context.lineTo(min_x, max_y);
        context.lineTo(min_x, min_y);
        context.close();
    }
}