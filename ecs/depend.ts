import {IDependMgr, IRuntime} from "./runtime";
import {util} from "../utils/util";
import {IComponentCtor} from "./default_component";


export class DependManager implements IDependMgr {
    private dependsPair: Map<IComponentCtor, IComponentCtor[]> = new Map<IComponentCtor, IComponentCtor[]>()
    private dependsPairInverse: Map<IComponentCtor, IComponentCtor[]> = new Map<IComponentCtor, IComponentCtor[]>()
    private runtime: IRuntime

    constructor(runtime: IRuntime) {
        this.runtime = runtime

    }

    AddDepends(a: IComponentCtor, b: IComponentCtor) {
        if (!this.dependsPair.get(a)) {
            this.dependsPair.set(a, [])
        }
        this.dependsPair.get(a).push(b);
        if (!this.dependsPairInverse.get(b)) {
            this.dependsPairInverse.set(b, [])
        }
        this.dependsPairInverse.get(b).push(a);
    }

    IsDepend(a: IComponentCtor, b: IComponentCtor): boolean {
        return (this.dependsPair.get(a) || []).indexOf(b) !== -1;
    }

    GetDependsBy(a: IComponentCtor): IComponentCtor[] {
        return this.dependsPairInverse.get(a) || [];
    }

    GetDepends(a: IComponentCtor): IComponentCtor[] {
        return this.dependsPair.get(a) || [];
    }

    SortDepends(a: any, b: any): number {

        if (!this.dependsPair.get(a)) {
            this.dependsPair.set(a, [])
        }
        if (this.dependsPair.get(a).indexOf(b) !== -1) {
            return 1;
        }
        if (!this.dependsPair.get(b)) {
            this.dependsPair.set(b, [])
        }
        if (this.dependsPair.get(b).indexOf(a) !== -1) {
            return -1;
        }
        return 0;
    }

    SortDependsInverse(a: any, b: any): number {
        return -this.SortDepends(a, b);
    }
}