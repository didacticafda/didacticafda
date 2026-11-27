(() => {
    const el = id => document.getElementById(id);
    const dialog = el('resource-dialog');
    const form = el('resource-form');
    const fields = form.elements;
    const config = window.recursosConfig;
    const page = createPageEditor({ el, fields, make, action, normalizeUrl });
    const sessionKey = 'didactica.editor';
    let items = page.fallback;
    const vacationButton = el('vacation-toggle');
    let vacation = false;
    let publishedVacation = false;
    let publishedItems;
    let conflict = false;
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
    function readPublished(data) {
        const withSettings = vacationButton && !Array.isArray(data);
        const records = withSettings ? data?.cards : data;
        if (!Array.isArray(records) || (withSettings && typeof data.vacation !== 'boolean')) {
            throw new Error('El archivo de datos tiene un formato incorrecto.');
        }
        publishedVacation = vacation = withSettings ? data.vacation : false;
        publishedItems = items = records;
    }
    async function loadLatest(auth) {
        const response = await github(auth);
        if (!response.ok) throw new Error('GitHub no pudo cargar los datos.');
        const file = await response.json();
        const latest = JSON.parse(new TextDecoder().decode(bytes64(file.content)));
        readPublished(latest);
        revision = file.sha;
    }
    async function save(next) {
        const bytes = new TextEncoder().encode(JSON.stringify(vacationButton ? { vacation, cards: next } : next, null, 2) + '\n');
        if (bytes.length >= 1000000) throw new Error('El archivo supera el tamaño admitido por el editor.');
        const content = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
        const response = await github(token, { method: 'PUT', body: JSON.stringify({
            message: 'Actualizar ' + page.label + ' de la cátedra', content, sha: revision, branch: 'main'
        }) });
        if (response.status === 409) {
            const draft = items;
            const draftVacation = vacation;
            await loadLatest(token);
            items = draft;
            vacation = draftVacation;
            conflict = true;
            throw new Error('Otra persona guardó una versión más reciente. Tu borrador sigue visible. Cancelá los cambios para cargar esa versión.');
        }
        revision = (await response.json()).content.sha;
        publishedItems = items = next;
        publishedVacation = vacation;
        return 'Guardado en GitHub. El cambio aparecerá cuando Pages termine de publicar.';
    }
    function render() {
        page.render(items, Boolean(token), openForm, vacation);
        const editing = Boolean(token);
        const root = document.documentElement;
        if (root.classList.contains('editing') !== editing) {
            root.classList.toggle('editing', editing);
            document.dispatchEvent(new Event('editingchange'));
        }
        const tools = document.querySelector('.resource-tools');
        if (tools) tools.hidden = !editing;
        const access = el('access');
        if (access) {
            document.querySelector('.nav-draft-actions').hidden = !editing;
            el('save-draft').disabled = !isDirty() || conflict;
            el('discard-draft').disabled = !isDirty();
            access.title = token ? 'Terminar edición' : 'Acceso para Docentes';
            access.setAttribute('aria-label', access.title);
            access.setAttribute('aria-pressed', String(Boolean(token)));
            access.firstElementChild.className = token ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock';
        }
    }

    function isDirty() {
        return Boolean(token) && (items !== publishedItems || vacation !== publishedVacation);
    }
    function openForm(next, item) {
        mode = next;
        selected = item;
        form.reset();
        el('dialog-error').textContent = '';
        el('login-fields').disabled = el('login-fields').hidden = mode !== 'login';
        el('item-fields').disabled = el('item-fields').hidden = !['add', 'edit'].includes(mode);
        const prompts = {
            vacation: 'El modo vacaciones oculta todas las tarjetas interactivas. ¿Deseás continuar?',
            save: '¿Confirmás el guardado de los cambios de esta página?',
            discard: '¿Querés cancelar los cambios realizados en esta página?',
            exit: conflict ? 'Hay una versión más reciente. Podés seguir editando o descartar el borrador y salir.' : 'Hay cambios pendientes en esta página. ¿Querés guardarlos antes de salir?',
            remove: item ? '¿Querés quitar «' + page.name(item) + '» del borrador?' : ''
        };
        el('delete-prompt').hidden = !prompts[mode];
        el('delete-prompt').textContent = prompts[mode] || '';
        if (mode === 'add' || mode === 'edit') page.fill(item);
        el('dialog-title').textContent = { login: 'Acceso para Docentes', add: 'Agregar ' + page.singular,
            edit: 'Editar ' + page.singular, remove: 'Eliminar ' + page.singular,
            vacation: 'Activar modo vacaciones', save: 'Guardar cambios', discard: 'Cancelar cambios', exit: 'Terminar edición' }[mode];
        el('cancel').textContent = ['save', 'discard', 'exit'].includes(mode) ? 'Seguir editando' : 'Cancelar';
        el('submit-resource').textContent = { login: 'Ingresar', add: page.submitLabel ?? 'Agregar al borrador', edit: page.submitLabel ?? 'Aplicar al borrador',
            remove: 'Quitar del borrador', vacation: 'Activar', save: 'Confirmar guardado', discard: 'Descartar cambios', exit: 'Guardar y salir' }[mode];
        el('discard-exit').hidden = mode !== 'exit';
        el('submit-resource').disabled = mode === 'exit' && conflict;
        dialog.showModal();
    }

    function accessClick() {
        if (!token) return openForm('login');
        if (isDirty()) return openForm('exit');
        endSession();
    }
    function endSession(message = 'Edición finalizada.') {
        sessionStorage.removeItem(sessionKey);
        token = '';
        items = publishedItems;
        vacation = publishedVacation;
        render();
        el('resource-status').textContent = message;
    }
    function setVacation(value) {
        vacation = value;
        el('resource-status').textContent = isDirty() ? 'Cambios pendientes de guardar.' : 'Sin cambios pendientes.';
        render();
    }
    if (vacationButton) vacationButton.onclick = () => {
        if (!token) return;
        if (vacation) setVacation(false);
        else openForm('vacation');
    };
    const addGroup = el('add-item');
    if (addGroup) addGroup.onclick = () => openForm('add');
    window.addEventListener('beforeunload', event => {
        if (isDirty()) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    el('cancel').onclick = () => dialog.close();
    dialog.oncancel = event => { if (busy) event.preventDefault(); };
    dialog.onclose = () => { fields.password.value = ''; };
    form.onsubmit = async event => {
        event.preventDefault();
        if (busy) return;
        const discardOnExit = mode === 'exit' && event.submitter === el('discard-exit');
        busy = el('discard-exit').disabled = el('cancel').disabled = el('submit-resource').disabled = true;
        el('dialog-error').textContent = '';
        try {
            if (mode === 'login') {
                const auth = await unlock(fields.username.value.trim(), fields.password.value);
                await loadLatest(auth);
                sessionStorage.setItem(sessionKey, auth);
                token = auth;
                el('resource-status').textContent = 'Edición habilitada.';
            } else if (mode === 'vacation') {
                setVacation(true);
            } else if (mode === 'save' || (mode === 'exit' && !discardOnExit)) {
                if (conflict) throw new Error('Revisá la versión más reciente antes de guardar.');
                const message = await save(items);
                if (mode === 'exit') endSession(message);
                else el('resource-status').textContent = message;
            } else if (mode === 'discard' || mode === 'exit') {
                items = publishedItems;
                vacation = publishedVacation;
                conflict = false;
                el('resource-status').textContent = 'Cambios descartados.';
                if (mode === 'exit') endSession('Cambios descartados. Edición finalizada.');
            } else {
                let next;
                if (mode === 'remove') next = items.filter(item => item.id !== selected.id);
                else {
                    const item = { id: selected?.id ?? crypto.randomUUID(), ...page.read() };
                    next = mode === 'add' ? [...items, item] : items.map(old => old.id === item.id ? item : old);
                }
                items = JSON.stringify(next) === JSON.stringify(publishedItems) ? publishedItems : next;
                el('resource-status').textContent = isDirty() ? 'Cambios pendientes de guardar.' : 'Sin cambios pendientes.';
            }
            dialog.close();
            render();
            (token ? (el('add-item') || vacationButton) : el('access')).focus({ preventScroll: true });
        } catch (error) {
            if (conflict) {
                dialog.close();
                render();
                el('resource-status').textContent = error.message;
                return;
            }
            el('dialog-error').textContent = error instanceof TypeError ? 'No se pudo conectar. Intentá nuevamente.' : error.message;
        } finally {
            busy = el('discard-exit').disabled = el('cancel').disabled = el('submit-resource').disabled = false;
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
            // En producción, la portada lee la misma revisión de main que guarda el editor.
            // Pages puede seguir sirviendo el JSON anterior durante un despliegue.
            const liveHome = vacationButton && ['didacticafda.com.ar', 'www.didacticafda.com.ar', 'didacticafda.github.io'].includes(location.hostname);
            const response = liveHome
                ? await fetch(fileApi + '?ref=main', { cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/vnd.github.raw+json' } })
                : await fetch(page.file, { cache: 'no-cache' });
            if (!response.ok) throw new Error();
            const published = await response.json();
            readPublished(published);
        } catch {
            el('resource-status').textContent = vacationButton ? 'No se pudieron cargar los recursos.' : 'No se pudo cargar la última versión. Se muestran los datos iniciales.';
        }
        render();
    }
    Promise.all([navbarReady, initialize()]).then(() => {
        render();
        el('save-draft').onclick = () => openForm('save');
        el('discard-draft').onclick = () => openForm('discard');
        el('access').onclick = accessClick;
        el('access').disabled = false;
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted) location.reload();
    });
})();
