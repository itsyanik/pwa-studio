const execa = require('execa');

const jUnitSuite = require('./junit-suite');

async function prettierCheck(report) {
    const junit = jUnitSuite(prettierCheck.title);
    const result = await execa(
        'yarn',
        ['run', '--silent', 'prettier:check', '--loglevel=debug'],
        { reject: false }
    );
    const { stdout, stderr } = result;
    const failedFiles = stdout.split('\n').filter(s => s.trim());

    // Prettier doesn't normally print the files it covered, but in debug
    // mode, you can extract them with these regex (as of Prettier 1.13.5)
    // This is a hack based on debug output not guaranteed to stay the same.
    const errorLineStartRE = /^\[error\]\s*/;
    const errors = stderr.match(/(\[error\].+?\n)+/gim);
    const errorMap = {};
    if (errors) {
        errors.forEach(block => {
            const lines = block.split('\n[error] ');
            const firstLine = lines.shift();
            if (errorLineStartRE.test(firstLine)) {
                // parseable
                const [name, message] = firstLine
                    .replace(errorLineStartRE, '')
                    .split(':')
                    .map(s => s.trim());
                if (name && message) {
                    errorMap[name] = {
                        message,
                        trace: lines.join('\n')
                    };
                }
            }
        });
    }
    const coveredFiles = stderr.match(
        /\[debug\]\s*resolve config from '[^']+'\n/gim
    );
    if (!coveredFiles || coveredFiles.length === 0) {
        let warning = 'Prettier did not appear to cover any files.';
        const prettierVersion = require('prettier/package.json').version;
        if (prettierVersion !== '1.13.5') {
            warning +=
                '\nThis may be due to an unexpected change in debug output in a version of Prettier later than 1.13.5.';
        }
        report.warn(warning);
    }
    coveredFiles.forEach(line => {
        const filename = (line.match(/'([^']+)'/) || [])[1];
        const erroredFile = errorMap[filename];
        if (erroredFile) {
            junit.error(filename, erroredFile.message, erroredFile.trace);
            report.fail(
                `Prettier could not parse ${filename}: ${
                    erroredFile.message
                }\n${erroredFile.trace}`,
                filename
            );
        } else if (failedFiles.includes(filename)) {
            junit.fail(filename, 'was not formatted with Prettier');
            report.fail(
                `${filename} was not formatted with Prettier`,
                filename
            );
        } else {
            junit.pass(filename);
        }
    });
    report.outputFile('results.xml', junit.print());
    if (failedFiles.length > 0) {
        report.logFailure(
            `Make sure to execute \`yarn run prettier\` locally prior to committing.`
        );
    } else {
        report.logSuccess('All files passed Prettier formatting check.');
    }
}

prettierCheck.title = 'Prettier format check';
prettierCheck.suiteName = 'prettierCheck';

module.exports = prettierCheck;
