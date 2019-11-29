const Rect = require('./Rect');
const Entity = require('../Entity');
const Component = require('../Component');

class QuadTree extends Rect{
    static defineName(){
        return 'QuadTree';
    }
    constructor(x,y,w,h,maxObject=8,maxLevel=4){
        super(x-w/2,y-h/2,x+w/2,y+h/2);
        this.maxObject = maxObject;
        this.maxLevel = maxLevel;
        this.root = new QuadBranch(x-w/2,y-h/2,x+w/2,y+h/2,0);
        this.colliders = [];

    }
    remove(collider,updating=false){
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        if(!updating) {
            const world = collider.quadWorld;
            if(world && world !== this) {
                throw new Error('Collider belongs to another quad system');
            }
            collider.quadWorld = null;
            this.colliders.splice(this.colliders.indexOf(collider), 1);
        }
        let tree = collider.quadTree;
        let index = tree.objects.indexOf(collider);
        tree.objects.splice(index,1);
        collider.quadTree = null;
        tree.tryCollapse(this.maxObject);
    }
    insert(collider,updating = false){
        if(!updating) {
            const world = collider.quadWorld;
            if(world && world !== this) {
                throw new Error('Collider belongs to another quad system');
            }
            if (collider instanceof Entity) {
                collider = collider.get('Collider');
            }
            collider.updateBorder();
            if (this.colliders.indexOf(collider)!==-1) {
                this.remove(collider);
                this.insert(collider);
                return;
            }
            this.colliders.push(collider);
            collider.quadWorld = this;


        }
        return this.root.insert(collider,this.maxObject,this.maxLevel);
    }

    potentials(collider) {
        return this.root.potentials(collider);
    }

    traverse(cb){
        if (!this.root) {
            return;
        }
        let stack = [];
        stack.push(this.root);
        let tmpNode;
        while (stack.length > 0) {
            tmpNode = stack.pop();
            cb(tmpNode);
            if (tmpNode.nodes && tmpNode.nodes.length > 0) {
                for (let i = tmpNode.nodes.length - 1; i >= 0; i--) {
                    stack.push(tmpNode.nodes[i]);
                }
            }
        }
    }

    draw(context){
        this.traverse(function (branch) {
            const min_x  = branch.minX;
            const min_y  = branch.minY;
            const max_x  = branch.maxX;
            const max_y  = branch.maxY;

            context.moveTo(min_x, min_y);
            context.lineTo(max_x, min_y);
            context.lineTo(max_x, max_y);
            context.lineTo(min_x, max_y);
            context.lineTo(min_x, min_y);
            context.close();
        });
    }
}

class QuadBranch extends Rect{
    static defineName(){
        return 'QuadTree';
    }

    /**
     * @constructor
     * @param {Number} minX
     * @param {Number} minY
     * @param {Number} maxX
     * @param {Number} maxY
     * @param {Number} level
     */
    constructor(minX,minY,maxX,maxY,level=0){
        super(minX,minY,maxX,maxY);
        this.level=level;
        this.parent = null;
        this.objects=[];
        this.nodes=[];
    }

    remove(collider,max_object){
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        let tree = collider.quadTree;
        let index = tree.objects.indexOf(collider);
        tree.objects.splice(index,1);
        collider.quadTree = null;
        tree.tryCollapse(max_object);
    }


    /**
     * 创建一个子四叉树
     * @param {Number} minX
     * @param {Number} minY
     * @param {Number} maxX
     * @param {Number} maxY
     * @param {Number} level
     * @returns {QuadTree}
     */
    createChild(minX,minY,maxX,maxY,level){
        let ret = new QuadBranch(minX,minY,maxX,maxY,level);
        ret.parent = this;
        return ret;
    }

    static remove(collider){
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        let tree = collider.quadTree;
        let index = tree.objects.indexOf(collider);
        tree.objects.splice(index,1);
        collider.quadTree = null;
        tree.tryCollapse();
    }

    get size(){
        let ret = 0;
        ret+=this.objects.length;
        for (let i=0;i<this.nodes.length;i++) {
            ret+=this.nodes[i].size;
        }
        return ret;
    }

    get root(){
        let parent = this;
        while(parent.parent) {
            parent = parent.parent;
        }
        return parent;
    }

    tryCollapse(max_object){
        if (!this.parent||this.nodes.length) {
            return;
        }
        if (this.parent.size<max_object) {
            this.parent.collapse();
        }
    }

