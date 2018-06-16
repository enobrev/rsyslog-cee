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
            let oOutput: any = {
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

        log(iSeverity: number, sAction: string, oMeta: any) {
            const oMessage = this._indexedLogRewriter(sAction, oMeta);
            const sMessage = Logger._syslogFormatter(oMessage);

            if (this.syslog) {
                Syslogh.syslog(iSeverity, sMessage);
            }

            if (this.console) {
                switch (iSeverity) {
                    case Syslogh.DEBUG:   console.debug('DEBUG',   oMessage); break;
                    case Syslogh.INFO:    console.info( 'INFO',    oMessage); break;
                    case Syslogh.NOTICE:  console.log(  'NOTICE',  oMessage); break;
                    case Syslogh.WARNING: console.warn( 'WARNING', oMessage); break;
                    case Syslogh.ERR:     console.error('ERR',     oMessage); break;
                    case Syslogh.CRIT:    console.error('CRIT',    oMessage); break;
                    case Syslogh.ALERT:   console.error('ALERT',   oMessage); break;
                    case Syslogh.EMERG:   console.error('EMERG',   oMessage); break;
                }
            }
        }

        summary(sOverrideName: ?string = 'Summary') {
            this.index++;
            const iTimer = this.metrics.stop('_REQUEST');

            this.log(Syslogh.INFO, [this.service, sOverrideName].join('.'), {
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
            })
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