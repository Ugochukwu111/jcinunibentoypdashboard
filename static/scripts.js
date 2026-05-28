/**
 * JCI UNIBEN TOYP - Master Admin Script
 * Includes: Nominations, Voting, Audit, and Category Scripts
 */


// 1. SYSTEM STATE & SECURITY (Requirement 2)
const currentUser = {
    name: "Admin User",
    role: "super-admin", // Toggle to 'auditor' to test Read-Only mode
    isAuthenticated: true
};


// Import Supabase client (requires `static/config.js` to set window.SUPABASE_URL and window.SUPABASE_ANON_KEY)
import { supabase } from './supabase-client.js';

// 2. VIEW TEMPLATES (Requirement 3B - 3H)
const templateViews = {
    overview: {
        filePath: '/views/overview.html',
        htmlContent: '',
    },
    nominations: {
        filePath: '/views/nominations.html',
        htmlContent: '',
    },
    categories: {
        filePath: '/views/categories.html',
        htmlContent: '',
    },
    finalists: {
        filePath: '/views/finalists.html',
        htmlContent: '',
    },
    voting: {
        filePath: './views/voting.html',
        htmlContent: '',
    },
    audit: {
        filePath: '/views/audit.html',
        htmlContent: '',
    },
    logs: {
        filePath: '/views/logs.html',
        htmlContent: '',
    },
    content: {
        filePath: '/views/content.html',
        htmlContent: '',
    },
};


// 3. CORE FUNCTIONS
/**
 * Loads/Parses html template file and Inits it inot the htmlContnent param/key
 * 
 * @param {Object} templateView - The view obj which contains its file path param and a htmlContnet param to stire the parsed template
 * @returns {HTML} - The parsed html view.
 */
const loadHTMLTemplate = async (templateView) => {
    if (templateView.htmlContent) { // if htmlContent is already loaded
        return templateView.htmlContent;
    }

    const filePath = templateView.filePath;
    console.log(filePath)
    const resp = await fetch(filePath, { cache: 'no-cache' }); // Pls change cache to 'default', this allows good testing
    if (!resp.ok) {
        throw new Error(`Couldn\'nt fetch ${filePath}`);
    }

    // Load the template and assign its content to the templateView obj for reusabilty & editability
    try {
        const templateString = await resp.text();
        const documentObj = new DOMParser().parseFromString(templateString, 'text/html');
        const templateNode = documentObj.querySelector('template');  // if <template> wrapper is used

        templateView.htmlContent = templateNode
            ? templateNode.innerHTML.trim()
            : documentObj.body.innerHTML.trim(); // Some templates have a <template> tag while some use a <div>

        return templateView.htmlContent;
    } catch (error) {
        console.error(`Couldn\'t parse template at ${filePath}`, error);
        return '';  // 
    }
}

/**
 * Gets the editable view
 * 
 * @param {String} viewKey - The unique key that identifies the view to be retrieved. 
 * @returns { HTML | '' } - The editable markup view OR an empty string if the view isnt found.
 */
const getViewMarkup = async (viewKey) => {
    if (templateViews[viewKey]) {
        return loadHTMLTemplate(templateViews[viewKey]);
    }
    return '';
};

/**
 * Applies role-based access control by restricting UI elements based on current user role
 * 
 * @returns {void}
 */
function applySecurityRoles() {
    const badge = document.querySelector('.role-badge');
    if (badge) {
        badge.textContent = currentUser.role === 'super-admin' ? 'Super Admin' : 'Auditor';
        badge.className = `role-badge ${currentUser.role}`;
    }

    // Auditor Restricted Access 
    if (currentUser.role === 'auditor') {
        const controls = document.querySelectorAll('.btn-primary, .btn-reject, #btn-approve, .switch-ui input, #add-cat-btn');
        controls.forEach(el => {
            if (el.tagName === 'INPUT') {
                el.disabled = true;
                el.parentElement.style.opacity = "0.5";
            } else {
                el.style.display = 'none';
            }
        });

        if (!document.querySelector('.audit-banner')) {
            const banner = document.createElement('div');
            banner.className = 'audit-banner';
            banner.style.cssText = "background: #FEF9C3; color: #854D0E; padding: 10px; font-size: 12px; text-align: center; border-bottom: 1px solid #FDE047;";
            banner.innerHTML = `<i class='bx bx-lock-alt'></i> <b>Audit Mode:</b> You have read-only access to all TOYP data.`;
            document.querySelector('.main-content').prepend(banner);
        }
        // Disable Visibility Toggles
        const toggles = document.querySelectorAll('.visibility-toggle');
        toggles.forEach(toggle => {
            toggle.disabled = true; // Prevents clicking
            toggle.parentElement.style.opacity = "0.6"; // Visual cue it's locked
            toggle.parentElement.style.cursor = "not-allowed";
        });

        // Hide "Toggle All" Bulk Action
        const bulkToggle = document.getElementById('toggle-all-visibility');
        if (bulkToggle) bulkToggle.style.display = 'none';

        // Content Panel Specific Restrictions
        const inputs = document.querySelectorAll('.card input, .card textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.backgroundColor = "#f8fafc";
        });

        const sendBtn = document.getElementById('send-announcement');
        const publishBtn = document.getElementById('publish-all-btn');
        if (sendBtn) sendBtn.style.display = 'none';
        if (publishBtn) publishBtn.style.display = 'none';
    }
}

