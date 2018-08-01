'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var crypto = _interopDefault(require('crypto'));
var Syslogh = _interopDefault(require('syslogh'));
var util = _interopDefault(require('util'));

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
            let oClone = oMeta ? Object.assign({}, oMeta) : {};

            let oOutput = {
                '--action': sMessage
            };

            if (oClone) {
                if (oClone.action) {
                    oOutput['--action'] = oClone.action;
                    delete oClone.action;
                }

                this.index++;

                oOutput['--i'] = this.index;
                oOutput['--r'] = this.request_hash;
                oOutput['--t'] = this.thread_hash;

                if (this.parent_hash) {
                    oOutput['--p'] = this.parent_hash;
                }

                // Move all "--*" items to root
                Object.keys(oClone).map(sKey => {
                    if (sKey.indexOf('--') === 0) {
                        oOutput[sKey] = oClone[sKey];
                        delete oClone[sKey];
                    }

                    if (sKey.indexOf('#') === 0) {
                        const sStrippedKey = sKey.replace(/^#+/, '');
                        oClone[sStrippedKey] = oClone[sKey];
                        delete oClone[sKey];

                        if (['string', 'number', 'boolean'].indexOf(typeof oClone[sStrippedKey]) > -1) {
                            this.Globals[sStrippedKey] = oClone[sStrippedKey];
                        } else {
                            this.Globals[sStrippedKey] = Object.assign({}, this.Globals[sStrippedKey], oClone[sStrippedKey]);
                        }
                    }
                });

                if (Object.keys(oClone).length > 0) {
                    Logger._objectFromPath(oOutput, oOutput['--action'], oClone);
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
        const oParsed = Logger.JSONifyErrors(oMeta);
        const oMessage = this._indexedLogRewriter(sAction, oParsed);
        const sMessage = Logger._syslogFormatter(oMessage);

        if (this.syslog) {
            Syslogh.syslog(iSeverity, sMessage);
        }

        if (this.console) {
            const sMessage = JSON.stringify(oMessage, null, '   ');
            switch (iSeverity) {
                case Syslogh.DEBUG:
                    console.debug('DEBUG', sMessage);break;
                case Syslogh.INFO:
                    console.info('INFO', sMessage);break;
                case Syslogh.NOTICE:
                    console.log('NOTICE', sMessage);break;
                case Syslogh.WARNING:
                    console.warn('WARNING', sMessage);break;
                case Syslogh.ERR:
                    console.error('ERR', sMessage);break;
                case Syslogh.CRIT:
                    console.error('CRIT', sMessage);break;
                case Syslogh.ALERT:
                    console.error('ALERT', sMessage);break;
                case Syslogh.EMERG:
                    console.error('EMERG', sMessage);break;
            }
        }
    }

    /**
     *
     * @param sOverrideName
     * @returns {{"--ms": *, "--i": number, "--summary": boolean, "--span": {_format: string, version: number, start_timestamp: string, end_timestamp: string, service: string, indicator: boolean, metrics: string, error: boolean, name: string, tags: {}, context: {}}}}
     */
    summary(sOverrideName = 'Summary') {
        this.index++;
        const iTimer = this.metrics.stop('_REQUEST');
        const oSummary = {
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
        };

        this.log(Syslogh.INFO, [this.service, sOverrideName].join('.'), oSummary);

        return oSummary;
    }

    /**
     *
     * @param {object} oMeta
     * @return {string}
     */
    static JSONifyErrors(oMeta) {
        if (oMeta) {
            let bFoundErrors = false;

            // https://stackoverflow.com/a/18391400/14651
            const sMeta = JSON.stringify(oMeta, (key, value) => {
                if (util.types && util.types.isNativeError ? util.types.isNativeError(value) : util.isError(value)) {
                    bFoundErrors = true;
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

            if (bFoundErrors && sMeta) {
                return JSON.parse(sMeta);
            }
        }

        return oMeta;
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
