    import TimeKeeper, {TimeKept} from './TimeKeeper';

    type TimerInfo = {
        range:   number,
        count:   number,
        average: number,
        timers?: [TimeKept?]
    };

    export default class Timer {
        private bReturnTimers:  boolean;

        readonly oTimers:       {
            [label: string]: [TimeKeeper]
        };

        readonly oIndices:      {
            [label: string]: number
        };

        constructor(bReturnTimers: boolean = false) {
            this.oTimers        = {};
            this.oIndices       = {};
            this.bReturnTimers  = bReturnTimers;
        }

        shouldReturnTimers(bReturnTimers: boolean): void {
            this.bReturnTimers = bReturnTimers;
        }

        get(sLabel: string): TimerInfo | undefined {
            if (this.oTimers[sLabel] && this.oTimers[sLabel].length > 0) {
                let aTimers = this.oTimers[sLabel];
                let oReturn: TimerInfo = {
                    range:   0,
                    count:   0,
                    average: 0
                };

                aTimers.map((oTime:TimeKeeper) => {
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
            let oReturn: {[label: string]: TimerInfo} = {};

            Object.keys(this.oTimers).map(sLabel => {
                let oTimer = this.get(sLabel);
                if (oTimer) {
                    oReturn[sLabel] = oTimer;
                }
            });

            return oReturn;
        }

        find(sLabel: string) {
            return this.oTimers[sLabel][this.oIndices[sLabel]];
        }

        start(sLabel: string) {

            let oTime = new TimeKeeper(sLabel);

            if (!this.oTimers[sLabel]) {
                this.oTimers[sLabel] = [oTime];
            } else {
                this.oTimers[sLabel].push(oTime);
            }

            this.oIndices[sLabel] = this.oTimers[sLabel].length - 1;

            return oTime;
        }

        stop(sLabel: string) {
            const oTime = this.find(sLabel);
            oTime.stop();
            return oTime.range();
        }
    }