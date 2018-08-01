    // @flow
    export type LoggerOptions = {
        service:        string,
        thread_hash?:   string,
        parent_hash?:   string,
        console?:       boolean,
        syslog?:        boolean
    };

    import crypto           from 'crypto';
    import Syslogh          from 'syslogh';
    import util             from 'util';
    import Timer            from './Timer';
    import TimeKeeper       from './TimeKeeper';

    export default class Logger {
        Globals:         {};

        service:         string;
        index:           number;
        metrics:         Timer;
        request_hash:    string;
        thread_hash:     string;
        parent_hash:     string;
        tags:            {};
        is_error:        boolean;
        purpose:         string;
        start_timestamp: string;
        console:         boolean;
        syslog:          boolean;

        constructor(oOptions: LoggerOptions) {
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
            this.thread_hash  = oOptions.thread_hash ? oOptions.thread_hash : this.request_hash;

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
            Syslogh.openlog(this.service, Syslogh.PID, Syslogh.LOCAL7)
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

        justAddContext(mContext: any) {
            this._indexedLogRewriter('', '', mContext);
        }

        addTag(tag: string, value: mixed) {
            this.tags[tag] = value;
        }

        setProcessIsError(is_error: boolean) {
            this.is_error = is_error;
        }

        setPurpose(purpose: string) {
            this.purpose = purpose;
        }

        static _objectFromPath (oObject: any, sPath: string, mValue: any) {
            sPath.split('.').reduce((oValue: {}, sKey: string, iIndex: number, aSplit: any) => oValue[sKey] = iIndex === aSplit.length - 1 ? mValue : {}, oObject);
        };

        static _syslogFormatter (oMessage: any) {
            return '@cee: ' + JSON.stringify(oMessage, (sKey, mValue) => {
                return mValue instanceof Buffer
                    ? mValue.toString('base64')
                    : mValue;
            });
        };

        _indexedLogRewriter = (sMessage: string, oMeta: any) => {
            let oClone = oMeta ? Object.assign({}, oMeta) : {};

            let oOutput: any = {
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

        log(iSeverity: number, sAction: string, oMeta: any) {
            const oParsed  = Logger.JSONifyErrors(oMeta);
            const oMessage = this._indexedLogRewriter(sAction, oParsed);
            const sMessage = Logger._syslogFormatter(oMessage);

            if (this.syslog) {
                Syslogh.syslog(iSeverity, sMessage);
            }

            if (this.console) {
                const sMessage = JSON.stringify(oMessage, null, '   ');
                switch (iSeverity) {
                    case Syslogh.DEBUG:   console.debug('DEBUG',   sMessage); break;
                    case Syslogh.INFO:    console.info( 'INFO',    sMessage); break;
                    case Syslogh.NOTICE:  console.log(  'NOTICE',  sMessage); break;
                    case Syslogh.WARNING: console.warn( 'WARNING', sMessage); break;
                    case Syslogh.ERR:     console.error('ERR',     sMessage); break;
                    case Syslogh.CRIT:    console.error('CRIT',    sMessage); break;
                    case Syslogh.ALERT:   console.error('ALERT',   sMessage); break;
                    case Syslogh.EMERG:   console.error('EMERG',   sMessage); break;
                }
            }
        }

        /**
         *
         * @param sOverrideName
         * @returns {{"--ms": *, "--i": number, "--summary": boolean, "--span": {_format: string, version: number, start_timestamp: string, end_timestamp: string, service: string, indicator: boolean, metrics: string, error: boolean, name: string, tags: {}, context: {}}}}
         */
        summary(sOverrideName: ?string = 'Summary') {
            this.index++;
            const iTimer = this.metrics.stop('_REQUEST');
            const oSummary = {
                '--ms':          iTimer,
                '--i':           this.index,
                '--summary':     true,
                '--span': {
                    _format:         'SSFSpan.DashedTrace',
                    version:         1,
                    start_timestamp: this.start_timestamp,
                    end_timestamp:   new Date().toISOString(),
                    service:         this.service,
                    indicator:       false,
                    metrics:         JSON.stringify(this.metrics.getAll()),
                    error:           this.is_error,
                    name:            this.purpose,
                    tags:            this.tags,
                    context:         this.Globals
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

        d(sAction: string, oMeta: any) {
            this.log(Syslogh.DEBUG, sAction, oMeta);
        }

        i(sAction: string, oMeta: any) {
            this.log(Syslogh.INFO, sAction, oMeta);
        }

        n(sAction: string, oMeta: any) {
            this.log(Syslogh.NOTICE, sAction, oMeta);
        }

        w(sAction: string, oMeta: any) {
            this.log(Syslogh.WARNING, sAction, oMeta);
        }

        e(sAction: string, oMeta: any) {
            this.log(Syslogh.ERR, sAction, oMeta);
        }

        c(sAction: string, oMeta: any) {
            this.log(Syslogh.CRIT, sAction, oMeta);
        }

        a(sAction: string, oMeta: any) {
            this.log(Syslogh.ALERT, sAction, oMeta);
        }

        em(sAction: string, oMeta: any) {
            this.log(Syslogh.EMERG, sAction, oMeta);
        }

        dt(oTime: TimeKeeper, sActionOverride: ?string) {
            this.d(sActionOverride ? sActionOverride : oTime.label(), {'--ms': oTime.stop()});
        }
        
        startTimer(sLabel: string) {
            return this.metrics.start(sLabel);
        }

        stopTimer(sLabel: string) {
            return this.metrics.stop(sLabel);
        }
    }