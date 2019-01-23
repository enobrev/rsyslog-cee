export declare type TimeKept = {
    start: number;
    stop: number;
    range: number;
};
export default class TimeKeeper {
    readonly _label: string;
    readonly _start: number;
    private _stop;
    private _range;
    constructor(sLabel: string);
    static getTime(): number;
    range(): number;
    stop(): number;
    label(): string;
    getStart(): number;
    started(): boolean;
    toObject(): TimeKept;
}