/**
 * Opens nomination details modal with nominee profile, achievement write-up, and approval actions
 * 
 * @returns {void}
 */
function openNominationModal(nomination = null) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');
    if (!nomination) {
        modalBody.innerHTML = '<div style="padding:20px">No nomination data available.</div>';
        modal.style.display = 'flex';
        return;
    }

    // count how many times this nominee appears (same email)
    const nomineeEmail = nomination.nominee_email;
    // we can compute occurrences from the currently loaded table if available
    const rows = document.querySelectorAll('#content-area tbody tr');
    let occurrences = 1;
    if (rows.length) {
        occurrences = Array.from(rows).reduce((acc, r) => {
            const emailCell = r.querySelector('td[data-email]');
            if (!emailCell) return acc;
            return acc + (emailCell.dataset.email === nomineeEmail ? 1 : 0);
        }, 0);
    }

    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--bg-slate);">
                    <div>
                        <h3 style="color: var(--jci-blue); font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Nominee Profile</h3>
                        <p style="font-weight: 700; font-size: 15px;">${nomination.nominee_name}</p>
                        <p style="font-size: 13px; color: var(--text-muted);">${nomination.nominee_email}</p>
                        <p style="font-size: 13px; color: var(--text-muted);">${nomination.whatsapp_contact || ''}</p>
                        <p style="font-size: 13px; color: var(--text-muted);">Nominated ${occurrences} time(s)</p>
                    </div>
                    <div>
                        <h3 style="color: var(--jci-teal); font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Nominator Details</h3>
                        <p style="font-weight: 700; font-size: 15px;">${nomination.nominator_email}</p>
                        <p style="font-size: 13px; color: var(--text-muted);">${nomination.faculty || ''} — ${nomination.department || ''}</p>
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 12px; margin-bottom: 10px; text-transform: uppercase; color: var(--text-muted);">Nominee Achievement Write-up</h3>
                    <div style="background: var(--bg-slate); padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: var(--text-main);">
                        ${nomination.reason || ''}
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 12px; margin-bottom: 10px; text-transform: uppercase; color: var(--text-muted);">Category</h3>
                    <div style="padding:8px 12px; border-radius:6px; background:var(--bg-slate);">${nomination.category || ''}</div>
                </div>

                <div class="modal-footer" style="margin-top: 10px; padding-top: 20px; border-top: 1px solid var(--bg-slate); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-primary flag-trigger" style="background: var(--jci-yellow); color: var(--jci-black); border: 1px solid var(--border-color);">
                        <i class='bx bxs-flag-alt'></i> Flag
                    </button>
                    <button class="btn-primary reject-trigger" style="background: #ef4444; color: white; border: 1px solid var(--border-color);">
                        <i class='bx bx-x'></i> Reject
                    </button>
                    <button class="btn-primary approve-trigger" data-id="${nomination.id}" style="background: var(--jci-teal);">
                        <i class='bx bx-check'></i> Approve Nomination
                    </button>
                </div>
            </div>
        `;
    modal.style.display = 'flex';

    applySecurityRoles();
}

/**
 * Opens category management modal for creating or editing award categories
 * 
 * @param {Boolean} isEdit - Whether the modal is for editing (true) or creating new (false)
 * @param {Object} data - Category data object containing name and description for edit mode
 * @returns {void}
 */
function openCategoryModal(isEdit = false, data = {}) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--bg-slate); padding-bottom: 15px;">
                    <h2 style="font-size: 18px; color: var(--jci-blue);">
                        ${isEdit ? '<i class="bx bx-edit"></i> Edit Category' : '<i class="bx bx-plus-circle"></i> New Category'}
                    </h2>
                    <p style="font-size: 12px; color: var(--text-muted);">Set the name and public description for this award.</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label class="modal-label">Category Name</label>
                        <input type="text" id="cat-name-input" value="${data.name || ''}" 
                            placeholder="e.g., Cultural Achievement" 
                            style="width: 100%; padding: 12px; border: 1px solid var(--bg-slate); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div>
                        <label class="modal-label">Public Description</label>
                        <textarea id="cat-desc-input" rows="5" 
                                style="width: 100%; padding: 12px; border: 1px solid var(--bg-slate); border-radius: 6px; font-family: inherit; font-size: 13px; line-height: 1.5;" 
                                placeholder="Describe the criteria for this category. This will be visible to nominators...">${data.desc || ''}</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 15px; border-top: 1px solid var(--bg-slate);">
                    <button class="view-btn" onclick="document.getElementById('detailsModal').style.display='none'">Cancel</button>
                    <button class="btn-primary" id="save-category-btn" style="background: var(--jci-teal); border: none; padding: 10px 25px;">
                        ${isEdit ? 'Update Category' : 'Save Category'}
                    </button>
                </div>
            </div>
        `;
    modal.style.display = 'flex';
    // mark save button with edit id when editing so handler knows to PATCH instead of POST
    const saveBtn = document.getElementById('save-category-btn');
    if (saveBtn) {
        if (isEdit && data && data.id) {
            saveBtn.dataset.editId = data.id;
        } else {
            delete saveBtn.dataset.editId;
        }
    }
}

