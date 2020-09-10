import {Long} from "./long";
import {util} from "./util";
import {log} from "./logger";

export function convertToLongArray(arr:number[]|string[]|Long[]):Long[] {
    if (arr.length==0) {
        return new Array<Long>()
    }
    let ret = new Array<Long>()
    let item1 = arr[0]
    if (util.isNumber(item1)) {
        arr = <number[]>arr
        arr.forEach(function (v,i,arr) {
            ret.push(Long.fromNumber(v))
        })
        return ret
    } else if (util.isStringNumber(item1)) {
        arr = <string[]>arr
        arr.forEach(function (v,i,arr) {
            if (!util.isStringNumber(v)) {
                log.panic("iter is not a stringNumber")
            }
            ret.push(Long.fromString(v))
        })
        return ret
    } else if (item1 instanceof Long) {
        return <Long[]>arr
    }
    log.panic("invalid long arr")
}