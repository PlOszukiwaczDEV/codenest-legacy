class AnimationManager {
    constructor() {
        this.initBackgroundAnimations();
        this.initInteractionAnimations();
    }

    initBackgroundAnimations() {
        document.addEventListener('mousemove', (e) => {
            const shapes = document.querySelectorAll('.shape');
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 2;
                const moveX = (x - 0.5) * speed;
                const moveY = (y - 0.5) * speed;

                shape.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }

    initInteractionAnimations() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                
                button.appendChild(ripple);
                setTimeout(() => ripple.remove(), 1000);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnimationManager();
}); 