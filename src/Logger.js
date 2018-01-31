    // @flow
    export type LoggerOptions = {
        service:        string,
        thread_hash?:   string,
        parent_hash?:   string,
        console?:       boolean,
        syslog?:        boolean
    };

    import crypto           from 'crypto';
    import Winston          from 'winston';
    import WinstonSyslog    from 'winston-syslog';
    import Timer            from './Timer';
    import TimeKeeper       from './TimeKeeper';

    require('winston-syslog'); // This has to be here or Winston shits the bed on init

    export default class Logger {
        Winston:         Logger;
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

        constructor(oOptions: LoggerOptions) {
            this.Globals = {};
            let aTransports = [];

            if (!oOptions.service) {
                throw new Error('Please set service name in options');
            }

            this.service = oOptions.service;

            this.Winston = new Winston.Logger({
                level:      'debug'
            }).setLevels(Winston.config.syslog.levels);

            this.Winston.rewriters.push(this._indexedLogRewriter);

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
            this.Winston.add(Winston.transports.Console, {
                app_name:  'icon-server',
                timestamp: true,
                colorize:  true,
                json:      true,
                level:     'debug'
            });
        }

        removeConsole() {
            this.Winston.remove(Winston.transports.Console.prototype.name);
        }

        addSyslog() {
            this.Winston.add(Winston.transports.Syslog, {
                app_name:  this.service,
                localhost: null, // Keep localhost out of syslog messages
                protocol:  'unix-connect',
                path:      '/dev/log',
                formatter: Logger._syslogFormatter
            });
        }

        removeSyslog() {
            this.Winston.remove(Winston.transports.Syslog.prototype.name);
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

        static _syslogFormatter (oOptions: any) {
            return '@cee: ' + JSON.stringify(oOptions.meta, (sKey, mValue) => {
                return mValue instanceof Buffer
                    ? mValue.toString('base64')
                    : mValue;
            });
        };

        _indexedLogRewriter = (sLevel: string, sMessage: string, oMeta: any) => {
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

        log(sSeverity: string, sAction: string, oMeta: any) {
            this.Winston.log(sSeverity, sAction, oMeta);
        }

        summary(sOverrideName: ?string = 'Summary') {
            this.index++;
            const iTimer = this.metrics.stop('_REQUEST');

            this.Winston.log('info', [this.service, sOverrideName].join('.'), {
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

                    Object.getOwnPropertyNames(value).forEach(function (key) {
                        error[key] = value[key];
                    });

                    return error;
                }

                return value;
            });
        }

        d(sAction: string, oMeta: any) {
            this.log('debug', sAction, oMeta);
        }

        i(sAction: string, oMeta: any) {
            this.log('info', sAction, oMeta);
        }

        n(sAction: string, oMeta: any) {
            this.log('notice', sAction, oMeta);
        }

        w(sAction: string, oMeta: any) {
            this.log('warning', sAction, oMeta);
        }

        e(sAction: string, oMeta: any) {
            this.log('error', sAction, oMeta);
        }

        c(sAction: string, oMeta: any) {
            this.log('crit', sAction, oMeta);
        }

        a(sAction: string, oMeta: any) {
            this.log('alert', sAction, oMeta);
        }

        em(sAction: string, oMeta: any) {
            this.log('emerg', sAction, oMeta);
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