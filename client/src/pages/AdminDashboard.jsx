import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioService } from '../services/portfolio';
import Toast from '../components/Toast';
import '../Admin.css';

export default function AdminDashboard() {
  const { logout, user, checkSession } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const handleLogout = async () => {
    await logout(false);
    navigate('/admin/login', { replace: true });
  };

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) {
        checkSession();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [checkSession]);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDbEmpty, setIsDbEmpty] = useState(false);

  // Portfolio items data
  const [aboutData, setAboutData] = useState({});
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [achievements, setAchievements] = useState([]);

  // Form edit states
  const [editingProject, setEditingProject] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingSkillCategory, setEditingSkillCategory] = useState(null);
  const [editingAchievement, setEditingAchievement] = useState(null);

  // New item states
  const [newProject, setNewProject] = useState({
    title: '', category: '', desc: '', tech: [], github: '', live: '', imageUrl: ''
  });
  const [newCert, setNewCert] = useState({
    title: '', platform: '', status: 'Completed', completed: true, desc: '', link: '', date: ''
  });
  const [newSkillCategory, setNewSkillCategory] = useState({
    id: '', title: '', icon: 'fa-code', skills: [], order: 0
  });
  const [newAchievement, setNewAchievement] = useState({
    title: '', location: '', achievement: '', desc: '', date: '', learnings: [], link: ''
  });

  // Local helper input tags
  const [projectTechInput, setProjectTechInput] = useState('');
  const [categorySkillsInput, setCategorySkillsInput] = useState('');
  const [achievementLearningsInput, setAchievementLearningsInput] = useState('');

  // File Upload states
  const [resumeFile, setResumeFile] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [projectImageFile, setProjectImageFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [achievementFilesList, setAchievementFilesList] = useState([]);

  // Form display toggles
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddCert, setShowAddCert] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddAchievement, setShowAddAchievement] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast("Current password and new password are required.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await portfolioService.changeAdminPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      showToast(res.message || "Admin password updated successfully!", "success");
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update password.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const about = await portfolioService.fetchAbout();
      if (about) {
        setAboutData(about);
        setIsDbEmpty(false);
      } else {
        setIsDbEmpty(true);
      }

      setProjects(await portfolioService.fetchProjects());
      setCertifications(await portfolioService.fetchCertifications());
      setSkills(await portfolioService.fetchSkills());
      setAchievements(await portfolioService.fetchAchievements());
    } catch (error) {
      console.error(error);
      showToast("Error loading data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);



  // ----------------------------------------------------
  // Home Controls (Resume, Photo, Counts)
  // ----------------------------------------------------
  const handleHomeUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await portfolioService.updateAbout(aboutData, profileImageFile, resumeFile);
      setAboutData(updated);
      setProfileImageFile(null);
      setResumeFile(null);
      showToast("Home controls and uploads updated!");
    } catch (error) {
      console.error(error);
      showToast("Failed to save changes: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // Projects CRUD
  // ----------------------------------------------------
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.title || !newProject.category) {
      showToast("Title and Category are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await portfolioService.saveProject(newProject, projectImageFile);
      showToast("Project added!");
      setNewProject({ title: '', category: '', desc: '', tech: [], github: '', live: '', imageUrl: '' });
      setProjectImageFile(null);
      setProjectTechInput('');
      setShowAddProject(false);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Add failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...data } = editingProject;
      await portfolioService.saveProject(data, projectImageFile, id);
      showToast("Project updated!");
      setEditingProject(null);
      setProjectImageFile(null);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Update failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    setSaving(true);
    try {
      await portfolioService.deleteProject(id);
      showToast("Project deleted.");
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addProjectTechTag = (isEdit = false) => {
    const val = projectTechInput.trim();
    if (!val) return;
    if (isEdit) {
      if (!editingProject.tech.includes(val)) {
        setEditingProject({ ...editingProject, tech: [...editingProject.tech, val] });
      }
    } else {
      if (!newProject.tech.includes(val)) {
        setNewProject({ ...newProject, tech: [...newProject.tech, val] });
      }
    }
    setProjectTechInput('');
  };

  const removeProjectTechTag = (tag, isEdit = false) => {
    if (isEdit) {
      setEditingProject({ ...editingProject, tech: editingProject.tech.filter(t => t !== tag) });
    } else {
      setNewProject({ ...newProject, tech: newProject.tech.filter(t => t !== tag) });
    }
  };

  // ----------------------------------------------------
  // Certifications CRUD
  // ----------------------------------------------------
  const handleAddCert = async (e) => {
    e.preventDefault();
    if (!newCert.title || !newCert.platform) {
      showToast("Title and Issuer/Platform are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await portfolioService.saveCert(newCert, certFile);
      showToast("Certificate added!");
      setNewCert({ title: '', platform: '', status: 'Completed', completed: true, desc: '', link: '', date: '' });
      setCertFile(null);
      setShowAddCert(false);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Add failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCert = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...data } = editingCert;
      await portfolioService.saveCert(data, certFile, id);
      showToast("Certificate updated!");
      setEditingCert(null);
      setCertFile(null);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Update failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCert = async (id) => {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    
    const oldCerts = [...certifications];
    setCertifications(prev => prev.filter(c => c.id !== id));
    setSaving(true);
    
    try {
      await portfolioService.deleteCert(id);
      showToast("Certificate deleted successfully.");
      await loadAllData();
    } catch (error) {
      console.error(error);
      setCertifications(oldCerts);
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // Achievements CRUD
  // ----------------------------------------------------
  const handleAchievementFilesSelect = (filesList) => {
    const filesArray = Array.from(filesList);
    setAchievementFilesList(prev => [...prev, ...filesArray]);
  };

  const removeSelectedFileBeforeUpload = (index) => {
    setAchievementFilesList(prev => prev.filter((_, idx) => idx !== index));
  };

  const removeExistingUploadedFile = (index) => {
    setEditingAchievement(prev => ({
      ...prev,
      files: prev.files.filter((_, idx) => idx !== index)
    }));
  };

  const handleAddAchievement = async (e) => {
    e.preventDefault();
    if (!newAchievement.title) {
      showToast("Title is required.", "error");
      return;
    }
    setSaving(true);
    try {
      await portfolioService.saveAchievement(newAchievement, achievementFilesList);
      showToast("Achievement added!");
      setNewAchievement({ title: '', location: '', achievement: '', desc: '', date: '', learnings: [], files: [] });
      setAchievementFilesList([]);
      setAchievementLearningsInput('');
      setShowAddAchievement(false);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Add failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAchievement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...data } = editingAchievement;
      await portfolioService.saveAchievement(data, achievementFilesList, id);
      showToast("Achievement updated!");
      setEditingAchievement(null);
      setAchievementFilesList([]);
      setAchievementLearningsInput('');
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Update failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAchievement = async (id) => {
    if (!window.confirm("Delete this achievement?")) return;
    setSaving(true);
    try {
      await portfolioService.deleteAchievement(id);
      showToast("Achievement deleted.");
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addAchievementLearningTag = (isEdit = false) => {
    const val = achievementLearningsInput.trim();
    if (!val) return;
    if (isEdit) {
      if (!editingAchievement.learnings.includes(val)) {
        setEditingAchievement({ ...editingAchievement, learnings: [...editingAchievement.learnings, val] });
      }
    } else {
      if (!newAchievement.learnings.includes(val)) {
        setNewAchievement({ ...newAchievement, learnings: [...newAchievement.learnings, val] });
      }
    }
    setAchievementLearningsInput('');
  };

  const removeAchievementLearningTag = (tag, isEdit = false) => {
    if (isEdit) {
      setEditingAchievement({ ...editingAchievement, learnings: editingAchievement.learnings.filter(l => l !== tag) });
    } else {
      setNewAchievement({ ...newAchievement, learnings: newAchievement.learnings.filter(l => l !== tag) });
    }
  };

  // ----------------------------------------------------
  // Skills CRUD
  // ----------------------------------------------------
  const handleAddSkillCategory = async (e) => {
    e.preventDefault();
    if (!newSkillCategory.id || !newSkillCategory.title) {
      showToast("Category ID and Title are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await portfolioService.saveSkillCategory(newSkillCategory, false);
      showToast("Skill Category added!");
      setNewSkillCategory({ id: '', title: '', icon: 'fa-code', skills: [], order: skills.length + 1 });
      setCategorySkillsInput('');
      setShowAddSkill(false);
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Add failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSkillCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await portfolioService.saveSkillCategory(editingSkillCategory, true);
      showToast("Skill Category updated!");
      setEditingSkillCategory(null);
      setCategorySkillsInput('');
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Update failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkillCategory = async (id) => {
    if (!window.confirm("Delete this entire skill category?")) return;
    setSaving(true);
    try {
      await portfolioService.deleteSkillCategory(id);
      showToast("Category deleted.");
      loadAllData();
    } catch (error) {
      console.error(error);
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addSkillPill = (isEdit = false) => {
    const val = categorySkillsInput.trim();
    if (!val) return;
    if (isEdit) {
      if (!editingSkillCategory.skills.includes(val)) {
        setEditingSkillCategory({ ...editingSkillCategory, skills: [...editingSkillCategory.skills, val] });
      }
    } else {
      if (!newSkillCategory.skills.includes(val)) {
        setNewSkillCategory({ ...newSkillCategory, skills: [...newSkillCategory.skills, val] });
      }
    }
    setCategorySkillsInput('');
  };

  const removeSkillPill = (skill, isEdit = false) => {
    if (isEdit) {
      setEditingSkillCategory({ ...editingSkillCategory, skills: editingSkillCategory.skills.filter(s => s !== skill) });
    } else {
      setNewSkillCategory({ ...newSkillCategory, skills: newSkillCategory.skills.filter(s => s !== skill) });
    }
  };

  // ----------------------------------------------------


  if (loading) {
    return (
      <div className="admin-login-container">
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}></i>
          <h2>Syncing Dashboard Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-db-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">Gokula<span>kannan</span></div>
          <div className="admin-mobile-toggle" onClick={() => setSidebarOpen(false)}>
            <i className="fa-solid fa-xmark" style={{ color: '#fff' }}></i>
          </div>
        </div>

        <nav className="admin-sidebar-menu">
          <div className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-chart-line"></i> Summary
          </div>
          <div className={`admin-menu-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-house"></i> Home Section Controls
          </div>
          <div className={`admin-menu-item ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => { setActiveTab('skills'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-laptop-code"></i> Skills
          </div>
          <div className={`admin-menu-item ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => { setActiveTab('projects'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-code"></i> Projects
          </div>
          <div className={`admin-menu-item ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => { setActiveTab('certifications'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-certificate"></i> Certifications
          </div>
          <div className={`admin-menu-item ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => { setActiveTab('achievements'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-trophy"></i> Achievements
          </div>
          <div className={`admin-menu-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => { setActiveTab('security'); setSidebarOpen(false); }}>
            <i className="fa-solid fa-key"></i> Security & Password
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-email" title={user?.email}>{user?.email || 'admin@portfolio.com'}</span>
            <button className="admin-logout-btn" onClick={handleLogout} title="Sign Out">
              <i className="fa-solid fa-power-off"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="admin-main-content">
        <header className="admin-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="admin-mobile-toggle" onClick={() => setSidebarOpen(true)}>
              <i className="fa-solid fa-bars"></i>
            </div>
            <h1 className="admin-page-title">
              {activeTab === 'dashboard' && 'Dashboard Summary'}
              {activeTab === 'home' && 'Home Section Controls'}
              {activeTab === 'skills' && 'Skills Management'}
              {activeTab === 'projects' && 'Projects CRUD'}
              {activeTab === 'certifications' && 'Certifications CRUD'}
              {activeTab === 'achievements' && 'Achievements CRUD'}
              {activeTab === 'security' && 'Security & Password Settings'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!portfolioService.isConfigured && (
              <span style={{ fontSize: '0.78rem', backgroundColor: '#e6c262', color: '#132a13', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
                <i className="fa-solid fa-circle-info"></i> Local Offline Mock DB
              </span>
            )}
            <a href="/" target="_blank" rel="noopener noreferrer" className="admin-visit-btn">
              <i className="fa-solid fa-eye"></i> View Live Site
            </a>
          </div>
        </header>

        <div className="admin-body-area">


          {/* ----------------------------------------------------
              TAB: DASHBOARD SUMMARY
              ---------------------------------------------------- */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="admin-dashboard-widgets">
                <div className="admin-widget-card"><div className="admin-widget-icon"><i className="fa-solid fa-code"></i></div>
                  <div className="admin-widget-info"><span className="admin-widget-count">{projects.length}</span><span className="admin-widget-label">Projects</span></div>
                </div>
                <div className="admin-widget-card"><div className="admin-widget-icon"><i className="fa-solid fa-certificate"></i></div>
                  <div className="admin-widget-info"><span className="admin-widget-count">{certifications.length}</span><span className="admin-widget-label">Certs</span></div>
                </div>
                <div className="admin-widget-card"><div className="admin-widget-icon"><i className="fa-solid fa-trophy"></i></div>
                  <div className="admin-widget-info"><span className="admin-widget-count">{achievements.length}</span><span className="admin-widget-label">Achievements</span></div>
                </div>
              </div>
              <div className="admin-card">
                <h3 className="admin-card-title">Instructions</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginTop: '0.5rem' }}>
                  Welcome back. Use the sidebar to manage your portfolio data. You can edit dynamic skills, portfolio projects, certifications with uploads, symposium achievements, and home profile settings.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="admin-btn admin-btn-secondary" onClick={loadAllData}><i className="fa-solid fa-rotate"></i> Refresh Dashboard Data</button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              TAB: HOME CONTROLS (Resume, Portrait, displayed counts)
              ---------------------------------------------------- */}
          {activeTab === 'home' && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Home Section Controls</h2>
              </div>
              <form onSubmit={handleHomeUpdate}>


                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Replace Portrait Photo</label>
                    <div className="admin-upload-zone" style={{ padding: '1.5rem' }}>
                      <input type="file" accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setProfileImageFile(e.target.files[0])} />
                      <i className="fa-solid fa-image admin-upload-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
                      <div className="admin-upload-text">{profileImageFile ? profileImageFile.name : "Choose profile image"}</div>
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Replace Resume PDF</label>
                    <div className="admin-upload-zone" style={{ padding: '1.5rem' }}>
                      <input type="file" accept=".pdf" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setResumeFile(e.target.files[0])} />
                      <i className="fa-solid fa-file-pdf admin-upload-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
                      <div className="admin-upload-text">{resumeFile ? resumeFile.name : "Choose resume PDF"}</div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}

          {/* ----------------------------------------------------
              TAB: SKILLS
              ---------------------------------------------------- */}
          {activeTab === 'skills' && (
            <div>
              {showAddSkill && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Add Skill Category</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowAddSkill(false)}>Cancel</button>
                  </div>
                  <form onSubmit={handleAddSkillCategory}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Category ID (e.g. web-tech)</label>
                        <input type="text" className="admin-input" value={newSkillCategory.id} onChange={(e) => setNewSkillCategory({ ...newSkillCategory, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={newSkillCategory.title} onChange={(e) => setNewSkillCategory({ ...newSkillCategory, title: e.target.value })} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Icon Class (e.g. fa-code)</label>
                        <input type="text" className="admin-input" value={newSkillCategory.icon} onChange={(e) => setNewSkillCategory({ ...newSkillCategory, icon: e.target.value })} />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Display Order</label>
                        <input type="number" className="admin-input" value={newSkillCategory.order} onChange={(e) => setNewSkillCategory({ ...newSkillCategory, order: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Add Skills</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={categorySkillsInput} onChange={(e) => setCategorySkillsInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addSkillPill(false); } }} placeholder="Add skill..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addSkillPill(false)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {newSkillCategory.skills.map(s => (
                          <span key={s} className="admin-tag">{s} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeSkillPill(s, false)}></i></span>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Create Category</button>
                  </form>
                </div>
              )}

              {editingSkillCategory && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Edit Skill Category</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingSkillCategory(null)}>Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateSkillCategory}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={editingSkillCategory.title} onChange={(e) => setEditingSkillCategory({ ...editingSkillCategory, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Icon Class</label>
                        <input type="text" className="admin-input" value={editingSkillCategory.icon} onChange={(e) => setEditingSkillCategory({ ...editingSkillCategory, icon: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Display Order</label>
                      <input type="number" className="admin-input" value={editingSkillCategory.order || 0} onChange={(e) => setEditingSkillCategory({ ...editingSkillCategory, order: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Add Skills</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={categorySkillsInput} onChange={(e) => setCategorySkillsInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addSkillPill(true); } }} placeholder="Add skill..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addSkillPill(true)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {editingSkillCategory.skills?.map(s => (
                          <span key={s} className="admin-tag">{s} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeSkillPill(s, true)}></i></span>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Changes</button>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Skill Category Groups</h3>
                  {!showAddSkill && !editingSkillCategory && (
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowAddSkill(true)}><i className="fa-solid fa-plus"></i> Add Category</button>
                  )}
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead><tr><th>Order</th><th>ID</th><th>Title</th><th>Skills</th><th>Actions</th></tr></thead>
                    <tbody>
                      {skills.map(cat => (
                        <tr key={cat.id}>
                          <td>{cat.order || 0}</td>
                          <td><code>{cat.id}</code></td>
                          <td><strong>{cat.title}</strong></td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {cat.skills?.map((s, idx) => <span key={idx} style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{s}</span>)}
                            </div>
                          </td>
                          <td>
                            <div className="admin-actions-cell">
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingSkillCategory(cat)}><i className="fa-solid fa-pen"></i> Edit</button>
                              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDeleteSkillCategory(cat.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              TAB: PROJECTS (CRUD)
              ---------------------------------------------------- */}
          {activeTab === 'projects' && (
            <div>
              {showAddProject && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Add Project</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowAddProject(false)}>Cancel</button>
                  </div>
                  <form onSubmit={handleAddProject}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Category</label>
                        <input type="text" className="admin-input" value={newProject.category} onChange={(e) => setNewProject({ ...newProject, category: e.target.value })} required />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={newProject.desc} onChange={(e) => setNewProject({ ...newProject, desc: e.target.value })} required />
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">GitHub URL</label>
                        <input type="url" className="admin-input" value={newProject.github} onChange={(e) => setNewProject({ ...newProject, github: e.target.value })} />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Live Demo URL</label>
                        <input type="url" className="admin-input" value={newProject.live} onChange={(e) => setNewProject({ ...newProject, live: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Tech Tags</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={projectTechInput} onChange={(e) => setProjectTechInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addProjectTechTag(false); } }} placeholder="Add tech..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addProjectTechTag(false)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {newProject.tech.map(t => <span key={t} className="admin-tag">{t} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeProjectTechTag(t, false)}></i></span>)}
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Upload Screenshot</label>
                      <div className="admin-upload-zone">
                        <input type="file" accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setProjectImageFile(e.target.files[0])} />
                        <i className="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                        <div className="admin-upload-text">{projectImageFile ? projectImageFile.name : "Select screenshots"}</div>
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Project</button>
                  </form>
                </div>
              )}

              {editingProject && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Edit Project: {editingProject.title}</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingProject(null)}>Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateProject}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Category</label>
                        <input type="text" className="admin-input" value={editingProject.category} onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })} required />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={editingProject.desc} onChange={(e) => setEditingProject({ ...editingProject, desc: e.target.value })} required />
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">GitHub URL</label>
                        <input type="url" className="admin-input" value={editingProject.github || ''} onChange={(e) => setEditingProject({ ...editingProject, github: e.target.value })} />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Live Demo URL</label>
                        <input type="url" className="admin-input" value={editingProject.live || ''} onChange={(e) => setEditingProject({ ...editingProject, live: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Tech Tags</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={projectTechInput} onChange={(e) => setProjectTechInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addProjectTechTag(true); } }} placeholder="Add tech..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addProjectTechTag(true)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {editingProject.tech?.map(t => <span key={t} className="admin-tag">{t} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeProjectTechTag(t, true)}></i></span>)}
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Replace screenshot</label>
                      <div className="admin-upload-zone">
                        <input type="file" accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setProjectImageFile(e.target.files[0])} />
                        <i className="fa-solid fa-image admin-upload-icon"></i>
                        <div className="admin-upload-text">{projectImageFile ? projectImageFile.name : "Upload new image"}</div>
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Changes</button>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Projects</h3>
                  {!showAddProject && !editingProject && (
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowAddProject(true)}><i className="fa-solid fa-plus"></i> Add Project</button>
                  )}
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead><tr><th>Screenshot</th><th>Category</th><th>Title</th><th>Tech Stack</th><th>Actions</th></tr></thead>
                    <tbody>
                      {projects.map(proj => (
                        <tr key={proj.id}>
                          <td>{proj.imageUrl ? <img src={proj.imageUrl} style={{ width: '50px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} alt="" /> : 'No image'}</td>
                          <td><span className="project-category-tag">{proj.category}</span></td>
                          <td><strong>{proj.title}</strong></td>
                          <td>{proj.tech?.join(', ')}</td>
                          <td>
                            <div className="admin-actions-cell">
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingProject(proj)}><i className="fa-solid fa-pen"></i> Edit</button>
                              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDeleteProject(proj.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              TAB: CERTIFICATIONS (CRUD)
              ---------------------------------------------------- */}
          {activeTab === 'certifications' && (
            <div>
              {showAddCert && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Add Certification</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowAddCert(false)}>Cancel</button>
                  </div>
                  <form onSubmit={handleAddCert}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={newCert.title} onChange={(e) => setNewCert({ ...newCert, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Platform/Issuer</label>
                        <input type="text" className="admin-input" value={newCert.platform} onChange={(e) => setNewCert({ ...newCert, platform: e.target.value })} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Status (Completed, In Progress)</label>
                        <select className="admin-select" value={newCert.status} onChange={(e) => setNewCert({ ...newCert, status: e.target.value, completed: e.target.value === 'Completed' })}>
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Completed Date/Year (e.g. 2025)</label>
                        <input type="text" className="admin-input" value={newCert.date} onChange={(e) => setNewCert({ ...newCert, date: e.target.value })} placeholder="e.g. 2025" />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={newCert.desc} onChange={(e) => setNewCert({ ...newCert, desc: e.target.value })} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Upload Certificate Image/PDF</label>
                      <div className="admin-upload-zone">
                        <input type="file" accept="image/*,.pdf" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setCertFile(e.target.files[0])} />
                        <i className="fa-solid fa-file-pdf admin-upload-icon"></i>
                        <div className="admin-upload-text">{certFile ? certFile.name : "Select document"}</div>
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Add Certification</button>
                  </form>
                </div>
              )}

              {editingCert && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Edit Certificate: {editingCert.title}</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingCert(null)}>Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateCert}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={editingCert.title} onChange={(e) => setEditingCert({ ...editingCert, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Issuer</label>
                        <input type="text" className="admin-input" value={editingCert.platform} onChange={(e) => setEditingCert({ ...editingCert, platform: e.target.value })} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Status</label>
                        <select className="admin-select" value={editingCert.status} onChange={(e) => setEditingCert({ ...editingCert, status: e.target.value, completed: e.target.value === 'Completed' })}>
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Completed Date/Year</label>
                        <input type="text" className="admin-input" value={editingCert.date || ''} onChange={(e) => setEditingCert({ ...editingCert, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={editingCert.desc} onChange={(e) => setEditingCert({ ...editingCert, desc: e.target.value })} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Replace certificate file</label>
                      <div className="admin-upload-zone">
                        <input type="file" accept="image/*,.pdf" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => setCertFile(e.target.files[0])} />
                        <i className="fa-solid fa-upload admin-upload-icon"></i>
                        <div className="admin-upload-text">{certFile ? certFile.name : "Select replacement file"}</div>
                      </div>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Changes</button>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Certifications</h3>
                  {!showAddCert && !editingCert && (
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowAddCert(true)}><i className="fa-solid fa-plus"></i> Add Certification</button>
                  )}
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead><tr><th>Platform</th><th>Title</th><th>Date</th><th>Status</th><th>Document</th><th>Actions</th></tr></thead>
                    <tbody>
                      {certifications.map(cert => (
                        <tr key={cert.id}>
                          <td><strong>{cert.platform}</strong></td>
                          <td>{cert.title}</td>
                          <td>{cert.date || 'N/A'}</td>
                          <td><span className={cert.completed ? 'badge-completed' : 'badge-progress'}>{cert.status}</span></td>
                          <td>{cert.link ? <a href={cert.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)' }}>View File</a> : 'None'}</td>
                          <td>
                            <div className="admin-actions-cell">
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingCert(cert)}><i className="fa-solid fa-pen"></i> Edit</button>
                              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDeleteCert(cert.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              TAB: ACHIEVEMENTS (CRUD)
              ---------------------------------------------------- */}
          {activeTab === 'achievements' && (
            <div>
              {showAddAchievement && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Add Achievement</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowAddAchievement(false)}>Cancel</button>
                  </div>
                  <form onSubmit={handleAddAchievement}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Event/Symposium Title</label>
                        <input type="text" className="admin-input" value={newAchievement.title} onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Location/Institution</label>
                        <input type="text" className="admin-input" value={newAchievement.location} onChange={(e) => setNewAchievement({ ...newAchievement, location: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Achievement Award (e.g. 1st Place)</label>
                        <input type="text" className="admin-input" value={newAchievement.achievement} onChange={(e) => setNewAchievement({ ...newAchievement, achievement: e.target.value })} placeholder="e.g. 1st Place / Participant" />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Date (e.g. Feb 2026)</label>
                        <input type="text" className="admin-input" value={newAchievement.date} onChange={(e) => setNewAchievement({ ...newAchievement, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={newAchievement.desc} onChange={(e) => setNewAchievement({ ...newAchievement, desc: e.target.value })} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Focus Areas / learnings (Tags)</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={achievementLearningsInput} onChange={(e) => setAchievementLearningsInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addAchievementLearningTag(false); } }} placeholder="Add tag..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addAchievementLearningTag(false)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {newAchievement.learnings.map(t => <span key={t} className="admin-tag">{t} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeAchievementLearningTag(t, false)}></i></span>)}
                      </div>
                    </div>
                     <div className="admin-form-group">
                      <label className="admin-label">Upload Documents / Proofs (Multiple)</label>
                      <div className="admin-upload-zone" style={{ cursor: 'pointer' }}>
                        <input type="file" accept="image/*,.pdf" multiple style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => handleAchievementFilesSelect(e.target.files)} />
                        <i className="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                        <div className="admin-upload-text">
                          {achievementFilesList.length > 0 ? `${achievementFilesList.length} files selected` : "Select files/images"}
                        </div>
                      </div>
                      {achievementFilesList.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                          {achievementFilesList.map((file, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(27, 67, 50, 0.05)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <span>{file.name}</span>
                              <button type="button" onClick={() => removeSelectedFileBeforeUpload(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Achievement</button>
                  </form>
                </div>
              )}

              {editingAchievement && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3 className="admin-card-title">Edit Achievement: {editingAchievement.title}</h3>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingAchievement(null)}>Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateAchievement}>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Event/Symposium Title</label>
                        <input type="text" className="admin-input" value={editingAchievement.title} onChange={(e) => setEditingAchievement({ ...editingAchievement, title: e.target.value })} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Location</label>
                        <input type="text" className="admin-input" value={editingAchievement.location} onChange={(e) => setEditingAchievement({ ...editingAchievement, location: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Award</label>
                        <input type="text" className="admin-input" value={editingAchievement.achievement} onChange={(e) => setEditingAchievement({ ...editingAchievement, achievement: e.target.value })} />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Date</label>
                        <input type="text" className="admin-input" value={editingAchievement.date} onChange={(e) => setEditingAchievement({ ...editingAchievement, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Description</label>
                      <textarea className="admin-textarea" value={editingAchievement.desc} onChange={(e) => setEditingAchievement({ ...editingAchievement, desc: e.target.value })} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Focus Areas / learnings (Tags)</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="text" className="admin-input" value={achievementLearningsInput} onChange={(e) => setAchievementLearningsInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addAchievementLearningTag(true); } }} placeholder="Add tag..." />
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addAchievementLearningTag(true)}>Add</button>
                      </div>
                      <div className="admin-tag-container">
                        {editingAchievement.learnings?.map(t => <span key={t} className="admin-tag">{t} <i className="fa-solid fa-xmark admin-tag-remove" onClick={() => removeAchievementLearningTag(t, true)}></i></span>)}
                      </div>
                    </div>
                     {editingAchievement.files && editingAchievement.files.length > 0 && (
                      <div className="admin-form-group">
                        <label className="admin-label">Existing Documents / Proofs</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                          {editingAchievement.files.map((fileUrl, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(204, 164, 59, 0.05)', padding: '6px 12px', border: '1px solid rgba(204, 164, 59, 0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)', fontWeight: '600' }}>View Certificate {idx + 1}</a>
                              <button type="button" onClick={() => removeExistingUploadedFile(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="admin-form-group">
                      <label className="admin-label">Add More Documents / Proofs</label>
                      <div className="admin-upload-zone" style={{ cursor: 'pointer' }}>
                        <input type="file" accept="image/*,.pdf" multiple style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(e) => handleAchievementFilesSelect(e.target.files)} />
                        <i className="fa-solid fa-plus admin-upload-icon"></i>
                        <div className="admin-upload-text">
                          {achievementFilesList.length > 0 ? `${achievementFilesList.length} files selected` : "Select files/images"}
                        </div>
                      </div>
                      {achievementFilesList.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                          {achievementFilesList.map((file, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(27, 67, 50, 0.05)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <span>{file.name}</span>
                              <button type="button" onClick={() => removeSelectedFileBeforeUpload(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>Save Changes</button>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Symposiums & Hackathons</h3>
                  {!showAddAchievement && !editingAchievement && (
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowAddAchievement(true)}><i className="fa-solid fa-plus"></i> Add Achievement</button>
                  )}
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead><tr><th>Date</th><th>Event Title</th><th>Award</th><th>Location</th><th>Actions</th></tr></thead>
                    <tbody>
                      {achievements.map(ach => (
                        <tr key={ach.id}>
                          <td>{ach.date}</td>
                          <td><strong>{ach.title}</strong></td>
                          <td><span className="project-category-tag">{ach.achievement}</span></td>
                          <td>{ach.location}</td>
                          <td>
                            <div className="admin-actions-cell">
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingAchievement(ach)}><i className="fa-solid fa-pen"></i> Edit</button>
                              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDeleteAchievement(ach.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              6. ADMIN SECURITY & PASSWORD MANAGEMENT TAB
              ---------------------------------------------------- */}
          {activeTab === 'security' && (
            <div style={{ maxWidth: '640px' }}>
              <div className="admin-card">
                <div className="admin-card-header" style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.35rem'
                    }}>
                      <i className="fa-solid fa-shield-halved"></i>
                    </div>
                    <div>
                      <h3 className="admin-card-title" style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Edit Admin Password</h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                        Update your administrator credentials. Changes are cryptographically hashed and saved on the server.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-label">Current Password</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      className="admin-input"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                      required
                      disabled={passwordLoading}
                    />
                  </div>

                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-label">New Password</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      className="admin-input"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                  </div>

                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-label">Confirm New Password</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      className="admin-input"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter your new password"
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                  </div>

                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer', userSelect: 'none' }} 
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    <input
                      type="checkbox"
                      id="showPass"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="showPass" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                      Show Passwords
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      type="submit"
                      className="admin-btn admin-btn-primary"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Updating Password...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-key"></i> Update Password
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                      disabled={passwordLoading}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
