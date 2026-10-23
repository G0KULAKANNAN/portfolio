import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, isConfigured } from '../firebase/config';
import { authService } from './auth';
import {
  STATIC_ABOUT,
  STATIC_SKILL_CATEGORIES,
  STATIC_PROJECTS,
  STATIC_CERTIFICATIONS,
  STATIC_ACHIEVEMENTS,
  STATIC_EXPERIENCE
} from './staticData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const STORAGE_KEYS = {
  VERSION: 'portfolio_data_version',
  ABOUT: 'portfolio_mock_profile',
  PROJECTS: 'portfolio_mock_projects',
  CERTIFICATIONS: 'portfolio_mock_certs',
  SKILLS: 'portfolio_mock_skills',
  ACHIEVEMENTS: 'portfolio_mock_achievements',
  EXPERIENCE: 'portfolio_mock_experience'
};

const deleteFileFromStorage = async (url) => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
    console.log("Deleted file from Firebase Storage:", url);
  } catch (error) {
    console.error("Failed to delete file from Firebase Storage:", error);
  }
};

/**
 * Execute Authenticated Admin HTTP request with CSRF token and HttpOnly cookies
 */
async function fetchWithAdminAuth(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const csrfToken = authService.getCsrfToken();
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Sends session cookie __Secure_admin_sid
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error(errorData.error || 'Your session has expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error(errorData.error || 'Access forbidden: Invalid security token.');
    }
    throw new Error(errorData.error || `Admin operation failed (${response.status})`);
  }

  return response.json();
}

