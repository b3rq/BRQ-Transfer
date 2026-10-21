const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

// Evaluate the entire production script, including declarations at the end.
// All disk, process, network and timer side effects stay inside this fixture.
module.exports = function createHarness(options = {}) {
    const files = new Map();
    const routes = new Map();
    const writes = [];
    const commands = [];
    const events = [];
    const intervals = [];
    const qrCalls = [];
    const sourceRoot = path.resolve(__dirname, '../..');
    const root = options.diskRoot ? path.resolve(options.diskRoot) : sourceRoot;
    const fakeFs = {
        existsSync: p => files.has(p), mkdirSync() {}, accessSync() {}, constants: fs.constants,
        readFileSync: p => { if (!files.has(p)) throw new Error('missing fixture'); return files.get(p); },
        writeFileSync: (p, data) => { if (options.writeError) throw Object.assign(new Error('denied'), { code: 'EACCES' }); writes.push(p); files.set(p, data); },
        copyFileSync: (a, b) => files.set(b, files.get(a)),
        renameSync: (a, b) => { if (options.renameError) throw new Error('rename denied'); files.set(b, files.get(a)); files.delete(a); },
        unlinkSync: p => { if (options.deleteError) throw new Error('denied'); files.delete(p); }, readdirSync: () => [],
        statSync: p => ({ isFile: () => true, isDirectory: () => true, size: Buffer.isBuffer(files.get(p)) ? files.get(p).length : 123, mtime: new Date(1000), mtimeMs: 1000 }),
        openSync: p => p, closeSync() {},
        readSync: (p, buffer, offset, length, position) => Buffer.from(files.get(p) || '').copy(buffer, offset, position, position + length),
        realpathSync: p => p
    };
    fakeFs.promises = { copyFile: async (a, b) => files.set(b, files.get(a)) };
    if (options.configText) files.set(path.join(root, 'config.json'), options.configText);
    if (options.configBackupText) files.set(path.join(root, 'config.json.bak'), options.configBackupText);
    const app = options.http ? require('express')() : { use() {}, get: (p, ...handlers) => routes.set('GET ' + p, handlers),
        post: (p, ...handlers) => routes.set('POST ' + p, handlers) };
    const express = () => app;
    express.json = options.http ? require('express').json : () => () => {};
    express.static = options.http ? require('express').static : () => () => {};
    const server = options.http ? require('node:http').createServer(app) : Object.assign(new EventEmitter(), { listen() {}, close: cb => cb?.() });
    if (options.http) {
        server.listenForTest = server.listen.bind(server);
        server.listen = options.live ? (port, host, callback) => server.listenForTest(port, '127.0.0.1', callback) : () => {};
    }
    let wss = Object.assign(new EventEmitter(), { clients: new Set(), close: cb => cb?.() });
    const multer = options.multipart ? options.multer || require('multer') : () => ({ any: () => (req, res, next) => next(), single: () => (req, res, next) => next(), array: () => (req, res, next) => next() });
    if (!options.multipart) multer.diskStorage = v => v;
    const fakeProcess = Object.assign(new EventEmitter(), { env: options.env || {}, platform: 'win32', exit() {} });
    const modules = {
        fs: { ...(options.diskRoot ? fs : fakeFs), ...options.fsOverrides }, express, http: { createServer: () => server },
        os: { networkInterfaces: () => options.interfaces || ({}) },
        dgram: options.dgram || { createSocket() { throw new Error('Unexpected UDP socket'); } },
        ws: { Server: function (settings) { if (options.wsReal) wss = new (require('ws').Server)(settings); return wss; }, OPEN: 1 }, multer,
        cors: () => () => {}, chokidar: { watch: options.watch || (() => Object.assign(new EventEmitter(), { close: async () => {} })) },
        qrcode: { toDataURL: async value => { qrCalls.push(value); return 'qr'; } },
        child_process: {
            exec() { throw new Error('Unexpected shell execution'); },
            execFile(binary, args, settings, callback) {
                if (options.execFile) return options.execFile(binary, args, settings, callback);
                commands.push(args);
                Promise.resolve().then(() => options.command ? options.command(args) : '').then(
                    output => callback(null, output, ''), error => callback(error, '', ''));
            },
            spawn(binary, args, settings) {
                commands.push(args);
                if (options.spawn) return options.spawn(binary, args, settings);
                throw new Error('Unexpected process');
            }
        }
    };
    const context = vm.createContext({ require: name => modules[name] || require(name.startsWith('.') ? path.resolve(sourceRoot, name) : name), __dirname: root,
        console: { log() {}, warn() {}, error() {} }, process: fakeProcess, Buffer, URL, AbortController,
        setTimeout, clearTimeout, setInterval: options.live ? setInterval : callback => { intervals.push(callback); return 0; }, clearInterval, module: { exports: {} } });
    vm.runInContext(fs.readFileSync(path.join(sourceRoot, 'server.js'), 'utf8'), context);
    vm.runInContext('broadcast = event => __events.push(event)', Object.assign(context, { __events: events }));
    return { context, files, writes, commands, events, server, wss, intervals, qrCalls, eval: code => vm.runInContext(code, context),
        async request(method, route, body = {}, extra = {}) {
            const response = { statusCode: 200, status(code) { this.statusCode = code; return this; },
                setHeader() {}, type() { return this; }, send(value) { this.body = value; return this; },
                json(value) { this.body = value; return this; } };
            const handlers = routes.get(`${method} ${route}`);
            let index = 0;
            const next = async error => { if (error) throw error; const handler = handlers[index++]; if (handler) return handler({ body, query: body, ...extra }, response, next); };
            await next();
            return response;
        }
    };
};
