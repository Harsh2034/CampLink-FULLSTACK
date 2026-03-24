document.addEventListener('DOMContentLoaded', () => {
    
    const API_BASE = 'http://localhost:3000/api';

    // =================================================================
    // STATE MANAGEMENT (Modified to remove local data arrays)
    // =================================================================
    let currentUser = null;
    let currentMarketplaceTab = 'projects';
    let currentAdminTab = 'projects';
    let currentActivityTab = 'projects';
    let viewHistory = ['landing'];
    let isEditingProfile = false;
    let activeListing = { id: null, type: null };

    // =================================================================
    // ELEMENT SELECTORS (Same as original)
    // =================================================================
    const views = Object.fromEntries(Array.from(document.querySelectorAll('.view')).map(el => [el.id.replace('-view', ''), el]));
    const authNav = document.getElementById('auth-nav-buttons');
    const appNav = document.getElementById('app-nav-buttons');
    const notificationEl = document.getElementById('notification');
    const proposalModal = document.getElementById('proposal-modal');
    const postModal = document.getElementById('post-modal');
    const contactModal = document.getElementById('contact-modal');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    // =================================================================
    // HELPER: API FETCHER
    // =================================================================
    async function fetchData(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`);
            return await res.json();
        } catch (error) {
            console.error("API Error:", error);
            return [];
        }
    }

    async function getUser(id) {
        return await fetchData(`/users/${id}`);
    }

    // =================================================================
    // THEME LOGIC (Kept exactly same)
    // =================================================================
    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.remove('light-theme');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    };
    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };
    themeToggleButton.addEventListener('click', toggleTheme);

    // =================================================================
    // CORE APP FUNCTIONS
    // =================================================================

    const showView = async (viewName, isGoingBack = false) => {
        if (!isGoingBack && viewHistory[viewHistory.length - 1] !== viewName) {
            viewHistory.push(viewName);
        }
        Object.values(views).forEach(v => v.classList.remove('active'));
        if (views[viewName]) views[viewName].classList.add('active');
        window.scrollTo(0, 0);

        // TRIGGER RENDERS BASED ON VIEW
        if (viewName === 'marketplace') await renderMarketplace();
        else if (viewName === 'activity' && currentUser) await renderMyActivity();
        else if (viewName === 'profile' && currentUser) {
            isEditingProfile = false;
            await renderProfile(currentUser.id);
        } else if (viewName === 'admin-dashboard') await renderAdminDashboard();
    };

    const goBack = () => {
        if (viewHistory.length > 1) {
            viewHistory.pop();
            const previousView = viewHistory[viewHistory.length - 1];
            showView(previousView, true);
        }
    };

    const showNotification = (message) => {
        notificationEl.textContent = message;
        notificationEl.classList.add('show');
        setTimeout(() => notificationEl.classList.remove('show'), 3000);
    };

    const login = async (email, password) => {
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                currentUser = await res.json();
                authNav.style.display = 'none';
                appNav.style.display = 'flex';
                if (currentUser.isAdmin) {
                    appNav.innerHTML = `<button class="btn" data-view-target="admin-dashboard">Dashboard</button><button id="logout-btn" class="btn btn-outline">Logout</button>`;
                    showView('admin-dashboard');
                } else {
                    appNav.innerHTML = `<button class="btn" data-view-target="marketplace">Marketplace</button><button class="btn" data-view-target="activity">My Activity</button><button class="btn" data-view-target="profile">My Profile</button><button id="logout-btn" class="btn btn-outline">Logout</button>`;
                    showView('marketplace');
                }
                document.getElementById('logout-btn').addEventListener('click', logout);
            } else {
                showNotification("Invalid Login Credentials");
            }
        } catch (e) { console.error(e); showNotification("Server Error"); }
    };

    const logout = () => {
        currentUser = null;
        authNav.style.display = 'flex';
        appNav.style.display = 'none';
        viewHistory = ['landing'];
        showView('landing');
    };

    // =================================================================
    // RENDER FUNCTIONS (Now using Async/Await & Fetch)
    // =================================================================

    const renderMarketplace = async () => {
        const container = views.marketplace.querySelector('#listings-container');
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        
        // Fetch from API instead of local variable
        let data = await fetchData(`/${currentMarketplaceTab}`); 
        // Filter out 'Hired' projects if looking at projects
        if (currentMarketplaceTab === 'projects') data = data.filter(p => p.status === 'Open');

        if (searchTerm) {
            data = data.filter(item => item.title.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm) || item.category.toLowerCase().includes(searchTerm));
        }

        // We need to fetch user names for "Posted By"
        // Optimization: Fetch all users once or fetch individually? For MVP, we'll fetch individually or rely on ID.
        // Better: Let's fetch the specific user for the card.
        
        container.innerHTML = '';
        
        for (const item of data) {
            const poster = await getUser(item.postedBy);
            const isProject = currentMarketplaceTab === 'projects';
            const isOwn = currentUser && item.postedBy === currentUser.id;
            
            let actionButton = '';
            if (!isOwn) {
                if (isProject) actionButton = `<span class="status-badge status-open">${item.status}</span>`;
                else actionButton = `<button class="btn btn-outline text-xs contact-btn" data-type="service" data-id="${item.id}">Contact</button>`;
            } else {
                actionButton = `<span>Posted by you</span>`;
            }

            const html = `
                <div class="card listing-card" data-item-id="${item.id}" data-type="${currentMarketplaceTab}">
                    <div class="card-content">
                        <p class="text-sm listing-category">${item.category}</p>
                        <h3 class="card-title mt-2">${item.title}</h3>
                        <span class="listing-posted-by">Posted by ${isOwn ? 'you' : poster.name}</span>
                        <p class="text-sm text-slate-300 mt-2">${item.description.substring(0, 100)}...</p>
                        <div class="card-skills-container">${(item.skills || []).map(skill => `<span class="skill-tag-sm">${skill}</span>`).join('')}</div>
                    </div>
                    <div class="card-content border-t border-slate-800 flex-between">
                        <p class="listing-price">₹${item.budget.toLocaleString()} <span>${isProject ? 'Budget' : 'Price'}</span></p>
                        ${actionButton}
                    </div>
                </div>`;
            container.innerHTML += html;
        }
    };

    const renderProjectDetail = async (projectId) => {
        const projects = await fetchData('/projects');
        const project = projects.find(p => p.id == projectId);
        if(!project) return;

        const client = await getUser(project.postedBy);
        const content = views['project-detail'].querySelector('#project-detail-content');
        const postedByText = currentUser && project.postedBy === currentUser.id ? 'Posted by you' : `Posted by <a href="#" class="link view-profile-link" data-user-id="${client.id}">${client.name}</a>`;
        
        content.innerHTML = `<div class="page-header"><button class="btn btn-outline back-btn">← Back</button><div><p class="text-sm text-sky-400">${project.category}</p><h2 class="section-title mt-2">${project.title}</h2><p class="text-sm text-slate-400 mt-2">${postedByText}</p></div><span class="status-badge ${project.status === 'Open' ? 'status-open' : 'status-hired'}">${project.status}</span></div><div class="card"><div class="card-content"><h3 class="font-semibold mb-2">Project Description</h3><p class="text-slate-300">${project.description}</p><h3 class="font-semibold mt-4 mb-2">Skills Required</h3><div class="card-skills-container">${(project.skills || []).map(skill => `<span class="skill-tag-sm">${skill}</span>`).join('')}</div><h3 class="font-semibold mt-4 mb-2">Budget</h3><p class="listing-price">₹${project.budget.toLocaleString()}</p></div></div><div class="mt-8" id="project-detail-actions"></div>`;
        
        const actionsContainer = content.querySelector('#project-detail-actions');
        if (currentUser && !currentUser.isAdmin && project.postedBy !== currentUser.id && project.status === 'Open') {
            actionsContainer.innerHTML = `<button class="btn btn-solid" id="apply-now-btn" data-project-id="${project.id}" data-type="project">Apply Now</button>`;
        }
    };

    const renderMyActivity = async () => {
        const projects = await fetchData('/projects');
        const services = await fetchData('/services');
        const proposals = await fetchData('/proposals');

        const myProjectsContainer = views.activity.querySelector('#my-projects-section');
        const myPostedProjects = projects.filter(p => p.postedBy === currentUser.id);
        
        // Count proposals for my projects
        myProjectsContainer.innerHTML = '';
        if (myPostedProjects.length > 0) {
            for(const p of myPostedProjects) {
                const propsCount = proposals.filter(prop => prop.projectId == p.id).length;
                myProjectsContainer.innerHTML += `<div class="card mb-4"><div class="card-content flex-between"><div><p class="font-semibold">${p.title}</p><p class="text-xs text-slate-400">${propsCount} proposal(s)</p></div>${p.status === 'Open' ? `<button class="btn btn-outline text-xs" data-view-proposals-id="${p.id}">View Proposals</button>` : `<span class="status-badge status-hired">${p.status}</span>`}</div></div>`;
            }
        } else {
            myProjectsContainer.innerHTML = `<p class="text-sm text-slate-400">You haven't posted any projects yet.</p>`;
        }

        const myServicesContainer = views.activity.querySelector('#my-services-section');
        const myPostedServices = services.filter(s => s.postedBy === currentUser.id);
        myServicesContainer.innerHTML = (myPostedServices.length > 0 ? myPostedServices.map(s => `<div class="card mb-4"><div class="card-content flex-between"><div><p class="font-semibold">${s.title}</p><p class="text-xs text-slate-400">Price: ₹${s.budget.toLocaleString()}</p></div><button class="btn btn-outline text-xs" data-view-item-id="${s.id}" data-type="service">View</button></div></div>`).join('') : `<p class="text-sm text-slate-400">You haven't posted any services yet.</p>`);

        const myProposalsContainer = views.activity.querySelector('#my-proposals-section');
        const mySentProposals = proposals.filter(p => p.proposerId === currentUser.id);
        
        myProposalsContainer.innerHTML = '';
        if(mySentProposals.length > 0) {
            for(const p of mySentProposals) {
                let listing = projects.find(proj => proj.id == p.projectId);
                // If not found in projects, check services (logic from your original)
                if (!listing) listing = services.find(serv => serv.id == p.serviceId);
                
                if (listing) {
                    myProposalsContainer.innerHTML += `<div class="card mb-4"><div class="card-content"><p class="font-semibold">${listing.title}</p><p class="text-xs text-slate-400">Your Bid: ₹${p.bid.toLocaleString()}</p><p class="text-xs text-slate-400 mt-2">Status: <span class="font-semibold ${p.status === 'Hired' ? 'text-amber-500' : ''}">${p.status}</span></p></div></div>`;
                }
            }
        } else {
            myProposalsContainer.innerHTML = `<p class="text-sm text-slate-400">You haven't sent any proposals yet.</p>`;
        }

        document.querySelectorAll('.activity-section').forEach(s => s.style.display = 'none');
        document.getElementById(`my-${currentActivityTab}-section`).style.display = 'block';
    };

    const renderProposalsList = async (projectId) => {
        const projects = await fetchData('/projects');
        const proposals = await fetchData('/proposals');
        
        const project = projects.find(p => p.id == projectId);
        const projectProposals = proposals.filter(p => p.projectId == projectId);
        
        const container = views.proposals.querySelector('#proposals-list-content');
        
        let proposalsHtml = '';
        if (projectProposals.length > 0) {
            for (const p of projectProposals) {
                const proposer = await getUser(p.proposerId);
                proposalsHtml += `<div class="card mb-4"><div class="card-content"><div class="flex-between"><p class="font-semibold"><a href="#" class="link view-profile-link" data-user-id="${proposer.id}">${proposer.name}</a></p><p class="text-lg font-semibold">₹${p.bid.toLocaleString()}</p></div><p class="text-sm text-slate-300 mt-2">${p.coverLetter}</p><div class="mt-4"><button class="btn btn-solid" data-hire-proposal-id="${p.id}" data-project-id="${projectId}">Hire This Student</button></div></div></div>`;
            }
        } else {
            proposalsHtml = '<p class="text-slate-400">No proposals received yet.</p>';
        }

        container.innerHTML = `<div class="page-header"><button class="btn btn-outline back-btn">← Back</button><div><p class="text-sm">Proposals for:</p><h2 class="section-title">${project.title}</h2></div></div>` + proposalsHtml;
    };

    const renderProfile = async (userId) => {
        const user = await getUser(userId);
        const isOwnProfile = user.id === currentUser.id;
        
        views.profile.querySelector('#profile-page-title').textContent = isOwnProfile ? 'My Profile' : `${user.name}'s Profile`;
        views.profile.querySelector('#edit-profile-btn').style.display = isOwnProfile ? 'inline-flex' : 'none';
        
        const contentArea = views.profile.querySelector('#profile-content-area');
        const skillsHtml = isOwnProfile && isEditingProfile
            ? user.skills.map(skill => `<span class="skill-tag">${skill}<button class="skill-remove-btn" type="button" data-skill="${skill}">&times;</button></span>`).join('')
            : user.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');

        contentArea.innerHTML = `
            <div><label class="form-label">Full Name</label><input id="profile-name" class="input" value="${user.name}" ${isOwnProfile && isEditingProfile ? '' : 'disabled'}></div>
            <div class="mt-4"><label class="form-label">College</label><input id="profile-college" class="input" value="${user.college || ''}" ${isOwnProfile && isEditingProfile ? '' : 'disabled'}></div>
            <div class="grid md-grid-cols-2 gap-4 mt-4">
                <div><label class="form-label">Year</label><input id="profile-year" class="input" value="${user.year || ''}" ${isOwnProfile && isEditingProfile ? '' : 'disabled'}></div>
                <div><label class="form-label">Branch</label><input id="profile-branch" class="input" value="${user.branch || ''}" ${isOwnProfile && isEditingProfile ? '' : 'disabled'}></div>
            </div>
            <div class="mt-4"><label class="form-label">Bio</label><textarea id="profile-bio-textarea" class="textarea" ${isOwnProfile && isEditingProfile ? '' : 'disabled'}>${user.bio}</textarea></div>
            <div class="mt-4"><label class="form-label">Skills</label><div id="profile-skills" class="skills-container">${skillsHtml}</div></div>
            <div id="profile-edit-area" style="display:${isOwnProfile && isEditingProfile ? 'block' : 'none'};"><hr class="border-slate-700 my-4"><form id="add-skill-form" class="flex gap-2"><input id="new-skill-input" class="input" placeholder="Add a new skill"><button type="submit" class="btn btn-solid">Add</button></form></div>
        `;
    };

    const renderAdminDashboard = async () => {
        const container = views['admin-dashboard'].querySelector('#admin-listings-container');
        const data = await fetchData(`/${currentAdminTab}`); // projects or services
        
        container.innerHTML = '';
        for(const item of data) {
            const user = await getUser(item.postedBy);
            container.innerHTML += `
            <div class="card">
                <div class="card-content">
                    <p class="text-sm listing-category">${item.category}</p>
                    <h3 class="card-title mt-2 text-base">${item.title}</h3>
                    <p class="text-xs text-slate-400 mt-2">Posted by: ${user.name}</p>
                </div>
                <div class="card-content border-t border-slate-800 flex-between">
                    <p class="listing-price text-base">₹${item.budget.toLocaleString()}</p>
                    <button class="btn btn-danger text-xs admin-delete-btn" data-item-id="${item.id}" data-type="${currentAdminTab}">Delete</button>
                </div>
            </div>`;
        }
    };

    const toggleProfileEdit = async () => {
        isEditingProfile = !isEditingProfile;
        const editBtn = document.getElementById('edit-profile-btn');
        if (isEditingProfile) {
            editBtn.textContent = 'Save Changes';
            await renderProfile(currentUser.id); // Re-render to show inputs
        } else {
            // SAVE CHANGES
            const updatedData = {
                name: document.getElementById('profile-name').value,
                college: document.getElementById('profile-college').value,
                year: document.getElementById('profile-year').value,
                branch: document.getElementById('profile-branch').value,
                bio: document.getElementById('profile-bio-textarea').value
            };
            
            // API Call to Update
            await fetch(`${API_BASE}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updatedData)
            });
            
            currentUser = { ...currentUser, ...updatedData }; // Update local state
            showNotification("Profile saved!");
            editBtn.textContent = 'Edit Profile';
            await renderProfile(currentUser.id);
        }
    };

    // =================================================================
    // EVENT LISTENERS
    // =================================================================

    document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); login('student@demo.com', 'password123'); });
    document.getElementById('admin-login-form').addEventListener('submit', e => { e.preventDefault(); login('admin@camp-link.com', 'adminpass'); });
    document.getElementById('signup-form').addEventListener('submit', e => { e.preventDefault(); showView('review'); });
    document.getElementById('college-id-upload').addEventListener('change', e => { document.getElementById('file-name-display').textContent = e.target.files.length > 0 ? `Selected: ${e.target.files[0].name}` : ''; });
    document.getElementById('demo-login-btn').addEventListener('click', () => login('student@demo.com', 'password123'));

    document.body.addEventListener('click', async e => {
        const viewTarget = e.target.closest('[data-view-target]');
        if (viewTarget) {
            const viewName = viewTarget.dataset.viewTarget;
            return showView(viewName);
        }

        // --- Interaction Logic ---
        const listingCard = e.target.closest('.listing-card');
        const contactBtn = e.target.closest('.contact-btn');
        
        if (contactBtn) {
            const serviceId = parseInt(contactBtn.closest('.listing-card').dataset.itemId);
            activeListing = { id: serviceId, type: 'service' };
            proposalModal.classList.add('active');
            return;
        }

        if (listingCard && listingCard.dataset.type === 'projects') {
            await renderProjectDetail(parseInt(listingCard.dataset.itemId));
            return showView('project-detail');
        }

        const viewProposalsId = e.target.closest('[data-view-proposals-id]')?.dataset.viewProposalsId;
        if (viewProposalsId) { 
            await renderProposalsList(parseInt(viewProposalsId)); 
            return showView('proposals'); 
        }

        const viewProfileLink = e.target.closest('.view-profile-link');
        if (viewProfileLink) { 
            e.preventDefault(); 
            isEditingProfile = false; 
            await renderProfile(parseInt(viewProfileLink.dataset.userId)); 
            return showView('profile'); 
        }

        if (e.target.matches('.back-btn')) goBack();
        
        // Modal & Modals Actions
        if (e.target.closest('#apply-now-btn')) {
            activeListing = { id: parseInt(e.target.dataset.projectId), type: 'project' };
            proposalModal.classList.add('active');
        }
        if (e.target.matches('.modal-close-btn')) e.target.closest('.modal-overlay').classList.remove('active');
    });

    // --- PROPOSAL FORM ---
    document.getElementById('proposal-form').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            proposerId: currentUser.id,
            bid: parseInt(document.getElementById('proposal-bid').value),
            coverLetter: document.getElementById('proposal-cover-letter').value,
            [activeListing.type === 'project' ? 'projectId' : 'serviceId']: activeListing.id
        };

        await fetch(`${API_BASE}/proposals`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        showNotification("Proposal submitted successfully!");
        proposalModal.classList.remove('active'); e.target.reset();
    });

    // --- HIRE LOGIC ---
    views.proposals.addEventListener('click', async e => {
        const hireButton = e.target.closest('[data-hire-proposal-id]');
        if (hireButton) {
            const proposalId = parseInt(hireButton.dataset.hireProposalId);
            const projectId = parseInt(hireButton.dataset.projectId);
            
            await fetch(`${API_BASE}/hire`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ proposalId, projectId })
            });

            showNotification(`You have hired the student!`);
            await renderMyActivity();
            showView('activity');
        }
    });

    // --- POST NEW LISTING ---
    document.getElementById('post-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const listingType = postModal.querySelector('.toggle-btn.active').dataset.type; // project or service
        
        const payload = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            budget: parseInt(formData.get('budget')),
            postedBy: currentUser.id,
            skills: formData.get('skills').split(',').map(s => s.trim()).filter(Boolean)
        };

        await fetch(`${API_BASE}/${listingType}s`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        currentMarketplaceTab = listingType + 's';
        document.querySelectorAll('#marketplace-view .tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === currentMarketplaceTab));
        await renderMarketplace();
        postModal.classList.remove('active');
        e.target.reset();
        showNotification('Listing posted successfully!');
    });

    // --- ADMIN DELETE ---
    views['admin-dashboard'].addEventListener('click', async e => {
        if (e.target.matches('.admin-delete-btn')) {
            const itemId = e.target.dataset.itemId;
            const type = e.target.dataset.type; // projects or services
            
            await fetch(`${API_BASE}/${type}/${itemId}`, { method: 'DELETE' });
            
            showNotification('Listing deleted successfully.');
            await renderAdminDashboard();
        }
    });

    // --- TABS & UI MISC ---
    document.getElementById('edit-profile-btn').addEventListener('click', toggleProfileEdit);
    
    // Add Skill
    views.profile.addEventListener('submit', async e => {
        if (e.target.id === 'add-skill-form') {
            e.preventDefault();
            const newSkill = document.getElementById('new-skill-input').value.trim();
            if(newSkill) {
                currentUser.skills.push(newSkill);
                // Save immediately
                await fetch(`${API_BASE}/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ skills: currentUser.skills })
                });
                renderProfile(currentUser.id);
            }
        }
    });

    // Remove Skill
    views.profile.addEventListener('click', async e => {
        if (e.target.matches('.skill-remove-btn')) {
            currentUser.skills = currentUser.skills.filter(s => s !== e.target.dataset.skill);
            await fetch(`${API_BASE}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ skills: currentUser.skills })
            });
            renderProfile(currentUser.id);
        }
    });

    document.getElementById('search-input').addEventListener('input', renderMarketplace);
    document.querySelector('#marketplace-view .tabs')?.addEventListener('click', e => {
        if (e.target.matches('.tab')) {
            document.querySelectorAll('#marketplace-view .tabs .tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentMarketplaceTab = e.target.dataset.tab;
            renderMarketplace();
        }
    });

    // Activity Tabs
    document.querySelector('#activity-view .tabs')?.addEventListener('click', e => {
        if (e.target.matches('.tab')) {
            document.querySelectorAll('#activity-view .tabs .tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentActivityTab = e.target.dataset.activityTab;
            renderMyActivity();
        }
    });

    document.getElementById('post-new-btn')?.addEventListener('click', () => postModal.classList.add('active'));
    postModal.querySelector('.toggle-group')?.addEventListener('click', e => {
        if (e.target.matches('.toggle-btn')) {
            postModal.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            // Toggle placeholder texts...
        }
    });

    // --- INIT ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    document.getElementById('year').textContent = new Date().getFullYear();
    showView('landing');
});