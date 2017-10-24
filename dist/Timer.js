'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TimeKeeper = require('./TimeKeeper');

var _TimeKeeper2 = _interopRequireDefault(_TimeKeeper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Timer {

    constructor(bReturnTimers = false) {
        this.oTimers = {};
        this.oIndices = {};
        this.bReturnTimers = bReturnTimers;
    }

    /**
     *
     * @param {Boolean} bReturnTimers
     */
    shouldReturnTimers(bReturnTimers) {
        this.bReturnTimers = bReturnTimers;
    }

    get(sLabel) {
        if (this.oTimers[sLabel] && this.oTimers[sLabel].length > 0) {
            let aTimers = this.oTimers[sLabel];
            let oReturn = {
                range: 0,
                count: 0,
                average: 0
            };

            if (this.bReturnTimers) {
                oReturn.timers = [];
            }

            /** @var TimeKeeper oTime */
            aTimers.map(oTime => {
                if (oTime.started()) {
                    oReturn.range += oTime.range();
                    oReturn.count++;

                    if (this.bReturnTimers) {
                        oReturn.timers.push(oTime.toObject());
                    }
                }
            });

            oReturn.average = oReturn.range / oReturn.count;

            return oReturn;
        }
    }

    getAll() {
        let oReturn = {};

        Object.keys(this.oTimers).map(sLabel => {
            let oTimer = this.get(sLabel);
            if (oTimer) {
                oReturn[sLabel] = oTimer;
            }
        });

        return oReturn;
    }

    find(sLabel) {
        return this.oTimers[sLabel][this.oIndices[sLabel]];
    }

    start(sLabel) {
        if (!this.oTimers[sLabel]) {
            this.oTimers[sLabel] = [];
        }

        let oTime = new _TimeKeeper2.default(sLabel);
        this.oTimers[sLabel].push(oTime);
        this.oIndices[sLabel] = this.oTimers[sLabel].length - 1;

        return oTime;
    }

    stop(sLabel) {
        const oTime = this.find(sLabel);
        oTime.stop();
        return oTime.range();
    }
}
exports.default = Timer;