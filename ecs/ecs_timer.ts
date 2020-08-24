import {Logger,log} from "../utils/logger";

enum STATE {
    STOP,
    START,
    ONSTOP,
}

export class Timer {
    private _timeScale:number
    private readonly _updateTime:number
    private _interval:number
    private _startTime:number
    private _timeOffset:number
    private _runningTime:number
    private _lastUpdateTime:number
    private _prevInterval:number
    private _taskIdGen:number
    private _tick:number
    private _state:STATE
    private _onStartCb:(runningTime:number)=>void
    private _onStopCb:(runningTime:number)=>void
    private _onPauseCb:(runningTime:number)=>void
    private _onResumeCb:(runningTime:number)=>void
    private _onDestroyCb:(runningTime:number)=>void
    private _onUpdateCb:(prevInterval:number,runningTime:number)=>void
    private _onLateUpdateCb:(prevInterval:number,runningTime:number)=>void
    private _scheduleTasks:object = {}
    private taskQueue = []
    private removeTasks = []

    constructor(updateTime, timescale) {
        this._timeScale = timescale || 1.0;
        this._updateTime = updateTime || 1000;
        this.reset();
    }

    reset() {
        this._interval = null;          //更新间隔
        this._startTime = 0;            //开始时间
        this._timeOffset = 0;           //时间偏移量
        this._runningTime = 0;          //运行时间
        this._lastUpdateTime = 0;       //最后更新时间
        this._prevInterval = 0;           //更新时间间隔
        this._state = STATE.STOP;  //定时器状态
        this._taskIdGen = 0;            //任务ID生成
        this._tick = 0;
        this._onUpdateCb = null;        //更新回调
        this._onLateUpdateCb = null;    //延迟更新回调
        this._onStartCb = null;           //开启事件回调
        this._onStopCb = null;            //结束事件回调
        this._onPauseCb = null;           //暂停事件回调
        this._onResumeCb = null;          //恢复事件回调
        this._onDestroyCb = null;         //销毁事件回调
        this.unscheduleAll();
    }

    setOffset(offset) {
        this._runningTime -= this._timeOffset;
        this._runningTime += offset;
        this._timeOffset = offset;
    }

    now() {
        return Date.now() + this._timeOffset;
    }

    start(time?) {
        if (this._interval) return;
        this._startTime = time ? time : Date.now();
        this._startTimer();
        this._onStart();
    }

    resetStartTime() {
        this._startTime = Date.now();
    }

//{name:name,time:time,task:function}
    schedule(name, task, interval, count, delay, startTime) {
        delay = delay || 0;
        if (this._scheduleTasks[name]) {
            log.error('task name exists:' + name);
            return;
        }
        this._taskIdGen++;
        this._scheduleTasks[name] = {
            name: name,
            interval: interval,
            startTime: startTime || (this._runningTime + delay),
            lastActiveTime: startTime || (this._runningTime + delay),
            task: task,
            count: count,
            id: this._taskIdGen,
        }
    }

    scheduleOnce(name, task, interval, delay, startTime) {
        this.schedule(name, task, interval, 1, delay, startTime);
    }

    getSchedule(name) {
        return this._scheduleTasks[name];
    }

    unschedule(name) {
        delete this._scheduleTasks[name];
        for (let i = 0; i < this.taskQueue.length; i++) {
            let task = this.taskQueue[i];
            if (task.name === name) {
                this.taskQueue.splice(i, 1);
            }
        }
    }

    unscheduleAll() {
        this.taskQueue = [];
        this.removeTasks = [];
        this._scheduleTasks = [];
    }

