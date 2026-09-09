(function () {
  let schema = null;
  let profile = {};
  let saveTimer = null;

  const sectionsEl = document.getElementById('sections');
  const gapsListEl = document.getElementById('gaps-list');
  const statusEl = document.getElementById('save-status');
  const generateBtn = document.getElementById('generate-btn');
  const handbookOutput = document.getElementById('handbook-output');

  function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getPath(obj, pathArr) {
    let cur = obj;
    for (const key of pathArr) {
      if (cur == null) return undefined;
      cur = cur[key];
    }
    return cur;
  }

  function setPath(obj, pathArr, value) {
    let cur = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
      const key = pathArr[i];
      const nextKey = pathArr[i + 1];
      if (cur[key] == null || typeof cur[key] !== 'object') {
        cur[key] = typeof nextKey === 'number' ? [] : {};
      }
      cur = cur[key];
    }
    const lastKey = pathArr[pathArr.length - 1];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'number' && Number.isNaN(value)) ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      delete cur[lastKey];
    } else {
      cur[lastKey] = value;
    }
  }

  function scheduleSave() {
    statusEl.textContent = 'saving…';
    statusEl.className = 'status saving';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }

  async function save() {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'save failed');
      statusEl.textContent = 'saved';
      statusEl.className = 'status';
      refreshGaps();
    } catch (err) {
      statusEl.textContent = 'save failed: ' + err.message;
      statusEl.className = 'status error';
    }
  }

  async function refreshGaps() {
    const res = await fetch('/api/gaps');
    const gaps = await res.json();
    if (gaps.length === 0) {
      gapsListEl.innerHTML = '<p>Nothing required is missing.</p>';
      return;
    }
    gapsListEl.innerHTML = '';
    for (const gap of gaps) {
      const div = document.createElement('div');
      div.className = 'gap-item ' + gap.priority;
      div.textContent = gap.label;
      gapsListEl.appendChild(div);
    }
  }

  function makeField(labelText, inputEl) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    return wrap;
  }

  function leafInput(fieldSchema, path, currentValue, onRender) {
    if (fieldSchema.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      if (currentValue !== undefined) input.value = currentValue;
      input.addEventListener('input', () => {
        const v = input.value === '' ? undefined : Number(input.value);
        setPath(profile, path, v);
        scheduleSave();
      });
      return input;
    }
    if (fieldSchema.type === 'array' && fieldSchema.items && fieldSchema.items.type === 'string') {
      const textarea = document.createElement('textarea');
      textarea.value = Array.isArray(currentValue) ? currentValue.join('\n') : '';
      textarea.placeholder = 'One per line';
      textarea.addEventListener('input', () => {
        const items = textarea.value.split('\n').map((s) => s.trim()).filter(Boolean);
        setPath(profile, path, items);
        scheduleSave();
      });
      return textarea;
    }
    if (fieldSchema.enum) {
      const select = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '—';
      select.appendChild(blank);
      for (const opt of fieldSchema.enum) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = humanize(opt);
        if (currentValue === opt) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener('change', () => {
        setPath(profile, path, select.value || undefined);
        scheduleSave();
        onRender && onRender();
      });
      return select;
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue !== undefined ? currentValue : '';
    input.addEventListener('input', () => {
      setPath(profile, path, input.value);
      scheduleSave();
    });
    return input;
  }

  function renderNestedObject(fieldSchema, path, currentValue) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'nested-fieldset';
    const legend = document.createElement('legend');
    legend.textContent = humanize(path[path.length - 1]);
    fieldset.appendChild(legend);
    const value = currentValue || {};
    for (const [key, subSchema] of Object.entries(fieldSchema.properties || {})) {
      const input = leafInput(subSchema, [...path, key], value[key]);
      fieldset.appendChild(makeField(humanize(key), input));
    }
    return fieldset;
  }

  function renderArrayOfObjects(container, path, itemSchema, refreshRow) {
    const wrap = document.createElement('div');
    wrap.className = 'row-editor';
    const rowsHost = document.createElement('div');
    wrap.appendChild(rowsHost);

    function draw() {
      rowsHost.innerHTML = '';
      const arr = getPath(profile, path) || [];
      arr.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'row';
        const fieldsHost = document.createElement('div');
        fieldsHost.className = 'row-fields';
        for (const [key, subSchema] of Object.entries(itemSchema.properties || {})) {
          const itemPath = [...path, idx, key];
          const input = leafInput(subSchema, itemPath, item[key], draw);
          fieldsHost.appendChild(makeField(humanize(key), input));
        }
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-row';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          const current = getPath(profile, path) || [];
          current.splice(idx, 1);
          setPath(profile, path, current.length ? current : undefined);
          scheduleSave();
          draw();
        });
        row.appendChild(fieldsHost);
        row.appendChild(removeBtn);
        rowsHost.appendChild(row);
      });
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'secondary';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const current = getPath(profile, path) || [];
      current.push({});
      setPath(profile, path, current);
      draw();
    });
    wrap.appendChild(addBtn);

    draw();
    container.appendChild(wrap);
  }

  function renderSectionBody(container, sectionKey, sectionSchema) {
    if (sectionSchema.type === 'array') {
      renderArrayOfObjects(container, [sectionKey], sectionSchema.items);
      return;
    }
    for (const [field, fieldSchema] of Object.entries(sectionSchema.properties || {})) {
      const path = [sectionKey, field];
      if (fieldSchema.type === 'array' && fieldSchema.items && fieldSchema.items.type === 'object') {
        const label = document.createElement('h3');
        label.textContent = humanize(field);
        container.appendChild(label);
        renderArrayOfObjects(container, path, fieldSchema.items);
        continue;
      }
      if (fieldSchema.type === 'object') {
        container.appendChild(renderNestedObject(fieldSchema, path, getPath(profile, path)));
        continue;
      }
      const input = leafInput(fieldSchema, path, getPath(profile, path));
      container.appendChild(makeField(humanize(field), input));
    }
  }

  function renderSections() {
    sectionsEl.innerHTML = '';
    for (const sectionKey of schema.required || []) {
      const sectionSchema = schema.properties[sectionKey];
      if (!sectionSchema) continue;
      const section = document.createElement('section');
      section.className = 'form-section';
      const h2 = document.createElement('h2');
      h2.textContent = humanize(sectionKey);
      section.appendChild(h2);
      renderSectionBody(section, sectionKey, sectionSchema);
      sectionsEl.appendChild(section);
    }
  }

  async function init() {
    const [schemaRes, profileRes] = await Promise.all([
      fetch('/api/schema').then((r) => r.json()),
      fetch('/api/profile').then((r) => r.json())
    ]);
    schema = schemaRes;
    profile = profileRes;
    renderSections();
    refreshGaps();
  }

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';
    try {
      const res = await fetch('/api/generate', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'generate failed');
      const text = await fetch('/api/handbook').then((r) => r.text());
      handbookOutput.textContent = text;
      handbookOutput.hidden = false;
    } catch (err) {
      handbookOutput.textContent = 'Error: ' + err.message;
      handbookOutput.hidden = false;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Regenerate handbook';
    }
  });

  init();
})();
