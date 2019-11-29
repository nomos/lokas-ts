const Component = require('../Component');

class Contact extends Component{
    static defineName(){
        return 'Contact';
    }
    constructor(a,b,time){
        super();
        this.a = a;
        this.b = b;
        this.time = time;
        this.collision = false;
        this.a_in_b = false;
        this.b_in_a = false;
        this.overlap = 0;
        this.overlap_x = 0;
        this.overlap_y = 0;
    }
    getCollider(ent) {
        return this.a===ent?this.b:this.b===ent?this.a:null;
    }
    dispatchEnterEvent() {
        let codA = this.a.get('Collider');
        let codB = this.b.get('Collider');
        if (codA&&codA.onCollisionEnter) {
            codA.onCollisionEnter(this.a,this.b)
        }
        if (codB&&codB.onCollisionEnter) {
            codB.onCollisionEnter(this.b,this.a)
        }
    }
    dispatchStayEvent() {
        let codA = this.a.get('Collider');
        let codB = this.b.get('Collider');
        if (codA&&codA.onCollisionStay) {
            codA.onCollisionStay(this.a,this.b)
        }
        if (codB&&codB.onCollisionStay) {
            codB.onCollisionStay(this.b,this.a)
        }
    }
    dispatchExitEvent() {
        let codA = this.a.get('Collider');
        let codB = this.b.get('Collider');
        if (codA&&codA.onCollisionExit) {
            codA.onCollisionExit(this.a,this.b)
        }
        if (codB&&codB.onCollisionExit) {
            codB.onCollisionExit(this.b,this.a)
        }
    }
}

module.exports = Contact;



