function createPageEditor({ el, fields, make, action, normalizeUrl }) {
    const body = document.querySelector('.comisiones-table tbody');
    const name = item => item.commission + ' · Grupo N° ' + item.number;
    function webLink(value) {
        const url = normalizeUrl(value);
        return /^https?:\/\//i.test(url) ? url : '';
    }
    function resourceLink(label, value, cls, icon) {
        const href = webLink(value);
        if (!href) return document.createTextNode(label);
        const link = make('a', cls);
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.append(make('i', icon), ' ' + label);
        return link;
    }
    function render(items, editing, openForm) {
        el('row-actions').hidden = !editing;
        if (!items) return;
        const rows = document.createDocumentFragment();
        for (const item of items) {
            const row = document.createElement('tr');
            row.insertCell().append(make('span', 'comision-tag', item.commission));
            row.insertCell().textContent = 'Grupo N° ' + item.number;
            const members = row.insertCell();
            for (const member of item.members) members.append(make('div', '', member));
            row.insertCell().append(resourceLink(item.institution, item.mapUrl, 'institucion-link', 'fa-solid fa-location-dot'));
            row.insertCell().append(resourceLink('Drive Grupo ' + item.number, item.driveUrl, 'drive-btn', 'fa-brands fa-google-drive'));
            if (editing) {
                row.insertCell().append(
                    action('Editar ' + name(item), 'pencil', 'group-action', () => openForm('edit', item)),
                    action('Eliminar ' + name(item), 'minus', 'group-action remove', () => openForm('remove', item))
                );
            }
            rows.append(row);
        }
        body.replaceChildren(rows);
    }
    return {
        file: 'comisiones.json', label: 'grupos', singular: 'grupo', fallback: null, render, name,
        fill(item) {
            if (!item) return;
            for (const key of ['commission', 'number', 'institution', 'mapUrl', 'driveUrl']) fields[key].value = item[key];
            item.members.forEach((member, i) => { fields['member' + (i + 1)].value = member; });
        },
        read() {
            const members = [fields.member1, fields.member2, fields.member3].map(input => input.value.trim()).filter(Boolean);
            if (!members.length) throw new Error('Completá al menos un integrante.');
            const number = fields.number.valueAsNumber;
            if (!Number.isSafeInteger(number) || number < 1) throw new Error('Ingresá un número de grupo entero y positivo.');
            const institution = fields.institution.value.trim();
            if (!institution) throw new Error('Ingresá el nombre de la institución.');
            const mapUrl = webLink(fields.mapUrl.value);
            const driveUrl = webLink(fields.driveUrl.value);
            if (!mapUrl || !driveUrl) throw new Error('Revisá los vínculos de Google Mapas y de la carpeta Drive.');
            return { commission: fields.commission.value, number, members, institution, mapUrl, driveUrl };
        }
    };
}
