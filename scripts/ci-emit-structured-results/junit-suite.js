const xml = require('xml');
const timer = require('./timer');

function jUnitSuite(title) {
    const stopwatch = timer();
    let failureCount = 0;
    let errorCount = 0;
    const cases = [];
    function testCase(name, type, message, trace) {
        const tcAttrs = {
            _attr: { classname: '', name, time: stopwatch.lap() }
        };
        return {
            testcase: type
                ? [
                      tcAttrs,
                      {
                          [type]: trace
                              ? { _attr: { message }, _cdata: trace }
                              : {
                                    _attr: { message }
                                }
                      }
                  ]
                : [tcAttrs]
        };
    }
    return {
        pass(name) {
            cases.push(testCase(name));
        },
        fail(name, message, trace) {
            cases.push(testCase(name, 'failure', message, trace));
            failureCount++;
        },
        error(name, message, trace) {
            cases.push(testCase(name, 'error', message, trace));
            errorCount++;
        },
        print() {
            if (cases.length === 0) {
                return '';
            }
            const time = stopwatch.stop();
            return xml(
                [
                    {
                        testsuites: [
                            {
                                _attr: {
                                    tests: cases.length,
                                    failures: failureCount,
                                    time
                                }
                            },
                            {
                                testsuite: [
                                    {
                                        _attr: {
                                            name: title,
                                            errors: errorCount,
                                            failures: failureCount,
                                            skipped: 0,
                                            timestamp: new Date().toISOString(),
                                            time,
                                            tests: cases.length
                                        }
                                    },
                                    ...cases
                                ]
                            }
                        ]
                    }
                ],
                {
                    declaration: true,
                    indent: '  '
                }
            );
        }
    };
}

module.exports = jUnitSuite;
