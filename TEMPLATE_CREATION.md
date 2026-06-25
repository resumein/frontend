# Dynamic Resume Template Creation Guide

This document details how to create and integrate new dynamic, non-static HTML resume templates into the **resumein** platform. The template engine is built to be completely declarative: by uploading a single HTML file with embedded layout metadata, the application automatically adapts its edit forms, drag-and-drop actions, used item markers, and order managers dynamically.

---

## 1. Directory Structure

All resume templates reside inside the public directory:
`public/templates/<template_name>.html`

Example:
- `public/templates/jakes.html`

---

## 2. Dynamic Configuration Metadata

Every template MUST include an embedded script tag with `id="template-config"` containing the JSON metadata schema. This schema describes:
1. The available layout sections.
2. The CSS selectors pointing to the corresponding DOM containers.
3. The individual editable input fields and their credential mappings.

### Configuration Schema Reference

```html
<script id="template-config" type="application/json">
{
  "sections": [
    {
      "id": "profile",
      "title": "Profile Details",
      "selector": "#header",
      "type": "profile",
      "fields": [
        { "name": "name", "label": "Full Name", "type": "text", "fromKey": ["name"] },
        { "name": "phone", "label": "Phone Number", "type": "text", "fromKey": ["phone"] },
        { "name": "email", "label": "Email Address", "type": "text", "fromKey": ["email"] },
        { "name": "links", "label": "Links", "type": "text" }
      ]
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "selector": "#section-experience",
      "type": "experience",
      "dragTypes": ["experience"],
      "fields": [
        { "name": "title", "label": "Job Title", "type": "text", "fromKey": ["title"] },
        { "name": "org", "label": "Organization / Company", "type": "text", "fromKey": ["company", "org", "school"] },
        { "name": "location", "label": "Location", "type": "text", "fromKey": ["location"] },
        { "name": "dates", "label": "Dates / Duration", "type": "text", "fromKey": ["formattedDates"] },
        { "name": "bullets", "label": "Bullet Points", "type": "bullets", "fromKey": ["bullets", "role", "description"] }
      ]
    }
  ]
}
</script>
```

### Property Description Table

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (e.g. `education`, `experience`, `projects`). Used as the key inside the database payload. |
| `title` | `string` | Human-readable title displayed in form headers and the layout manager. |
| `selector` | `string` | CSS selector matching the container element in the HTML body (e.g., `#section-experience`). |
| `type` | `string` | Section form/data structure. Supported types: `'profile'`, `'education'`, `'experience'`, `'projects'`, `'skills'`, `'custom_list'`. |
| `dragTypes` | `string[]` | Types of sidebar item cards accepted for drag-and-drop into this section (e.g. `['project']`). |
| `fields` | `array` | Schema of editable input fields. Supports `text`, `textarea`, and `bullets`. |
| `fromKey` | `string[]` | Fallback list of credential record keys to map from when dragging a card from the sidebar (e.g., matching the company name to the organization input). |

---

## 3. Template Rendering Lifecycle

The preview iframe loads the selected template HTML and exposes a global function to populate/update the resume canvas without a page refresh:

```javascript
window.renderResume = function(data) {
    // 1. Clear existing dynamically managed containers
    if (data.templateConfig && data.templateConfig.sections) {
        const container = document.getElementById('page');
        
        // Hide deleted sections
        if (container) {
            const allSections = Array.from(container.querySelectorAll('section'));
            allSections.forEach(elSec => {
                const isInConfig = data.templateConfig.sections.some(sec => sec.selector === `#${elSec.id}`);
                if (!isInConfig) elSec.style.display = 'none';
            });
        }

        // Dynamically instantiate or show config sections
        data.templateConfig.sections.forEach(sec => {
            if (sec.id !== 'profile') {
                let elSec = document.querySelector(sec.selector);
                if (!elSec && container && sec.selector.startsWith('#')) {
                    const elId = sec.selector.substring(1);
                    elSec = document.createElement('section');
                    elSec.id = elId;
                    container.appendChild(elSec);
                }
                if (elSec) {
                    elSec.innerHTML = '';
                    elSec.style.display = 'block';
                }
            }
        });
    }

    // 2. Render Header/Profile Section
    renderHeader(data);

    // 3. Render Custom and Default list content dynamically
    if (data.templateConfig && data.templateConfig.sections) {
        data.templateConfig.sections.forEach(sec => {
            if (sec.id === 'education') renderEducation(data);
            else if (sec.id === 'experience') renderExperience(data);
            else if (sec.id === 'projects') renderProjects(data);
            else if (sec.id === 'certifications') renderCertifications(data);
            else if (sec.id === 'awards') renderAwards(data);
            else if (sec.id === 'skills') renderSkills(data);
            else if (sec.id !== 'profile') renderCustomSection(data, sec);
        });

        // 4. Rearrange DOM elements to match the layout manager's ordering
        const container = document.getElementById('page');
        if (container) {
            data.templateConfig.sections.forEach(sec => {
                if (sec.id !== 'profile') {
                    const elSec = document.querySelector(sec.selector);
                    if (elSec && elSec.parentElement === container) {
                        container.appendChild(elSec); // Moves the element to the correct ordered position
                    }
                }
            });
        }
    }
}
```

---

## 4. Custom List Section Renderer

To support user-created custom sections (e.g. "Volunteer Work" or "Hobbies"), the rendering function should support generic list mappings:

```javascript
function renderCustomSection(data, sec) {
    const section = document.querySelector(sec.selector);
    if (!section) return;
    
    // Add dynamic section heading
    section.appendChild(el('h2', { class: 'section-title', text: sec.title }));
    
    const items = data[sec.id] || [];
    if (items.length > 0) {
        const list = el('ul', { class: 'entry-list' });
        items.forEach(item => {
            const entry = el('li', { class: 'entry' });
            const titleVal = item.title || item.name || '';
            const techVal = item.tech || item.category || '';
            const datesVal = item.dates || item.formattedDates || '';

            const row = el('div', { class: 'entry-row' }, [
                el('span', {
                    class: 'left',
                    html: `<b>${escapeHtml(titleVal)}</b>` + (techVal ? ` <span class="sep">|</span> <i>${escapeHtml(techVal)}</i>` : '')
                }),
                el('span', { class: 'right', text: datesVal })
            ]);
            entry.appendChild(row);
            if (item.bullets && item.bullets.length > 0) {
                entry.appendChild(renderBullets(item.bullets));
            }
            list.appendChild(entry);
        });
        section.appendChild(list);
    }
}
```

---

## 5. CSS Guidelines for Canvas Preview

- **Page Constraints**: Keep width exactly `8.5in` and height `11in` with appropriate padding to match a US Letter page layout.
- **Dynamic Highlights**: The editor wrapper automatically overlays dashed outlines on selectors matching active `templateConfig.sections` for direct interactive editing. Ensure your CSS selectors are clean and target container parent elements rather than individual list entries.
- **Scrollbars**: Set `body { overflow: hidden; }` to keep the canvas clean.
