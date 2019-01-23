    export type TimeKept = {
        start: number,
        stop:  number,
        range: number
    };

    export default class TimeKeeper {
        readonly _label: string;
        readonly _start: number;

        private _stop:  number;
        private _range: number;

        constructor(sLabel: string) {
            this._label = sLabel;
            this._start = TimeKeeper.getTime();
            this._stop  = 0;
            this._range = 0;
        }

        static getTime():number {
            const aTime = process.hrtime();
            const iNS = aTime[0] * 1e9 + aTime[1];
            return iNS / 1e6;
        }

        range():number {
            if (!this._range) {
                this._range = this._stop > 0 ? this._stop - this._start : TimeKeeper.getTime() - this._start;
            }

            return this._range;
        }

        stop():number {
            this._stop = TimeKeeper.getTime();

            return this.range();
        }

        label():string {
            return this._label;
        }

        getStart():number {
            return this._start;
        }

        started():boolean {
            return this._start > 0;
        }

        toObject():TimeKept {
            return {
                start: this._start,
                stop:  this._stop,
                range: this.range()
            }
        }
    }