(() => {
    const el = id => document.getElementById(id);
    const grid = el('resource-grid');
    const dialog = el('resource-dialog');
    const form = el('resource-form');
    const fields = form.elements;
    const config = window.recursosConfig;
    const icons = {
        envelope: 'Correo', 'file-contract': 'Consigna o formulario', 'book-open': 'Bibliografía',
        'folder-tree': 'Carpeta', pencil: 'Escritura', users: 'Comisiones', video: 'Video',
        'file-pdf': 'PDF', calendar: 'Calendario', link: 'Enlace', bullhorn: 'Aviso'
    };
    const initial = Array.from(grid.children, (node, i) => ({
        id: 'original-' + i, title: node.querySelector('h3').textContent.trim(),
        description: node.querySelector('p').textContent.trim(), url: node.getAttribute('href'),
        featured: node.classList.contains('card-halo-verde'),
        icon: Object.keys(icons).find(key => node.querySelector('.card-icon').classList.contains('fa-' + key))
    }));
    let cards = initial;
    let revision = 0;
    let token = '';
    let mode, selected, busy = false;

    function safeUrl(value) {
        if (!value || /[\\\u0000-\u001f]/.test(value)) return false;
        try {
            const url = new URL(value, location.href);
            return ['https:', 'http:', 'mailto:'].includes(url.protocol);
        } catch { return false; }
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
    function render() {
        grid.querySelectorAll('.card').forEach(card => card.vanillaTilt?.destroy());
        grid.replaceChildren();
        for (const item of cards) {
            const card = make(token ? 'article' : 'a', 'card');
            card.classList.toggle('card-halo-verde', item.featured);
            if (!token && safeUrl(item.url)) {
                card.href = item.url;
                if (/^https?:$/.test(card.protocol) && card.origin !== location.origin) {
                    card.target = '_blank';
                    card.rel = 'noopener noreferrer';
                }
            }
            card.append(make('i', 'fa-solid fa-' + (Object.hasOwn(icons, item.icon) ? item.icon : 'link') + ' card-icon'),
                make('h3', '', item.title), make('p', '', item.description));
            if (token) {
                card.append(action('Editar ' + item.title, 'pencil', 'edit-resource', () => openForm('edit', item)),
                    action('Eliminar ' + item.title, 'minus', 'remove-resource', () => openForm('remove', item)));
            } else {
                const arrow = make('span', 'card-btn');
                arrow.append(make('i', 'fa-solid fa-arrow-right'));
                card.append(arrow);
            }
            grid.append(card);
        }
        if (!token && window.innerWidth > 768 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.VanillaTilt?.init(grid.querySelectorAll('.card'), { max: 15, speed: 400, glare: true, 'max-glare': 0.4, scale: 1.05 });
        }
        el('access').querySelector('span').textContent = token ? 'Terminar edición' : 'Acceso docente';
        el('access').title = el('access').textContent.trim();
        el('access').querySelector('i').className = 'fa-solid fa-' + (token ? 'unlock' : 'lock');
        el('add-card').hidden = !token;
        fitTitles();
    }
    function fitTitles() {
        for (const title of grid.querySelectorAll('h3')) {
            let size = 21;
            title.style.fontSize = size + 'px';
            while (size > 16 && title.offsetHeight > size * 2.45) {
                title.style.fontSize = --size + 'px';
            }
        }
    }
    let gridWidth;
    new ResizeObserver(([entry]) => {
        if (entry.contentRect.width !== gridWidth) {
            gridWidth = entry.contentRect.width;
            fitTitles();
        }
    }).observe(grid);
    document.fonts.ready.then(fitTitles);

    const fileApi = 'https://api.github.com/repos/didacticafda/didacticafda/contents/recursos.json';
    function bytes64(value) {
        return Uint8Array.from(atob(value), char => char.charCodeAt(0));
    }
    async function unlock(username, password) {
        if (!config) throw new Error('Falta activar el acceso docente en GitHub.');
        if (username !== 'didacticadocente') throw new Error('Revisá el usuario y la clave.');
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
        if (!response.ok) throw new Error('GitHub no pudo cargar las tarjetas.');
        const file = await response.json();
        const latest = JSON.parse(new TextDecoder().decode(bytes64(file.content)));
        if (!Array.isArray(latest)) throw new Error('El archivo de tarjetas tiene un formato incorrecto.');
        revision = file.sha;
        cards = latest;
    }
    async function save(next) {
        const bytes = new TextEncoder().encode(JSON.stringify(next, null, 2) + '\n');
        if (bytes.length >= 1000000) throw new Error('El archivo supera el tamaño admitido por el editor.');
        const content = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
        const response = await github(token, { method: 'PUT', body: JSON.stringify({
            message: 'Actualizar tarjetas de la cátedra', content, sha: revision, branch: 'main'
        }) });
        if (response.status === 409) {
            await loadLatest(token);
            return 'Otra persona guardó cambios. Revisá las tarjetas actualizadas antes de volver a editar.';
        }
        revision = (await response.json()).content.sha;
        cards = next;
        return 'Guardado en GitHub. El cambio aparecerá cuando Pages termine de publicar.';
    }
    function preview() {
        el('icon-preview').className = 'fa-solid fa-' + fields.icon.value;
    }
    for (const [key, label] of Object.entries(icons)) fields.icon.add(new Option(label, key));
    fields.icon.onchange = preview;
    function openForm(next, item) {
        mode = next;
        selected = item;
        form.reset();
        el('dialog-error').textContent = '';
        el('login-fields').disabled = el('login-fields').hidden = mode !== 'login';
        el('card-fields').disabled = el('card-fields').hidden = !['add', 'edit'].includes(mode);
        el('delete-prompt').hidden = mode !== 'remove';
        el('delete-prompt').textContent = item ? '¿Querés eliminar «' + item.title + '» del inicio?' : '';
        if (mode === 'edit') {
            for (const key of ['icon', 'title', 'description', 'url']) fields[key].value = item[key];
            fields.featured.checked = item.featured;
        }
        preview();
        el('dialog-title').textContent = { login: 'Acceso docente', add: 'Agregar tarjeta', edit: 'Editar tarjeta', remove: 'Eliminar tarjeta' }[mode];
        el('submit-resource').textContent = { login: 'Ingresar', add: 'Publicar', edit: 'Guardar cambios', remove: 'Eliminar' }[mode];
        dialog.showModal();
    }
    el('access').onclick = () => {
        if (!token) return openForm('login');
        token = '';
        render();
        el('resource-status').textContent = 'Edición finalizada.';

    };
    el('add-card').onclick = () => openForm('add');
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
                token = auth;
                el('resource-status').textContent = 'Edición habilitada.';
            } else {
                let next;
                if (mode === 'remove') next = cards.filter(card => card.id !== selected.id);
                else {
                    const title = fields.title.value.trim();
                    const url = fields.url.value.trim();
                    if (!title || !safeUrl(url) || /\s/.test(url) || !(/^(https?:\/\/|mailto:)/i.test(url) || /^[./\w%-]+\.html(?:[?#].*)?$/i.test(url))) {
                        throw new Error('Ingresá un título y un vínculo web, un correo con mailto: o una página .html del sitio.');
                    }
                    const item = { id: selected?.id ?? crypto.randomUUID(), title, url, description: fields.description.value.trim(),
                        icon: fields.icon.value, featured: fields.featured.checked };
                    next = mode === 'add' ? [...cards, item] : cards.map(card => card.id === item.id ? item : card);
                }
                el('resource-status').textContent = await save(next);
            }
            dialog.close();
            render();
            el(token ? 'add-card' : 'access').focus({ preventScroll: true });
        } catch (error) {
            el('dialog-error').textContent = error instanceof TypeError ? 'No se pudo conectar. Intentá nuevamente.' : error.message;
        } finally {
            busy = el('cancel').disabled = el('submit-resource').disabled = false;
        }
    };
    render();
    el('access').disabled = true;
    fetch('recursos.json', { cache: 'no-cache' }).then(async response => {
        if (!response.ok) throw new Error();
        const published = await response.json();
        if (!Array.isArray(published)) throw new Error();
        cards = published;
        render();
    }).catch(() => {
        el('resource-status').textContent = 'No se pudo cargar la última versión. Se muestran los recursos iniciales.';
    }).finally(() => { el('access').disabled = false; });
})();
