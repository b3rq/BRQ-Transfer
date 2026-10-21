const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
module.exports = function uiHarness(mobile = false) {
    const elements = new Map();
    function element() { return { value: '', checked: false, style: {}, dataset: {}, children: [],
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute() {}, getAttribute: () => '', querySelectorAll: () => [], querySelector: () => element(),
        addEventListener() {}, replaceChildren() { this.children = []; }, appendChild(e) { this.children.push(e); },
        getContext: () => ({}), click() {}, remove() {} }; }
    const document = { getElementById: id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
        querySelectorAll: () => [], querySelector: () => element(), createElement: element,
        documentElement: element(), body: element(), addEventListener() {} };
    const requests = [], xhrs = [], sockets = [], windowListeners = new Map();
    class Xhr { constructor() { this.upload = {}; xhrs.push(this); } open() {} send() {} abort() { this.aborted = true; this.onabort?.(); } }
    const context = vm.createContext({ document, localStorage: { getItem: () => null, setItem() {} },
        console, navigator: {}, location: { protocol: 'http:', host: 'localhost' },
        window: { addEventListener: (name, fn) => windowListeners.set(name, fn), confirm: () => true },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
        fetch: async (url, opts) => { requests.push({ url, opts }); return new Promise(() => {}); },
        WebSocket: class { constructor() { this.readyState = 0; sockets.push(this); } close() { this.closed = true; } },
        XMLHttpRequest: Xhr, FormData: class { append() {} }, URL, Blob, AbortController,
        crypto: require('node:crypto'), Image: class {} });
    let source = fs.readFileSync(path.join(__dirname, '../../public', mobile ? 'mobile.html' : 'pc.js'), 'utf8');
    context.window.location = context.location;
    if (mobile) source = source.slice(source.lastIndexOf('<script>') + 8, source.lastIndexOf('</script>'));
    vm.runInContext(source, context);
    return { context, elements, requests, xhrs, sockets, windowListeners, eval: code => vm.runInContext(code, context) };
};
