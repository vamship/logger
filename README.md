# @vamship/logger

_Singleton module for configuration and initialization of application wide
logger objects._

This library does not actually provide logging functionality, but merely
abstracts the configuration and creation of application wide logger objects.
Actual logging functionality is provided by [pino](https://getpino.io/#/)

## Motivation

Logging is an essential part of developing good applications, and there are
multiple logging solutions available for developers to choose from. This
library is not an attempt to reinvent that wheel. Instead, this library focuses
on solving the problem of being able to configure and initialize loggers
consistently from within different modules in a single application.

Most applications rely on having multiple code modules, broken up into separate
files, and each module may want to write log statements during execution. This
is typically addressed in one of two ways:

1. Each code module independently configures and creates its own logger object
2. The entry point for the application creates the logger and passes it down to
   all other objects that are created within the application

When each code module attempts to configure its own logger object, it opens up
opportunities for inconsistent initialization of the logger. It also becomes
problematic if logging configuration needs to be tweaked during debugging or if
the logging strategy changes.

These issues are alleviated by having the logger object centrally created and
then passed down from object to object, but that makes the object interfaces
clunky, when each method or constructor requires an additional argument to
accept the logger object.

This library attempts to solve these problems by providing static interfaces for
the configuration and instantiation of a logging object. The logger object is
configured with application wide settings in the main entry point of the
program, such as an `index.js` file. All other modules with the application can
then use this library to instantiate logger objects that are specific to that
module/class. As long as logger configuration occurs prior to instantiation,
everything is good.

This library also provides singleton methods to enable/disable mocking, which
is especially useful for writing tests, when logging statements could
potentially interfere with test results.

## Installation

This library can be installed using npm:

```
npm install @vamship/logger
```

## Usage

### Using the logger

Before creating any logger instances, the logger must be configured using the
`configure()` method:

#### index.js (application entry point):

```
const logger = require('@vamship/logger')
                    // Configure application wide logger
                    .configure('myApp', {
                        level: 'debug'
                    })
                    // Logger object for the main module
                    .getLogger('main');

// Write your first log statement.
logger.trace('Logger initialized');

// Now load other modules.
const user = require('./user');
```

#### user.js (Module to manage users):

```
const _logger = require('@vamship/logger');

class User {
    constructur(username) {
        this._logger = _logger.getLogger({
            username
        });
        logger.trace('Logger for user object initialized');
    }
}
```

### Testing

When tests are being written for a module that uses a logger, the test harness
can invoke the `enableMock()` prior to loading any of the modules under test.
This ensures that mock loggers are returned on every `getLogger()` call, making
sure that nothing is actually written to logs.

Optionally, `disableMock()` can be invoked at the end of a test run to ensure
that any further call to `getLogger()` will return a valid logger object.

## Note on the logger

This library uses the [pino](https://getpino.io/#/) logger library to provide
the underlying logging functionality. Every call to `getLogger()` returns a
pino logger object that is not wrapped in any way and is completely independent
of this library.

The choice of pino was made based on the author's familiarity with the
[bunyan](https://github.com/trentm/node-bunyan) logging library, and the fact
that pino appears to have an near identical interface/API to bunyan, but claims
to be significantly more performant.

One of the ideas behind this library is to also enable a relatively transparent
mechanism for swapping out one underlying logger implementation with another.
While this is not a primary goal, the abstraction provided by this library
could be helpful under certain conditions.
