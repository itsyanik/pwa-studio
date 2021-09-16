const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const runPrettier = require('./structured-results-prettier');
const runEslint = require('./structured-results-eslint');
const runValidateQueries = require('./structured-results-validate-queries');

function dangerReporterFactory(name, title) {
    const results = {
        name,
        title,
        outputFiles: [],
        fail: [],
        markdown: [],
        message: [],
        warn: []
    };

    const failedFiles = new Set();
    const outputFiles = {};

    return {
        fail(...args) {
            const file = args[1];
            if (file) {
                failedFiles.add(file);
            }
            results.fail.push(args);
        },
        markdown(...args) {
            results.markdown.push(args);
        },
        message(...args) {
            results.message.push(args);
        },
        warn(...args) {
            results.warn.push(args);
        },
        logSuccess(message) {
            results.successSummary = message;
        },
        logFailure(message) {
            results.failureSummary = message;
        },
        outputFile(filename, contents) {
            const filePath = path.join('./test-results/', name, filename);
            results.outputFiles.push(filePath);
            outputFiles[filePath] = contents;
        },
        emit() {
            results.failedFiles = [...failedFiles];
            return { results, outputFiles };
        }
    };
}

async function emitStructuredResults(runner) {
    const name = runner.suiteName || runner.name;
    const title = runner.title || runner.suiteName || runner.name;
    const report = dangerReporterFactory(name, title);
    await runner(report);
    const { results, outputFiles } = report.emit();
    if (results.outputFiles.length > 0) {
        await Promise.all(
            results.outputFiles.map(async filePath => {
                await mkdir(path.dirname(filePath), { recursive: true });
                await writeFile(filePath, outputFiles[filePath], 'utf-8');
            })
        );
    }
    return results;
}

function emitAll() {
    return Promise.all(
        [runPrettier, runEslint, runValidateQueries].map(emitStructuredResults)
    ).then(results =>
        console.log(
            JSON.stringify(
                // merge all result objects
                // results.reduce((all, next) => ({ ...all, ...next })),
                results,
                null,
                2
            )
        )
    );
}

module.exports = emitAll;
