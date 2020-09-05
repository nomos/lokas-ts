import {Singleton} from "../utils/singleton";
import * as snowflakey from "snowflakey"

class IdGenerator extends Singleton {
    private worker:snowflakey.Worker
    constructor(isServer?:boolean) {
        super();
        if (isServer) {
            this.worker = new snowflakey.Worker({
                name: 'server',
                epoch: 1420070400000,
                workerId: process.env.CLUSTER_ID || 31,
                processId: process.pid || undefined,
                workerBits: 8,
                processBits: 0,
                incrementBits: 14
            })
        } else {
            this.worker = new snowflakey.Worker({
                name: 'client',
                epoch: 1420070400000,
                workerId: 0,
                processId: undefined,
                workerBits: 8,
                processBits: 0,
                incrementBits: 14
            })
        }
    }

    generate():number {
        return this.worker.generate()
    }
}