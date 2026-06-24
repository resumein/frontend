# Dynamic Template Creation Guide

This guide documents how to create and add new resume templates to the application. The rendering engine is fully dynamic and automatically adapts its editor interface, click interaction hot zones, and drag-and-drop mechanics from a configuration block declared directly inside the template file.

---

## 1. File Structure

A template is a single HTML file placed in the `public/templates/` directory (e.g. `public/templates/my_template.html`). It must contain:
1. **HTML Layout**: Standard DOM container structure.
2. **CSS Styles**: Styled layouts (recommending media print styling for high-quality PDF downloads).
3. **Template JSON Configuration**: Declared inside a `<script id="template-config" type="application/json">` block.
4. **JS Renderer**: A global `window.renderResume(data)` function that the application calls to dynamically rebuild the template elements with updated data.

---

## 2. Template Configuration Schema

The `<script id="template-config" type="application/json">` block defines the input forms and categories for the editor panel.

### Example JSON
```json
{
  "sections": [
    {
      "id": "profile",
      "title": "Profile Details",
      "selector": "#header",
      "type": "profile",
      "fields": [
        { "name": "name", "label": "Full Name", "type": "text", "placeholder": "Jake Ryan", "fromKey": ["name"] },
        { "name": "phone", "label": "Phone Number", "type": "text", "placeholder": "+91 12345 67890", "fromKey": ["phone"] }
      ]
    },
    {
      "id": "education",
      "title": "Education History",
      "selector": "#section-education",
      "type": "education",
      "dragTypes": ["education"],
      "fields": [
        { "name": "school", "label": "School Name", "type": "text", "placeholder": "Southwestern University", "fromKey": ["school", "company", "org", "name"] },
        { "name": "dates", "label": "Dates / Duration", "type": "text", "placeholder": "Aug. 2018 -- May 2021", "fromKey": ["formattedDates"] }
      ]
    }
  ]
}
```

### Config Properties
- **`sections`** (array): List of interactive sections.
  - **`id`** (string): The key where section data will be stored under the resume JSON payload (e.g. `"education"`, `"experience"`, `"volunteer"`).
  - **`title`** (string): The human-readable title shown on form draw headers.
  - **`selector`** (string): The CSS selector representing the section inside the HTML body (e.g. `"#section-education"`, `".skills-block"`). Used to bind highlight hovers, drag highlights, and click edit zones.
  - **`type`** (string):
    - `"profile"`: Root section with single instance fields (name, phone, email, links, etc.).
    - `"education"` | `"experience"` | `"projects"` | `"skills"` | `"custom_list"`: List-based sections where items can be dynamically added/deleted/ordered.
  - **`dragTypes`** (array of strings, optional): Declares which sidebar item types can be dropped into this section (e.g., `["education"]`, or `["project", "certification", "award"]` for projects section).
  - **`fields`** (array): Fields inside the section card form:
    - **`name`** (string): The key in the JSON object representing the field (e.g., `"school"`, `"location"`, `"bullets"`).
    - **`label`** (string): The label displayed above the input field.
    - **`type`** (string): `"text"`, `"textarea"`, or `"bullets"` (for list arrays of string bullet points).
    - **`placeholder`** (string, optional): Input placeholder.
    - **`fromKey`** (array of strings, optional): Fallback keys utilized to map properties from dragged credentials items. Precomputed keys available:
      - `"formattedDates"`: Formatted date range computed automatically from from/to/date values.
      - Standard credential properties: `"company"`, `"org"`, `"school"`, `"title"`, `"degree"`, `"tech"`, `"bullets"`, `"description"`, etc.

---

## 3. The JS Renderer Interface

Your template must bind its main entry point to `window.renderResume` so the preview iframe can update the visual DOM elements reactively:

```html
<script>
  function render(data) {
    // Clear and rebuild elements
    document.getElementById('header').innerHTML = data.name || '';
    
    // Render list items (e.g. education)
    const eduList = document.getElementById('section-education');
    eduList.innerHTML = '';
    (data.education || []).forEach(edu => {
      const itemEl = document.createElement('div');
      itemEl.className = 'edu-item';
      itemEl.innerHTML = `<h3>${edu.school}</h3><p>${edu.dates}</p>`;
      eduList.appendChild(itemEl);
    });
  }

  // Bind to global window object
  window.renderResume = render;

  // Initialize layout with default fallback values on startup
  render(defaultData);
</script>
```

---

## 4. Integration

Once the template HTML file is saved under `public/templates/`, you can assign it to any resume in the database via the `template` attribute (e.g., `"my_template"`). The application will automatically:
- Fetch and render `/templates/my_template.html`.
- Read and generate custom form inputs dynamically in the right editor panel.
- Setup mouse click triggers and section drag-highlights.
