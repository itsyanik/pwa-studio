const path = require('path');
const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);
const api = require('@graphql-cli/common');
const loaders = require('@graphql-cli/loaders');
const core = require('@graphql-inspector/core');
const graphql = require('graphql');

const jUnitSuite = require('./junit-suite');

const createInspectorExtension = name => api => {
    loaders.loaders.forEach(loader => {
        api.loaders.schema.register(loader);
    });
    loaders.loaders.forEach(loader => {
        api.loaders.documents.register(loader);
    });
    return {
        name
    };
};

const extensions = [createInspectorExtension('validate')];

const keepClientFields = true;
const strictFragments = false;

async function validateQueries(report) {
    const junit = jUnitSuite(validateQueries.title);
    const config = await api.useConfig({
        rootDir: process.cwd(),
        extensions
    });

    const project = config.getProject();
    const schema = await project.getSchema();
    const documents = await project.getDocuments();
    let allValid = true;

    const validations = core.validate(
        schema,
        documents.map(
            doc => new graphql.Source(graphql.print(doc.document), doc.location)
        ),
        {
            strictFragments,
            keepClientFields
        }
    );
    await Promise.all(
        validations.map(async ({ source, errors }) => {
            const filePath = path.relative('.', source.name);
            if (errors.length > 0) {
                allValid = false;
                // get the contents so we can get an accurate line number for danger
                // to make an inline comment
                const fileContents = await readFile(source.name, 'utf8');
                const firstLineOfQuery = source.body
                    .substring(0, source.body.indexOf('\n'))
                    .trim();
                const charOffset = fileContents.indexOf(firstLineOfQuery);
                const lineOffset =
                    fileContents.substring(0, charOffset).split('\n').length -
                    1;
                for (const error of errors) {
                    const line = lineOffset + error.locations[0].line;
                    junit.fail(
                        filePath,
                        'did not pass GraphQL validation',
                        error.message
                    );
                    report.fail(error.message, filePath, line);
                }
            } else {
                junit.pass(filePath);
            }
        })
    );

    report.outputFile('results.xml', junit.print());

    if (allValid) {
        report.logSuccess(
            'All GraphQL queries in template literals are valid.'
        );
    } else {
        report.logFailure(
            'Make sure to execute `yarn run validate-queries` before push.'
        );
    }
}

validateQueries.suiteName = 'validateQueries';
validateQueries.title = 'GraphQL query validation';

module.exports = validateQueries;
