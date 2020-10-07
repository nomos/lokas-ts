export class RingBuffer<T> {
    protected _elements: T[]
    protected _first: number = 0
    protected _last: number = 0
    protected _size: number = 0
    protected _end: number = 0
    protected _evictedCb: (t: T) => void

    constructor(capacity: number, evictedCb: (t: T) => void) {
        this._elements = new Array<T>(capacity || 50);
        this._evictedCb = evictedCb;
    }

    capacity(): number {
        return this._elements.length;
    }

    isEmpty(): boolean {
        return this.size() === 0;
    }

    isFull(): boolean {
        return this.size() === this.capacity();
    }

    /**
     * Peeks at the top element of the queue.
     */
    peek(): T {
        if (this.isEmpty()) throw new Error('RingBuffer is empty');

        return this._elements[this._first];
    }

    /**
     * Peeks at multiple elements in the queue.
     */
    peekN(count): T[] {
        if (count > this._size) throw new Error('Not enough elements in RingBuffer');

        let end = Math.min(this._first + count, this.capacity());
        let firstHalf = this._elements.slice(this._first, end);
        if (end < this.capacity()) {
            return firstHalf;
        }
        let secondHalf = this._elements.slice(0, count - firstHalf.length);
        return firstHalf.concat(secondHalf);
    }

    /**
     * Dequeues the top element of the queue.
     */
    deq(): T {
        let element = this.peek();

        this._size--;
        this._first = (this._first + 1) % this.capacity();

        return element;
    }

    /**
     * Dequeues multiple elements of the queue.
     */
    deqN(count: number): T[] {
        let elements = this.peekN(count);

        this._size -= count;
        this._first = (this._first + count) % this.capacity();

        return elements;
    }

    /**
     * Enqueues the `element` at the end of the ring buffer and returns its new size.
     */
    enq(element: T): number {
        this._end = (this._first + this.size()) % this.capacity();
        let full = this.isFull()
        if (full && this._evictedCb) {
            this._evictedCb(this._elements[this._end]);
        }
        this._elements[this._end] = element;

        if (full) {
            this._first = (this._first + 1) % this.capacity();
        } else {
            this._size++;
        }

        return this.size();
    }

    /**
     * Returns the size of the queue.
     */
    size(): number {
        return this._size;
    }
}