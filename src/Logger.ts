    import http from "http";

    export type LoggerOptions = {
        service:        string
        purpose?:       string
        thread_hash?:   string
        parent_hash?:   string
        format?:        boolean

        request?:       http.IncomingMessage
    }

    export type TraceTags = {
        '--t'?: string
        '--p'?: string
    }

    import crypto           from 'crypto';
    import util             from 'util';
    import url              from "url";

    import Timer            from './Timer';
    import TimeKeeper       from './TimeKeeper';

    export default class Logger {
        readonly service:         string;
        readonly request_hash:    string;
        readonly thread_hash:     string;
        readonly parent_hash?:    string;
        readonly start_timestamp: string;

        private index:           number;
        private metrics:         Timer;
        private is_error:        boolean;
        private format:          boolean = false;
        private purpose?:        string;

        public static EMERG:   number = 0;  /* system is unusable */
        public static ALERT:   number = 1;  /* action must be taken immediately */
        public static CRIT:    number = 2;  /* critical conditions */
        public static ERR:     number = 3;  /* error conditions */
        public static WARNING: number = 4;  /* warning conditions */
        public static NOTICE:  number = 5;  /* normal but significant condition */
        public static INFO:    number = 6;  /* informational */
        public static DEBUG:   number = 7;  /* debug-level messages */

        public static SEVERITY_NAMES = {
            [Logger.EMERG]:     'emerg',
            [Logger.ALERT]:     'alert',
            [Logger.CRIT]:      'crit',
            [Logger.ERR]:       'err',
            [Logger.WARNING]:   'warning',
            [Logger.NOTICE]:    'notice',
            [Logger.INFO]:      'info',
            [Logger.DEBUG]:     'debug',
        };

        readonly Globals:         {
            [index: string]: any
        };

        private tags?:           {
            [index: string]: any
        };

        constructor(oOptions: LoggerOptions) {
            this.Globals    = {};
            this.index      = 0;
            this.is_error   = false;

            if (!oOptions.service) {
                throw new Error('Please set service name in options');
            }

            this.service = oOptions.service;

            this.request_hash = crypto.createHash('sha1').update('' + TimeKeeper.getTime()).digest('hex').substring(0, 8);
            this.thread_hash  = this.request_hash;

            if (oOptions.format !== undefined) {
                this.format = oOptions.format;
            }

            if (oOptions.request) {
                if (oOptions.request.headers && oOptions.request.headers['x-request-id']) {
                    this.thread_hash = <string> oOptions.request.headers['x-request-id'];
                }

                const oUrl = url.parse(oOptions.request.url || '', true);

                if (oUrl.query['--t']) {
                    this.thread_hash = <string> oUrl.query['--t'];
                }

                if (oUrl.query['--p']) {
                    this.parent_hash = <string> oUrl.query['--p'];
                }

                this.addRequestContext(oOptions.request);
            } else {
                if (oOptions.thread_hash) {
                    this.thread_hash = oOptions.thread_hash;
                }

                if (oOptions.parent_hash) {
                    this.parent_hash = oOptions.parent_hash;
                }
            }

            this.metrics = new Timer();
            this.metrics.start('_REQUEST');

            this.start_timestamp = new Date().toISOString();

            if (oOptions.purpose) {
                this.setPurpose(oOptions.purpose);
            }
        }

        getTraceTags(): TraceTags {
            return {
                '--t': this.thread_hash,
                '--p': this.request_hash
            };
        }

        justAddContext(mContext: any) {
            this._indexedLogRewriter('', mContext);
        }

        addRequestContext(oRequest: http.IncomingMessage) {
            this._indexedLogRewriter('', {
                '#request': {
                    headers:    JSON.stringify(oRequest.headers),
                    host:       oRequest.headers.host,
                    method:     oRequest.method,
                    parameters: {
                        path:  null,
                        post:  null,
                        query: null
                    },
                    path:       null,
                    referrer:   oRequest.headers.referer,
                    uri:        oRequest.url
                },
                '#user': {
                    agent: oRequest.headers['user-agent'],
                    ip:    oRequest.connection.remoteAddress
                }
            });
        }

        addTag(tag: string, value: any) {
            if (!this.tags) {
                this.tags = {};
            }

            this.tags[tag] = value;
        }

        setProcessIsError(is_error: boolean) {
            this.is_error = is_error;
        }

        setPurpose(purpose: string) {
            this.purpose = purpose;
        }

        static _objectFromPath (oObject: any, sPath: string, mValue: any) {
            sPath.split('.').reduce((oValue: {[index: string]: any}, sKey: string, iIndex: number, aSplit: any) => oValue[sKey] = iIndex === aSplit.length - 1 ? mValue : {}, oObject);
        };

        static _syslogFormatter (oMessage: any, bFormat: boolean): string {
            return '@cee: ' + JSON.stringify(oMessage, (sKey, mValue) => {
                return mValue instanceof Buffer
                    ? mValue.toString('base64')
                    : mValue;
            }, bFormat ? '   ' : undefined);
        };

        _indexedLogRewriter = (sMessage: string, oMeta?: any) => {
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

        private log(iSeverity: number, sAction: string, oMeta?: any) {
            const oParsed  = Logger.JSONifyErrors(oMeta);
            const oMessage = this._indexedLogRewriter(sAction, oParsed);

            oMessage['--s']  = iSeverity;
            oMessage['--sn'] = Logger.SEVERITY_NAMES[iSeverity];

            const sMessage = Logger._syslogFormatter(oMessage, this.format);

            switch (iSeverity) {
                case Logger.DEBUG:   console.debug(sMessage); break;
                case Logger.INFO:    console.info( sMessage); break;
                case Logger.NOTICE:  console.log(  sMessage); break;
                case Logger.WARNING: console.warn( sMessage); break;
                case Logger.ERR:     console.error(sMessage); break;
                case Logger.CRIT:    console.error(sMessage); break;
                case Logger.ALERT:   console.error(sMessage); break;
                case Logger.EMERG:   console.error(sMessage); break;
            }
        }

        /**
         *
         * @param sOverrideName
         * @returns {{"--ms": *, "--i": number, "--summary": boolean, "--span": {_format: string, version: number, start_timestamp: string, end_timestamp: string, service: string, indicator: boolean, metrics: string, error: boolean, name: string, tags: {}, context: {}}}}
         */
        summary(sOverrideName: string = 'Summary') {
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
                    metrics:         JSON.stringify(this.metrics.getAll()),
                    error:           this.is_error,
                    name:            this.purpose,
                    tags:            this.tags,
                    context:         this.Globals
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
        static JSONifyErrors(oMeta: object) {
            if (oMeta) {
                let bFoundErrors = false;

                // https://stackoverflow.com/a/18391400/14651
                const sMeta = JSON.stringify(oMeta, (sKey: string , mValue: any) => {
                    if (util.types && util.types.isNativeError(mValue)) {
                        bFoundErrors = true;
                        let oError: {[index: string]: any} = {};

                        Object.getOwnPropertyNames(mValue).forEach((sKey: string) => {
                            if (sKey === 'stack') {
                                // @ts-ignore
                                oError[sKey] = mValue[sKey].split('\n');
                            } else {
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

        d(sAction: string, oMeta?: any) {
            this.log(Logger.DEBUG, sAction, oMeta);
        }

        i(sAction: string, oMeta?: any) {
            this.log(Logger.INFO, sAction, oMeta);
        }

        n(sAction: string, oMeta?: any) {
            this.log(Logger.NOTICE, sAction, oMeta);
        }

        w(sAction: string, oMeta?: any) {
            this.log(Logger.WARNING, sAction, oMeta);
        }

        e(sAction: string, oMeta?: any) {
            this.log(Logger.ERR, sAction, oMeta);
        }

        c(sAction: string, oMeta?: any) {
            this.log(Logger.CRIT, sAction, oMeta);
        }

        a(sAction: string, oMeta?: any) {
            this.log(Logger.ALERT, sAction, oMeta);
        }

        em(sAction: string, oMeta?: any) {
            this.log(Logger.EMERG, sAction, oMeta);
        }

        dt(oTime: TimeKeeper, sActionOverride?: string) {
            this.d(sActionOverride ? sActionOverride : oTime.label(), {'--ms': oTime.stop()});
        }
        
        startTimer(sLabel: string): TimeKeeper {
            return this.metrics.start(sLabel);
        }

        stopTimer(sLabel: string): number {
            return this.metrics.stop(sLabel);
        }
    }