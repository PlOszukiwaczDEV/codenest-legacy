// Theme management
class ThemeManager {
    constructor() {
        this.init();
        this.addListeners();
    }

    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeScript = document.createElement('script');
        themeScript.textContent = `
            (function() {
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
            })();
        `;
        document.head.appendChild(themeScript);
    }

    addListeners() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
                document.documentElement.setAttribute('data-theme', e.newValue);
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            const themeToggles = document.querySelectorAll('.theme-toggle');
            themeToggles.forEach(toggle => {
                toggle.addEventListener('click', () => this.toggleTheme());
            });
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
}

const themeManager = new ThemeManager(); 