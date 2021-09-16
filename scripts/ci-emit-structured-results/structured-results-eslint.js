const path = require('path');
const execa = require('execa');
const timer = require('./timer');
async function eslint(report) {
    const eslintJUnitReporter = require('eslint/lib/cli-engine/formatters/junit');
    const stopwatch = timer();
    const { stdout } = await execa(
        'yarn',
        ['run', '--silent', 'lint', '-f', 'json'],
        { reject: false }
    );
    const results = JSON.parse(stdout);
    // TODO: build as XML DOM so we can customize
    const eslintXml = eslintJUnitReporter(results);
    const eslintXmlWithTime = eslintXml.replace(
        /testsuite package="org\.eslint" time="0"/m,
        `testsuite package="org.eslint" time="${stopwatch.stop()}"`
    );
    report.outputFile('results.xml', eslintXmlWithTime);

    const errFiles = results.filter(r => r.errorCount);

    for (const errFile of errFiles) {
        const file = path.relative('.', errFile.filePath);
        for (const error of errFile.messages) {
            report.fail(
                `${error.message}  \n(ESLint rule \`${error.ruleId}\`)`,
                file,
                error.line
            );
        }
    }

    if (errFiles.length > 0) {
        report.logFailure(
            `Execute \`yarn run lint\` locally for more details.`
        );
    } else {
        report.logSuccess('All files passed ESLint.');
    }
}

eslint.title = 'ESLint rules';
eslint.suiteName = 'eslint';

module.exports = eslint;