    collapse(){
        for (let i=0;i<this.nodes.length;i++) {
            let objects = this.nodes[i].objects;

            for (let j=0;j<objects.length;j++) {
                objects[j].quadTree = this;
            }
            this.objects.concat(objects);
            this.nodes[i].clear();
        }
        this.nodes = [];
    }



    /**
     * 插入碰撞体
     * @param {Entity} collider
     * @param {Number} max_object
     * @param {Number} max_level
     */
    insert(collider,max_object,max_level){
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        let i=0;
        let index;
        if (typeof this.nodes[0]!=='undefined') {
            index = this.getIndex(collider);
            if (index!==-1) {
                this.nodes[index].insert(collider,max_object,max_level);
                return;
            }
        }

        this.objects.push(collider);
        collider.quadTree = this;
        if (!max_object) {
            return;
        }
        if (this.objects.length>max_object&&this.level<max_level) {
            if (this.nodes[0]===undefined) {
                this.split();
            }
            while (i<this.objects.length) {
                index = this.getIndex(this.objects[i]);
                if (index!== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0],max_object,max_level)
                } else {
                    i++;
                }
            }
        }
    }

    /**
     * 对碰撞体获取潜在碰撞对象
     * @param {Entity} collider
     * @returns {Array}
     */
    potentials(collider) {
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        let index = this.getIndex(collider);
        let returnObjects = this.objects;
        if (typeof this.nodes[0]!=='undefined') {
            //如果符合其中一个子对象集合,从子对象集合获取碰撞体
            if (index!== -1) {
                returnObjects=returnObjects.concat(
                    this.nodes[index].potentials(collider));
                //如果不能符合子对象,遍历所有子对象获取碰撞体
            } else {
                for (let i=0; i<this.nodes.length; i=i+1) {
                    returnObjects=returnObjects.concat(
                        this.nodes[i].potentials(collider));
                }
            }
        }
        return returnObjects;
    }

    /**
     * 清理四叉树
     */
    clear(){
        this.objects = [];
        for (let i=0;i<this.nodes.length;i++) {
            if (typeof this.nodes[i]!=='undefined') {
                this.nodes[i].clear();
            }
        }
        this.nodes=[];
    }

    /**
     * 分割四叉树
     */
    split(){
        const nextLevel = this.level+1;
        const x = this.x;
        const y = this.y;
        const min_x = this.minX;
        const min_y = this.minY;
        const max_x = this.maxX;
        const max_y = this.maxY;
        this.nodes[0] = this.createChild(
            min_x,min_y,x,y,nextLevel);
        this.nodes[1] = this.createChild(
            x,min_y,max_x,y,nextLevel);
        this.nodes[2] = this.createChild(
            min_x,y,x,max_y,nextLevel);
        this.nodes[3] = this.createChild(
            x,y,max_x,max_y,nextLevel);
    }

    /**
     * 判断插入的碰撞体在当前树的象限
     * @param {Collider} collider
     * @returns {number}
     */
    getIndex(collider){
        if (collider instanceof Entity) {
            collider = collider.get('Collider');
        }
        let index = -1;
        const c_min_x = collider.minX;
        const c_max_x = collider.maxX;
        const c_min_y = collider.minY;
        const c_max_y = collider.maxY;
        const t_min_x = this.minX;
        const t_max_x = this.maxX;
        const t_min_y = this.minY;
        const t_max_y = this.maxY;
        const x = this.x;
        const y= this.y;
        // console.log(collider.getEntity().id,'c_min_x',c_min_x,'c_max_x',c_max_x,'c_min_y',c_min_y,'c_max_y',c_max_y);
        // console.log(collider.getEntity().id,'t_min_x',t_min_x,'t_max_x',t_max_x,'t_min_y',t_min_y,'t_max_y',t_max_y);
        // console.log(collider.getEntity().id,'x',x,'y',y);

        const bottomQuadrant = c_min_y>t_min_y&&c_max_y<y,
            topQuadrant = c_min_y>y&&c_min_y<t_max_y;
        const leftQuadrant = c_min_x>t_min_x&&c_max_x<x,
            rightQuadrant = c_min_x>x&&c_min_x<t_max_x;
        // console.log('bottomQuadrant',bottomQuadrant,'topQuadrant',topQuadrant,'leftQuadrant',leftQuadrant,'rightQuadrant',rightQuadrant);

        if (leftQuadrant) {
            if (bottomQuadrant) {
                index = 0;
            }
            else if (topQuadrant) {
                index = 2;
            }
        } else if (rightQuadrant) {
            if (bottomQuadrant) {
                index = 1;
            } else if (topQuadrant) {
                index=3;
            }
        }
        return index;
    }
}

module.exports = QuadTree;