    activeSchedule(interval, now) {
        this.taskQueue = [];
        this.removeTasks = [];
        for (let i in this._scheduleTasks) {
            let task = this._scheduleTasks[i];
            while (task.interval < now - task.lastActiveTime && task.count) {
                this.taskQueue.push({
                    name: task.name,
                    activeTime: task.lastActiveTime + task.interval,
                    interval: task.lastActiveTime + task.interval - now,
                    task: task.task,
                    id: task.id,
                    count: task.count,
                });
                task.count = task.count - 1;
                task.lastActiveTime += task.interval;
                if (!task.count) {
                    this.removeTasks.push(task.name);
                    break;
                }
            }
        }
        this.taskQueue.sort(function (a, b) {
            if (a.activeTime < b.activeTime) {
                return -1;
            }
            if (a.activeTime > b.activeTime) {
                return 1;
            }
            if (a.activeTime === b.activeTime) {
                if (a.id < b.id) {
                    return -1;
                } else {
                    return 1;
                }
            }
        });
        for (let i = 0; i < this.taskQueue.length; i++) {
            let taskObj = this.taskQueue[i];
            taskObj.task(taskObj.interval, taskObj.activeTime, taskObj.count);
        }
        this.taskQueue = [];

        for (let i = 0; i < this.removeTasks.length; i++) {

            this.unschedule(this.removeTasks[i]);
        }
        this.removeTasks = [];
    }

    stop() {
        this._onStop();
        this._stopTimer();
        this._runningTime = 0;
        this._startTime = 0;
    }

    pause() {
        this._onPause();
        this._stopTimer();
    }

    resume() {
        if (this._interval) return;
        this._prevInterval = this._updateTime;
        this._startTimer();
        this._onResume();
    }

    destroy() {
        this.unscheduleAll();
        this.stop();
        this.reset();
    }


    instantUpdate() {
        this._state = STATE.START;
        let now = Date.now();
        let interval = now - this._lastUpdateTime;
        interval = interval * this._timeScale;
        this._runningTime += interval;
        this._prevInterval = interval;
        if (this._onUpdateCb) {
            this._onUpdateCb(this._prevInterval, this._runningTime);
        }
        this.activeSchedule(this._prevInterval, this._runningTime);
        if (this._onLateUpdateCb) {
            this._onLateUpdateCb(this._prevInterval, this._runningTime);
        }
        this._lastUpdateTime = now;
    }

    _syncUpdate() {
        this._lastUpdateTime = Date.now();
        this.instantUpdate();
        if (!this._interval) {
            this._interval = setInterval(function () {
                this._tick++;
                this.instantUpdate();
            }.bind(this), this._updateTime);
        }
    }

    tick(){
        this._tick++;
        this.instantUpdate();
    }

    _startTimer() {
        this._syncUpdate();
    }

    _stopTimer() {
        clearInterval(this._interval);
        this._interval = null;
    }

    _onStart() {
        this._onStartCb && this._onStartCb(this._runningTime);
    }

    _onResume() {
        this._onResumeCb && this._onResumeCb(this._runningTime);
    }

    _onStop() {
        this._onStopCb && this._onStopCb(this._runningTime);
    }

    _onPause() {
        this._onPauseCb && this._onPauseCb(this._runningTime);
    }

    _onDestroy() {
        this._onDestroyCb && this._onDestroyCb(this._runningTime);
    }

    set timeScale(v){
        this._timeScale = v
    }
    get timeScale(){
        return this._timeScale
    }

    get runningTime(){
        return this._runningTime
    }

    set updateTime(v){
        this.updateTime = v;
        this.pause();
        this.resume();
    }
    get updateTime(){
        return this._updateTime;
    }

    get lastUpdateTime(){
        return this._lastUpdateTime + this._timeOffset;
    }

    get startTime(){
        return this._startTime + this._timeOffset;

    }

    set onStart(cb){
        this._onStartCb = cb;
    }
    set onStop(cb){
        this._onStopCb = cb;

    }
    set onPause(cb){
        this._onPauseCb = cb;

    }
    set onResume(cb){
        this._onResumeCb = cb;
    }
    set onDestroy(cb){
        this._onDestroyCb = cb;
    }
    set onUpdate(cb){
        this._onUpdateCb = cb;
    }
    set onLateUpdate(cb){
        this._onLateUpdateCb = cb;
    }
}