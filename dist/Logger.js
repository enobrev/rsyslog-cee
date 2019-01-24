"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const syslogh_1 = __importDefault(require("syslogh"));
const util_1 = __importDefault(require("util"));
const url_1 = __importDefault(require("url"));
const Timer_1 = __importDefault(require("./Timer"));
const TimeKeeper_1 = __importDefault(require("./TimeKeeper"));
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
                        }
                        else {
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
        this.index = 0;
        this.is_error = false;
        this.console = false;
        this.syslog = false;
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
        this.request_hash = crypto_1.default.createHash('sha1').update('' + TimeKeeper_1.default.getTime()).digest('hex').substring(0, 8);
        this.thread_hash = this.request_hash;
        if (oOptions.request) {
            if (oOptions.request.headers && oOptions.request.headers['x-request-id']) {
                this.thread_hash = oOptions.request.headers['x-request-id'];
            }
            const oUrl = url_1.default.parse(oOptions.request.url || '', true);
            if (oUrl.query['--t']) {
                this.thread_hash = oUrl.query['--t'];
            }
            if (oUrl.query['--p']) {
                this.parent_hash = oUrl.query['--p'];
            }
        }
        else {
            if (oOptions.thread_hash) {
                this.thread_hash = oOptions.thread_hash;
            }
            if (oOptions.parent_hash) {
                this.parent_hash = oOptions.parent_hash;
            }
        }
        this.metrics = new Timer_1.default();
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
        syslogh_1.default.openlog(this.service, syslogh_1.default.PID, syslogh_1.default.LOCAL7);
    }
    removeSyslog() {
        this.syslog = false;
        syslogh_1.default.closelog();
    }
    getTraceTags() {
        return {
            '--t': this.thread_hash,
            '--p': this.request_hash
        };
    }
    justAddContext(mContext) {
        this._indexedLogRewriter('', mContext);
    }
    addTag(tag, value) {
        if (!this.tags) {
            this.tags = {};
        }
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
    ;
    static _syslogFormatter(oMessage) {
        return '@cee: ' + JSON.stringify(oMessage, (sKey, mValue) => {
            return mValue instanceof Buffer
                ? mValue.toString('base64')
                : mValue;
        });
    }
    ;
    log(iSeverity, sAction, oMeta) {
        const oParsed = Logger.JSONifyErrors(oMeta);
        const oMessage = this._indexedLogRewriter(sAction, oParsed);
        const sMessage = Logger._syslogFormatter(oMessage);
        if (this.syslog) {
            syslogh_1.default.syslog(iSeverity, sMessage);
        }
        if (this.console) {
            const sMessage = JSON.stringify(oMessage, null, '   ');
            switch (iSeverity) {
                case syslogh_1.default.DEBUG:
                    console.debug('DEBUG', sMessage);
                    break;
                case syslogh_1.default.INFO:
                    console.info('INFO', sMessage);
                    break;
                case syslogh_1.default.NOTICE:
                    console.log('NOTICE', sMessage);
                    break;
                case syslogh_1.default.WARNING:
                    console.warn('WARNING', sMessage);
                    break;
                case syslogh_1.default.ERR:
                    console.error('ERR', sMessage);
                    break;
                case syslogh_1.default.CRIT:
                    console.error('CRIT', sMessage);
                    break;
                case syslogh_1.default.ALERT:
                    console.error('ALERT', sMessage);
                    break;
                case syslogh_1.default.EMERG:
                    console.error('EMERG', sMessage);
                    break;
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
        this.log(syslogh_1.default.INFO, [this.service, sOverrideName].join('.'), oSummary);
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
            const sMeta = JSON.stringify(oMeta, (sKey, mValue) => {
                if (util_1.default.types && util_1.default.types.isNativeError ? util_1.default.types.isNativeError(mValue) : util_1.default.isError(mValue)) {
                    bFoundErrors = true;
                    let oError = {};
                    Object.getOwnPropertyNames(mValue).forEach(sKey => {
                        if (sKey === 'stack') {
                            oError[sKey] = mValue[sKey].split('\n');
                        }
                        else {
                            oError[sKey] = mValue[sKey];
                        }
                    });
                    return oError;
                }
                return mValue;
            });
            if (bFoundErrors && sMeta) {
                return JSON.parse(sMeta);
            }
        }
        return oMeta;
    }
    d(sAction, oMeta) {
        this.log(syslogh_1.default.DEBUG, sAction, oMeta);
    }
    i(sAction, oMeta) {
        this.log(syslogh_1.default.INFO, sAction, oMeta);
    }
    n(sAction, oMeta) {
        this.log(syslogh_1.default.NOTICE, sAction, oMeta);
    }
    w(sAction, oMeta) {
        this.log(syslogh_1.default.WARNING, sAction, oMeta);
    }
    e(sAction, oMeta) {
        this.log(syslogh_1.default.ERR, sAction, oMeta);
    }
    c(sAction, oMeta) {
        this.log(syslogh_1.default.CRIT, sAction, oMeta);
    }
    a(sAction, oMeta) {
        this.log(syslogh_1.default.ALERT, sAction, oMeta);
    }
    em(sAction, oMeta) {
        this.log(syslogh_1.default.EMERG, sAction, oMeta);
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
exports.default = Logger;
