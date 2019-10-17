jest.mock('execa');
jest.mock('fs-extra');
jest.mock('node-fetch');
jest.mock('tar');
jest.mock('../Utilities/createProject');
jest.mock('../cli/create-env-file');
const yargs = require('yargs');
const { shellSync, shell } = require('execa');
const createProject = require('../Utilities/createProject');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const tar = require('tar');
const createProjectCliBuilder = require('../cli/create-project');

beforeEach(() => {
    fse.ensureDir.mockReset();
    fse.readdir.mockReset();
    fetch.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    tar.extract.mockReturnValueOnce({
        on: (e, cb) => e === 'finish' && setImmediate(cb)
    });
});
afterEach(() => {
    jest.restoreAllMocks();
});

test('is a yargs builder', async () => {
    expect(createProjectCliBuilder).toMatchObject({
        command: expect.stringContaining('create-project'),
        describe: expect.stringContaining('Create a PWA'),
        handler: expect.any(Function)
    });
    const mockCommand = {
        ...createProjectCliBuilder,
        handler: jest.fn()
    };
    const parser = yargs.command(mockCommand).help();

    const output = await new Promise((resolve, reject) =>
        parser.parse('--help', (err, argv, output) =>
            err ? reject(err) : resolve(output)
        )
    );

    expect(output).toMatch('Create a PWA');

    // throws because it wants a positional argument--just checking
    expect(() => createProjectCliBuilder.builder(yargs)).toThrow('positional');
});

test('locates builtin package', async () => {
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce(true);
    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: 'venia-concept',
            directory: '/project'
        })
    ).resolves.not.toThrow();
    expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'goo',
            template: expect.stringMatching('packages/venia-concept')
        })
    );
});

test('locates template dir on disk', async () => {
    fse.readdir.mockResolvedValueOnce(true);
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce(true);
    await expect(
        createProjectCliBuilder.handler({
            template: 'other-template-on-fs',
            directory: 'project'
        })
    ).resolves.not.toThrow();
    expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'project',
            template: expect.stringMatching('other-template-on-fs')
        })
    );
});

test('locates cached template dir', async () => {
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce(['package.json']);
    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: '@vendor/npm-template',
            directory: '/project'
        })
    ).resolves.not.toThrow();
    expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'goo',
            template: expect.stringMatching('@vendor/npm-template')
        })
    );
});

test('locates template dir on npm', async () => {
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce([]);
    shellSync.mockImplementation(() => ({
        stdout: JSON.stringify({ dist: { tarball: 'https://tgzfile' } })
    }));
    fetch.mockResolvedValueOnce({ body: { pipe: () => {}, on: () => {} } });
    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: '@vendor/npm-template',
            directory: '/project'
        })
    ).resolves.not.toThrow();
    expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'goo',
            template: expect.stringMatching('@vendor/npm-template')
        })
    );
});

test('uses monorepo assets in DEBUG_PROJECT_CREATION mode', async () => {
    shellSync.mockImplementation(() => ({
        stdout: JSON.stringify({ dist: { tarball: 'https://tgzfile' } })
    }));
    fetch.mockResolvedValueOnce({ body: { pipe: () => {}, on: () => {} } });
    const old = process.env.DEBUG_PROJECT_CREATION;
    process.env.DEBUG_PROJECT_CREATION = 1;
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockRejectedValueOnce(new Error('no!'));

    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: '@vendor/npm-template',
            directory: '/project'
        })
    ).resolves.not.toThrow();
    expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'goo',
            template: expect.stringMatching('@vendor/npm-template')
        })
    );
    expect(shellSync).toHaveBeenCalled();
    process.env.DEBUG_PROJECT_CREATION = old;
});

test('throws errors if npm view or tarball fetch error', async () => {
    const old = process.env.DEBUG_PROJECT_CREATION;
    process.env.DEBUG_PROJECT_CREATION = 1;
    shellSync.mockImplementationOnce(() => ({
        stdout: 'bad json'
    }));
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockRejectedValueOnce(new Error('no!'));

    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: '@vendor/npm-template',
            directory: '/project'
        })
    ).rejects.toThrow('could not get tarball url');

    shellSync.mockImplementationOnce(() => ({
        stdout: JSON.stringify({ dist: { tarball: 'https://tgzfile' } })
    }));
    fetch.mockRejectedValueOnce(new Error('404'));
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockRejectedValueOnce(new Error('no!'));

    await expect(
        createProjectCliBuilder.handler({
            name: 'goo',
            template: '@vendor/npm-template',
            directory: '/project'
        })
    ).rejects.toThrow('could not download tarball');

    process.env.DEBUG_PROJECT_CREATION = old;
});

test('warns if backendurl does not match env', async () => {
    const old = process.env.MAGENTO_BACKEND_URL;
    process.env.MAGENTO_BACKEND_URL = 'https://other-example.com';
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce(true);
    await expect(
        createProjectCliBuilder.handler({
            backendUrl: 'https://example.com',
            name: 'goo',
            template: 'venia-concept',
            directory: '/project',
            npmClient: 'yarn'
        })
    ).resolves.not.toThrow();
    expect(process.env.MAGENTO_BACKEND_URL).not.toBe('https://example.com');
    expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching('Environment variable overrides!')
    );
    process.env.MAGENTO_BACKEND_URL = old;
});

test('runs install', async () => {
    process.env.MAGENTO_BACKEND_URL = 'https://consistent.website';
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockResolvedValueOnce(true);
    await expect(
        createProjectCliBuilder.handler({
            backendUrl: 'https://consistent.website',
            name: 'goo',
            template: 'venia-concept',
            directory: process.cwd(),
            install: true,
            npmClient: 'yarn'
        })
    ).resolves.not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching('Environment variable overrides!')
    );
    expect(shell).toHaveBeenCalledWith('yarn install', expect.anything());
});

test('errors out on a bad npm package', async () => {
    fse.readdir.mockRejectedValueOnce(new Error('ENOENT'));
    fse.ensureDir.mockResolvedValueOnce(true);
    fse.readdir.mockRejectedValueOnce(new Error('no!'));
    await expect(
        createProjectCliBuilder.handler({
            name: 'package-name',
            template: 'bad template name',
            directory: '/project',
            install: true,
            npmClient: 'yarn'
        })
    ).rejects.toThrow('Invalid template');
});
