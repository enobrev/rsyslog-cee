    // @flow

    type TimerInfo = {
        range: number,
        count: number,
        average: number,
        [timers: ?string]: Array<Object>
    };

    import TimeKeeper from './TimeKeeper';

    export default class Timer {
        oTimers:        {[label: string]: Array<TimeKeeper>};
        oIndices:       {[label: string]: number};
        bReturnTimers:  boolean;

        constructor(bReturnTimers: boolean = false) {
            this.oTimers        = {};
            this.oIndices       = {};
            this.bReturnTimers  = bReturnTimers;
        }

        /**
         *
         * @param {Boolean} bReturnTimers
         */
        shouldReturnTimers(bReturnTimers: boolean) {
            this.bReturnTimers = bReturnTimers;
        }

        get(sLabel: string) {
            if (this.oTimers[sLabel] && this.oTimers[sLabel].length > 0) {
                let aTimers = this.oTimers[sLabel];
                let oReturn: TimerInfo = {
                    range:   0,
                    count:   0,
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
            let oReturn = { };

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
            if (!this.oTimers[sLabel]) {
                this.oTimers[sLabel] = [];
            }

            let oTime = new TimeKeeper(sLabel);
            this.oTimers[sLabel].push(oTime);
            this.oIndices[sLabel] = this.oTimers[sLabel].length - 1;

            return oTime;
        }

        stop(sLabel: string) {
            const oTime = this.find(sLabel);
            oTime.stop();
            return oTime.range();
        }
    }