declare module 'syslogh';

declare namespace Syslogh {
    /*
     * Option flags for openlog.
     *
     * LOG_ODELAY no longer does anything.
     * LOG_NDELAY is the inverse of what it used to be.
     */
    enum Option {
        PID     =  1 << 0, /* log the pid with each message */
        CONS    =  2 << 0, /* log on the console if errors in sending */
        ODELAY  =  4 << 0, /* delay open until first syslog() (default) */
        NDELAY  =  8 << 0, /* don't delay open */
        NOWAIT  = 10 << 0, /* don't wait for console forks: DEPRECATED */
        PERROR  = 20 << 0  /* log to stderr as well */
    }

    type Options = {
        flags: Option
    }

    enum Facility {
        KERN	    = 0  << 3,	/* kernel messages */
        USER	    = 1  << 3,	/* random user-level messages */
        MAIL	    = 2  << 3,	/* mail system */
        DAEMON	    = 3  << 3,	/* system daemons */
        AUTH	    = 4  << 3,	/* security/authorization messages */
        SYSLOG	    = 5  << 3,	/* messages generated internally by syslogd */
        LPR		    = 6  << 3,	/* line printer subsystem */
        NEWS	    = 7  << 3,	/* network news subsystem */
        UUCP	    = 8  << 3,	/* UUCP subsystem */
        CRON	    = 9  << 3,	/* clock daemon */
        AUTHPRIV	= 10 << 3,	/* security/authorization messages (private) */


        /* other codes through 15 reserved for system use */
        LOCAL0	    = 16 << 3,	/* reserved for local use */
        LOCAL1	    = 17 << 3,	/* reserved for local use */
        LOCAL2	    = 18 << 3,	/* reserved for local use */
        LOCAL3	    = 19 << 3,	/* reserved for local use */
        LOCAL4	    = 20 << 3,	/* reserved for local use */
        LOCAL5	    = 21 << 3,	/* reserved for local use */
        LOCAL6	    = 22 << 3,	/* reserved for local use */
        LOCAL7	    = 23 << 3	/* reserved for local use */
    }

    enum Priority {
        EMERG	= 0,	/* system is unusable */
        ALERT	= 1,	/* action must be taken immediately */
        CRIT	= 2,	/* critical conditions */
        ERR		= 3,	/* error conditions */
        WARNING	= 4,	/* warning conditions */
        NOTICE	= 5,	/* normal but significant condition */
        INFO	= 6,	/* informational */
        DEBUG	= 7 	/* debug-level messages */
    }
}

declare class Syslogh {

    // Options (flags)
    static PID:     number;
    static CONS:    number;
    static ODELAY:  number;
    static NDELAY:  number;
    static NOWAIT:  number;
    static PERROR:  number;

    // facilities
    static KERN:    number;
    static USER:    number;
    static MAIL:    number;
    static DAEMON:  number;
    static AUTH:    number;
    static SYSLOG:  number;
    static LPR:     number;
    static NEWS:    number;
    static UUCP:    number;
    static CRON:    number;

    static LOCAL0:  number;
    static LOCAL1:  number;
    static LOCAL2:  number;
    static LOCAL3:  number;
    static LOCAL4:  number;
    static LOCAL5:  number;
    static LOCAL6:  number;
    static LOCAL7:  number;

    // severities
    static EMERG:   number;
    static ALERT:   number;
    static CRIT:    number;
    static ERR:     number;
    static WARNING: number;
    static NOTICE:  number;
    static INFO:    number;
    static DEBUG:   number;

    openlog(identity: string, flags: Syslogh.Options, facility: Syslogh.Facility): void;

    syslog(priority: Syslogh.Priority, message: string): void;

    closelog():void
}