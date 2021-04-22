/// <reference types="node" />
import http from "http";
export declare type LoggerOptions = {
    service: string;
    purpose?: string;
    thread_hash?: string;
    parent_hash?: string;
    format?: boolean;
    cee?: boolean;
    request?: http.IncomingMessage;
};
export declare type TraceTags = {
    '--t'?: string;
    '--p'?: string;
};
import TimeKeeper from './TimeKeeper';
export default class Logger {
    readonly service: string;
    readonly request_hash: string;
    readonly thread_hash: string;
    readonly parent_hash?: string;
    readonly start_timestamp: string;
    private index;
    private metrics;
    private is_error;
    private format;
    private cee;
    private purpose?;
    static EMERG: number;
    static ALERT: number;
    static CRIT: number;
    static ERR: number;
    static WARNING: number;
    static NOTICE: number;
    static INFO: number;
    static DEBUG: number;
    static SEVERITY_NAMES: {
        [x: number]: string;
    };
    readonly Globals: {
        [index: string]: any;
    };
    private tags?;
    constructor(oOptions: LoggerOptions);
    getTraceTags(): TraceTags;
    justAddContext(mContext: any): void;
    addRequestContext(oRequest: http.IncomingMessage): void;
    addTag(tag: string, value: any): void;
    setProcessIsError(is_error: boolean): void;
    setPurpose(purpose: string): void;
    private static _objectFromPath;
    private _syslogFormatter;
    private _indexedLogRewriter;
    private log;
    /**
     *
     * @param sOverrideName
     * @returns {{"--ms": *, "--i": number, "--summary": boolean, "--span": {_format: string, version: number, start_timestamp: string, end_timestamp: string, service: string, indicator: boolean, metrics: string, error: boolean, name: string, tags: {}, context: {}}}}
     */
    summary(sOverrideName?: string): {
        '--ms': number;
        '--i': number;
        '--summary': boolean;
        '--span': {
            _format: string;
            version: number;
            start_timestamp: string;
            end_timestamp: string;
            service: string;
            metrics: string;
            error: boolean;
            name: string | undefined;
            tags: {
                [index: string]: any;
            } | undefined;
            context: {
                [index: string]: any;
            };
        };
    };
    /**
     *
     * @param {object} oMeta
     * @return {string}
     */
    private static JSONifyErrors;
    d(sAction: string, oMeta?: any): void;
    i(sAction: string, oMeta?: any): void;
    n(sAction: string, oMeta?: any): void;
    w(sAction: string, oMeta?: any): void;
    e(sAction: string, oMeta?: any): void;
    c(sAction: string, oMeta?: any): void;
    a(sAction: string, oMeta?: any): void;
    em(sAction: string, oMeta?: any): void;
    dt(oTime: TimeKeeper, sActionOverride?: string): void;
    startTimer(sLabel: string): TimeKeeper;
    stopTimer(sLabel: string): number;
}
