# icons.welco.me
Service for generating Place Type, City, and User Icons

# Dev

1. Ensure your icons config file is in place in `/etc/welco`
2. Install babel-cli globally if you haven't already

```
$ yarn global add babel-cli
```

3. In the root directory of this repo, run `make install` which will install the dependencies
4. In the root directory of this repo, run `make production` which will compile the code into the `./dist` directory
5. To run the server, run `node ./dist/index.js`
6. Open your browser to the port designated in the config file (at the time of this writing: 9997)


## Watching for Code Updates

For development, I recommend running two terminal windows - one to "watch" for updates, and another to re/start the server manually.

Terminal 1:

```
$ make watch
```

Terminal 2:

```
$ node ./dist/index.js
```

And then after every auto build from Terminal 1, kill the process in Terminal 2 (Ctrl+C on Linux), and Start it again.

## Logs / Console

To see log output, you can tail the logs ( `tail -f /var/log/syslog` ) or search for and uncomment the following in src/Logger.js (around line 62 as of this writing).  Please remember not to commit this change to the repo.

Change This:

```
    let aTransports = [];
    aTransports.push(oTransportSyslog);
    //aTransports.push(oTransportConsole);

```

To This:

```

    let aTransports = [];
    aTransports.push(oTransportSyslog);
    aTransports.push(oTransportConsole);

```
