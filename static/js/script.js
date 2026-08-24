/**
 * Family Tree Explorer - Frontend Logic
 * Communicates with Python Flask & SQLite backend REST API.
 */

let familyData = [];
let currentZoom = 1.0;
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// DOM Elements
const treeContainer = document.getElementById("tree-container");
const treeViewport = document.getElementById("tree-viewport");
const memberModal = document.getElementById("member-modal");
const profileModal = document.getElementById("profile-modal");
const memberForm = document.getElementById("member-form");
const relatedSelect = document.getElementById("form-related-id");
const relationSelect = document.getElementById("form-relation");
const genderSelect = document.getElementById("form-gender");
const searchInput = document.getElementById("tree-search");
const searchClearBtn = document.getElementById("search-clear-btn");

// =========================================================
// TOAST NOTIFICATIONS
// =========================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =========================================================
// API CALLS
// =========================================================

async function fetchMembers() {
    try {
        const res = await fetch("/api/members");
        const data = await res.json();
        if (data.success) {
            familyData = data.members || [];
            updateRelatedSelect();
            renderTree();
            fetchStats();
        }
    } catch (err) {
        console.error("Error fetching family members:", err);
        showToast("Error connecting to server", "error");
    }
}

async function fetchStats() {
    try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.success && data.stats) {
            document.getElementById("stat-total").textContent = data.stats.total;
            document.getElementById("stat-males").textContent = data.stats.males;
            document.getElementById("stat-females").textContent = data.stats.females;
            document.getElementById("stat-inlaws").textContent = data.stats.in_laws;
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    }
}

// =========================================================
// RELATION & GENDER AUTO-DETECTION
// =========================================================
if (relationSelect && genderSelect) {
    relationSelect.addEventListener("change", function () {
        const rel = relationSelect.value.toLowerCase().trim();
        if (rel === "husband" || rel === "son" || rel === "father" || rel === "brother" || rel === "son-in-law") {
            genderSelect.value = "Male";
        } else if (rel === "wife" || rel === "daughter" || rel === "mother" || rel === "sister" || rel === "daughter-in-law") {
            genderSelect.value = "Female";
        }
    });
}

// =========================================================
// DROPDOWN POPULATION
// =========================================================
function updateRelatedSelect(selectedId = null) {
    if (!relatedSelect) return;
    relatedSelect.innerHTML = `<option value="">-- None (Root / Starting Member) --</option>`;

    familyData.forEach(member => {
        const opt = document.createElement("option");
        opt.value = member.id;
        opt.textContent = `${member.name} (${member.relation || "Member"})`;
        if (selectedId && Number(selectedId) === member.id) {
            opt.selected = true;
        }
        relatedSelect.appendChild(opt);
    });
}

// =========================================================
// SPOUSE & CHILDREN RESOLUTION LOGIC
// =========================================================

function isSpouseRelation(relation) {
    if (!relation) return false;
    const r = relation.toLowerCase().trim();
    return (
        r === "wife" ||
        r === "husband" ||
        r === "spouse" ||
        r === "son-in-law" ||
        r === "son in law" ||
        r === "daughter-in-law" ||
        r === "daughter in law"
    );
}

function findSpouse(person) {
    if (!person) return null;

    // 1. Direct relation: someone has related_id === person.id and spouse relation
    let spouse = familyData.find(m =>
        m.id !== person.id &&
        m.related_id === person.id &&
        isSpouseRelation(m.relation)
    );
    if (spouse) return spouse;

    // 2. Inverse relation: person points to someone as spouse
    if (isSpouseRelation(person.relation) && person.related_id) {
        spouse = familyData.find(m => m.id === person.related_id);
        if (spouse) return spouse;
    }

    // 3. Parent link: Daughter & Son-in-law
    if (person.gender === "Female" || person.relation?.toLowerCase() === "daughter") {
        spouse = familyData.find(m => {
            const r = m.relation?.toLowerCase().trim();
            return (
                (r === "son-in-law" || r === "son in law") &&
                (m.related_id === person.id || (person.related_id && m.related_id === person.related_id))
            );
        });
        if (spouse && spouse.id !== person.id) return spouse;
    }

    // 4. Parent link: Son & Daughter-in-law
    if (person.gender === "Male" || person.relation?.toLowerCase() === "son") {
        spouse = familyData.find(m => {
            const r = m.relation?.toLowerCase().trim();
            return (
                (r === "daughter-in-law" || r === "daughter in law") &&
                (m.related_id === person.id || (person.related_id && m.related_id === person.related_id))
            );
        });
        if (spouse && spouse.id !== person.id) return spouse;
    }

    return null;
}

