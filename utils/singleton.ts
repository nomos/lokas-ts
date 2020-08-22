export class Singleton {
    static __instance
    static getInstance() {
        if (!this.__instance) {
            let args = [].slice.call(arguments);
            this.__instance = Object.create(this.prototype);
            this.apply(this.__instance,args);
        }
        return this.__instance;
    }
    isSingleton(){
        return this === Object.getPrototypeOf(this).constructor.getInstance();
    }
}
