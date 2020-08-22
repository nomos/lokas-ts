/**
 * StateMachine v1.0.1 - git.io/stm
 * Oliver Caldwell
 * MIT license
 */

import {EventEmitter} from "./event_emitter";

export class StateMachine extends EventEmitter{
    protected _state:string
    protected _lastState:string
    constructor(options) {
        super()
        if (options) {
            // Register any passed listeners
            if (options.listeners) {
                this.addListeners(options.listeners);
            }

            // Store the initial state if there is one
            if (options.initialState) {
                this.setState(options.initialState);
            }
        }
    }
    getState () {
        var state = this._state;
        return typeof state === 'string' && state ? state : null;
    }
    get (){
        return this.getState()
    }
    get state(){
        return this.getState()
    }
    get now(){
        return this.getState()
    }
    getLastState() {
        let state = this._lastState;
        return typeof state === 'string' && state ? state : null;
    }

    get last(){
        return this.getLastState()
    }

    setState = function (next, ...args) {
        var orig = this.getState(),
            trans = '>';
        this._state = next;
        this._lastState = orig;

        if (orig) {
            this.emitEvent(orig + trans + next, ...args);

            this.emitEvent(orig + trans, ...args);
        }

        this.emitEvent(trans + next, ...args);

        this.emitEvent('change', [orig, next]);

        return this;
    }
    set (next, ...args){
        return this.setState(next,...args)
    }
    set state(next){
        this.setState(next,[])
    }
    set now(next){
        this.setState(next,[])
    }
}
