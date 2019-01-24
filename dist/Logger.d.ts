/// <reference types="node" />
import http from "http";
export interface LoggerOptions {
    service: string;
    thread_hash?: string;
    parent_hash?: string;
    console?: boolean;
    syslog?: boolean;
    request?: http.IncomingMessage;
}
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
    private console;
    private syslog;
    private purpose?;
    readonly Globals: {
        [index: string]: any;
    };
    private tags?;
    constructor(oOptions: LoggerOptions);
    addConsole(): void;
    removeConsole(): void;
    addSyslog(): void;
    removeSyslog(): void;
    getTraceTags(): {
        '--t': string;
        '--p': string;
    };
    justAddContext(mContext: any): void;
    addTag(tag: string, value: any): void;
    setProcessIsError(is_error: boolean): void;
    setPurpose(purpose: string): void;
    static _objectFromPath(oObject: any, sPath: string, mValue: any): void;
    static _syslogFormatter(oMessage: any): string;
    _indexedLogRewriter: (sMessage: string, oMeta?: any) => any;
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
            indicator: boolean;
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
    static JSONifyErrors(oMeta: object): any;
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
