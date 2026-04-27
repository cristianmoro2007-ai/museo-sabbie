const FALLBACK_IMG = "https://placehold.co/600x800/e8e3d9/6b6660?text=Immagine%0ANon+Disponibile&font=playfair-display";

async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (!id) {
        showError();
        return;
    }

    try {
        const response = await fetch('dati.json');
        if (!response.ok) throw new Error("Database non trovato");
        
        const data = await response.json();
        const item = data.find(s => s.id === id);
        
        if (item) {
            renderDetail(item);
        } else {
            showError();
        }
    } catch (error) {
        console.error(error);
        showError();
    }
}

function renderDetail(item) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('detail-container').classList.remove('hidden');

    // Update page title
    document.title = `${item.nome} — Museo Digitale delle Sabbie`;

    const img = document.getElementById('detail-img');
    img.src = item.immagine;
    img.onerror = function() {
        this.onerror = null;
        this.src = FALLBACK_IMG;
    };
    
    img.alt = item.nome;
    
    document.getElementById('detail-title').textContent = item.nome;
    document.getElementById('detail-badge').textContent = item.continente;
    document.getElementById('detail-prov').textContent = item.provenienza;
    document.getElementById('detail-id').textContent = item.id;
    document.getElementById('detail-desc').textContent = item.descrizione;

    // Generate QR Code
    const currentUrl = window.location.href;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    
    new QRCode(qrContainer, {
        text: currentUrl,
        width: 150,
        height: 150,
        colorDark : "#1c1b18",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // ── Mini-map + Google Earth ──
    initLocationSection(item);
}

async function initLocationSection(item) {
    const locationSection = document.getElementById('location-section');
    const earthLink = document.getElementById('google-earth-link');
    const label = document.getElementById('location-label');

    locationSection.classList.remove('hidden');
    label.textContent = "Ricerca posizione in corso...";
    
    // Default fallback link using text search in Google Earth
    const searchQuery = encodeURIComponent(item.provenienza);
    earthLink.href = `https://earth.google.com/web/search/${searchQuery}`;

    try {
        // Geocoding on the fly via Nominatim API
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            
            label.textContent = `${item.provenienza} — ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
            
            // Update Google Earth link to specific coordinates
            earthLink.href = `https://earth.google.com/web/@${lat},${lng},10000a,1000d,35y,0h,0t,0r`;

            // Setup 3D Globe with Globe.gl
            const minimapContainer = document.getElementById('detail-minimap');
            minimapContainer.innerHTML = '';
            
            const globe = Globe()(minimapContainer)
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundColor('rgba(0,0,0,0)')
                .width(minimapContainer.clientWidth)
                .height(minimapContainer.clientHeight)
                .pointsData([{ lat: lat, lng: lng }])
                .pointAltitude(0.02)
                .pointColor(() => '#b8542a')
                .pointRadius(() => 1.2)
                .pointResolution(32);

            // Set initial camera position to the location
            setTimeout(() => {
                globe.pointOfView({ lat: lat, lng: lng, altitude: 1.8 }, 2000);
            }, 300);

            // Auto-rotate the globe slowly
            globe.controls().autoRotate = true;
            globe.controls().autoRotateSpeed = 0.8;
            globe.controls().enableZoom = false; // Disable zoom to keep it contained
            
            window.addEventListener('resize', () => {
                if (minimapContainer.clientWidth) {
                    globe.width(minimapContainer.clientWidth);
                    globe.height(minimapContainer.clientHeight);
                }
            });

        } else {
            // Geocoding failed, hide map but keep Earth link text search
            document.getElementById('detail-minimap').style.display = 'none';
            label.textContent = `Posizione: ${item.provenienza}`;
        }
    } catch (e) {
        console.error("Geocoding error:", e);
        document.getElementById('detail-minimap').style.display = 'none';
        label.textContent = `Posizione: ${item.provenienza}`;
    }
}

function showError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error-container').classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', loadDetail);
