# node-tools
Winston Wrapper that allows for structured console and syslog output including timers

# Options

```
    import Logger from './Logger'

    let oLogger = new Logger(
        {
            service: 'Whatever', // The App Name for Syslog
            console: true,       // Output logs to console
            syslog:  true        // Output logs to syslog
        }
    );
```