export const portfolioService = {
  isConfigured,

  // ----------------------------------------------------
  // Database Auto-Migration Check & Action
  // ----------------------------------------------------
  checkAndAutoMigrate: async () => {
    try {
      const CURRENT_DATA_VERSION = '2026_soc_v4';
      const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
      if (storedVersion !== CURRENT_DATA_VERSION) {
        localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_DATA_VERSION);
        await portfolioService.seedDatabase();
      }

      if (isConfigured && db) {
        const docSnap = await getDoc(doc(db, 'profile', 'settings'));
        if (!docSnap.exists()) {
          console.log("[Firebase Migration] Database is empty. Starting auto-migration of static data to Firestore...");
          await portfolioService.seedDatabase();
          console.log("[Firebase Migration] Migration completed successfully!");
        }
      } else {
        const localAbout = localStorage.getItem(STORAGE_KEYS.ABOUT);
        if (!localAbout) {
          console.log("[Local Migration] Mock database is empty. Auto-migrating static data to LocalStorage...");
          await portfolioService.seedDatabase();
        }
      }
    } catch (error) {
      console.warn("Auto-migration check failed. Proceeding with regular operations.", error);
    }
  },

  // ----------------------------------------------------
  // Profile Settings (Home Section Controls)
  // ----------------------------------------------------
  fetchAbout: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.about) return data.about;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const docSnap = await getDoc(doc(db, 'profile', 'settings'));
      return docSnap.exists() ? docSnap.data() : null;
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.ABOUT);
      return localData ? JSON.parse(localData) : STATIC_ABOUT;
    }
  },

  updateAbout: async (aboutData, profileImageFile, resumeFile) => {
    let finalData = { ...aboutData };

    if (profileImageFile) {
      finalData.profileImageUrl = URL.createObjectURL(profileImageFile);
    }
    if (resumeFile) {
      finalData.resumeUrl = URL.createObjectURL(resumeFile);
    }

    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth('/admin/save-about', {
        method: 'POST',
        body: JSON.stringify(finalData)
      });
    } catch (err) {
      // Re-throw security errors (401/403) so UI displays appropriate feedback
      throw err;
    }

    if (isConfigured && db && storage) {
      const aboutRef = doc(db, 'profile', 'settings');
      await setDoc(aboutRef, finalData, { merge: true });
    }

    localStorage.setItem(STORAGE_KEYS.ABOUT, JSON.stringify(finalData));
    return finalData;
  },

  // ----------------------------------------------------
  // Projects CRUD
  // ----------------------------------------------------
  fetchProjects: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.projects && data.projects.length > 0) return data.projects;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const querySnap = await getDocs(collection(db, 'projects'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return localData ? JSON.parse(localData) : STATIC_PROJECTS;
    }
  },

  saveProject: async (projectData, imageFile, editId = null) => {
    let finalProject = { ...projectData };
    if (editId) {
      finalProject.id = editId;
    } else if (!finalProject.id) {
      finalProject.id = 'proj-' + Date.now();
      finalProject.createdAt = new Date().toISOString();
    }

    if (imageFile) {
      finalProject.imageUrl = URL.createObjectURL(imageFile);
    }

    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth('/admin/save-project', {
        method: 'POST',
        body: JSON.stringify(finalProject)
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db && storage) {
      if (editId) {
        const projRef = doc(db, 'projects', editId);
        await updateDoc(projRef, finalProject);
      } else {
        await addDoc(collection(db, 'projects'), finalProject);
      }
    }

    let projects = [];
    const localData = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (localData) projects = JSON.parse(localData);

    if (editId) {
      projects = projects.map(p => p.id === editId ? { ...p, ...finalProject } : p);
    } else {
      projects.push(finalProject);
    }
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return finalProject;
  },

  deleteProject: async (id) => {
    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth(`/admin/project/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db) {
      const docRef = doc(db, 'projects', id);
      await deleteDoc(docRef);
    }

    const localData = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (localData) {
      let projects = JSON.parse(localData);
      projects = projects.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    }
  },

  // ----------------------------------------------------
  // Certifications CRUD
  // ----------------------------------------------------
  fetchCertifications: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.certifications && data.certifications.length > 0) return data.certifications;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const querySnap = await getDocs(collection(db, 'certifications'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.CERTIFICATIONS);
      return localData ? JSON.parse(localData) : STATIC_CERTIFICATIONS;
    }
  },

  saveCert: async (certData, certFile, editId = null) => {
    let finalCert = { ...certData };
    if (editId) {
      finalCert.id = editId;
    } else if (!finalCert.id) {
      finalCert.id = 'cert-' + Date.now();
      finalCert.createdAt = new Date().toISOString();
    }

    if (certFile) {
      finalCert.link = URL.createObjectURL(certFile);
    }

    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth('/admin/save-cert', {
        method: 'POST',
        body: JSON.stringify(finalCert)
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db && storage) {
      if (editId) {
        const certRef = doc(db, 'certifications', editId);
        await updateDoc(certRef, finalCert);
      } else {
        await addDoc(collection(db, 'certifications'), finalCert);
      }
    }

    let certs = [];
    const localData = localStorage.getItem(STORAGE_KEYS.CERTIFICATIONS);
    if (localData) certs = JSON.parse(localData);

    if (editId) {
      certs = certs.map(c => c.id === editId ? { ...c, ...finalCert } : c);
    } else {
      certs.push(finalCert);
    }
    localStorage.setItem(STORAGE_KEYS.CERTIFICATIONS, JSON.stringify(certs));
    return finalCert;
  },

  deleteCert: async (id) => {
    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth(`/admin/cert/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db) {
      const docRef = doc(db, 'certifications', id);
      await deleteDoc(docRef);
    }

    const localData = localStorage.getItem(STORAGE_KEYS.CERTIFICATIONS);
    if (localData) {
      let certs = JSON.parse(localData);
      certs = certs.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CERTIFICATIONS, JSON.stringify(certs));
    }
  },

  // ----------------------------------------------------
  // Achievements CRUD
  // ----------------------------------------------------
  fetchAchievements: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.achievements && data.achievements.length > 0) return data.achievements;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const querySnap = await getDocs(collection(db, 'achievements'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
      return localData ? JSON.parse(localData) : STATIC_ACHIEVEMENTS;
    }
  },

  saveAchievement: async (achievementData, filesToUpload = [], editId = null) => {
    let finalAch = { ...achievementData };
    if (!finalAch.files) finalAch.files = [];
    if (editId) {
      finalAch.id = editId;
    } else if (!finalAch.id) {
      finalAch.id = 'ach-' + Date.now();
      finalAch.createdAt = new Date().toISOString();
    }

    if (filesToUpload.length > 0) {
      const newUrls = filesToUpload.map((file) => URL.createObjectURL(file));
      finalAch.files = [...finalAch.files, ...newUrls];
    }

    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth('/admin/save-achievement', {
        method: 'POST',
        body: JSON.stringify(finalAch)
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db && storage) {
      if (editId) {
        const achRef = doc(db, 'achievements', editId);
        await updateDoc(achRef, finalAch);
      } else {
        await addDoc(collection(db, 'achievements'), finalAch);
      }
    }

    let achs = [];
    const localData = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (localData) achs = JSON.parse(localData);

    if (editId) {
      achs = achs.map(a => a.id === editId ? { ...a, ...finalAch } : a);
    } else {
      achs.push(finalAch);
    }
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achs));
    return finalAch;
  },

  deleteAchievement: async (id) => {
    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth(`/admin/achievement/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db) {
      const docRef = doc(db, 'achievements', id);
      await deleteDoc(docRef);
    }

    const localData = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (localData) {
      let achs = JSON.parse(localData);
      achs = achs.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achs));
    }
  },

  // ----------------------------------------------------
  // Skills Categories CRUD
  // ----------------------------------------------------
  fetchSkills: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.skills && data.skills.length > 0) return data.skills;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const querySnap = await getDocs(collection(db, 'skills'));
      const list = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      return list;
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.SKILLS);
      return localData ? JSON.parse(localData) : STATIC_SKILL_CATEGORIES;
    }
  },

  saveSkillCategory: async (categoryData, isEdit = false) => {
    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth('/admin/save-skill', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db) {
      const catRef = doc(db, 'skills', categoryData.id);
      if (isEdit) {
        await updateDoc(catRef, {
          title: categoryData.title,
          icon: categoryData.icon,
          skills: categoryData.skills,
          order: categoryData.order || 0
        });
      } else {
        await setDoc(catRef, categoryData);
      }
    }

    let skills = [];
    const localData = localStorage.getItem(STORAGE_KEYS.SKILLS);
    if (localData) skills = JSON.parse(localData);

    if (isEdit) {
      skills = skills.map(s => s.id === categoryData.id ? { ...s, ...categoryData } : s);
    } else {
      skills.push(categoryData);
    }

    skills.sort((a, b) => (a.order || 0) - (b.order || 0));
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
    return categoryData;
  },

  deleteSkillCategory: async (id) => {
    // Call secure backend API with session credentials & CSRF
    try {
      await fetchWithAdminAuth(`/admin/skill/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      throw err;
    }

    if (isConfigured && db) {
      await deleteDoc(doc(db, 'skills', id));
    }

    const localData = localStorage.getItem(STORAGE_KEYS.SKILLS);
    if (localData) {
      let skills = JSON.parse(localData);
      skills = skills.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
    }
  },

  // ----------------------------------------------------
  // Admin Password Management
  // ----------------------------------------------------
  changeAdminPassword: async (currentPassword, newPassword) => {
    return await fetchWithAdminAuth('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // ----------------------------------------------------
  // Experience CRUD
  // ----------------------------------------------------
  fetchExperience: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        if (data.experience && data.experience.length > 0) return data.experience;
      }
    } catch (e) {
      // Fallback
    }

    await portfolioService.checkAndAutoMigrate();
    if (isConfigured && db) {
      const querySnap = await getDocs(collection(db, 'experience'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const localData = localStorage.getItem(STORAGE_KEYS.EXPERIENCE);
      return localData ? JSON.parse(localData) : STATIC_EXPERIENCE;
    }
  },

  // ----------------------------------------------------
  // Seed Database (used by auto-migration check)
  // ----------------------------------------------------
  seedDatabase: async () => {
    if (isConfigured && db) {
      await setDoc(doc(db, 'profile', 'settings'), STATIC_ABOUT);
      for (const cat of STATIC_SKILL_CATEGORIES) {
        await setDoc(doc(db, 'skills', cat.id), cat);
      }
      for (const proj of STATIC_PROJECTS) {
        await addDoc(collection(db, 'projects'), { ...proj, createdAt: new Date().toISOString() });
      }
      for (const cert of STATIC_CERTIFICATIONS) {
        await addDoc(collection(db, 'certifications'), { ...cert, createdAt: new Date().toISOString() });
      }
      for (const ach of STATIC_ACHIEVEMENTS) {
        const files = ach.link ? [ach.link] : [];
        const { link, ...rest } = ach;
        await addDoc(collection(db, 'achievements'), { ...rest, files, createdAt: new Date().toISOString() });
      }
      for (const exp of STATIC_EXPERIENCE) {
        await addDoc(collection(db, 'experience'), { ...exp, createdAt: new Date().toISOString() });
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ABOUT, JSON.stringify(STATIC_ABOUT));
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(STATIC_SKILL_CATEGORIES));
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(
        STATIC_PROJECTS.map((p, idx) => ({ id: 'seed-proj-' + idx, ...p, createdAt: new Date().toISOString() }))
      ));
      localStorage.setItem(STORAGE_KEYS.CERTIFICATIONS, JSON.stringify(
        STATIC_CERTIFICATIONS.map((c, idx) => ({ id: 'seed-cert-' + idx, ...c, createdAt: new Date().toISOString() }))
      ));
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(
        STATIC_ACHIEVEMENTS.map((a, idx) => {
          const files = a.link ? [a.link] : (a.certificates ? a.certificates.map(c => c.link) : []);
          return { id: 'seed-ach-' + idx, ...a, files, createdAt: new Date().toISOString() };
        })
      ));
      localStorage.setItem(STORAGE_KEYS.EXPERIENCE, JSON.stringify(STATIC_EXPERIENCE));
    }
  }
};
