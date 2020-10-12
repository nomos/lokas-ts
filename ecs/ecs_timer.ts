'use strict'
import {Logger,log} from "../utils/logger";

enum STATE {
    STOP,
    START,
    ONSTOP,
}

export class Timer {
    private _TimeScale:number
    private readonly _UpdateTime:number
    private _interval:any
    private _StartTime:number
    private _timeOffset:number
    private _RunningTime:number
    private _LastUpdateTime:number
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
        this._TimeScale = timescale || 1.0;
        this._UpdateTime = updateTime || 1000;
        this.Reset();
    }

    Reset() {
        this._interval = null;          //更新间隔
        this._StartTime = 0;            //开始时间
        this._timeOffset = 0;           //时间偏移量
        this._RunningTime = 0;          //运行时间
        this._LastUpdateTime = 0;       //最后更新时间
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
        this.UnscheduleAll();
    }

    setOffset(offset) {
        this._RunningTime -= this._timeOffset;
        this._RunningTime += offset;
        this._timeOffset = offset;
    }

    Now() {
        return Date.now() + this._timeOffset;
    }

    Start(time?) {
        if (this._interval) return;
        this._StartTime = time ? time : Date.now();
        this._startTimer();
        this._onStart();
    }

    ResetStartTime() {
        this._StartTime = Date.now();
    }

//{name:name,time:time,task:function}
    Schedule(name, task, interval, count, delay, startTime) {
        delay = delay || 0;
        if (this._scheduleTasks[name]) {
            log.error('task name exists:' + name);
            return;
        }
        this._taskIdGen++;
        this._scheduleTasks[name] = {
            name: name,
            interval: interval,
            startTime: startTime || (this._RunningTime + delay),
            lastActiveTime: startTime || (this._RunningTime + delay),
            task: task,
            count: count,
            id: this._taskIdGen,
        }
    }

    ScheduleOnce(name, task, interval, delay, startTime) {
        this.Schedule(name, task, interval, 1, delay, startTime);
    }

    GetSchedule(name) {
        return this._scheduleTasks[name];
    }

    Unschedule(name) {
        delete this._scheduleTasks[name];
        for (let i = 0; i < this.taskQueue.length; i++) {
            let task = this.taskQueue[i];
            if (task.name === name) {
                this.taskQueue.splice(i, 1);
            }
        }
    }

    UnscheduleAll() {
        this.taskQueue = [];
        this.removeTasks = [];
        this._scheduleTasks = [];
    }

    private activeSchedule(interval, now) {
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

            this.Unschedule(this.removeTasks[i]);
        }
        this.removeTasks = [];
    }

    Stop() {
        this._onStop();
        this._stopTimer();
        this._RunningTime = 0;
        this._StartTime = 0;
    }

    Pause() {
        this._onPause();
        this._stopTimer();
    }

    Resume() {
        if (this._interval) return;
        this._prevInterval = this._UpdateTime;
        this._startTimer();
        this._onResume();
    }

    Destroy() {
        this.UnscheduleAll();
        this.Stop();
        this.Reset();
    }


    private instantUpdate() {
        this._state = STATE.START;
        let now = Date.now();
        let interval = now - this._LastUpdateTime;
        interval = interval * this._TimeScale;
        this._RunningTime += interval;
        this._prevInterval = interval;
        if (this._onUpdateCb) {
            this._onUpdateCb(this._prevInterval, this._RunningTime);
        }
        this.activeSchedule(this._prevInterval, this._RunningTime);
        if (this._onLateUpdateCb) {
            this._onLateUpdateCb(this._prevInterval, this._RunningTime);
        }
        this._LastUpdateTime = now;
    }

    private _syncUpdate() {
        this._LastUpdateTime = Date.now();
        this.instantUpdate();
        if (!this._interval) {
            this._interval = setInterval(function () {
                this._tick++;
                this.instantUpdate();
            }.bind(this), this._UpdateTime);
        }
    }

    Tick(){
        this._tick++;
        this.instantUpdate();
    }

    private _startTimer() {
        this._syncUpdate();
    }

    private _stopTimer() {
        clearInterval(this._interval);
        this._interval = null;
    }

    private _onStart() {
        this._onStartCb && this._onStartCb(this._RunningTime);
    }

    private _onResume() {
        this._onResumeCb && this._onResumeCb(this._RunningTime);
    }

    private _onStop() {
        this._onStopCb && this._onStopCb(this._RunningTime);
    }

    private _onPause() {
        this._onPauseCb && this._onPauseCb(this._RunningTime);
    }

    private _onDestroy() {
        this._onDestroyCb && this._onDestroyCb(this._RunningTime);
    }

    set TimeScale(v){
        this._TimeScale = v
    }
    get TimeScale(){
        return this._TimeScale
    }

    get RunningTime(){
        return this._RunningTime
    }

    set UpdateTime(v){
        this.UpdateTime = v;
        this.Pause();
        this.Resume();
    }
    get UpdateTime(){
        return this._UpdateTime;
    }

    get LastUpdateTime(){
        return this._LastUpdateTime + this._timeOffset;
    }

    get StartTime(){
        return this._StartTime + this._timeOffset;

    }

    set OnStart(cb){
        this._onStartCb = cb;
    }
    set OnStop(cb){
        this._onStopCb = cb;

    }
    set OnPause(cb){
        this._onPauseCb = cb;

    }
    set OnResume(cb){
        this._onResumeCb = cb;
    }
    set OnDestroy(cb){
        this._onDestroyCb = cb;
    }
    set OnUpdate(cb){
        this._onUpdateCb = cb;
    }
    set OnLateUpdate(cb){
        this._onLateUpdateCb = cb;
    }
}