function findChildren(person, spouse, renderedSet) {
    const parentIds = [person.id];
    if (spouse) parentIds.push(spouse.id);

    return familyData.filter(member => {
        if (renderedSet.has(member.id)) return false;
        if (member.id === person.id || (spouse && member.id === spouse.id)) return false;

        // Ignore spouses pointing to parentIds (they are couple, not children)
        if (parentIds.includes(member.related_id) && isSpouseRelation(member.relation)) {
            return false;
        }

        if (parentIds.includes(member.related_id)) {
            return true;
        }
        return false;
    });
}

function getRootMembers() {
    if (familyData.length === 0) return [];

    const potentialRoots = familyData.filter(m => {
        if (m.related_id === null || m.related_id === undefined) return true;
        return !familyData.some(parent => parent.id === m.related_id);
    });

    const roots = [];
    const spouseSet = new Set();

    potentialRoots.forEach(member => {
        if (spouseSet.has(member.id)) return;
        const spouse = findSpouse(member);
        if (spouse) {
            spouseSet.add(spouse.id);
        }
        roots.push(member);
    });

    if (roots.length === 0 && familyData.length > 0) {
        roots.push(familyData[0]);
    }

    return roots;
}

// =========================================================
// CARD & TREE RENDERING
// =========================================================

function createCard(member) {
    const card = document.createElement("div");
    const genderClass = (member.gender || "male").toLowerCase();
    const relLower = (member.relation || "").toLowerCase();
    const isInLaw = relLower.includes("law");

    card.className = `member-card ${genderClass} ${isInLaw ? 'in-law' : ''} ${member.alive === 0 ? 'deceased' : ''}`;
    card.id = `card-${member.id}`;
    card.setAttribute("data-name", (member.name || "").toLowerCase());
    card.setAttribute("data-relation", (member.relation || "").toLowerCase());

    const initials = member.name
        .split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    card.innerHTML = `
        <div class="card-top">
            <div class="card-avatar">${initials}</div>
            <div class="card-info">
                <div class="card-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>
                <span class="relation-badge">${escapeHtml(member.relation || "Member")}</span>
            </div>
        </div>

        <div class="card-details">
            <i class="fa-solid fa-calendar-days"></i>
            <span>${member.dob ? escapeHtml(member.dob) : (member.alive === 0 ? 'Deceased' : 'Living')}</span>
        </div>

        <div class="card-actions">
            <button class="action-btn add-btn" title="Add relative under ${escapeHtml(member.name)}" onclick="quickAddRelative(${member.id})">
                <i class="fa-solid fa-plus"></i>
            </button>
            <button class="action-btn" title="View details" onclick="viewMemberProfile(${member.id})">
                <i class="fa-solid fa-eye"></i>
            </button>
            <button class="action-btn" title="Edit member" onclick="openEditMember(${member.id})">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn del-btn" title="Delete member" onclick="confirmDeleteMember(${member.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;

    return card;
}

function createFamily(primaryPerson, renderedSet = new Set()) {
    if (renderedSet.has(primaryPerson.id)) return null;
    renderedSet.add(primaryPerson.id);

    const family = document.createElement("div");
    family.className = "family-branch";

    const couple = document.createElement("div");
    couple.className = "couple";

    const spouse = findSpouse(primaryPerson);
    if (spouse) {
        renderedSet.add(spouse.id);
    }

    couple.appendChild(createCard(primaryPerson));

    if (spouse) {
        const line = document.createElement("div");
        line.className = "spouse-line";
        couple.appendChild(line);
        couple.appendChild(createCard(spouse));
    }

    family.appendChild(couple);

    // Render children branches
    const children = findChildren(primaryPerson, spouse, renderedSet);
    if (children.length > 0) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "children";

        children.forEach(child => {
            const childBranch = createFamily(child, renderedSet);
            if (childBranch) {
                childrenContainer.appendChild(childBranch);
            }
        });

        if (childrenContainer.children.length > 0) {
            family.appendChild(childrenContainer);
        }
    }

    return family;
}

function renderTree() {
    if (!treeContainer) return;
    treeContainer.innerHTML = "";

    if (familyData.length === 0) {
        treeContainer.innerHTML = `
            <div style="color: #cbd5e1; text-align: center; padding: 40px;">
                <i class="fa-solid fa-tree" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                <h2>Your Family Tree is Empty</h2>
                <p style="margin-top: 8px; color: #94a3b8;">Click <strong>Add Member</strong> or <strong>Load Sample</strong> to start building your heritage tree.</p>
            </div>
        `;
        return;
    }

    const roots = getRootMembers();
    const renderedSet = new Set();

    roots.forEach(root => {
        const branch = createFamily(root, renderedSet);
        if (branch) {
            treeContainer.appendChild(branch);
        }
    });

    // Render any remaining members
    familyData.forEach(member => {
        if (!renderedSet.has(member.id)) {
            const branch = createFamily(member, renderedSet);
            if (branch) {
                treeContainer.appendChild(branch);
            }
        }
    });
}

// =========================================================
// MODAL & CRUD ACTIONS
// =========================================================

function openAddModal() {
    document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Family Member`;
    document.getElementById("edit-member-id").value = "";
    memberForm.reset();
    updateRelatedSelect();
    memberModal.classList.add("active");
}

