import {IDependMgr, IRuntime} from "./runtime";
import {util} from "../utils/util";
import {IComponent} from "./default_component";


export class DependManager implements IDependMgr {
    private dependsPair: Map<{ new(): IComponent }, { new(): IComponent }[]> = new Map<{ new(): IComponent }, { new(): IComponent }[]>()
    private dependsPairInverse: Map<{ new(): IComponent }, { new(): IComponent }[]> = new Map<{ new(): IComponent }, { new(): IComponent }[]>()
    private runtime: IRuntime

    constructor(runtime: IRuntime) {
        this.runtime = runtime

    }

    AddDepends(a: { new(): IComponent }, b: { new(): IComponent }) {
        if (!this.dependsPair.get(a)) {
            this.dependsPair.set(a, [])
        }
        this.dependsPair.get(a).push(b);
        if (!this.dependsPairInverse.get(b)) {
            this.dependsPairInverse.set(b, [])
        }
        this.dependsPairInverse.get(b).push(a);
    }

    IsDepend(a: { new(): IComponent }, b: { new(): IComponent }): boolean {
        return (this.dependsPair.get(a) || []).indexOf(b) !== -1;
    }

    GetDependsBy(a: { new(): IComponent }): { new(): IComponent }[] {
        return this.dependsPairInverse.get(a) || [];
    }

    GetDepends(a: { new(): IComponent }): { new(): IComponent }[] {
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