/**
 * Opens detailed dossier modal displaying comprehensive nominee profile information
 * 
 * @returns {void}
 */
function openDossierModal() {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--bg-slate); padding-bottom: 10px; display: flex; justify-content: space-between;">
                    <h2 style="font-size: 18px; color: var(--jci-blue);">Nominee Profile</h2>
                    <span class="status-badge status-shortlisted">Shortlisted</span>
                </div>
                <div style="display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid var(--bg-slate);">
                    <button class="view-btn" onclick="document.getElementById('detailsModal').style.display='none'">Close Dossier</button>
                </div>
            </div>
        `;
    modal.style.display = 'flex';
}


// 4. CORE CONTROLLER
document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const navItems = document.querySelectorAll('.nav-item');
    const modal = document.getElementById('detailsModal');
    // voting timer logic
    let timerInterval;

    function startTimer(durationInSeconds) {
        let timer = durationInSeconds;
        const display = document.getElementById('voting-timer');

        clearInterval(timerInterval); // Clear any existing timer

        timerInterval = setInterval(() => {
            let hours = Math.floor(timer / 3600);
            let minutes = Math.floor((timer % 3600) / 60);
            let seconds = Math.floor(timer % 60);

            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            if (display) display.textContent = hours + ":" + minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(timerInterval);
                if (display) display.textContent = "EXPIRED";
            }
        }, 1000);
    }

    // Update your Click Listener for Voting
    // Event Delegation
    document.addEventListener('click', async (e) => {
        const banner = document.getElementById('voting-banner');
        const statusLabel = document.getElementById('v-status');

        if (e.target.id === 'start-v') {
            // Toggle UI
            e.target.style.display = 'none';
            document.getElementById('stop-v').style.display = 'block';

            // Update Banner
            banner.className = "voting-banner active";
            banner.innerHTML = `<i class='bx bxs-megaphone'></i> <span>VOTING IS LIVE: Public portal is now accepting ballots.</span>`;

            // Update Status
            statusLabel.textContent = "Phase: Active";
            statusLabel.style.background = "#DCFCE7";
            statusLabel.style.color = "#166534";

            // Start 24-hour timer (86400 seconds)
            startTimer(86400);
        }

        if (e.target.id === 'stop-v') {
            e.target.style.display = 'none';
            document.getElementById('start-v').style.display = 'block';

            // Update Banner back to Locked
            banner.className = "voting-banner locked";
            banner.innerHTML = `<i class='bx bxs-lock'></i> <span>VOTING IS CURRENTLY LOCKED: Public access is disabled.</span>`;

            statusLabel.textContent = "Phase: Paused";
            statusLabel.style.background = "#FEE2E2";
            statusLabel.style.color = "#991B1B";

            clearInterval(timerInterval);
            document.getElementById('voting-timer').textContent = "00:00:00";
        }
    });

    // Default View
    await loadOverview();

    // Navigation Switcher Logic
    navItems.forEach(item => {
        item.addEventListener('click', async function (e) {
            if (this.classList.contains('logout')) return;
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            const viewKey = this.getAttribute('data-view');
            const viewMarkup = await getViewMarkup(viewKey);
            if (viewMarkup) {
                contentArea.innerHTML = viewMarkup;
                applySecurityRoles();
                if (viewKey === 'overview') await loadOverview();
                if (viewKey === 'nominations') await loadNominations();
                if (viewKey === 'categories') await loadCategories();
            }
        });
    });

    // when cards are clicked in overview, navigate to matching view
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.stat-card');
        if (card) {
            let viewKey = card.getAttribute('data-view');
            if (!viewKey) {
                // fallback to index mapping
                const idx = Array.from(document.querySelectorAll('.stats-grid .stat-card')).indexOf(card);
                const mapping = ['nominations','categories','voting','nominations'];
                viewKey = mapping[idx] || 'overview';
            }
            const navItem = document.querySelector(`.nav-item[data-view="${viewKey}"]`);
            if (navItem) navItem.click();
        }
    });

    // helper to load overview data
    async function loadOverview() {
        const template = await getViewMarkup('overview');
        contentArea.innerHTML = template;
        applySecurityRoles();
            // fetch counts directly from Supabase
            try {
                const [{ count: nominations }, { count: votes }, { count: categories }] = await Promise.all([
                    supabase.from('nominations').select('id', { count: 'exact', head: true }),
                    supabase.from('votes').select('id', { count: 'exact', head: true }),
                    supabase.from('categories').select('id', { count: 'exact', head: true }),
                ]);

                // try verified count
                let verified = 0;
                try {
                    const { count: verifiedCount } = await supabase.from('nominations').select('id', { count: 'exact', head: true }).eq('status', 'verified');
                    verified = verifiedCount || 0;
                } catch (e) { /* ignore */ }

                const pending = (nominations || 0) - verified;
                const cards = document.querySelectorAll('.stats-grid .stat-card h2');
                if (cards[0]) cards[0].textContent = nominations || '--';
                if (cards[1]) cards[1].textContent = verified || '--';
                if (cards[2]) cards[2].textContent = votes || '--';
                if (cards[3]) cards[3].textContent = typeof pending === 'number' ? pending : '--';
            } catch (err) {
                console.error('failed to fetch counts', err);
            }
        // wire "View All Logs" button to open logs view
        const viewLogsBtn = document.querySelector('.view-btn');
        if (viewLogsBtn && viewLogsBtn.textContent.includes('View All Logs')) {
            viewLogsBtn.addEventListener('click', async () => {
                const viewMarkup = await getViewMarkup('logs');
                contentArea.innerHTML = viewMarkup;
                applySecurityRoles();
                await loadLogs();
            });
        }
    }

    async function loadLogs() {
        try {
            const limit = 50;
            const [{ data: noms }, { data: vts }, { data: cats }] = await Promise.all([
                supabase.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit),
                supabase.from('votes').select('id, nomination_id, voter_email, created_at').order('created_at', { ascending: false }).limit(limit),
                supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
            ]);

            const events = [];
            (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
            (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: v.voter_email || 'anonymous', status: 'Voted' }));
            (cats || []).forEach(c => events.push({ time: c.created_at, activity: `Category Added: ${c.name}`, user: 'Admin', status: 'Created' }));

            events.sort((a, b) => new Date(b.time) - new Date(a.time));

            const tbody = document.getElementById('logs-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            events.slice(0, limit).forEach(ev => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px;">${new Date(ev.time).toLocaleString()}</td>
                    <td style="padding: 12px;">${ev.activity}</td>
                    <td style="padding: 12px;">${ev.user}</td>
                    <td style="padding: 12px;"><span class="status-badge">${ev.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('failed to load logs', err);
        }
    }

    // load categories list and populate categories view
    async function loadCategories() {
        try {
            const { data: cats, error } = await supabase.from('categories').select('*');
            if (error) throw error;
            const tbody = document.getElementById('category-table-body');
            if (tbody) {
                tbody.innerHTML = '';
                (cats || []).forEach(cat => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">${cat.name}</td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px; color: var(--text-muted);">${cat.description || ''}</td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                            <label class="switch-ui">
                                <input type="checkbox" class="cat-toggle" data-id="${cat.id}" checked>
                                <span class="slider"></span>
                            </label>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">-</td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <div style="display: flex; gap: 8px;">
                                <button class="view-btn edit-cat-trigger" data-id="${cat.id}" data-name="${cat.name}" data-desc="${cat.description || ''}"><i class='bx bx-edit-alt'></i></button>
                                <button class="view-btn delete-cat" data-id="${cat.id}" style="color: #ef4444;"><i class='bx bx-trash'></i></button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            // update stat cards in categories view
            const activeCard = document.querySelector('.stat-info h2');
            const hiddenCard = document.querySelectorAll('.stat-info h2')[1];
            if (activeCard) activeCard.textContent = (cats || []).length || '--';
            if (hiddenCard) hiddenCard.textContent = '0';
        } catch (err) {
            console.error('failed to load categories', err);
        }
    }

    // fetch and display nominations list in nominations view
    async function loadNominations() {
        try {
            const { data: nominations, error } = await supabase.from('nominations').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const tbody = document.querySelector('#content-area tbody');
            if (!tbody) return;
            tbody.innerHTML = ''; // clear existing
            // keep a map for quick lookup when opening modal
            window.__NOMINATIONS_MAP__ = {};
            (nominations || []).forEach(nom => {
                window.__NOMINATIONS_MAP__[nom.id] = nom;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">${new Date(nom.created_at).toLocaleString()}</td>
                    <td data-email="${nom.nominee_email || ''}" style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">${nom.nominee_name}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">${nom.category || ''}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><span class="status-badge ${nom.status || 'pending'}">${nom.status || 'Pending'}</span></td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                        <label class="switch-ui"><input type="checkbox" ${nom.public ? 'checked' : ''}><span class="slider"></span></label>
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><button class="view-btn review-trigger" data-id="${nom.id}">Review</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('error loading nominations', err);
                }

                // wire export button to download CSV of current nominations
                const exportBtn = document.getElementById('export-nominations-btn');
                if (exportBtn) {
                    exportBtn.onclick = async () => {
                        // use the nominations map if present, otherwise fetch fresh
                        let items = Object.values(window.__NOMINATIONS_MAP__ || {});
                        if (!items.length) {
                            const { data: fresh, error } = await supabase.from('nominations').select('*').order('created_at', { ascending: false }).limit(100);
                            items = error ? [] : (fresh || []);
                        }
                        if (!items.length) return alert('No nominations to export');
                        const csvRows = [];
                        const headers = ['id','nominee_name','nominee_email','nominator_email','category','faculty','department','level','created_at'];
                        csvRows.push(headers.join(','));
                        items.forEach(it => {
                            const row = headers.map(h => '"'+String(it[h]||'').replace(/"/g,'""')+'"').join(',');
                            csvRows.push(row);
                        });
                        const csv = csvRows.join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `nominations_export_${new Date().toISOString().slice(0,10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                    };
                }
    }

    // Event Delegation
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('review-trigger')) {
            const id = e.target.getAttribute('data-id');
            const nom = (window.__NOMINATIONS_MAP__ || {})[id];
            openNominationModal(nom);
            return;
        }
        if (e.target.classList.contains('close-modal')) modal.style.display = 'none';
        //nomination approval Workflow
        if (e.target.closest('.approve-trigger')) {
            const btn = e.target.closest('.approve-trigger');
            const id = btn.getAttribute('data-id');
            if (!id) return alert('Nomination id missing');
            if (!confirm('Approve this nomination and mark as Verified?')) return;
            // call server to update status
            try {
                const { data, error } = await supabase.from('nominations').update({ status: 'verified' }).eq('id', id).select();
                if (error) throw error;
                alert('Nomination marked Verified');
                modal.style.display = 'none';
                await loadNominations();
                await loadOverview();
            } catch (err) {
                console.error(err);
                alert('Failed to update nomination. Check RLS and anon key permissions.');
            }
            return;
        }
        // Nomination flagging Workflow
        if (e.target.closest('.flag-trigger')) {

            const concern = prompt("Specify the concern for flagging (e.g., Potential duplicate, suspicious documentation):");

            if (concern !== null && concern.trim() !== "") {
                if (confirm("Flag this nomination for Auditor review?")) {

                    alert("Entry Flagged.\nConcern: " + concern + "\nAn Auditor has been notified for investigation.");

                    const modal = document.getElementById('detailsModal');
                    modal.style.display = 'none';

                    console.log("Nomination flagged by Admin. Concern: " + concern);

                }
            } else if (concern === "") {
                alert("Action Cancelled: You must specify a concern to flag an entry.");
            }
        }
        // Nomination rejection Workflow
        if (e.target.closest('.reject-trigger')) {

            const reason = prompt("Please enter the reason for rejection (e.g., Ineligible age, Missing documents):");

            if (reason !== null && reason.trim() !== "") {
                if (confirm("Confirm Rejection? This action cannot be undone.")) {

                    alert("Nomination Rejected.\nReason: " + reason + "\nStatus updated for Audit Log.");

                    const modal = document.getElementById('detailsModal');
                    modal.style.display = 'none';

                    console.log("Nomination rejected by Admin. Reason: " + reason);
                }
            } else if (reason === "") {
                alert("Action Cancelled: A reason is required to reject a nomination.");
            }
        }


        //CATEGORY MODAL MANAGEMENT TRIGGERS
        // Trigger for Add Category
        if (e.target.id === 'add-cat-trigger') {
            openCategoryModal(false);
        }
        // Trigger for Edit Category (pass id so save can PATCH)
        if (e.target.closest('.edit-cat-trigger')) {
            const btn = e.target.closest('.edit-cat-trigger');
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const desc = btn.getAttribute('data-desc'); // Now fetching description
            openCategoryModal(true, { id, name, desc });
        }

        // Handle the "Save" inside the modal (create or update)
        if (e.target.id === 'save-category-btn') {
            const newName = document.getElementById('cat-name-input').value;
            const newDesc = document.getElementById('cat-desc-input').value;
            const saveBtn = document.getElementById('save-category-btn');
            const editId = saveBtn ? saveBtn.dataset.editId : null;

            if (newName.trim() === "" || newDesc.trim() === "") {
                return alert("Please fill in both the Category Name and Description.");
            }

            // prepare payload
            const payload = { name: newName.trim(), description: newDesc.trim() };

            try {
                if (editId) {
                    // update existing category via Supabase
                    const { data, error } = await supabase.from('categories').update(payload).eq('id', editId).select();
                    if (error) throw error;
                    alert(`Success: '${newName}' updated.`);
                } else {
                    // create new category via Supabase
                    const { data, error } = await supabase.from('categories').insert([payload]).select();
                    if (error) throw error;
                    alert(`Success: '${newName}' created.`);
                }
                document.getElementById('detailsModal').style.display = 'none';
                await loadCategories();
            } catch (err) {
                console.error('category save error', err);
                alert('Failed to save category');
            }
        }

        // Trigger for Deleting a Category
        if (e.target.closest('.delete-cat')) {
            const btn = e.target.closest('.delete-cat');
            const id = btn.getAttribute('data-id');
            if (!id) return alert('Category id missing');
            if (!confirm('Delete this category? This action cannot be undone.')) return;
            try {
                const { data, error } = await supabase.from('categories').delete().eq('id', id).select();
                if (error) throw error;
                alert('Category deleted');
                await loadCategories();
            } catch (err) {
                console.error('failed to delete category', err);
                alert('Failed to delete category');
            }
        }

        // Trigger for Finalist Dossier Modal
        if (e.target.closest('.live-profile-trigger')) {
            openDossierModal();
        }

        // Voting Phase Control
        if (e.target.id === 'start-v') {
            alert("SUCCESS: Voting portal is now open to the public.");
            e.target.style.display = 'none';
            document.getElementById('stop-v').style.display = 'block';
            document.getElementById('v-status').textContent = "Phase: Active";
            document.getElementById('v-status').style.background = "#dcfce7";
            document.getElementById('v-status').style.color = "#166534";
        }
        if (e.target.id === 'stop-v') {
            alert("CONFIRMED: Voting portal is now closed.");
            e.target.style.display = 'none';
            document.getElementById('start-v').style.display = 'block';
            const statusLabel = document.getElementById('v-status');
            statusLabel.textContent = "Phase: Paused";
            statusLabel.style.background = "#FEE2E2";
            statusLabel.style.color = "#991B1B";
        }
    });


    // --- MOBILE MENU LOGIC ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Add overlay to body if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    const overlay = document.querySelector('.sidebar-overlay');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    // Close menu when a navigation item is clicked
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    });

    applySecurityRoles();
});