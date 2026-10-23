const fs = require('fs');
const path = require('path');
const {
  STATIC_ABOUT,
  STATIC_SKILL_CATEGORIES,
  STATIC_PROJECTS,
  STATIC_EXPERIENCE,
  STATIC_CERTIFICATIONS,
  STATIC_ACHIEVEMENTS
} = require('./data/defaultData');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'portfolioData.json');

// In-memory cache
let inMemoryData = null;

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      about: STATIC_ABOUT,
      skills: STATIC_SKILL_CATEGORIES,
      projects: STATIC_PROJECTS,
      experience: STATIC_EXPERIENCE,
      certifications: STATIC_CERTIFICATIONS,
      achievements: STATIC_ACHIEVEMENTS,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    inMemoryData = initialData;
  }
}

function loadData() {
  ensureDataFile();
  if (!inMemoryData) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryData = JSON.parse(raw);
    } catch (err) {
      console.error('[DataStore] Failed to parse portfolioData.json, loading defaults:', err);
      inMemoryData = {
        about: STATIC_ABOUT,
        skills: STATIC_SKILL_CATEGORIES,
        projects: STATIC_PROJECTS,
        experience: STATIC_EXPERIENCE,
        certifications: STATIC_CERTIFICATIONS,
        achievements: STATIC_ACHIEVEMENTS,
        updatedAt: new Date().toISOString()
      };
    }
  }
  return inMemoryData;
}

function persistData() {
  try {
    ensureDataFile();
    inMemoryData.updatedAt = new Date().toISOString();
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('[DataStore] Persist error:', err);
  }
}

const dataStore = {
  getAll: () => {
    return loadData();
  },

  updateAbout: (newAbout) => {
    const data = loadData();
    data.about = { ...data.about, ...newAbout };
    persistData();
    return data.about;
  },

  saveProject: (project) => {
    const data = loadData();
    if (!project.id) {
      project.id = 'proj-' + Date.now();
      project.createdAt = new Date().toISOString();
      data.projects.push(project);
    } else {
      const index = data.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        data.projects[index] = { ...data.projects[index], ...project };
      } else {
        data.projects.push(project);
      }
    }
    persistData();
    return project;
  },

  deleteProject: (id) => {
    const data = loadData();
    const beforeCount = data.projects.length;
    data.projects = data.projects.filter(p => p.id !== id);
    persistData();
    return data.projects.length < beforeCount;
  },

  saveCert: (cert) => {
    const data = loadData();
    if (!cert.id) {
      cert.id = 'cert-' + Date.now();
      cert.createdAt = new Date().toISOString();
      data.certifications.push(cert);
    } else {
      const index = data.certifications.findIndex(c => c.id === cert.id);
      if (index !== -1) {
        data.certifications[index] = { ...data.certifications[index], ...cert };
      } else {
        data.certifications.push(cert);
      }
    }
    persistData();
    return cert;
  },

  deleteCert: (id) => {
    const data = loadData();
    const beforeCount = data.certifications.length;
    data.certifications = data.certifications.filter(c => c.id !== id);
    persistData();
    return data.certifications.length < beforeCount;
  },

  saveSkillCategory: (category) => {
    const data = loadData();
    if (!category.id) {
      category.id = 'skill-' + Date.now();
    }
    const index = data.skills.findIndex(s => s.id === category.id);
    if (index !== -1) {
      data.skills[index] = { ...data.skills[index], ...category };
    } else {
      data.skills.push(category);
    }
    data.skills.sort((a, b) => (a.order || 0) - (b.order || 0));
    persistData();
    return category;
  },

  deleteSkillCategory: (id) => {
    const data = loadData();
    const beforeCount = data.skills.length;
    data.skills = data.skills.filter(s => s.id !== id);
    persistData();
    return data.skills.length < beforeCount;
  },

  saveAchievement: (ach) => {
    const data = loadData();
    if (!ach.id) {
      ach.id = 'ach-' + Date.now();
      ach.createdAt = new Date().toISOString();
      data.achievements.push(ach);
    } else {
      const index = data.achievements.findIndex(a => a.id === ach.id);
      if (index !== -1) {
        data.achievements[index] = { ...data.achievements[index], ...ach };
      } else {
        data.achievements.push(ach);
      }
    }
    persistData();
    return ach;
  },

  deleteAchievement: (id) => {
    const data = loadData();
    const beforeCount = data.achievements.length;
    data.achievements = data.achievements.filter(a => a.id !== id);
    persistData();
    return data.achievements.length < beforeCount;
  }
};

module.exports = dataStore;
