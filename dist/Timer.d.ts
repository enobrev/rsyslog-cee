import TimeKeeper, { TimeKept } from './TimeKeeper';
declare type TimerInfo = {
    range: number;
    count: number;
    average: number;
    timers?: [TimeKept?];
};
export default class Timer {
    private bReturnTimers;
    readonly oTimers: {
        [label: string]: [TimeKeeper];
    };
    readonly oIndices: {
        [label: string]: number;
    };
    constructor(bReturnTimers?: boolean);
    shouldReturnTimers(bReturnTimers: boolean): void;
    get(sLabel: string): TimerInfo | undefined;
    getAll(): {
        [label: string]: TimerInfo;
    };
    find(sLabel: string): TimeKeeper;
    start(sLabel: string): TimeKeeper;
    stop(sLabel: string): number;
}
export {};
