export interface IContext {
    Set(name: string, value:any)
    Get(name)
}

export class DefaultContext implements IContext{
    public transId: number = -1;
    public resolveFunc: () => void = null;
    public rejectFunc: (srr: string) => void = null;
    private context: object = {}

    getContext() {
        return this.context
    }

    Set(name: string, value:any) {
        this.context[name] = value
    }

    Get(name) {
        return this.context[name]
    }
}