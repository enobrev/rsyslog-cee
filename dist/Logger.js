'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _winstonSyslog = require('winston-syslog');

var _winstonSyslog2 = _interopRequireDefault(_winstonSyslog);

var _Timer = require('./Timer');

var _Timer2 = _interopRequireDefault(_Timer);

var _TimeKeeper = require('./TimeKeeper');

var _TimeKeeper2 = _interopRequireDefault(_TimeKeeper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('winston-syslog'); // This has to be here or Winston shits the bed on init

class Logger {

    constructor(oOptions) {
        this._indexedLogRewriter = (sLevel, sMessage, oMeta) => {
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
                        const sStrippedKey = sKey.replace('#', '');
                        oMeta[sStrippedKey] = oMeta[sKey];
                        delete oMeta[sKey];

                        if (this.Globals[sStrippedKey] !== undefined) {
                            Object.assign(this.Globals[sStrippedKey], oMeta[sStrippedKey]);
                        } else {
                            this.Globals[sStrippedKey] = oMeta[sStrippedKey];
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
        let aTransports = [];

        if (!oOptions.service) {
            throw new Error('Please set service name in options');
        }

        this.service = oOptions.service;

        this.Winston = new _winston2.default.Logger({
            level: 'debug'
        }).setLevels(_winston2.default.config.syslog.levels);

        this.Winston.rewriters.push(this._indexedLogRewriter);

        if (oOptions.console) {
            this.addConsole();
        }

        if (oOptions.syslog) {
            this.addSyslog();
        }

        this.index = 0;

        this.request_hash = _crypto2.default.createHash('sha1').update('' + _TimeKeeper2.default.getTime()).digest('hex').substring(0, 8);
        this.thread_hash = oOptions.thread_hash ? oOptions.thread_hash : this.request_hash;

        if (oOptions.parent_hash) {
            this.parent_hash = oOptions.parent_hash;
        }

        this.metrics = new _Timer2.default();
        this.metrics.start('_REQUEST');

        this.start_timestamp = new Date().toISOString();
    }

    addConsole() {
        this.Winston.add(_winston2.default.transports.Console, {
            app_name: 'icon-server',
            timestamp: true,
            colorize: true,
            json: true,
            level: 'debug'
        });
    }

    removeConsole() {
        this.Winston.remove(_winston2.default.transports.Console.prototype.name);
    }

    addSyslog() {
        this.Winston.add(_winston2.default.transports.Syslog, {
            app_name: this.service,
            localhost: null, // Keep localhost out of syslog messages
            protocol: 'unix-connect',
            path: '/dev/log',
            formatter: Logger._syslogFormatter
        });
    }

    removeSyslog() {
        this.Winston.remove(_winston2.default.transports.Syslog.prototype.name);
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

    static _syslogFormatter(oOptions) {
        return '@cee: ' + JSON.stringify(oOptions.meta, (sKey, mValue) => {
            return mValue instanceof Buffer ? mValue.toString('base64') : mValue;
        });
    }

    log(sSeverity, sAction, oMeta) {
        this.Winston.log(sSeverity, sAction, oMeta);
    }

    summary(sOverrideName = 'Summary') {
        this.index++;
        const iTimer = this.metrics.stop('_REQUEST');

        this.Winston.log('info', [this.service, sOverrideName].join('.'), {
            '--ms': iTimer,
            '--i': this.index,
            '--summary': true,
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
        });
    }

    d(sAction, oMeta) {
        this.log('debug', sAction, oMeta);
    }

    i(sAction, oMeta) {
        this.log('info', sAction, oMeta);
    }

    n(sAction, oMeta) {
        this.log('notice', sAction, oMeta);
    }

    w(sAction, oMeta) {
        this.log('warning', sAction, oMeta);
    }

    e(sAction, oMeta) {
        this.log('error', sAction, oMeta);
    }

    c(sAction, oMeta) {
        this.log('crit', sAction, oMeta);
    }

    a(sAction, oMeta) {
        this.log('alert', sAction, oMeta);
    }

    em(sAction, oMeta) {
        this.log('emerg', sAction, oMeta);
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