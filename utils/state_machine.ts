import {EventEmitter} from "./event_emitter";

export class StateMachine extends EventEmitter {
    protected _state: string
    protected _lastState: string

    constructor(options) {
        super()
        if (options) {
            if (options.listeners) {
                this.addListeners(options.listeners);
            }

            if (options.initialState) {
                this.setState(options.initialState);
            }
        }
    }

    getState(): string {
        return this._state;
    }

    get(): string {
        return this._state;
    }

    get state(): string {
        return this._state;
    }

    get now(): string {
        return this._state;
    }

    getLastState(): string {
        return this._lastState;
    }

    get last() {
        return this.getLastState()
    }

    setState(next:string, ...args) {
        let orig: string = this.getState()
        let trans = '>';
        this._state = next;
        this._lastState = orig;

        if (orig) {
            this.emitEvent(orig + trans + next, args);

            this.emitEvent(orig + trans, args);
        }

        this.emitEvent(trans + next, args);

        this.emitEvent('change', [orig, next]);

        return this;
    }

    set(next, ...args) {
        return this.setState(next, ...args)
    }

    set state(next) {
        this.setState(next, [])
    }

    set now(next) {
        this.setState(next, [])
    }
}
