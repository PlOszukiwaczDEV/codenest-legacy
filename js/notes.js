window.NoteManager = class NoteManager {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes') || '[]');
        this.tags = {
            html: { color: '#fff', background: '#E34F26' },
            javascript: { color: '#000', background: '#F7DF1E' },
            css: { color: '#fff', background: '#1572B6' },
            python: { color: '#fff', background: '#3776AB' },
            react: { color: '#000', background: '#61DAFB' },
            nodejs: { color: '#fff', background: '#339933' },
            php: { color: '#fff', background: '#777BB4' },
            sql: { color: '#fff', background: '#4479A1' },
            ruby: { color: '#fff', background: '#CC342D' }
        };
        this.currentSort = localStorage.getItem('currentSort') || 'recent';
        this.setupSortButton();
        this.sidebarState = {
            isOpen: false,
            title: '',
            content: '',
            tags: [],
            noteId: null
        };
    }

    setupSortButton() {
        const sortBtn = document.querySelector('.sort-btn');
        if (!sortBtn) return;

        if (this.notes.length === 0) {
            sortBtn.disabled = true;
            sortBtn.style.opacity = '0.5';
            sortBtn.style.cursor = 'not-allowed';
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'sort-dropdown';
        dropdown.innerHTML = `
            <div class="sort-option ${this.currentSort === 'recent' ? 'active' : ''}" data-sort="recent">Recently Edited</div>
            <div class="sort-option ${this.currentSort === 'created' ? 'active' : ''}" data-sort="created">Creation Date</div>
            <div class="sort-option ${this.currentSort === 'alpha' ? 'active' : ''}" data-sort="alpha">Alphabetical</div>
        `;
        
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.appendChild(dropdown);
        }
        
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.sort-option');
            if (option) {
                this.currentSort = option.dataset.sort;
                localStorage.setItem('currentSort', this.currentSort);
                
                dropdown.querySelectorAll('.sort-option').forEach(opt => {
                    opt.classList.toggle('active', opt === option);
                });
                
                this.loadNotes();
                dropdown.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!sortBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    loadNotes() {
        const notesGrid = document.getElementById('notes-grid');
        const sortBtn = document.querySelector('.sort-btn');
        if (!notesGrid) return;

        notesGrid.innerHTML = '';

        let sortedNotes = [...this.notes];
        
        if (sortBtn) {
            if (sortedNotes.length === 0) {
                sortBtn.disabled = true;
                sortBtn.style.opacity = '0.5';
                sortBtn.style.cursor = 'not-allowed';
            } else {
                sortBtn.disabled = false;
                sortBtn.style.opacity = '1';
                sortBtn.style.cursor = 'pointer';
            }
        }

        switch (this.currentSort) {
            case 'recent':
                sortedNotes.sort((a, b) => new Date(b.updated) - new Date(a.updated));
                break;
            case 'created':
                sortedNotes.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'alpha':
                sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }

        if (sortedNotes.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-content">
                        <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        <h3>No Notes Yet</h3>
                        <p>Click the + button to create your first note.</p>
                    </div>
                </div>
            `;
        } else {
            sortedNotes.forEach(note => this.renderNoteCard(note, notesGrid));
        }
    }

    createNote(data) {
        const note = {
            id: Date.now().toString(),
            title: data.title,
            content: data.content,
            tags: data.tags,
            pinned: false,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.notes.unshift(note);
        this.saveNotes();
        return note;
    }

    updateNote(id, data) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index !== -1) {
            this.notes[index] = {
                ...this.notes[index],
                ...data,
                updated: new Date().toISOString(),
                tags: data.tags || []
            };
            localStorage.setItem('notes', JSON.stringify(this.notes));
            this.loadNotes();
        }
    }

    deleteNote(id) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index === -1) return false;

        const deletedNote = this.notes.splice(index, 1)[0];
        this.saveNotes();

        localStorage.setItem('lastDeletedNote', JSON.stringify(deletedNote));
        this.showUndoNotification();

        return true;
    }

    undoDelete() {
        const lastDeleted = JSON.parse(localStorage.getItem('lastDeletedNote'));
        if (!lastDeleted) return false;

        this.notes.unshift(lastDeleted);
        this.saveNotes();
        localStorage.removeItem('lastDeletedNote');
        return true;
    }

    togglePin(id) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return false;

        note.pinned = !note.pinned;
        this.saveNotes();
        return true;
    }

    searchNotes(query) {
        if (!query) {
            this.loadNotes();
            return this.notes;
        }

        const searchParams = this.parseSearchQuery(query);
        const filteredNotes = this.notes.filter(note => {
            if (searchParams.tag && !note.tags.includes(searchParams.tag)) return false;
            
            if (searchParams.date) {
                const noteDate = note.created.split('T')[0];
                if (noteDate !== searchParams.date) return false;
            }

            if (searchParams.keywords.length > 0) {
                const noteText = `${note.title} ${note.content}`.toLowerCase();
                return searchParams.keywords.every(keyword => 
                    noteText.includes(keyword.toLowerCase())
                );
            }

            return true;
        });

        this.renderFilteredNotes(filteredNotes);
        return filteredNotes;
    }

    parseSearchQuery(query) {
        const params = {
            tag: null,
            date: null,
            keywords: []
        };

        const words = query.split(' ');
        words.forEach(word => {
            if (word.startsWith('tag:')) {
                params.tag = word.slice(4);
            } else if (word.startsWith('date:')) {
                params.date = word.slice(5);
            } else {
                params.keywords.push(word);
            }
        });

        return params;
    }

    saveNotes() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
        this.loadNotes();
    }

    showUndoNotification() {
        const notification = document.createElement('div');
        notification.className = 'undo-notification';
        notification.innerHTML = `
            Note deleted. <button class="undo-btn">Undo</button>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);

        notification.querySelector('.undo-btn').addEventListener('click', () => {
            this.undoDelete();
            notification.remove();
        });
    }

    renderNotes() {
        const pinnedGrid = document.getElementById('pinned-notes-grid');
        const recentGrid = document.getElementById('recent-notes-grid');
        const allGrid = document.getElementById('all-notes-grid');

        if (!pinnedGrid || !recentGrid || !allGrid) return;

        pinnedGrid.innerHTML = '';
        recentGrid.innerHTML = '';
        allGrid.innerHTML = '';

        const pinnedNotes = this.notes.filter(note => note.pinned);
        const unpinnedNotes = this.notes.filter(note => !note.pinned);
        const recentNotes = [...this.notes]
            .sort((a, b) => new Date(b.updated) - new Date(a.updated))
            .slice(0, 5);

        pinnedNotes.forEach(note => this.renderNoteCard(note, pinnedGrid));
        recentNotes.forEach(note => this.renderNoteCard(note, recentGrid));
        unpinnedNotes.forEach(note => this.renderNoteCard(note, allGrid));
    }

    renderNoteCard(note, container) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <div class="note-header">
                <h3>${note.title}</h3>
                <div class="note-actions">
                    <button class="edit-btn" data-id="${note.id}" data-tooltip="Edit Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-btn" data-id="${note.id}" data-tooltip="Delete Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="note-preview">${this.getPreview(note.content)}</div>
            <div class="note-tags">
                ${(note.tags || []).map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('')}
            </div>
            <div class="note-meta">
                Updated ${this.formatDate(note.updated)}
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.note-actions')) {
                this.showNoteModal(note);
            }
        });

        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeNoteModal();
            openNoteSidebar(note.id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this note?')) {
                this.deleteNote(note.id);
                this.closeNoteModal();
            }
        });

        container.appendChild(card);
    }

    getPreview(content) {
        return content.slice(0, 150) + (content.length > 150 ? '...' : '');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    renderFilteredNotes(filteredNotes) {
        const allGrid = document.getElementById('all-notes-grid');
        if (!allGrid) return;

        allGrid.innerHTML = '';

        filteredNotes.forEach(note => this.renderNoteCard(note, allGrid));

        const pinnedSection = document.querySelector('.pinned-notes');
        const recentSection = document.querySelector('.recent-notes');
        
        if (pinnedSection) {
            pinnedSection.style.display = 'none';
        }
        if (recentSection) {
            recentSection.style.display = 'none';
        }
    }

    createEditSidebar(note) {
        return `
            <div class="sidebar-header">
                <h3>Edit Note</h3>
                <button class="close-sidebar">×</button>
            </div>
            <div class="sidebar-content">
                <input type="text" class="note-title" placeholder="Note Title" value="${note.title || ''}">
                <textarea class="note-content" placeholder="Write your note here...">${note.content || ''}</textarea>
                <div class="tag-selector">
                    <!-- Add your tag options here -->
                </div>
                <button class="save-note">Save Changes</button>
            </div>
        `;
    }

    showNoteModal(note) {
        this.saveSidebarState();
        
        const sidebar = document.getElementById('note-sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }

        const modal = document.createElement('div');
        modal.className = 'note-modal-overlay';
        modal.innerHTML = `
            <div class="note-modal">
                <div class="note-modal-header">
                    <div class="note-modal-title">
                        <h2>${note.title}</h2>
                    </div>
                    <div class="note-modal-actions">
                        <button class="pin-btn" data-id="${note.id}" title="${note.pinned ? 'Unpin note' : 'Pin note'}">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="${note.pinned ? 'currentColor' : 'none'}">
                                <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
                                <path d="M15 3v6h6"/>
                            </svg>
                        </button>
                        <button class="edit-btn" data-id="${note.id}" title="Edit note">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                        </button>
                        <button class="delete-btn" data-id="${note.id}" title="Delete note">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="note-modal-tags">
                    ${(note.tags || []).map(tag => `
                        <span class="tag" data-tag="${tag}" style="
                            color: ${this.tags[tag]?.color};
                            background: ${this.tags[tag]?.background}">
                            ${tag}
                        </span>
                    `).join('')}
                </div>
                <div class="note-modal-content markdown-body">
                    ${marked.parse(note.content)}
                </div>
                <div class="note-modal-meta">
                    Updated ${this.formatDate(note.updated)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.classList.add('active');
            modal.querySelector('.note-modal').classList.add('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeNoteModal();
            }
        });

        const editBtn = modal.querySelector('.edit-btn');
        const deleteBtn = modal.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => {
            this.closeNoteModal();
            openNoteSidebar(note.id);
        });

        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this note?')) {
                this.deleteNote(note.id);
                this.closeNoteModal();
            }
        });

        document.addEventListener('keydown', this.handleEscapeKey);
    }

    closeNoteModal() {
        const modal = document.querySelector('.note-modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            modal.querySelector('.note-modal').classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    }

    handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            this.closeNoteModal();
        }
    }

    saveSidebarState(noteId = null) {
        const sidebar = document.getElementById('note-sidebar');
        if (sidebar) {
            this.sidebarState = {
                isOpen: sidebar.classList.contains('active'),
                title: sidebar.querySelector('.note-title')?.value || '',
                content: sidebar.querySelector('.note-content')?.value || '',
                tags: Array.from(sidebar.querySelectorAll('.tag-option input:checked')).map(input => input.value),
                noteId: noteId
            };
        }
    }

    restoreSidebarState() {
        const sidebar = document.getElementById('note-sidebar');
        if (sidebar && this.sidebarState.isOpen) {
            const titleInput = sidebar.querySelector('.note-title');
            const contentInput = sidebar.querySelector('.note-content');
            const tagInputs = sidebar.querySelectorAll('.tag-option input');

            if (titleInput) titleInput.value = this.sidebarState.title;
            if (contentInput) contentInput.value = this.sidebarState.content;
            tagInputs.forEach(input => {
                input.checked = this.sidebarState.tags.includes(input.value);
            });
        }
    }

    static showDashboard() {
        if (!document.querySelector('.dashboard-container')) {
            const dashboard = document.createElement('div');
            dashboard.className = 'dashboard-container';
            dashboard.innerHTML = `
                <div class="dashboard-header">
                    <div class="header-left">
                        <svg class="app-logo" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:var(--accent-color)" />
                                    <stop offset="100%" style="stop-color:var(--hover-color)" />
                                </linearGradient>
                            </defs>
                            <path class="logo-shape" d="M30 20 L45 10 L70 10 L85 25 L85 75 L70 90 L45 90 L30 80" 
                                fill="none" stroke="url(#logoGradient)" stroke-width="4" 
                                stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <h1>CodeNest</h1>
                    </div>
                    <div class="user-info">
                        <button class="theme-toggle-btn">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </button>
                        <button class="logout-btn">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>

                <div class="notes-sections">
                    <div class="section">
                        <div class="section-header">
                            <h2>My Notes</h2>
                            <div class="header-actions">
                                <button class="sort-btn" title="Sort notes">
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                                        <path d="M3 6h18M7 12h10M11 18h2" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </button>
                                <div class="search-bar">
                                    <input type="text" class="search-input" placeholder="Search notes...">
                                    <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <div id="pinned-notes-grid" class="notes-grid"></div>
                        <div id="recent-notes-grid" class="notes-grid"></div>
                        <div id="notes-grid" class="notes-grid"></div>
                    </div>
                </div>

                <button class="new-note-btn" title="Create new note">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                        <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>

                <div id="note-sidebar" class="note-sidebar">
                    <!-- Sidebar content will be dynamically inserted -->
                </div>
            `;

            document.body.appendChild(dashboard);
            setupEventListeners(dashboard);
        }

        document.querySelector('.login-page')?.classList.add('hidden');
        document.querySelector('.dashboard-container')?.classList.remove('hidden');

        if (!window.noteManager) {
            window.noteManager = new NoteManager();
            window.noteManager.loadNotes();
        }
    }
}

window.noteManager = new NoteManager();

function openNoteSidebar(noteId = null) {
    const sidebar = document.getElementById('note-sidebar');
    if (!sidebar) return;

    const note = noteId ? window.noteManager.notes.find(n => n.id === noteId) : null;
    
    sidebar.className = 'note-sidebar active';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h3>${note ? 'Edit Note' : 'New Note'}</h3>
            <button class="close-sidebar">×</button>
        </div>
        <div class="sidebar-content">
            <input type="text" class="note-title" placeholder="Note title" value="${note?.title || ''}">
            <div class="editor-controls">
                <div class="preview-toggle">
                    <button class="edit-mode active">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="preview-mode">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Preview
                    </button>
                </div>
            </div>
            <div class="edit-view active">
                <textarea class="note-content" placeholder="Write your note here... (Markdown supported)">${note?.content || ''}</textarea>
                <div class="char-counter">0/6000</div>
                <div class="tag-selector">
                    ${Object.keys(window.noteManager.tags).map(tag => `
                        <label class="tag-option">
                            <input type="checkbox" value="${tag}" ${note?.tags?.includes(tag) ? 'checked' : ''}>
                            <span class="tag" data-tag="${tag}">${tag}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="save-note-container">
                    <button class="save-note">
                        ${note ? 
                            `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>` : 
                            `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>`
                        }
                        ${note ? 'Update' : 'Create'} Note
                    </button>
                    <div class="error-message"></div>
                </div>
            </div>
            <div class="preview-view markdown-body">
                <!-- Preview content will be rendered here -->
            </div>
        </div>
    `;

    const elements = {
        titleInput: sidebar.querySelector('.note-title'),
        contentInput: sidebar.querySelector('.note-content'),
        saveButton: sidebar.querySelector('.save-note'),
        errorMessage: sidebar.querySelector('.error-message'),
        charCounter: sidebar.querySelector('.char-counter'),
        editMode: sidebar.querySelector('.edit-mode'),
        previewMode: sidebar.querySelector('.preview-mode'),
        editView: sidebar.querySelector('.edit-view'),
        previewView: sidebar.querySelector('.preview-view')
    };

    function updateFormState() {
        const count = elements.contentInput.value.length;
        elements.charCounter.textContent = `${count}/6000`;
        elements.charCounter.style.color = count > 6000 ? 'var(--error-color)' : 'var(--text-secondary)';
        
        const title = elements.titleInput.value.trim();
        const content = elements.contentInput.value.trim();
        
        if (!title || !content) {
            elements.errorMessage.textContent = 'Title and content are required';
            elements.errorMessage.style.display = 'block';
            elements.saveButton.disabled = true;
        } else if (content.length > 6000) {
            elements.errorMessage.textContent = `Content exceeds 6000 characters (${content.length}/6000)`;
            elements.errorMessage.style.display = 'block';
            elements.saveButton.disabled = true;
        } else {
            elements.errorMessage.style.display = 'none';
            elements.saveButton.disabled = false;
        }
    }

    elements.saveButton.addEventListener('click', async () => {
        const title = elements.titleInput.value.trim();
        const content = elements.contentInput.value.trim();
        const tagInputs = sidebar.querySelectorAll('.tag-option input:checked');
        const tags = Array.from(tagInputs).map(input => input.value);

        try {
            if (note) {
                await window.noteManager.updateNote(note.id, { title, content, tags });
            } else {
                await window.noteManager.createNote({ title, content, tags });
            }
            sidebar.classList.remove('active');
        } catch (error) {
            elements.errorMessage.textContent = error.message;
            elements.errorMessage.style.display = 'block';
        }
    });

    elements.editMode.addEventListener('click', () => {
        elements.editMode.classList.add('active');
        elements.previewMode.classList.remove('active');
        elements.editView.classList.add('active');
        elements.previewView.classList.remove('active');
    });

    elements.previewMode.addEventListener('click', () => {
        elements.previewMode.classList.add('active');
        elements.editMode.classList.remove('active');
        elements.previewView.classList.add('active');
        elements.editView.classList.remove('active');
        elements.previewView.innerHTML = marked.parse(elements.contentInput.value);
    });

    elements.titleInput.addEventListener('input', updateFormState);
    elements.contentInput.addEventListener('input', updateFormState);
    
    updateFormState();

    const closeButton = sidebar.querySelector('.close-sidebar');
    closeButton.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
}

function setupEventListeners(container) {
    container.querySelector('.new-note-btn')?.addEventListener('click', () => {
        openNoteSidebar();
    });

    const searchInput = container.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const results = window.noteManager.searchNotes(e.target.value);
            window.noteManager.renderFilteredNotes(results);
        }, 300));
    }

    container.querySelector('.logout-btn')?.addEventListener('click', () => {
        document.cookie = 'user_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/';
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 