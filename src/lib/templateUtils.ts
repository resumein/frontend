export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'bullets';
  placeholder?: string;
  fromKey?: string[]; // fallback list of credential keys to map from
}

export interface TemplateSection {
  id: string;
  title: string;
  selector: string;
  type: 'profile' | 'education' | 'experience' | 'projects' | 'skills' | 'custom_list';
  fields: TemplateField[];
  dragTypes?: string[];
}

export interface TemplateConfig {
  sections: TemplateSection[];
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  sections: [
    {
      id: 'profile',
      title: 'Profile Details',
      selector: '#header',
      type: 'profile',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Jake Ryan', fromKey: ['name'] },
        { name: 'phone', label: 'Phone Number', type: 'text', placeholder: '+91 12345 67890', fromKey: ['phone'] },
        { name: 'email', label: 'Email Address', type: 'text', placeholder: 'jake@example.com', fromKey: ['email'] },
        { name: 'links', label: 'Links', type: 'text' }
      ]
    },
    {
      id: 'education',
      title: 'Education History',
      selector: '#section-education',
      type: 'education',
      dragTypes: ['education'],
      fields: [
        { name: 'school', label: 'School Name', type: 'text', placeholder: 'Southwestern University', fromKey: ['school', 'company', 'org', 'name'] },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'Georgetown, TX', fromKey: ['location'] },
        { name: 'degree', label: 'Degree / Major', type: 'text', placeholder: 'Bachelor of Science in Computer Science', fromKey: ['degree', 'field'] },
        { name: 'dates', label: 'Dates / Duration', type: 'text', placeholder: 'Aug. 2018 -- May 2021', fromKey: ['formattedDates'] }
      ]
    },
    {
      id: 'experience',
      title: 'Work Experience',
      selector: '#section-experience',
      type: 'experience',
      dragTypes: ['experience'],
      fields: [
        { name: 'title', label: 'Job Title', type: 'text', placeholder: 'Software Engineer', fromKey: ['title'] },
        { name: 'org', label: 'Organization / Company', type: 'text', placeholder: 'Texas A&M University', fromKey: ['company', 'org', 'school'] },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'College Station, TX', fromKey: ['location'] },
        { name: 'dates', label: 'Dates / Duration', type: 'text', placeholder: 'June 2020 -- Present', fromKey: ['formattedDates'] },
        { name: 'bullets', label: 'Bullet Points', type: 'bullets', placeholder: 'Developed a REST API...', fromKey: ['bullets', 'role', 'description'] }
      ]
    },
    {
      id: 'projects',
      title: 'Projects',
      selector: '#section-projects',
      type: 'projects',
      dragTypes: ['project'],
      fields: [
        { name: 'title', label: 'Project Title', type: 'text', placeholder: 'Gitlytics', fromKey: ['title', 'name'] },
        { name: 'tech', label: 'Technologies Used', type: 'text', placeholder: 'Python, Flask, React, Docker', fromKey: ['technologiesUsed', 'tech', 'platform', 'issuer'] },
        { name: 'dates', label: 'Dates / Duration', type: 'text', placeholder: 'June 2020 -- Present', fromKey: ['formattedDates'] },
        { name: 'bullets', label: 'Bullet Points', type: 'bullets', placeholder: 'Visualized GitHub data...', fromKey: ['bullets', 'role', 'description'] }
      ]
    },
    {
      id: 'certifications',
      title: 'Certifications',
      selector: '#section-certifications',
      type: 'projects',
      dragTypes: ['certification'],
      fields: [
        { name: 'title', label: 'Certification Title', type: 'text', placeholder: 'AWS Cloud Practitioner', fromKey: ['title', 'name'] },
        { name: 'tech', label: 'Platform / Issuer', type: 'text', placeholder: 'Amazon Web Services', fromKey: ['tech', 'platform', 'issuer'] },
        { name: 'dates', label: 'Dates / Duration', type: 'text', placeholder: 'June 2020', fromKey: ['formattedDates'] },
        { name: 'bullets', label: 'Description', type: 'bullets', placeholder: 'Learned about cloud architecture...', fromKey: ['bullets', 'role', 'description'] }
      ]
    },
    {
      id: 'awards',
      title: 'Awards',
      selector: '#section-awards',
      type: 'projects',
      dragTypes: ['award'],
      fields: [
        { name: 'title', label: 'Award Title', type: 'text', placeholder: 'First Place Winner', fromKey: ['title', 'name'] },
        { name: 'tech', label: 'Organiser / Issuer', type: 'text', placeholder: 'Texas Hackathon', fromKey: ['tech', 'platform', 'issuer'] },
        { name: 'dates', label: 'Dates / Duration', type: 'text', placeholder: 'June 2020', fromKey: ['formattedDates'] },
        { name: 'bullets', label: 'Description', type: 'bullets', placeholder: 'Awarded for best AI project...', fromKey: ['bullets', 'role', 'description'] }
      ]
    },
    {
      id: 'skills',
      title: 'Technical Skills',
      selector: '#section-skills',
      type: 'skills',
      dragTypes: ['skill'],
      fields: [
        { name: 'category', label: 'Category Label', type: 'text', placeholder: 'Languages', fromKey: ['category'] },
        { name: 'items', label: 'Skill Items (Comma-separated)', type: 'text', placeholder: 'Java, Python, C/C++, JavaScript', fromKey: ['items'] }
      ]
    }
  ]
};

export const parseTemplateConfig = (htmlText: string): TemplateConfig | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const scriptEl = doc.getElementById('template-config');
    if (scriptEl && scriptEl.textContent) {
      return JSON.parse(scriptEl.textContent) as TemplateConfig;
    }
  } catch (err) {
    console.error('Failed to parse template configuration:', err);
  }
  return null;
};

export const mapItemToSectionData = (item: any, section: TemplateSection) => {
  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDates = (from?: string, to?: string) => {
    const fromLabel = from ? formatDateLabel(from) : '';
    const toLabel = to ? formatDateLabel(to) : 'Present';
    return fromLabel ? `${fromLabel} -- ${toLabel}` : '';
  };

  const formattedDates = item.fromDate || item.toDate 
    ? formatDates(item.fromDate, item.toDate) 
    : (item.completedOn ? formatDateLabel(item.completedOn) : (item.date ? formatDateLabel(item.date) : ''));

  const enrichedItem = {
    ...item,
    formattedDates,
    tech: item.tech || item.platform || item.issuer || '',
    org: item.company || item.org || item.school || '',
    bullets: item.role && item.role.length > 0 ? item.role : (item.description ? [item.description] : [''])
  };

  const data: any = {};
  section.fields.forEach(field => {
    let val: any = undefined;
    if (field.fromKey) {
      for (const key of field.fromKey) {
        if (enrichedItem[key] !== undefined && enrichedItem[key] !== '') {
          val = enrichedItem[key];
          break;
        }
      }
    }
    
    if (val === undefined) {
      val = field.type === 'bullets' ? [''] : '';
    } else {
      if (field.type === 'bullets' && !Array.isArray(val)) {
        val = [val];
      }
    }
    data[field.name] = val;
  });

  return data;
};

export const getFallbackRenderData = (activeContent: any, config: TemplateConfig | null): any => {
  return activeContent || {};
};
