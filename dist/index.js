'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var crypto = _interopDefault(require('crypto'));
var Syslogh = _interopDefault(require('syslogh'));

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

        let oTime = new TimeKeeper(sLabel);
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

class Logger {

    constructor(oOptions) {
        this._indexedLogRewriter = (sMessage, oMeta) => {
            let oOutput = {
                '--action': sMessage
            };

            if (oMeta) {
                if (oMeta.action) {
                    oOutput['--action'] = oMeta.action;
                    delete oMeta.action;
                }

                this.index++;

                oOutput['--i'] = this.index;
                oOutput['--r'] = this.request_hash;
                oOutput['--t'] = this.thread_hash;

                if (this.parent_hash) {
                    oOutput['--p'] = this.parent_hash;
                }

                // Move all "--*" items to root
                Object.keys(oMeta).map(sKey => {
                    if (sKey.indexOf('--') === 0) {
                        oOutput[sKey] = oMeta[sKey];
                        delete oMeta[sKey];
                    }

                    if (sKey.indexOf('#') === 0) {
                        const sStrippedKey = sKey.replace(/^#+/, '');
                        oMeta[sStrippedKey] = oMeta[sKey];
                        delete oMeta[sKey];

                        if (['string', 'number', 'boolean'].indexOf(typeof oMeta[sStrippedKey]) > -1) {
                            this.Globals[sStrippedKey] = oMeta[sStrippedKey];
                        } else {
                            this.Globals[sStrippedKey] = Object.assign({}, this.Globals[sStrippedKey], oMeta[sStrippedKey]);
                        }
                    }
                });

                if (Object.keys(oMeta).length > 0) {
                    Logger._objectFromPath(oOutput, oOutput['--action'], oMeta);
                }
            }

            return oOutput;
        };

        this.Globals = {};

        if (!oOptions.service) {
            throw new Error('Please set service name in options');
        }

        this.service = oOptions.service;

        if (oOptions.console) {
            this.addConsole();
        }

        if (oOptions.syslog) {
            this.addSyslog();
        }

        this.index = 0;

        this.request_hash = crypto.createHash('sha1').update('' + TimeKeeper.getTime()).digest('hex').substring(0, 8);
        this.thread_hash = oOptions.thread_hash ? oOptions.thread_hash : this.request_hash;

        if (oOptions.parent_hash) {
            this.parent_hash = oOptions.parent_hash;
        }

        this.metrics = new Timer();
        this.metrics.start('_REQUEST');

        this.start_timestamp = new Date().toISOString();
    }

    addConsole() {
        this.console = true;
    }

    removeConsole() {
        this.console = false;
    }

    addSyslog() {
        this.syslog = true;
        Syslogh.openlog(this.service, Syslogh.PID, Syslogh.LOCAL7);
    }

    removeSyslog() {
        this.syslog = false;
        Syslogh.closelog();
    }

    getTraceTags() {
        return {
            '--t': this.thread_hash,
            '--p': this.request_hash
        };
    }

    justAddContext(mContext) {
        this._indexedLogRewriter('', '', mContext);
    }

    addTag(tag, value) {
        this.tags[tag] = value;
    }

    setProcessIsError(is_error) {
        this.is_error = is_error;
    }

    setPurpose(purpose) {
        this.purpose = purpose;
    }

    static _objectFromPath(oObject, sPath, mValue) {
        sPath.split('.').reduce((oValue, sKey, iIndex, aSplit) => oValue[sKey] = iIndex === aSplit.length - 1 ? mValue : {}, oObject);
    }

    static _syslogFormatter(oMessage) {
        return '@cee: ' + JSON.stringify(oMessage, (sKey, mValue) => {
            return mValue instanceof Buffer ? mValue.toString('base64') : mValue;
        });
    }

    log(iSeverity, sAction, oMeta) {
        const oMessage = this._indexedLogRewriter(sAction, oMeta);
        const sMessage = Logger._syslogFormatter(oMessage);

        if (this.syslog) {
            Syslogh.syslog(iSeverity, sMessage);
        }

        if (this.console) {
            switch (iSeverity) {
                case Syslogh.DEBUG:
                    console.debug('DEBUG', oMessage);break;
                case Syslogh.INFO:
                    console.info('INFO', oMessage);break;
                case Syslogh.NOTICE:
                    console.log('NOTICE', oMessage);break;
                case Syslogh.WARNING:
                    console.warn('WARNING', oMessage);break;
                case Syslogh.ERR:
                    console.error('ERR', oMessage);break;
                case Syslogh.CRIT:
                    console.error('CRIT', oMessage);break;
                case Syslogh.ALERT:
                    console.error('ALERT', oMessage);break;
                case Syslogh.EMERG:
                    console.error('EMERG', oMessage);break;
            }
        }
    }

    summary(sOverrideName = 'Summary') {
        this.index++;
        const iTimer = this.metrics.stop('_REQUEST');

        this.log(Syslogh.INFO, [this.service, sOverrideName].join('.'), {
            '--ms': iTimer,
            '--i': this.index,
            '--summary': true,
            '--span': {
                _format: 'SSFSpan.DashedTrace',
                version: 1,
                start_timestamp: this.start_timestamp,
                end_timestamp: new Date().toISOString(),
                service: this.service,
                indicator: false,
                metrics: JSON.stringify(this.metrics.getAll()),
                error: this.is_error,
                name: this.purpose,
                tags: this.tags,
                context: this.Globals
            }
        });
    }

    /**
     *
     * @param {Error} oError
     * @return {string}
     */
    static JSONifyError(oError) {
        // https://stackoverflow.com/a/18391400/14651
        return JSON.stringify(oError, (key, value) => {
            if (value instanceof Error) {
                let error = {};

                Object.getOwnPropertyNames(value).forEach(key => {
                    if (key === 'stack') {
                        error[key] = value[key].split('\n');
                    } else {
                        error[key] = value[key];
                    }
                });

                return error;
            }

            return value;
        });
    }

    d(sAction, oMeta) {
        this.log(Syslogh.DEBUG, sAction, oMeta);
    }

    i(sAction, oMeta) {
        this.log(Syslogh.INFO, sAction, oMeta);
    }

    n(sAction, oMeta) {
        this.log(Syslogh.NOTICE, sAction, oMeta);
    }

    w(sAction, oMeta) {
        this.log(Syslogh.WARNING, sAction, oMeta);
    }

    e(sAction, oMeta) {
        this.log(Syslogh.ERR, sAction, oMeta);
    }

    c(sAction, oMeta) {
        this.log(Syslogh.CRIT, sAction, oMeta);
    }

    a(sAction, oMeta) {
        this.log(Syslogh.ALERT, sAction, oMeta);
    }

    em(sAction, oMeta) {
        this.log(Syslogh.EMERG, sAction, oMeta);
    }

    dt(oTime, sActionOverride) {
        this.d(sActionOverride ? sActionOverride : oTime.label(), { '--ms': oTime.stop() });
    }

    startTimer(sLabel) {
        return this.metrics.start(sLabel);
    }

    stopTimer(sLabel) {
        return this.metrics.stop(sLabel);
    }
}

exports.Logger = Logger;
exports.Timer = Timer;
exports.TimeKeeper = TimeKeeper;