function openEditMember(id) {
    const member = familyData.find(m => m.id === id);
    if (!member) return;

    document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Member`;
    document.getElementById("edit-member-id").value = member.id;
    document.getElementById("form-name").value = member.name || "";
    document.getElementById("form-gender").value = member.gender || "Male";
    document.getElementById("form-relation").value = member.relation || "Member";
    document.getElementById("form-dob").value = member.dob || "";
    document.getElementById("form-alive").value = String(member.alive ?? 1);
    document.getElementById("form-bio").value = member.bio || "";

    updateRelatedSelect(member.related_id);
    memberModal.classList.add("active");
}

function quickAddRelative(parentId) {
    openAddModal();
    updateRelatedSelect(parentId);
}

function closeModal() {
    memberModal.classList.remove("active");
    profileModal.classList.remove("active");
}

function viewMemberProfile(id) {
    const member = familyData.find(m => m.id === id);
    if (!member) return;

    const spouse = findSpouse(member);
    const children = familyData.filter(m => m.related_id === member.id && !isSpouseRelation(m.relation));
    const initials = member.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    const genderClass = (member.gender || "male").toLowerCase();

    const body = document.getElementById("profile-body");
    body.innerHTML = `
        <div class="profile-avatar-large ${genderClass}" style="background: ${member.gender === 'Female' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}">
            ${initials}
        </div>
        <div class="profile-name">${escapeHtml(member.name)}</div>
        <div class="profile-relation">
            <span class="relation-badge">${escapeHtml(member.relation)}</span>
        </div>

        <div class="profile-meta-grid">
            <div class="profile-meta-item">
                <small>Gender</small>
                <span>${escapeHtml(member.gender)}</span>
            </div>
            <div class="profile-meta-item">
                <small>Status</small>
                <span>${member.alive === 1 ? 'Living' : 'Deceased'}</span>
            </div>
            <div class="profile-meta-item">
                <small>Birth Date</small>
                <span>${member.dob ? escapeHtml(member.dob) : 'Unknown'}</span>
            </div>
            <div class="profile-meta-item">
                <small>Spouse</small>
                <span>${spouse ? escapeHtml(spouse.name) : 'None'}</span>
            </div>
        </div>

        ${member.bio ? `<div class="profile-bio"><p>${escapeHtml(member.bio)}</p></div>` : ''}

        ${children.length > 0 ? `
            <div style="margin-top: 15px; width: 100%; text-align: left;">
                <small style="color: #64748b; font-weight: 700; text-transform: uppercase;">Children (${children.length})</small>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                    ${children.map(c => `<span style="background: #e2e8f0; border-radius: 6px; padding: 3px 8px; font-size: 0.8rem;">${escapeHtml(c.name)}</span>`).join('')}
                </div>
            </div>
        ` : ''}
    `;

    profileModal.classList.add("active");
}

async function confirmDeleteMember(id) {
    const member = familyData.find(m => m.id === id);
    const name = member ? member.name : "this member";
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
        const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
            showToast("Member deleted successfully");
            fetchMembers();
        } else {
            showToast(data.message || "Failed to delete member", "error");
        }
    } catch (err) {
        showToast("Error communicating with server", "error");
    }
}

// =========================================================
// FORM SUBMISSION
// =========================================================
if (memberForm) {
    memberForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const editId = document.getElementById("edit-member-id").value;
        const payload = {
            name: document.getElementById("form-name").value.trim(),
            gender: document.getElementById("form-gender").value,
            relation: document.getElementById("form-relation").value,
            dob: document.getElementById("form-dob").value.trim(),
            alive: Number(document.getElementById("form-alive").value),
            related_id: document.getElementById("form-related-id").value || null,
            bio: document.getElementById("form-bio").value.trim()
        };

        try {
            const url = editId ? `/api/members/${editId}` : `/api/members`;
            const method = editId ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showToast(editId ? "Member updated" : "Member added to database");
                closeModal();
                fetchMembers();
            } else {
                showToast(data.message || "Error saving member", "error");
            }
        } catch (err) {
            showToast("Error saving to database", "error");
        }
    });
}

// =========================================================
// TOOLBAR & ZOOM & PAN
// =========================================================

function applyZoom(delta = 0, exact = null) {
    if (exact !== null) {
        currentZoom = exact;
    } else {
        currentZoom = Math.min(Math.max(currentZoom + delta, 0.4), 2.0);
    }
    treeContainer.style.transform = `scale(${currentZoom})`;
    document.getElementById("zoom-reset").textContent = `${Math.round(currentZoom * 100)}%`;
}

document.getElementById("zoom-in")?.addEventListener("click", () => applyZoom(0.1));
document.getElementById("zoom-out")?.addEventListener("click", () => applyZoom(-0.1));
document.getElementById("zoom-reset")?.addEventListener("click", () => applyZoom(0, 1.0));
document.getElementById("tree-center")?.addEventListener("click", () => {
    applyZoom(0, 1.0);
    treeViewport.scrollTo({
        left: (treeContainer.offsetWidth - treeViewport.clientWidth) / 2,
        top: 0,
        behavior: "smooth"
    });
});

// Viewport Mouse Drag Pan
treeViewport?.addEventListener("mousedown", (e) => {
    if (e.target.closest(".member-card") || e.target.closest("button")) return;
    isDragging = true;
    startX = e.pageX - treeViewport.offsetLeft;
    startY = e.pageY - treeViewport.offsetTop;
    scrollLeft = treeViewport.scrollLeft;
    scrollTop = treeViewport.scrollTop;
});

window.addEventListener("mouseup", () => isDragging = false);
treeViewport?.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - treeViewport.offsetLeft;
    const y = e.pageY - treeViewport.offsetTop;
    treeViewport.scrollLeft = scrollLeft - (x - startX);
    treeViewport.scrollTop = scrollTop - (y - startY);
});

// Search Input Filtering
searchInput?.addEventListener("input", function () {
    const q = searchInput.value.toLowerCase().trim();
    searchClearBtn?.classList.toggle("hidden", q === "");

    const cards = document.querySelectorAll(".member-card");
    cards.forEach(card => {
        if (!q) {
            card.classList.remove("search-match", "search-dim");
            return;
        }
        const name = card.getAttribute("data-name") || "";
        const rel = card.getAttribute("data-relation") || "";
        if (name.includes(q) || rel.includes(q)) {
            card.classList.add("search-match");
            card.classList.remove("search-dim");
        } else {
            card.classList.remove("search-match");
            card.classList.add("search-dim");
        }
    });
});

searchClearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
});

// Header Buttons
document.getElementById("btn-open-add")?.addEventListener("click", openAddModal);
document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
document.getElementById("modal-cancel-btn")?.addEventListener("click", closeModal);
document.getElementById("profile-close-btn")?.addEventListener("click", closeModal);

document.getElementById("btn-sample-tree")?.addEventListener("click", async () => {
    if (!confirm("Load 3-generation sample family tree? (This will reset current data)")) return;
    try {
        const res = await fetch("/api/reset-sample", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            showToast("Sample family tree loaded");
            fetchMembers();
        }
    } catch (err) {
        showToast("Error loading sample data", "error");
    }
});

document.getElementById("btn-clear-tree")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to clear the entire family tree database?")) return;
    try {
        const res = await fetch("/api/clear", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            showToast("Database cleared");
            fetchMembers();
        }
    } catch (err) {
        showToast("Error clearing tree", "error");
    }
});

document.getElementById("btn-export")?.addEventListener("click", () => {
    window.location.href = "/api/export";
});

// Helper Escape HTML
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initial Load
fetchMembers();
