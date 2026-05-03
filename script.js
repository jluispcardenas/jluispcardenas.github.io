// Espera a que el DOM se cargue completamente
document.addEventListener('DOMContentLoaded', function() {

    // 1. Interactividad de la Galería: Cambiar la leyenda al hacer clic
    const photoCards = document.querySelectorAll('.photo-card');
    
    photoCards.forEach(card => {
        card.addEventListener('click', function() {
            const figcaption = this.querySelector('figcaption');
            const ponyNameSpan = figcaption.querySelector('.pony-name');
            const originalPonyName = ponyNameSpan.textContent;
            
            // Un mensaje temporal de otro poni fake
            ponyNameSpan.textContent = "¡Rainbow Joy dice:";
            const originalText = figcaption.lastChild.textContent;
            figcaption.lastChild.textContent = " \"¡Tu alegría es mágica, Kaitlyn! 🌈\"";
            
            // Volver al mensaje original después de 2 segundos
            setTimeout(() => {
                ponyNameSpan.textContent = originalPonyName;
                figcaption.lastChild.textContent = originalText;
            }, 2000);
        });
    });

    // 2. Efecto de Lluvia de Estrellas del Botón Mágico
    const magicButton = document.getElementById('magicButton');

    magicButton.addEventListener('click', function() {
        createSparkles();
    });

    function createSparkles() {
        const body = document.body;
        const numberOfSparkles = 20;

        for (let i = 0; i < numberOfSparkles; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            
            // Posicionamiento aleatorio
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            sparkle.style.left = x + 'px';
            sparkle.style.top = y + 'px';
            
            // Tamaño aleatorio
            const size = Math.random() * 20 + 10;
            sparkle.style.width = size + 'px';
            sparkle.style.height = size + 'px';

            // Animación aleatoria
            const animationDuration = Math.random() * 1.5 + 0.5;
            sparkle.style.animation = `sparkle-fall ${animationDuration}s linear forwards`;

            body.appendChild(sparkle);

            // Eliminar la chispa después de que la animación termine
            setTimeout(() => {
                sparkle.remove();
            }, animationDuration * 1000);
        }
    }
});

// Estilos de la chispa (añadir dinámicamente si no están en style.css)
const sparkleStyles = `
    .sparkle {
        position: fixed;
        background-color: var(--gold);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--white);
        pointer-events: none;
        opacity: 0.8;
        z-index: 1000;
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }

    @keyframes sparkle-fall {
        0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(200px) rotate(360deg);
            opacity: 0;
        }
    }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = sparkleStyles;
document.head.appendChild(styleSheet);
