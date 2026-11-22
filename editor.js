(() => {
    const el = id => document.getElementById(id);
    const dialog = el('resource-dialog');
    const form = el('resource-form');
    const fields = form.elements;
    const config = window.recursosConfig;
    const page = createPageEditor({ el, fields, make, action, normalizeUrl });
    const sessionKey = 'didactica.editor';
    let items = page.fallback;
    let revision, selected, mode;
    let token = '';
    let busy = false;

    function normalizeUrl(input) {
        const value = typeof input === 'string' ? input.trim() : '';
        if (!value || /[\s\\\u0000-\u001f]/.test(value)) return '';
        if (/^mailto:.+/i.test(value)) return value;
        // Las páginas del sitio conservan sus rutas relativas.
        if (!value.startsWith('//') && /^(?:(?:\.{0,2}\/)|(?:[\w%-]+\/))*[\w%-]+\.html(?:[?#].*)?$/i.test(value)) return value;

        const explicit = /^https?:\/\//i.test(value);
        try {
            const url = new URL(explicit ? value : 'https://' + value.replace(/^\/\//, ''));
            if (url.username || url.password) return '';
            if (!explicit && (!url.hostname.includes('.') || !/^(?:\/\/)?[^/?#:]+(?:[/?#:]|$)/.test(value))) return '';
            return url.href;
        } catch { return ''; }
    }

    function make(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text) node.textContent = text;
        return node;
    }
    function action(label, icon, cls, run) {
        const btn = make('button', cls);
        btn.type = 'button';
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.append(make('i', 'fa-solid fa-' + icon));
        btn.onclick = run;
        return btn;
    }
    const fileApi = 'https://api.github.com/repos/didacticafda/didacticafda/contents/' + page.file;
    function bytes64(value) {
        return Uint8Array.from(atob(value), char => char.charCodeAt(0));
    }
    async function unlock(username, password) {
        if (!config) throw new Error('Falta activar el acceso docente en GitHub.');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(username));
        const userHash = btoa(String.fromCharCode(...new Uint8Array(digest)));
        if (userHash !== '1gyX99DYjRI0okWv/2VX4FgyTlSfcKWqh1Xhz6+ijpg=') throw new Error('Revisá el usuario y la clave.');
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes64(config.salt),
            iterations: 600000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        try {
            const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes64(config.iv) }, key, bytes64(config.data));
            return new TextDecoder().decode(plain);
        } catch { throw new Error('Revisá el usuario y la clave.'); }
    }
    async function github(auth, options = {}) {
        const response = await fetch(fileApi + (options.method ? '' : '?ref=main'), {
            ...options, cache: 'no-store', redirect: 'error', credentials: 'omit',
            headers: { Authorization: 'Bearer ' + auth, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }
        });
        if (!response.ok && response.status !== 409) {
            throw new Error('GitHub no pudo completar la operación (' + response.status + '). Revisá la autorización y los permisos de la rama main.');
        }
        return response;
    }
    async function loadLatest(auth) {
        const response = await github(auth);
        if (!response.ok) throw new Error('GitHub no pudo cargar los datos.');
        const file = await response.json();
        const latest = JSON.parse(new TextDecoder().decode(bytes64(file.content)));
        if (!Array.isArray(latest)) throw new Error('El archivo de datos tiene un formato incorrecto.');
        revision = file.sha;
        items = latest;
    }
    async function save(next) {
        const bytes = new TextEncoder().encode(JSON.stringify(next, null, 2) + '\n');
        if (bytes.length >= 1000000) throw new Error('El archivo supera el tamaño admitido por el editor.');
        const content = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
        const response = await github(token, { method: 'PUT', body: JSON.stringify({
            message: 'Actualizar ' + page.label + ' de la cátedra', content, sha: revision, branch: 'main'
        }) });
        if (response.status === 409) {
            await loadLatest(token);
            return 'Otra persona guardó cambios. Revisá los datos actualizadas antes de volver a editar.';
        }
        revision = (await response.json()).content.sha;
        items = next;
        return 'Guardado en GitHub. El cambio aparecerá cuando Pages termine de publicar.';
    }
    function render() {
        page.render(items, Boolean(token), openForm);
        el('add-item').hidden = !token;
        const access = el('access');
        if (access) {
            access.title = token ? 'Terminar edición' : 'Acceso para Docentes';
            access.setAttribute('aria-label', access.title);
            access.setAttribute('aria-pressed', String(Boolean(token)));
            access.firstElementChild.className = token ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock';
        }
    }

    function openForm(next, item) {
        mode = next;
        selected = item;
        form.reset();
        el('dialog-error').textContent = '';
        el('login-fields').disabled = el('login-fields').hidden = mode !== 'login';
        el('item-fields').disabled = el('item-fields').hidden = !['add', 'edit'].includes(mode);
        el('delete-prompt').hidden = mode !== 'remove';
        el('delete-prompt').textContent = mode === 'remove' ? '¿Querés eliminar «' + page.name(item) + '»?' : '';
        if (mode === 'add' || mode === 'edit') page.fill(item);
        el('dialog-title').textContent = { login: 'Acceso para Docentes', add: 'Agregar ' + page.singular,
            edit: 'Editar ' + page.singular, remove: 'Eliminar ' + page.singular }[mode];
        el('submit-resource').textContent = { login: 'Ingresar', add: 'Publicar', edit: 'Guardar cambios', remove: 'Eliminar' }[mode];
        dialog.showModal();
    }

    function accessClick() {
        if (!token) return openForm('login');
        sessionStorage.removeItem(sessionKey);
        token = '';
        render();
        el('resource-status').textContent = 'Edición finalizada.';
    }
    el('add-item').onclick = () => openForm('add');
    el('cancel').onclick = () => dialog.close();
    dialog.oncancel = event => { if (busy) event.preventDefault(); };
    dialog.onclose = () => { fields.password.value = ''; };
    form.onsubmit = async event => {
        event.preventDefault();
        if (busy) return;
        busy = el('cancel').disabled = el('submit-resource').disabled = true;
        el('dialog-error').textContent = '';
        try {
            if (mode === 'login') {
                const auth = await unlock(fields.username.value.trim(), fields.password.value);
                await loadLatest(auth);
                sessionStorage.setItem(sessionKey, auth);
                token = auth;
                el('resource-status').textContent = 'Edición habilitada.';
            } else {
                let next;
                if (mode === 'remove') next = items.filter(item => item.id !== selected.id);
                else {
                    const item = { id: selected?.id ?? crypto.randomUUID(), ...page.read() };
                    next = mode === 'add' ? [...items, item] : items.map(old => old.id === item.id ? item : old);
                }
                el('resource-status').textContent = await save(next);
            }
            dialog.close();
            render();
            el(token ? 'add-item' : 'access').focus({ preventScroll: true });
        } catch (error) {
            el('dialog-error').textContent = error instanceof TypeError ? 'No se pudo conectar. Intentá nuevamente.' : error.message;
        } finally {
            busy = el('cancel').disabled = el('submit-resource').disabled = false;
        }
    };

    async function initialize() {
        const auth = sessionStorage.getItem(sessionKey);
        if (auth) {
            try {
                await loadLatest(auth);
                token = auth;
                render();
                return;
            } catch {
                sessionStorage.removeItem(sessionKey);
                el('resource-status').textContent = 'No se pudo recuperar la edición. Volvé a ingresar.';
            }
        }
        try {
            const response = await fetch(page.file, { cache: 'no-cache' });
            if (!response.ok) throw new Error();
            const published = await response.json();
            if (!Array.isArray(published)) throw new Error();
            items = published;
        } catch {
            el('resource-status').textContent = 'No se pudo cargar la última versión. Se muestran los datos iniciales.';
        }
        render();
    }
    Promise.all([navbarReady, initialize()]).then(() => {
        render();
        el('access').onclick = accessClick;
        el('access').disabled = false;
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted) location.reload();
    });
})();
