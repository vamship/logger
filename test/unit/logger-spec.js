'use strict';

const _sinon = require('sinon');
const _chai = require('chai');
_chai.use(require('sinon-chai'));
_chai.use(require('chai-as-promised'));
const expect = _chai.expect;

const _rewire = require('rewire');
const _testUtils = require('@vamship/test-utils');
const _testValues = _testUtils.testValues;
const ObjectMock = _testUtils.ObjectMock;

const { ArgError } = require('@vamship/error-types').args;

let _logger = null;

describe('logger', function () {
    const LOG_LEVELS = [
        'silent',
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
    ];
    let _pinoMock = null;

    beforeEach(() => {
        const pino = LOG_LEVELS.reduce((result, level) => {
            result[level] = _sinon.spy();
            return result;
        }, {});
        const destinationObject = {};
        const extremeDestination = {};

        _pinoMock = new ObjectMock(pino)
            .addMock('child', pino)
            .addMock('destination', destinationObject);
        _pinoMock.__destinationObject = destinationObject;
        _pinoMock.__extremeDestination = extremeDestination;

        _pinoMock.ctor.destination = _pinoMock.instance.destination;

        _logger = _rewire('../../src/logger');
        _logger.__set__('_pino', _pinoMock.ctor);

        //Reset the initialized flag
        _logger.__set__('_isInitialized', false);
    });

    describe('[init]', () => {
        it('should expose the necessary fields and methods', () => {
            expect(_logger.configure).to.be.a('function');
            expect(_logger.getLogger).to.be.a('function');
            expect(_logger.enableMock).to.be.a('function');
            expect(_logger.disableMock).to.be.a('function');
        });
    });

    describe('configure()', () => {
        it('should throw an error if invoked without a valid name', () => {
            const message = 'Invalid name (arg #1)';
            _testValues.allButString('').forEach((name) => {
                const wrapper = () => {
                    _logger.configure(name);
                };

                expect(wrapper).to.throw(ArgError, message);
            });
        });

        it('should return a reference to the logger module when invoked', () => {
            const name = _testValues.getString('appName');
            const ret = _logger.configure(name);

            expect(ret).to.equal(_logger);
        });

        it('should initialize the logger object with the correct parameters', () => {
            const name = _testValues.getString('appName');
            const level = 'debug';
            const extreme = false;
            const destination = _testValues.getString('destination');
            const serializers = {
                mySerializer: () => {
                    return 'test';
                },
            };
            const redact = new Array(5)
                .fill(0)
                .map((item, index) => _testValues.getString(`redact_${index}`));
            const destinationMethod = _pinoMock.mocks.destination;

            const options = {
                level,
                extreme,
                destination,
                serializers,
                redact,
            };

            expect(_pinoMock.ctor).to.not.have.been.called;
            expect(destinationMethod.stub).to.not.have.been.called;

            _logger.configure(name, options);

            expect(destinationMethod.stub).to.have.been.calledOnce;
            expect(destinationMethod.stub).to.have.been.calledWithExactly({
                dest: destination,
                sync: !extreme,
            });

            expect(_pinoMock.ctor).to.have.been.calledOnce;
            expect(_pinoMock.ctor.args[0][0]).to.deep.equal({
                name,
                level,
                serializers,
                redact,
            });
            expect(_pinoMock.ctor.args[0][1]).to.deep.equal(
                _pinoMock.__destinationObject
            );
        });

        it('should initialize the logger with defaults if the options object is not specified', () => {
            const inputs = _testValues.allButObject();
            const destinationMethod = _pinoMock.mocks.destination;

            inputs.forEach((options, index) => {
                const name = _testValues.getString('appName');

                expect(destinationMethod.stub).to.not.have.been.called;

                _logger.configure(name, options);

                expect(destinationMethod.stub).to.have.been.calledOnce;
                expect(destinationMethod.stub.args[0]).to.have.length(1);
                expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                    fd: process.stdout.fd,
                    sync: true,
                });

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                const args = _pinoMock.ctor.args[index][0];
                expect(args.level).to.equal('info');

                destinationMethod.reset();
            });
        });

        it('should use the default log level if a valid log level is not specified', () => {
            const inputs = _testValues.allButString('foo', 'bar', '');

            inputs.forEach((level, index) => {
                const name = _testValues.getString('appName');
                const options = { level };
                _logger.configure(name, options);

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                const args = _pinoMock.ctor.args[index][0];
                expect(args.level).to.equal('info');
            });
        });

        it('should pass object destinations to the constructor without using pino.destination', () => {
            const inputs = [{}, {}, {}];
            inputs.forEach((destination, index) => {
                const name = _testValues.getString('appName');
                const options = { destination, extreme: false };

                const destinationMethod = _pinoMock.mocks.destination;

                expect(destinationMethod.stub).to.not.have.been.called;

                _logger.configure(name, options);

                expect(destinationMethod.stub).to.not.have.been.called;

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                //Reset call counts
                destinationMethod.reset();

                expect(_pinoMock.ctor.args[index][1]).to.equal(destination);
            });
        });

        describe('[extreme mode]', () => {
            it('should apply the extreme flag to the destination if defined in the options', () => {
                const inputs = [true, false];
                const destinationMethod = _pinoMock.mocks.destination;

                inputs.forEach((extreme, index) => {
                    const name = _testValues.getString('appName');

                    expect(destinationMethod.stub).to.not.have.been.called;

                    _logger.configure(name, { extreme });

                    expect(destinationMethod.stub).to.have.been.calledOnce;
                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stdout.fd,
                        sync: !extreme,
                    });

                    //Reset the initialized flag
                    _logger.__set__('_isInitialized', false);

                    destinationMethod.reset();
                });
            });

            it('should not apply the extreme flag to the destination a destination object is specified', () => {
                const inputs = [true, false];
                const destinationMethod = _pinoMock.mocks.destination;

                inputs.forEach((extreme, index) => {
                    const name = _testValues.getString('appName');
                    const destination = {};

                    expect(destinationMethod.stub).to.not.have.been.called;

                    _logger.configure(name, { extreme, destination });

                    expect(destinationMethod.stub).to.not.have.been.called;

                    //Reset the initialized flag
                    _logger.__set__('_isInitialized', false);

                    expect(_pinoMock.ctor.args[index][1]).to.equal(destination);
                });
            });

            it('should use the stdout file descriptor if the destination is "process.stdoout" ', () => {
                const inputs = [true, false];
                const destinationMethod = _pinoMock.mocks.destination;

                inputs.forEach((extreme, index) => {
                    const name = _testValues.getString('appName');
                    const destination = 'process.stdout';
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    _logger.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stdout.fd,
                        sync: !extreme,
                    });

                    //Reset the initialized flag
                    _logger.__set__('_isInitialized', false);

                    //Reset call counts
                    destinationMethod.reset();

                    expect(_pinoMock.ctor.args[index][1]).to.equal(
                        _pinoMock.__destinationObject
                    );
                });
            });

            it('should use the stderr file descriptor if the destination is "process.stderr" ', () => {
                const inputs = [true, false];
                const destinationMethod = _pinoMock.mocks.destination;

                inputs.forEach((extreme, index) => {
                    const name = _testValues.getString('appName');
                    const destination = 'process.stderr';
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    _logger.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stderr.fd,
                        sync: !extreme,
                    });

                    //Reset the initialized flag
                    _logger.__set__('_isInitialized', false);

                    //Reset call counts
                    destinationMethod.reset();

                    expect(_pinoMock.ctor.args[index][1]).to.equal(
                        _pinoMock.__destinationObject
                    );
                });
            });

            it('should treat the destination as a file path if it not one of the standard values', () => {
                const inputs = [true, false];
                const destinationMethod = _pinoMock.mocks.destination;

                inputs.forEach((extreme, index) => {
                    const name = _testValues.getString('appName');
                    const destination = _testValues.getString('destination');
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    _logger.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        dest: destination,
                        sync: !extreme,
                    });

                    //Reset the initialized flag
                    _logger.__set__('_isInitialized', false);

                    //Reset call counts
                    destinationMethod.reset();

                    expect(_pinoMock.ctor.args[index][1]).to.equal(
                        _pinoMock.__destinationObject
                    );
                });
            });
        });

        it('should default extreme = true if a valid boolean value is not specified', () => {
            const inputs = _testValues.allButBoolean();

            inputs.forEach((extreme, index) => {
                const name = _testValues.getString('appName');
                const destination = _testValues.getString('destination');
                const options = { destination, extreme };

                const destinationMethod = _pinoMock.mocks.destination;

                expect(destinationMethod.stub).to.not.have.been.called;

                _logger.configure(name, options);

                expect(destinationMethod.stub).to.have.been.calledOnce;

                expect(destinationMethod.stub).to.have.been.calledWithExactly({
                    dest: destination,
                    sync: true,
                });

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                //Reset call counts
                destinationMethod.reset();

                expect(_pinoMock.ctor.args[index][1]).to.equal(
                    _pinoMock.__destinationObject
                );
            });
        });

        it('should use the default value for serializers if a valid value is not specified', () => {
            const inputs = _testValues.allButObject();

            inputs.forEach((serializers, index) => {
                const name = _testValues.getString('appName');
                const options = { serializers };
                _logger.configure(name, options);

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                const args = _pinoMock.ctor.args[index][0];
                expect(args.serializers).to.deep.equal({});
            });
        });

        it('should use the default value for redact if a valid value is not specified', () => {
            const inputs = _testValues.allButArray();

            inputs.forEach((redact, index) => {
                const name = _testValues.getString('appName');
                const options = { redact };
                _logger.configure(name, options);

                //Reset the initialized flag
                _logger.__set__('_isInitialized', false);

                const args = _pinoMock.ctor.args[index][0];
                expect(args.redact).to.deep.equal([]);
            });
        });

        it('should have no impact if invoked multiple times', () => {
            let name = _testValues.getString('appName');
            _logger.configure(name);

            for (let index = 0; index < 10; index++) {
                _pinoMock.ctor.resetHistory();
                name = _testValues.getString('appName');
                _logger.configure(name);

                expect(_pinoMock.ctor).to.not.have.been.called;
            }
        });
    });

    describe('getLogger()', () => {
        it('should throw an error if invoked without a logger group name', () => {
            const message = 'Invalid group (arg #1)';
            const name = _testValues.getString('appName');
            _logger.configure(name);

            const inputs = _testValues.allButString('');
            inputs.forEach((group) => {
                const wrapper = () => {
                    return _logger.getLogger(group);
                };

                expect(wrapper).to.throw(ArgError, message);
            });
        });

        it('should return a dummy logger if the logger has not been configured', () => {
            const appName = _testValues.getString('appName');
            const logger = _logger.getLogger(appName);

            expect(logger).to.be.an('object');
            LOG_LEVELS.forEach((level) => {
                const method = logger[level];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });

            expect(logger.child()).to.equal(logger);
            expect(logger.__isMock).to.be.true;
        });

        it('should return a logger object if the logger has been configured', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            _logger.configure(appName);

            const logger = _logger.getLogger(group);
            expect(logger).to.be.an('object');

            LOG_LEVELS.forEach((level) => {
                const method = logger[level];
                expect(method).to.be.a('function');
            });
            expect(logger.child).to.be.a('function');
            expect(logger.__isMock).to.be.undefined;
        });

        it('should create a child logger with the specified logger group name', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const childMethod = _pinoMock.mocks.child;

            _logger.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;
            _logger.getLogger(group);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0];

            expect(args).to.deep.equal({
                group,
            });
        });

        it('should add any additional properties specified to the logger instance', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const props = {
                foo: 'bar',
                abc: 123,
                obj: {
                    add: 'me',
                },
                level: 'trace',
            };
            const childMethod = _pinoMock.mocks.child;

            _logger.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;
            _logger.getLogger(group, props);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0];

            const expectedArgs = Object.assign(
                {
                    group,
                },
                props
            );
            expect(args).to.deep.equal(expectedArgs);
        });

        it('should ensure that the group property is not overridden by additional properties', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const loggerProps = {
                group: 'this should not override the logger name',
            };
            const childMethod = _pinoMock.mocks.child;

            _logger.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;
            _logger.getLogger(group, loggerProps);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0];

            expect(args.group).to.equal(group);
        });
    });

    describe('enableMock()', () => {
        it('should return a dummy logger when invoked, even if after logger initialization', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');

            _logger.configure(appName);
            _logger.enableMock();
            const logger = _logger.getLogger(group);

            expect(logger).to.be.an('object');
            LOG_LEVELS.forEach((level) => {
                const method = logger[level];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });

            expect(logger.__isMock).to.be.true;
        });
    });

    describe('disableMock()', () => {
        it('should disable mocking and return the configured logger object when invoked', () => {
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            _logger.configure(appName);
            _logger.enableMock();

            let logger = _logger.getLogger(group);
            expect(logger).to.be.an('object');
            LOG_LEVELS.forEach((level) => {
                const method = logger[level];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });
            expect(logger.__isMock).to.be.true;

            _logger.disableMock();
            logger = _logger.getLogger(group);
            expect(logger).to.be.an('object');
            LOG_LEVELS.forEach((level) => {
                const method = logger[level];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });
            expect(logger.__isMock).to.be.undefined;
        });
    });
});
