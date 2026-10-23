import React, { useState, useEffect, useRef } from 'react';
import profileImg from './assets/profile.jpg';
import { portfolioService } from './services/portfolio';
import {
  STATIC_ABOUT,
  STATIC_SKILL_CATEGORIES,
  STATIC_PROJECTS,
  STATIC_EXPERIENCE,
  STATIC_CERTIFICATIONS,
  STATIC_ACHIEVEMENTS,
  STATIC_ACADEMIC
} from './services/staticData';

function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollHeader, setScrollHeader] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [projectFilter, setProjectFilter] = useState('all');
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('portfolio-theme', 'light');
  }, []);

  // Portfolio States initialized from static source of truth
  const [skills, setSkills] = useState(STATIC_SKILL_CATEGORIES);
  const [projects, setProjects] = useState(STATIC_PROJECTS);
  const [experience, setExperience] = useState(STATIC_EXPERIENCE);
  const [certifications, setCertifications] = useState(STATIC_CERTIFICATIONS);
  const [achievements, setAchievements] = useState(STATIC_ACHIEVEMENTS);
  const [academic] = useState(STATIC_ACADEMIC);
  const [about, setAbout] = useState(STATIC_ABOUT);

  const cursorRef = useRef(null);

  /* ----------------------------------------------------------------------
     EFFECT: Fetch dynamic data from Portfolio Service
     ---------------------------------------------------------------------- */
  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        const aboutData = await portfolioService.fetchAbout();
        if (aboutData) {
          setAbout(prev => ({
            ...prev,
            ...aboutData,
            profileImageUrl: aboutData.profileImageUrl || prev.profileImageUrl,
            resumeUrl: aboutData.resumeUrl || prev.resumeUrl
          }));
        }

        const projectsList = await portfolioService.fetchProjects();
        if (projectsList && projectsList.length > 0) {
          setProjects(projectsList);
        }

        const certsList = await portfolioService.fetchCertifications();
        if (certsList && certsList.length > 0) {
          setCertifications(certsList);
        }

        const skillsList = await portfolioService.fetchSkills();
        if (skillsList && skillsList.length > 0) {
          setSkills(skillsList);
        }

        const achsList = await portfolioService.fetchAchievements();
        if (achsList && achsList.length > 0) {
          setAchievements(achsList);
        }

        const expList = await portfolioService.fetchExperience();
        if (expList && expList.length > 0) {
          setExperience(expList);
        }
      } catch (error) {
        console.error("Error fetching data inside portfolio page:", error);
      }
    };

    fetchPortfolioData();
  }, []);

  /* ----------------------------------------------------------------------
     EFFECT: Custom Mouse Follower Glow
     ---------------------------------------------------------------------- */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorRef.current) {
        window.requestAnimationFrame(() => {
          cursorRef.current.style.left = `${e.clientX}px`;
          cursorRef.current.style.top = `${e.clientY}px`;
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ----------------------------------------------------------------------
     EFFECT: Scroll listeners (Header scroll & Back-to-top)
     ---------------------------------------------------------------------- */
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY >= 80) {
        setScrollHeader(true);
      } else {
        setScrollHeader(false);
      }

      if (window.scrollY >= 560) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ----------------------------------------------------------------------
     EFFECT: Active Link Scroll Spy
     ---------------------------------------------------------------------- */
  useEffect(() => {
    const handleScrollSpy = () => {
      const scrollY = window.scrollY;
      const sections = document.querySelectorAll('section[id]');

      sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 120;
        const sectionId = current.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          setActiveSection(sectionId);
        }
      });
    };

    window.addEventListener('scroll', handleScrollSpy);
    return () => window.removeEventListener('scroll', handleScrollSpy);
  }, []);

  /* ----------------------------------------------------------------------
     EFFECT: Scroll Reveal Intersection Observer
     ---------------------------------------------------------------------- */
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
            observer.unobserve(entry.target);
          }
        });
      };

      const observer = new IntersectionObserver(observerCallback, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      });

      revealElements.forEach(element => observer.observe(element));
      return () => observer.disconnect();
    } else {
      revealElements.forEach(element => element.classList.add('reveal-active'));
    }
  }, [projectFilter, projects]);

  /* ----------------------------------------------------------------------
     FILTER: Projects List
     ---------------------------------------------------------------------- */
  const filteredProjects = projects.filter(project => {
    if (projectFilter === 'all') return true;
    const cat = (project.category || '').toLowerCase();
    if (projectFilter === 'iam') return cat.includes('identity') || cat.includes('access') || cat.includes('iam');
    if (projectFilter === 'vuln') return cat.includes('vulnerability') || cat.includes('scanner') || cat.includes('defensive');
    if (projectFilter === 'ml') return cat.includes('ml') || cat.includes('machine') || cat.includes('analysis');
    return true;
  });

  return (
    <div className="grid-mesh">
      {/* Custom Interactive Follow Cursor */}
      <div ref={cursorRef} className="cursor-glow"></div>

      {/* Navigation Header */}
      <header className={`header ${scrollHeader ? 'scroll-header' : ''}`} id="header">
        <nav className="nav container">
          <a href="#" className="nav-logo">
            Gokulakannan P
          </a>
          
          <div className={`nav-menu ${menuOpen ? 'show-menu' : ''}`} id="nav-menu">
            <ul className="nav-list">
              <li className="nav-item">
                <a 
                  href="#home" 
                  className={`nav-link ${activeSection === 'home' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#about" 
                  className={`nav-link ${activeSection === 'about' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  About
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#skills" 
                  className={`nav-link ${activeSection === 'skills' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Skills
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#experience" 
                  className={`nav-link ${activeSection === 'experience' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Experience
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#projects" 
                  className={`nav-link ${activeSection === 'projects' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Projects
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#academic" 
                  className={`nav-link ${activeSection === 'academic' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Education
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#certifications" 
                  className={`nav-link ${activeSection === 'certifications' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Certifications
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#achievements" 
                  className={`nav-link ${activeSection === 'achievements' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Achievements
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#contact" 
                  className={`nav-link ${activeSection === 'contact' ? 'active-link' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Contact
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="/admin" 
                  className="nav-link nav-admin-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <i className="fa-solid fa-lock" style={{ marginRight: '0.35rem' }}></i>Admin
                </a>
              </li>
            </ul>
          </div>

          <div className="nav-actions">
            <button 
              className="nav-toggle-btn" 
              id="nav-toggle" 
              aria-label="Toggle Menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </nav>
      </header>

      <main className="main">
        {/* ==================================================================
            2. HERO SECTION
            ================================================================== */}
        <section className="home" id="home">
          <div className="home-container container grid">
            <div className="home-content reveal">
              <h1 className="home-title">Gokulakannan P</h1>
              <h2 className="home-subtitle">{about.title || 'Aspiring SOC Analyst | Python Developer | Frontend Developer | Cybersecurity & Networking Enthusiast'}</h2>
              <p className="home-tagline">
                {about.tagline || 'Learning SIEM, Threat Detection & Incident Response'}
              </p>

              {/* Two Clean Primary Hero Action Buttons */}
              <div className="home-buttons">
                <a href="#projects" className="btn btn-primary">
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.5rem' }}></i>
                  View My Projects
                </a>
                <a 
                  href={about.resumeUrl || '/assets/resume.pdf'} 
                  download="Gokulakannan_P_Resume.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-secondary"
                >
                  <i className="fa-solid fa-file-arrow-down" style={{ marginRight: '0.5rem' }}></i>
                  Download Resume
                </a>
              </div>

              {/* Stats Grid */}
              <div className="home-stats">
                <div className="stat-item" style={{ '--reveal-delay': '100ms' }}>
                  <div className="stat-icon-wrapper p-icon">
                    <i className="fa-solid fa-shield-virus"></i>
                  </div>
                  <span className="stat-num">{projects.length}+</span>
                  <span className="stat-lbl">SECURITY PROJECTS</span>
                </div>
                <div className="stat-item" style={{ '--reveal-delay': '200ms' }}>
                  <div className="stat-icon-wrapper c-icon">
                    <i className="fa-solid fa-award"></i>
                  </div>
                  <span className="stat-num">{certifications.length}+</span>
                  <span className="stat-lbl">CERTIFICATIONS & TRAINING</span>
                </div>
                <div className="stat-item" style={{ '--reveal-delay': '300ms' }}>
                  <div className="stat-icon-wrapper s-icon">
                    <i className="fa-solid fa-brain"></i>
                  </div>
                  <span className="stat-num">
                    {skills.reduce((acc, cat) => acc + (cat.skills?.length || 0), 0)}+
                  </span>
                  <span className="stat-lbl">PRACTICAL SKILLS</span>
                </div>
              </div>
            </div>

            {/* Clean Hero Visual with Portrait */}
            <div className="home-visual reveal">
              <div 
                className={`avatar-frame ${isAvatarHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setIsAvatarHovered(true)}
                onMouseLeave={() => setIsAvatarHovered(false)}
              >
                <div className="avatar-orbit-border"></div>

                <img 
                  src={about.profileImageUrl || profileImg} 
                  alt="Gokulakannan P - Aspiring SOC Analyst Portrait" 
                  className="avatar-img" 
                />
              </div>
            </div>
          </div>
        </section>


        {/* ==================================================================
            3. ABOUT ME SECTION
            ================================================================== */}
        <section className="about section" id="about">
          <div className="container">
            <h2 className="section-title reveal">About Me</h2>
            <span className="section-subtitle reveal">Building Practical Skills in Security Operations & Threat Detection</span>

            {/* Separate Prominent Career Objective */}
            <div className="objective-banner reveal">
              <div className="objective-banner-header">
                <div className="objective-icon-badge">
                  <i className="fa-solid fa-bullseye"></i>
                </div>
                <h3 className="objective-banner-title">{about.cardObjectiveTitle || 'Career Objective'}</h3>
              </div>
              <p className="objective-banner-text">
                {about.cardObjectiveDesc || 'Seeking an entry-level SOC Analyst or Cybersecurity Internship opportunity where I can apply my foundational knowledge, strengthen my investigation skills, and gain practical experience in security operations.'}
              </p>
            </div>
            
            <div className="about-container grid reveal">
              {/* Left Column: Exact Profile Content */}
              <div className="about-info">
                <h3 className="about-heading">Professional Profile</h3>
                <p className="about-text">
                  I am a <span className="highlight-gold">Cyber Security undergraduate</span> at Erode Sengunthar Engineering College with a strong interest in <span className="highlight-gold">Security Operations Center (SOC) operations</span>, network security, threat detection, and incident response.
                </p>
                <p className="about-text">
                  I am building my cybersecurity knowledge through structured learning, networking fundamentals, security tools, hands-on exercises, and security-focused projects.
                </p>
                <p className="about-text">
                  I have gained exposure to cybersecurity through an internship at <span className="highlight-gold">Codec Technologies Pvt. Ltd.</span> and a Cybersecurity Analyst Job Simulation by <span className="highlight-gold">Tata Consultancy Services (TCS)</span>, where I explored Identity and Access Management (IAM).
                </p>
                <p className="about-text">
                  My goal is to develop practical SOC Analyst skills and contribute to identifying, investigating, and responding to security threats.
                </p>
              </div>

              {/* Right Column: 4 Clean Foundational Cards */}
              <div className="about-cards-grid">
                {/* Card 1: SOC & Monitoring Focus */}
                <div className="about-card reveal" style={{ '--reveal-delay': '100ms' }}>
                  <div className="about-card-icon-wrapper">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <h4 className="about-card-title">{about.cardSocTitle || 'SOC & Monitoring Focus'}</h4>
                  <p className="about-card-desc">
                    {about.cardSocDesc || 'Focusing on security monitoring concepts, alert analysis fundamentals, threat triage, and incident response procedures through structured defensive scenarios.'}
                  </p>
                </div>

                {/* Card 2: Networking & Protocols */}
                <div className="about-card reveal" style={{ '--reveal-delay': '200ms' }}>
                  <div className="about-card-icon-wrapper">
                    <i className="fa-solid fa-network-wired"></i>
                  </div>
                  <h4 className="about-card-title">{about.cardNetworkTitle || 'Networking & Protocols'}</h4>
                  <p className="about-card-desc">
                    {about.cardNetworkDesc || 'Building strong foundations in TCP/IP, DNS, HTTP/HTTPS, IP addressing, and network ports to inspect packets and identify anomalies.'}
                  </p>
                </div>

                {/* Card 3: IAM & Security Controls */}
                <div className="about-card reveal" style={{ '--reveal-delay': '300ms' }}>
                  <div className="about-card-icon-wrapper">
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <h4 className="about-card-title">{about.cardIamTitle || 'IAM & Security Controls'}</h4>
                  <p className="about-card-desc">
                    {about.cardIamDesc || 'Practical exploration of Identity & Access Management (IAM) fundamentals, strategy assessment, and authentication safeguards including 2FA, session security, and hashing.'}
                  </p>
                </div>

                {/* Card 4: Hands-On Practice */}
                <div className="about-card reveal" style={{ '--reveal-delay': '400ms' }}>
                  <div className="about-card-icon-wrapper">
                    <i className="fa-solid fa-terminal"></i>
                  </div>
                  <h4 className="about-card-title">Hands-On Practice</h4>
                  <p className="about-card-desc">
                    Actively inspecting traffic in Wireshark, enumerating network services with Nmap, navigating Linux systems, and developing secure Python scripts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ==================================================================
            4. TECHNICAL SKILLS SECTION
            ================================================================== */}
        <section className="skills section" id="skills">
          <div className="container">
            <h2 className="section-title reveal">Technical Skills</h2>
            <span className="section-subtitle reveal">Core competencies, security tools, and technical foundations</span>

            <div className="skills-grid grid">
              {skills.map((category, index) => (
                <div 
                  key={category.id || index} 
                  className="skills-category-card glass-panel reveal"
                  style={{ '--reveal-delay': `${index * 80}ms` }}
                >
                  <div className="category-header">
                    <div className="category-icon-wrapper">
                      <i className={`fa-solid ${category.icon || 'fa-code'}`}></i>
                    </div>
                    <h3 className="category-title">{category.title}</h3>
                  </div>
                  <div className="skills-pills-list">
                    {category.skills?.map((skill, idx) => (
                      <span key={idx} className="skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            INTERNSHIP & PRACTICAL EXPERIENCE SECTION
            ================================================================== */}
        <section className="experience section" id="experience">
          <div className="container">
            <h2 className="section-title reveal">Internship & Practical Experience</h2>
            <span className="section-subtitle reveal">Hands-on industry exposure and simulated security operations</span>

            <div className="experience-grid grid">
              {experience.map((exp, index) => (
                <div 
                  key={exp.id || index} 
                  className="experience-card glass-panel reveal"
                  style={{ '--reveal-delay': `${index * 120}ms` }}
                >
                  <div>
                    <div className="experience-header">
                      <div>
                        <h3 className="experience-role-title">{exp.role}</h3>
                        <span className="experience-org">
                          <i className={`fa-solid ${exp.icon || 'fa-shield-halved'}`}></i>
                          {exp.organization}
                        </span>
                      </div>
                      <span className="experience-period-badge">
                        <i className="fa-regular fa-calendar"></i> {exp.period}
                      </span>
                    </div>

                    <div className="experience-points-list">
                      {exp.points?.map((pt, idx) => (
                        <div key={idx} className="experience-point-item">
                          <i className="fa-solid fa-circle-check"></i>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {exp.certificates && exp.certificates.length > 0 && (
                    <div className="experience-certificates">
                      {exp.certificates.map((cert, cIdx) => (
                        <a 
                          key={cIdx}
                          href={cert.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary btn-sm"
                        >
                          <i className="fa-solid fa-certificate"></i> {cert.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            FEATURED PROJECTS SECTION
            ================================================================== */}
        <section className="projects section" id="projects">
          <div className="container">
            <h2 className="section-title reveal">Featured Projects</h2>
            <span className="section-subtitle reveal">Practical applications, security tools, and authentication systems</span>

            {/* Filter buttons */}
            <div className="projects-filters reveal">
              <button 
                className={`filter-btn ${projectFilter === 'all' ? 'active-filter' : ''}`}
                onClick={() => setProjectFilter('all')}
              >
                All Work
              </button>
              <button 
                className={`filter-btn ${projectFilter === 'iam' ? 'active-filter' : ''}`}
                onClick={() => setProjectFilter('iam')}
              >
                Identity & Access Management
              </button>
              <button 
                className={`filter-btn ${projectFilter === 'vuln' ? 'active-filter' : ''}`}
                onClick={() => setProjectFilter('vuln')}
              >
                Vulnerability Assessment
              </button>
              <button 
                className={`filter-btn ${projectFilter === 'ml' ? 'active-filter' : ''}`}
                onClick={() => setProjectFilter('ml')}
              >
                Threat Analysis
              </button>
            </div>

            <div className="projects-grid grid">
              {filteredProjects.map((project, index) => (
                <div 
                  key={project.id || index} 
                  className="project-card glass-panel reveal"
                  style={{ '--reveal-delay': `${index * 80}ms` }}
                >
                  <div>
                    {project.imageUrl && (
                      <div className="project-img-wrapper" style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', height: '180px' }}>
                        <img src={project.imageUrl} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <span className="project-category-tag">{project.category}</span>
                    <div className="project-details">
                      <h3 className="project-title">{project.title}</h3>
                      <p className="project-description">{project.desc}</p>
                      <div className="project-tech">
                        {project.tech?.map((t, idx) => (
                          <span key={idx} className="tech-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="project-actions">
                    {project.github && (
                      <a href={project.github} target="_blank" rel="noopener noreferrer" className="project-action-link">
                        <i className="fa-brands fa-github"></i> GitHub
                      </a>
                    )}
                    {project.live && (
                      <a href={project.live} target="_blank" rel="noopener noreferrer" className="project-action-link">
                        <i className="fa-solid fa-circle-play"></i> Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            ACADEMIC BACKGROUND (EDUCATION) SECTION
            ================================================================== */}
        <section className="academic section" id="academic">
          <div className="container">
            <h2 className="section-title reveal">Academic Background</h2>
            <span className="section-subtitle reveal">Formal education and undergraduate pathway</span>

            <div className="timeline-container">
              {academic.map((edu, index) => (
                <div key={edu.id || index} className="timeline-item reveal" style={{ '--reveal-delay': `${index * 150}ms` }}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-date-container">
                    <span className="timeline-date-pill">{edu.date}</span>
                  </div>
                  <div className="timeline-card glass-panel">
                    <div className="timeline-card-header">
                      <div className="timeline-icon-badge">
                        <i className={`fa-solid ${edu.icon || 'fa-graduation-cap'}`}></i>
                      </div>
                      <div>
                        <h3 className="timeline-degree">{edu.degree}</h3>
                        <span className="timeline-specialization">{edu.specialization}</span>
                        {edu.cgpa && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <span className="badge-completed" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                              CGPA: {edu.cgpa}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="timeline-institution">
                      <i className="fa-solid fa-school timeline-inst-icon"></i> {edu.institution}
                    </span>
                    <ul className="timeline-details-list">
                      {edu.details?.map((detail, idx) => (
                        <li key={idx} className="timeline-detail-item">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            CERTIFICATIONS & TRAINING SECTION
            ================================================================== */}
        <section className="certifications section" id="certifications">
          <div className="container">
            <h2 className="section-title reveal">Certifications & Training</h2>
            <span className="section-subtitle reveal">Verified credentials, courses, and job simulation milestones</span>

            <div className="certifications-grid grid">
              {certifications.map((cert, index) => (
                <div 
                  key={cert.id || index} 
                  className="cert-card glass-panel reveal"
                  style={{ '--reveal-delay': `${index * 100}ms` }}
                >
                  <div className="cert-header">
                    <span className={`cert-badge ${cert.completed ? 'badge-completed' : 'badge-progress'}`}>
                      {cert.status}
                    </span>
                    {cert.date && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {cert.date}
                      </span>
                    )}
                  </div>
                  <div className="cert-content">
                    <h3 className="cert-title">{cert.title}</h3>
                    <p className="cert-platform">{cert.platform}</p>
                    <p className="cert-description">{cert.desc}</p>
                    {cert.completed && cert.link ? (
                      <a 
                        href={cert.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="cert-btn btn-secondary"
                      >
                        <i className="fa-solid fa-certificate"></i> View Certificate
                      </a>
                    ) : cert.completed ? (
                      <a href="#" className="cert-btn btn-secondary disabled" onClick={(e) => e.preventDefault()}>
                        <i className="fa-solid fa-certificate"></i> Verified Milestone
                      </a>
                    ) : (
                      <a href="#" className="cert-btn btn-secondary disabled" onClick={(e) => e.preventDefault()}>
                        <i className="fa-solid fa-spinner fa-spin"></i> Ongoing Study
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            ACHIEVEMENTS & HACKATHONS SECTION
            ================================================================== */}
        <section className="achievements section" id="achievements">
          <div className="container">
            <h2 className="section-title reveal">Achievements & Hackathons</h2>
            <span className="section-subtitle reveal">Practical competitions, quiz podiums, and problem solving</span>

            <div className="achievements-grid grid">
              {achievements.map((item, index) => (
                <div 
                  key={item.id || index} 
                  className="achievement-card glass-panel reveal"
                  style={{ '--reveal-delay': `${index * 120}ms` }}
                >
                  <div className="achievement-header">
                    <span className="achievement-date-tag">{item.date}</span>
                    <i className="fa-solid fa-trophy achievement-trophy-icon"></i>
                  </div>
                  <div className="achievement-body">
                    <h3 className="achievement-title">{item.title}</h3>
                    <span className="achievement-location">
                      <i className="fa-solid fa-map-pin"></i> {item.location}
                    </span>
                    <div className="achievement-badge">
                      <span className="achievement-badge-text">{item.achievement}</span>
                    </div>
                    <p className="achievement-desc">{item.desc}</p>

                    {item.link && (
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.25rem', marginBottom: '1rem', alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        <i className="fa-solid fa-certificate"></i> View Certificate
                      </a>
                    )}

                    {item.certificates && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
                        {item.certificates.map((cItem, idx) => (
                          <a 
                            key={idx}
                            href={cItem.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary btn-sm"
                            style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                          >
                            <i className="fa-solid fa-certificate"></i> {cItem.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {item.files && item.files.length > 0 && (
                      <div className="achievement-files-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '0.25rem', marginBottom: '1rem' }}>
                        {item.files.map((fileUrl, idx) => (
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            key={idx} 
                            className="btn btn-secondary btn-sm"
                            style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                          >
                            <i className="fa-solid fa-certificate"></i> View Certificate {item.files.length > 1 ? (idx + 1) : ''}
                          </a>
                        ))}
                      </div>
                    )}

                    {item.learnings && item.learnings.length > 0 && (
                      <div className="achievement-learnings-section">
                        <span className="learnings-label">Key Focus Areas:</span>
                        <ul className="achievement-learnings-list">
                          {item.learnings.map((learn, idx) => (
                            <li key={idx} className="achievement-learning-item">
                              <i className="fa-solid fa-check-circle check-icon"></i> {learn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ==================================================================
            RESUME DOWNLOAD SECTION
            ================================================================== */}
        <section className="resume section" id="resume">
          <div className="container">
            <div className="resume-wrapper glass-panel reveal" style={{ '--reveal-delay': '100ms' }}>
              <div className="resume-icon-block">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <div className="resume-content-block">
                <h2 className="resume-title">Curriculum Vitae</h2>
                <p className="resume-description">
                  Looking for an entry-level SOC Analyst or Cybersecurity Intern? Download my comprehensive resume detailing my security monitoring fundamentals, IAM simulation training, networking knowledge, and hands-on projects.
                </p>
                <a 
                  href={about.resumeUrl || '/assets/resume.pdf'} 
                  download="Gokulakannan_P_Resume.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                >
                  <i className="fa-solid fa-file-arrow-down" style={{ marginRight: '0.5rem' }}></i>
                  Download Resume
                </a>
              </div>
            </div>
          </div>
        </section>


        {/* ==================================================================
            CONTACT SECTION
            ================================================================== */}
        <section className="contact section" id="contact">
          <div className="container">
            <h2 className="section-title reveal">Let's Connect</h2>
            <span className="section-subtitle reveal">Available for SOC Analyst internships, entry-level opportunities, and discussions</span>

            <div className="contact-grid grid">
              <div className="contact-channels glass-panel reveal" style={{ '--reveal-delay': '100ms' }}>
                <h3 className="contact-channels-title">Network Channels</h3>
                <p className="contact-channels-text">
                  I am actively seeking entry-level SOC Analyst roles and cybersecurity internship opportunities. Please feel free to reach out via email, phone, or LinkedIn.
                </p>
                
                <div className="channel-list">
                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-solid fa-envelope"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">Email</span>
                      <a href={`mailto:${about.email || 'gokulakannan.cyber@gmail.com'}`} className="channel-value">
                        {about.email || 'gokulakannan.cyber@gmail.com'}
                      </a>
                    </div>
                  </div>

                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-solid fa-phone"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">Phone</span>
                      <a href={`tel:${(about.phone || '+917358889119').replace(/\s+/g, '')}`} className="channel-value">
                        {about.phone || '+91 73588 89119'}
                      </a>
                    </div>
                  </div>

                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-brands fa-linkedin-in"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">LinkedIn</span>
                      <a 
                        href="https://www.linkedin.com/in/gokulakannan-p-a8b3b8397" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="channel-value"
                      >
                        linkedin.com/in/gokulakannan-p-a8b3b8397
                      </a>
                    </div>
                  </div>

                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-brands fa-github"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">GitHub</span>
                      <a 
                        href="https://github.com/G0KULAKANNAN" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="channel-value"
                      >
                        github.com/G0KULAKANNAN
                      </a>
                    </div>
                  </div>

                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-solid fa-fire"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">TryHackMe</span>
                      <a 
                        href="https://tryhackme.com/p/gokulakannan.cyber" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="channel-value"
                      >
                        tryhackme.com/p/gokulakannan.cyber
                      </a>
                    </div>
                  </div>

                  <div className="channel-item">
                    <div className="channel-icon"><i className="fa-solid fa-location-dot"></i></div>
                    <div className="channel-info">
                      <span className="channel-label">Location</span>
                      <span className="channel-value">
                        {about.location || 'Erode, Tamil Nadu, India'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container container">
          <h3 className="footer-logo">Gokulakannan P</h3>
          <p className="footer-description">Aspiring SOC Analyst • Learning Security Monitoring, Threat Detection & Incident Response</p>
          
          <ul className="footer-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#skills">Skills</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#academic">Education</a></li>
            <li><a href="#certifications">Certifications</a></li>
            <li><a href="#achievements">Achievements</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="/admin"><i className="fa-solid fa-lock" style={{ marginRight: '0.25rem', fontSize: '0.8rem' }}></i>Admin Portal</a></li>
          </ul>

          <div className="footer-socials">
            <a href="https://github.com/G0KULAKANNAN" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i className="fa-brands fa-github"></i></a>
            <a href="https://www.linkedin.com/in/gokulakannan-p-a8b3b8397" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
            <a href="https://tryhackme.com/p/gokulakannan.cyber" target="_blank" rel="noopener noreferrer" aria-label="TryHackMe"><i className="fa-solid fa-fire"></i></a>
            <a href={`mailto:${about.email || 'gokulakannan.cyber@gmail.com'}`} aria-label="Email"><i className="fa-solid fa-envelope"></i></a>
          </div>

          <span className="footer-copy">
            &copy; 2026 Gokulakannan P. All rights reserved. Professional SOC Analyst Portfolio.
          </span>
        </div>
      </footer>

      {/* Back to top button */}
      <a 
        href="#" 
        className={`back-to-top ${showScrollTop ? 'show-scroll' : ''}`} 
        id="back-to-top" 
        aria-label="Back to top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <i className="fa-solid fa-arrow-up"></i>
      </a>
    </div>
  );
}

export default Portfolio;
