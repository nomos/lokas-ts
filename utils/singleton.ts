export class Singleton {
    static __instance
    static GetInstance() {
        if (!this.__instance) {
            let args = [].slice.call(arguments);
            this.__instance = Object.create(this.prototype);
            this.apply(this.__instance,args);
        }
        return this.__instance;
    }
    IsSingleton(){
        return this === Object.getPrototypeOf(this).constructor.getInstance();
    }
}
