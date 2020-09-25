import {Singleton} from "../utils/singleton";
import {SnowFlake} from "../utils/snowflake";

export class IdGenerator extends Singleton {
    private worker:SnowFlake
    constructor(isServer?:boolean) {
        super();
        if (isServer) {
            this.worker = new SnowFlake({
                nodeId:<number>(process.env.CLUSTER_ID || 31),
                timeOffset: 1420070400000,
            })
        } else {
            this.worker = new SnowFlake({
                nodeId:<number>(process.env.CLUSTER_ID || 31),
                timeOffset: 1420070400000,
            })
        }
    }

    Generate():string {
        return this.worker.generateRaw().toString()
    }
}