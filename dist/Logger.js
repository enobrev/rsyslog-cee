"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const util_1 = __importDefault(require("util"));
const url_1 = __importDefault(require("url"));
const Timer_1 = __importDefault(require("./Timer"));
const TimeKeeper_1 = __importDefault(require("./TimeKeeper"));
class Logger {
    constructor(oOptions) {
        this.format = false;
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
        if (!oOptions.service) {
            throw new Error('Please set service name in options');
        }
        this.service = oOptions.service;
        this.request_hash = crypto_1.default.createHash('sha1').update('' + TimeKeeper_1.default.getTime()).digest('hex').substring(0, 8);
        this.thread_hash = this.request_hash;
        if (oOptions.format !== undefined) {
            this.format = oOptions.format;
        }
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
            this.addRequestContext(oOptions.request);
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
        if (oOptions.purpose) {
            this.setPurpose(oOptions.purpose);
        }
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
    addRequestContext(oRequest) {
        this._indexedLogRewriter('', {
            '#request': {
                headers: JSON.stringify(oRequest.headers),
                host: oRequest.headers.host,
                method: oRequest.method,
                parameters: {
                    path: null,
                    post: null,
                    query: null
                },
                path: null,
                referrer: oRequest.headers.referer,
                uri: oRequest.url
            },
            '#user': {
                agent: oRequest.headers['user-agent'],
                ip: oRequest.connection.remoteAddress
            }
        });
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
    static _syslogFormatter(oMessage, bFormat) {
        return '@cee: ' + JSON.stringify(oMessage, (sKey, mValue) => {
            return mValue instanceof Buffer
                ? mValue.toString('base64')
                : mValue;
        }, bFormat ? '   ' : undefined);
    }
    ;
    log(iSeverity, sAction, oMeta) {
        const oParsed = Logger.JSONifyErrors(oMeta);
        const oMessage = this._indexedLogRewriter(sAction, oParsed);
        oMessage['--s'] = iSeverity;
        oMessage['--sn'] = Logger.SEVERITY_NAMES[iSeverity];
        const sMessage = Logger._syslogFormatter(oMessage, this.format);
        switch (iSeverity) {
            case Logger.DEBUG:
                console.debug(sMessage);
                break;
            case Logger.INFO:
                console.info(sMessage);
                break;
            case Logger.NOTICE:
                console.log(sMessage);
                break;
            case Logger.WARNING:
                console.warn(sMessage);
                break;
            case Logger.ERR:
                console.error(sMessage);
                break;
            case Logger.CRIT:
                console.error(sMessage);
                break;
            case Logger.ALERT:
                console.error(sMessage);
                break;
            case Logger.EMERG:
                console.error(sMessage);
                break;
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
                metrics: JSON.stringify(this.metrics.getAll()),
                error: this.is_error,
                name: this.purpose,
                tags: this.tags,
                context: this.Globals
            }
        };
        this.log(Logger.INFO, [this.service, sOverrideName].join('.'), oSummary);
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
                if (util_1.default.types && util_1.default.types.isNativeError(mValue)) {
                    bFoundErrors = true;
                    let oError = {};
                    Object.getOwnPropertyNames(mValue).forEach((sKey) => {
                        if (sKey === 'stack') {
                            // @ts-ignore
                            oError[sKey] = mValue[sKey].split('\n');
                        }
                        else {
                            // @ts-ignore
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
        this.log(Logger.DEBUG, sAction, oMeta);
    }
    i(sAction, oMeta) {
        this.log(Logger.INFO, sAction, oMeta);
    }
    n(sAction, oMeta) {
        this.log(Logger.NOTICE, sAction, oMeta);
    }
    w(sAction, oMeta) {
        this.log(Logger.WARNING, sAction, oMeta);
    }
    e(sAction, oMeta) {
        this.log(Logger.ERR, sAction, oMeta);
    }
    c(sAction, oMeta) {
        this.log(Logger.CRIT, sAction, oMeta);
    }
    a(sAction, oMeta) {
        this.log(Logger.ALERT, sAction, oMeta);
    }
    em(sAction, oMeta) {
        this.log(Logger.EMERG, sAction, oMeta);
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
Logger.EMERG = 0; /* system is unusable */
Logger.ALERT = 1; /* action must be taken immediately */
Logger.CRIT = 2; /* critical conditions */
Logger.ERR = 3; /* error conditions */
Logger.WARNING = 4; /* warning conditions */
Logger.NOTICE = 5; /* normal but significant condition */
Logger.INFO = 6; /* informational */
Logger.DEBUG = 7; /* debug-level messages */
Logger.SEVERITY_NAMES = {
    [Logger.EMERG]: 'emerg',
    [Logger.ALERT]: 'alert',
    [Logger.CRIT]: 'crit',
    [Logger.ERR]: 'err',
    [Logger.WARNING]: 'warning',
    [Logger.NOTICE]: 'notice',
    [Logger.INFO]: 'info',
    [Logger.DEBUG]: 'debug',
};
