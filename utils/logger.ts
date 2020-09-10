import {Singleton} from "./singleton";

export class Logger extends Singleton{
    public INGAMECONSOLE:boolean = true
    public OPENLOGFLAGALL:boolean = true
    public STACKLEVEL:number = 3
    public SYSTEMLOG = {};
    public STATE = {
        info: {
            title: '',
            color: 'color:' + '#007700' + ';',
            color1: 'color:' + '#5599FF' + ';',
        },
        warn: {
            title: '警告!!!',
            color: 'color:' + '#FF7700' + ';',
            color1: 'color:' + '#5599FF' + ';',
        },
        debug: {
            title: 'DEBUG!!!',
            color: 'color:' + '#FF0000' + ';',
            color1: 'color:' + '#5599FF' + ';',
        },
        error: {
            title: '错误!!!',
            color: 'color:' + '#FF0000' + ';',
            color1: 'color:' + '#5599FF' + ';',
        },
        panic: {
            title: '崩溃!!!',
            color: 'color:' + '#FF0000' + ';',
            color1: 'color:' + '#5599FF' + ';',
        }
    }
    public OPENLOGFLAG = {
        info: 1,
        log: 1,
        warn: 1,
        error: 1,
        assert: 1,
        time: 1,
        filename: 1,
        classname: 1,
        upperfolder: 0,
        function: 1,
    }
    constructor() {
        super()
    }

    info(...args:any){
        if (!this.OPENLOGFLAGALL || !this.OPENLOGFLAG.log) {
            return;
        }
        this._log(this.STATE.info, args)
    }
    debug(...args:any){
        if (!this.OPENLOGFLAGALL || !this.OPENLOGFLAG.log) {
            return;
        }
        this._log(this.STATE.debug, args)
    }
    warn(...args:any){
        if (!this.OPENLOGFLAGALL || !this.OPENLOGFLAG.log) {
            return;
        }
        this._log(this.STATE.warn, args)
    }
    error(...args:any){
        if (!this.OPENLOGFLAGALL || !this.OPENLOGFLAG.log) {
            return;
        }
        this._log(this.STATE.error, args)
    }
    panic(...args:any) {
        if (!this.OPENLOGFLAGALL || !this.OPENLOGFLAG.log) {
            return;
        }
        this._log(this.STATE.panic, args)
        throw new Error("")

    }
    private _log(state, args){
        let stack = this._stack();
        let backLog = console.log;
        let time;
        if (this.OPENLOGFLAG.time) {
            time = this.getDateString();
        } else {
            time = '';
        }
        let funcName = '';
        if (this.OPENLOGFLAG.function) {
            funcName = stack[2];
        }
        let fileName = '';
        let lineNum = '';
        if (this.OPENLOGFLAG.filename) {
            fileName = stack[0];
            lineNum = ":" + stack[1];
        }


        let arguments1;
        let arguments2;
        let arg;
        if (cc&&cc.sys.isNative || cc.sys.browserType == 'wechatgame'|| cc.sys.browserType == 'wechat') {
            arguments1 = state.title + time;
            arguments2 = fileName + lineNum + funcName;
            arg = [arguments1 += arguments2 + ": "];
            let argstr = args.reduce(function (ret,argiter) {
                if (typeof argiter === 'object') {
                    argiter = '[object]'
                }
                ret+=argiter;
                ret+=' ';
                return ret;
            });
            if (argstr.length>510) {
                argstr = argstr.substr(0,500);
            }
            arg[0] += argstr;
        } else {
            arguments1 = ["%c" + state.title + time + "%c%s%s%s: %c"];
            arguments2 = [state.color, state.color1, fileName, lineNum, funcName, state.color];
            if (typeof args[0] === 'string') {
                let arg4 = args.splice(0, 1);
                arguments1[0] += arg4;
            }
            arg = arguments1.concat(arguments2);
            arg = arg.concat(args);
        }
        if (stack[3]) {
            backLog.apply(backLog, arg);
        }
    }
    private _stack(){
        let index = this.STACKLEVEL;
        if (cc.sys.isNative) {
            // index--;
        }
        let e = new Error();
        let lines = e.stack.split("\n");
        lines.shift();
        let result = [];
        let callLine;
        for (let i=0;i<lines.length;i++) {
            let line = lines[i];
            line = line.substring(7);
            let lineBreak = line.split(" ");
            if (lineBreak[0] === 'Logger._log') {
                callLine = lines[i+2].substr(7).split(" ");
            }
        }
        if (!callLine) {
            console.error('Logger.debug error');
            return ['',0,'',true];
        }
        let linesub=5;

        let callLineAddr = callLine[callLine.length-1];
        let callLineAddrSplit = callLineAddr.split('/');
        let callLineEndSplit = callLineAddrSplit[callLineAddrSplit.length-1].split(':');
        let lineNum = callLineEndSplit[1];
        lineNum = lineNum-linesub;
        let fileName = callLineEndSplit[0];
        let upperFolder = callLineAddrSplit[callLineAddrSplit.length-2];


        if (fileName) {
            fileName = fileName;
            if (this.OPENLOGFLAG.upperfolder)
                fileName+=upperFolder;
        } else {
            fileName = "";
        }
        let funcName = callLine[0];
        if (!funcName || funcName === '<anonymous>')
            funcName = '';
        if (!this.OPENLOGFLAG.classname) {
            let split = funcName.split('.');
            funcName = split[split.length-1]||'';
        }
        let active = true;
        let fileTag = fileName.split('.');
        if (this.SYSTEMLOG[fileTag[0]] !== undefined) {
            active = this.SYSTEMLOG[fileTag[0]];
        }
        return [fileName, lineNum, " ", active];
    }

    private getDateString() {
        let d = new Date();
        let str = String(d.getHours());
        let timeStr = "";
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = String(d.getMinutes());
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = String(d.getSeconds());
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = String(d.getMilliseconds());
        if (str.length == 1) str = "00" + str;
        if (str.length == 2) str = "0" + str;
        timeStr += str;

        timeStr = "[" + timeStr + "]";
        return timeStr;
    }
}
export const log = <Logger>Logger.getInstance()