
/* Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
 * items are added to the end of the queue and removed from the front.
 */

export class Queue<T>{
    protected queue:T[] = []
    protected offset:number = 0

    constructor() {
    }
    size():number {
        return (this.queue.length - this.offset);
    }
    isEmpty():boolean{
        return (this.queue.length == 0);
    }
    enq(item){
        this.queue.push(item);
    }
    /* Dequeues an item and returns it. If the queue is empty, the value
     * 'undefined' is returned.
     */
    deq(item):T{

        // if the queue is empty, return immediately
        if (this.queue.length == 0) return undefined;

        // store the item at the front of the queue
        item = this.queue[this.offset];

        // increment the offset and remove the free space if necessary
        if (++ this.offset * 2 >= this.queue.length){
            this.queue  = this.queue.slice(this.offset);
            this.offset = 0;
        }

        return item;
    }
    /* Returns the item at the front of the queue (without dequeuing it). If the
     * queue is empty then undefined is returned.
     */
    peek():T{
        return (this.queue.length > 0 ? this.queue[this.offset] : undefined);
    }
}