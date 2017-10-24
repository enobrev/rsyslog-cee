"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
class TimeKeeper {

    constructor(sLabel) {
        this._label = sLabel;
        this._start = TimeKeeper.getTime();
        this._stop = 0;
        this._range = 0;
    }

    static getTime() {
        const aTime = process.hrtime();
        const iNS = aTime[0] * 1e9 + aTime[1];
        return iNS / 1e6;
    }

    range() {
        if (!this._range) {
            this._range = this._stop > 0 ? this._stop - this._start : TimeKeeper.getTime() - this._start;
        }

        return this._range;
    }

    stop() {
        this._stop = TimeKeeper.getTime();

        return this.range();
    }

    label() {
        return this._label;
    }

    getStart() {
        return this._start;
    }

    started() {
        return this._start > 0;
    }

    toObject() {
        return {
            start: this._start,
            stop: this._stop,
            range: this.range()
        };
    }
}
exports.default = TimeKeeper;
//# sourceMappingURL=TimeKeeper.js.map