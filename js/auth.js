class Auth {
    static async checkAuthStatus() {
        const token = localStorage.getItem('user_token');
        const userData = localStorage.getItem('user_data');

        if (!token || !userData) {
            if (window.location.pathname === '/') {
                this.showLoginPage();
            }
            return null;
        }

        try {
            const response = await fetch('/api/auth-check', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                this.logout();
                return null;
            }

            if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
                window.location.href = '/';
                return null;
            }

            if (window.location.pathname === '/') {
                this.showDashboard();
            }

            return JSON.parse(userData);
        } catch (error) {
            console.error('Auth check error:', error);
            this.logout();
            return null;
        }
    }

    static showLoginPage() {
        document.querySelector('.login-page')?.classList.remove('hidden');
        document.querySelector('.notes-container')?.classList.add('hidden');
    }

    static showDashboard() {
        if (!document.querySelector('.notes-container')) {
            const notesContainer = document.createElement('div');
            notesContainer.className = 'notes-container';
            notesContainer.innerHTML = `
                <div class="notes-header">
                    <div class="section-header">
                        <h2>My Notes</h2>
                        <button class="sort-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                                <path d="M3 6h18M7 12h10M11 18h2" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="search-bar">
                        <input type="text" class="search-input" placeholder="Search notes...">
                    </div>
                </div>
                <div id="notes-grid"></div>
                <button class="new-note-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                        <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            `;
            document.body.appendChild(notesContainer);
        }

        document.querySelector('.login-page')?.classList.add('hidden');
        document.querySelector('.notes-container')?.classList.remove('hidden');

        if (!window.noteManager) {
            window.noteManager = new NoteManager();
            window.noteManager.loadNotes();
        }
    }

    static async logout() {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.checkAuthStatus();
}); 