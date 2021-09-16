require('./create-structured-results')().catch(e => {
    console.error(e);
    process.exit(1);
});
