document.addEventListener("DOMContentLoaded", () => {
    const galleryContainer = document.getElementById("gallery");
    
    if (galleryContainer) {
        const totalImagenes = 19;
        const subdirectorio = "img/gallery/";
        let fotoActual = 1;

        // Creamos una única etiqueta img que irá rotando de fuente
        const imgElement = document.createElement("img");
        imgElement.classList.add("gallery-slide");
        
        const cambiarFoto = () => {
            const numeroFormateado = String(fotoActual).padStart(3, '0');
            imgElement.src = `${subdirectorio}gallery${numeroFormateado}.jpg`;
            imgElement.alt = `Registro de actividades de la cátedra - Foto ${fotoActual}`;
        };

        // Inicializamos con la primera foto
        cambiarFoto();
        galleryContainer.appendChild(imgElement);

        // Cambia la imagen automáticamente sin romper el efecto tilt externo
        setInterval(() => {
            fotoActual++;
            if (fotoActual > totalImagenes) {
                fotoActual = 1;
            }
            cambiarFoto();
        }, 3500);
    }
});