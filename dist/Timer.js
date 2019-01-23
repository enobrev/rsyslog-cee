"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TimeKeeper_1 = __importDefault(require("./TimeKeeper"));
class Timer {
    constructor(bReturnTimers = false) {
        this.oTimers = {};
        this.oIndices = {};
        this.bReturnTimers = bReturnTimers;
    }
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
            aTimers.map((oTime) => {
                if (oTime.started()) {
                    oReturn.range += oTime.range();
                    oReturn.count++;
                    if (this.bReturnTimers) {
                        if (!oReturn.timers) {
                            oReturn.timers = [];
                        }
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
        let oTime = new TimeKeeper_1.default(sLabel);
        if (!this.oTimers[sLabel]) {
            this.oTimers[sLabel] = [oTime];
        }
        else {
            this.oTimers[sLabel].push(oTime);
        }
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
