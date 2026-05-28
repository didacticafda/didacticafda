const tiltElements = document.querySelectorAll('.tilt-element');

tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    el.addEventListener('mouseleave', () => {
        el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
});

const container = document.getElementById('blobs-container');
if (container && window.innerWidth > 768) {
    const colors = ['rgba(116,172,223,0.3)','rgba(46,96,145,0.7)','rgba(177,223,250,0.4)','rgba(231,136,36,0.2)','rgba(222,74,152,0.3)','rgba(142,73,155,0.1)','rgba(37,150,221,0.4)','rgba(28,136,197,0.3)'];
    const numBlobs = 35;
    for (let i = 0; i < numBlobs; i++) {
        const blob = document.createElement('div');
        blob.classList.add('blob-circle');
        const size = Math.floor(Math.random() * 250) + 120;
        blob.style.width = `${size}px`;
        blob.style.height = `${size}px`;
        blob.style.top = `${Math.random() * 100}%`;
        blob.style.left = `${Math.random() * 70}%`;
        blob.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const blur = Math.random() < 0.5 ? (50 + Math.random()*100) : (10 + Math.random()*20);
        blob.style.filter = `blur(${blur}px)`;
        container.appendChild(blob);
        animateBlob(blob);
    }
    function animateBlob(blob) {
        const moveX = (Math.random() - 0.8) * 500;
        const moveY = (Math.random() - 0.5) * 920;
        const duration = 10000 + Math.random()*5000;
        blob.animate([{ transform: 'translate(0,0)' },{ transform: `translate(${moveX}px, ${moveY}px)` },{ transform: 'translate(0,0)' }], { duration: duration, iterations: Infinity, easing: 'ease-in-out' });
    }
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth - 1.5;
        const y = e.clientY / window.innerHeight - 0.5;
        document.querySelectorAll('.blob-circle').forEach((blob, i) => {
            blob.style.transform = `translate(${x * (20+i)}px, ${y * (20+i)}px)`;
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    function actualizarImagenesTema() {
        const temaActual = document.documentElement.getAttribute("data-theme");
        const logo = document.getElementById("logo-navbar");
        if (logo) logo.src = temaActual === "dark" ? "img/logodark.svg" : "img/logod.svg";
        const banner = document.getElementById("banner-memoria");
        if (banner) banner.src = temaActual === "dark" ? "img/banner_dm.svg" : "img/banner_lm.svg";
    }

    const htmlElement = document.documentElement; 
    const temaGuardado = localStorage.getItem("tema-manual");
    const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (temaGuardado === "dark" || (!temaGuardado && prefiereOscuro)) {
        htmlElement.setAttribute("data-theme", "dark");
    } else {
        htmlElement.setAttribute("data-theme", "light");
    }
    
    setTimeout(actualizarImagenesTema, 500);

    const observer = new MutationObserver(() => {
        const btnTema = document.getElementById("btn-tema");
        if (btnTema) {
            const temaActual = htmlElement.getAttribute("data-theme");
            btnTema.innerHTML = temaActual === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            observer.disconnect(); 
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

document.addEventListener("click", (e) => {
    const btnTema = e.target.closest("#btn-tema");
    if (btnTema) {
        e.preventDefault();
        const root = document.documentElement;
        const temaActual = root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const nuevoTema = temaActual === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", nuevoTema);
        localStorage.setItem("tema-manual", nuevoTema);
        const logo = document.getElementById("logo-navbar");
        if (logo) logo.src = nuevoTema === "dark" ? "img/logodark.svg" : "img/logod.svg";
        const banner = document.getElementById("banner-memoria");
        if (banner) banner.src = nuevoTema === "dark" ? "img/banner_dm.svg" : "img/banner_lm.svg";
        const icono = btnTema.querySelector("i");
        if (icono) icono.className = nuevoTema === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}); 