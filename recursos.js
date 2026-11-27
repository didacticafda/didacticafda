function createPageEditor({ el, fields, make, action, normalizeUrl }) {
    const grid = el('resource-grid');
    const icons = {
        file: 'Documento', envelope: 'Correo', 'file-contract': 'Consigna o formulario', 'book-open': 'Bibliografía',
        'folder-tree': 'Carpeta', pencil: 'Escritura', users: 'Comisiones', video: 'Video',
        'file-pdf': 'PDF', calendar: 'Calendario', link: 'Enlace', bullhorn: 'Aviso'
    };
    function render(cards, token, openForm, vacation) {
        grid.querySelectorAll('.card').forEach(card => card.vanillaTilt?.destroy());
        grid.replaceChildren();
        el('vacation-toggle').textContent = vacation ? 'Desactivar modo vacaciones' : 'Activar modo vacaciones';
        el('vacation-notice').hidden = !vacation;
        if (vacation) return;
        for (const item of cards) {
            const card = make(token ? 'article' : 'a', 'card');
            card.classList.toggle('card-halo-verde', item.featured);
            const href = normalizeUrl(item.url);
            if (!token && href) {
                card.href = href;
                if (/^https?:$/.test(card.protocol) && card.origin !== location.origin) {
                    card.target = '_blank';
                    card.rel = 'noopener noreferrer';
                }
            }
            card.append(make('i', 'fa-solid fa-' + (Object.hasOwn(icons, item.icon) ? item.icon : 'link') + ' card-icon'),
                make('h3', '', item.title), make('p', '', item.description));
            if (token) {
                if (href && new URL(href, location.href).href.split(/[?#]/)[0] === new URL('comisiones.html', location.href).href) {
                    const link = make('a', 'card-page-link', 'Abrir Comisiones');
                    link.href = href;
                    card.append(link);
                }
                card.append(action('Editar ' + item.title, 'pencil', 'edit-resource', () => openForm('edit', item)),
                    action('Eliminar ' + item.title, 'minus', 'remove-resource', () => openForm('remove', item)));
            } else {
                const arrow = make('span', 'card-btn');
                arrow.append(make('i', 'fa-solid fa-arrow-right'));
                card.append(arrow);
            }
            grid.append(card);
        }
        if (token) {
            const add = make('button', 'card add-card');
            add.id = 'add-item';
            add.type = 'button';
            add.append(make('i', 'fa-solid fa-plus'), make('span', '', 'Agregar tarjeta'));
            add.onclick = () => openForm('add');
            grid.append(add);
        }
        if (!token && window.innerWidth > 768 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.VanillaTilt?.init(grid.querySelectorAll('.card'), { max: 15, speed: 400, glare: true, 'max-glare': 0.4, scale: 1.05 });
        }
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

    const options = el('icon-options');
    for (const [key, label] of Object.entries(icons)) {
        const choice = make('label', 'icon-option');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'icon';
        radio.value = key;
        radio.defaultChecked = key === 'file';
        const glyph = make('i', 'fa-solid fa-' + key);
        glyph.setAttribute('aria-hidden', 'true');
        choice.append(radio, glyph, make('span', '', label));
        options.append(choice);
    }
    return {
        file: 'recursos.json', label: 'tarjetas', singular: 'tarjeta', submitLabel: 'Guardar', fallback: [], render,
        name: item => item.title,
        fill(item) {
            if (item) {
                for (const key of ['icon', 'title', 'description', 'url']) fields[key].value = item[key];
                fields.featured.checked = item.featured;
            }
        },
        read() {
            const title = fields.title.value.trim();
            const url = normalizeUrl(fields.url.value);
            if (!title || !url) throw new Error('Ingresá un título y un vínculo válido, por ejemplo drive.google.com.');
            return { title, url, description: fields.description.value.trim(), icon: fields.icon.value, featured: fields.featured.checked };
        }
    };
}
