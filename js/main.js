let allData = [];
let filteredData = [];

const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const continentFilter = document.getElementById('continentFilter');

// Fallback image url
const FALLBACK_IMG = "https://placehold.co/600x400/e8e3d9/6b6660?text=Anteprima%0ANon+Disponibile&font=playfair-display";

// ── IntersectionObserver for staggered card reveals ──
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            // Stagger the reveal based on position in view
            const card = entry.target;
            const delay = Array.from(card.parentElement.children).indexOf(card) % 6;
            card.style.transitionDelay = `${delay * 0.06}s`;
            card.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
            card.classList.add('revealed');
            revealObserver.unobserve(card);
        }
    });
}, {
    threshold: 0.05,
    rootMargin: '0px 0px -30px 0px'
});

async function loadData() {
    try {
        const response = await fetch('dati.json');
        if (!response.ok) throw new Error("Errore nel caricamento dei dati");
        allData = await response.json();
        filteredData = [...allData];
        
        loading.classList.add('hidden');
        gallery.classList.remove('hidden');
        
        // Update sample count in header
        const countEl = document.getElementById('sampleCount');
        if (countEl) {
            countEl.textContent = `${allData.length} campioni catalogati`;
        }

        renderPage();
    } catch (error) {
        console.error(error);
        loading.textContent = "Errore durante il caricamento del database.";
    }
}

function renderPage() {
    gallery.innerHTML = '';
    
    if (filteredData.length === 0) {
        gallery.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--fg-muted); font-family: var(--font-display); font-style: italic; font-size: 1.2rem; padding: 3rem;">Nessun campione trovato.</p>`;
    } else {
        filteredData.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'card';
            
            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${item.immagine}" class="card-img" alt="${item.nome}" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK_IMG}';">
                </div>
                <div class="card-content">
                    <div style="margin-bottom: 0.5rem;">
                        <span class="badge">${item.continente}</span>
                    </div>
                    <h3 class="card-title">${item.nome}</h3>
                    <p class="card-subtitle">📍 ${item.provenienza}</p>
                    <div class="card-footer">
                        <a href="dettaglio.html?id=${item.id}" class="btn">Visualizza Scheda</a>
                    </div>
                </div>
            `;
            gallery.appendChild(card);
            
            // Observe each card for staggered reveal
            revealObserver.observe(card);
        });
    }
}

const searchAliases = {
    "italia": ["italy", "italia", "sardegna", "sicilia", "venezia", "roma", "belluno"],
    "usa": ["usa", "california", "wyoming", "massachusetts", "florida", "arizona", "utah", "new mexico", "illinois", "connecticut", "alabama", "cape cod"],
    "spagna": ["spain", "spagna", "spagin", "tenerife", "lanzarote", "fuerteventura", "canarie"],
    "francia": ["france", "francia", "corsica"],
    "regno unito": ["regno unito", "uk", "gran bretagna", "galles", "scozia", "inghilterra", "irlanda del nord"],
    "messico": ["mexico", "messico"],
    "sudafrica": ["sudafrica", "sud africa"],
    "brasile": ["brasile", "brazil"],
    "olanda": ["olanda", "netherlands"],
    "egitto": ["egitto", "egypt"],
    "marocco": ["marocco", "morocco"]
};

function filterData() {
    const rawTerm = searchInput.value.toLowerCase().trim();
    const continent = continentFilter.value;
    
    let searchTerms = [rawTerm];
    let isAliasSearch = false;
    
    // Controlla se il termine corrisponde a una delle nazioni con alias
    for (const [key, aliases] of Object.entries(searchAliases)) {
        if (key === rawTerm || aliases.includes(rawTerm)) {
            // Se c'è un match, cerchiamo tutte le varianti
            searchTerms = [...aliases, key];
            isAliasSearch = true;
            break;
        }
    }
    
    // Creiamo regex con boundary \b per evitare che "roma" trovi "romania" o "usa" trovi "siracusa"
    const regexes = isAliasSearch ? searchTerms.map(t => new RegExp(`\\b${t}\\b`, 'i')) : [];
    
    filteredData = allData.filter(item => {
        const itemNome = item.nome.toLowerCase();
        const itemProv = item.provenienza.toLowerCase();
        
        let matchesTerm = false;
        if (rawTerm === '') {
            matchesTerm = true;
        } else if (isAliasSearch) {
            matchesTerm = regexes.some(r => r.test(itemNome) || r.test(itemProv));
        } else {
            matchesTerm = searchTerms.some(t => itemNome.includes(t) || itemProv.includes(t));
        }
        
        const matchesContinent = continent === 'all' || 
                                 item.continente === continent ||
                                 (continent === 'Americhe' && (item.continente === 'Nord America' || item.continente === 'Sud America'));
        return matchesTerm && matchesContinent;
    });
    
    renderPage();
}

// Event Listeners
searchInput.addEventListener('input', filterData);
continentFilter.addEventListener('change', filterData);

// ── Mappa Leaflet Interattiva ──
let map;
let geojsonLayer;

const countryNameMap = {
    "United States of America": "USA",
    "Italy": "Italia",
    "Egypt": "Egitto",
    "Morocco": "Marocco",
    "Netherlands": "Olanda",
    "South Africa": "Sudafrica",
    "Dominican Republic": "Repubblica Dominicana",
    "Mexico": "Messico",
    "Greece": "Grecia",
    "Croatia": "Croazia",
    "Philippines": "Filippine",
    "United Kingdom": "Regno Unito",
    "Japan": "Giappone",
    "China": "Cina",
    "Germany": "Germania",
    "France": "Francia",
    "Spain": "Spagna",
    "Brazil": "Brasile"
};

function initMap() {
    map = L.map('map').setView([20, 0], 2);
    
    // Mappa di base con stile chiaro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Carica i confini dal file GeoJSON locale
    fetch('countries.geo.json')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: '#e8e3d9',
                        weight: 1,
                        opacity: 1,
                        color: '#a39c93',
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function(feature, layer) {
                    layer.on({
                        mouseover: function(e) {
                            var targetLayer = e.target;
                            targetLayer.setStyle({
                                fillColor: '#b8542a',
                                fillOpacity: 0.6,
                                color: '#8a3c1c',
                                weight: 2
                            });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                                targetLayer.bringToFront();
                            }
                        },
                        mouseout: function(e) {
                            geojsonLayer.resetStyle(e.target);
                        },
                        click: function(e) {
                            const rawName = feature.properties.name;
                            const mappedName = countryNameMap[rawName] || rawName;
                            
                            searchInput.value = mappedName;
                            continentFilter.value = 'all'; // Reset continente
                            filterData();
                            
                            setTimeout(() => {
                                document.querySelector('.controls-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                        }
                    });
                    
                    layer.bindTooltip(feature.properties.name, {
                        className: 'map-tooltip',
                        sticky: true
                    });
                }
            }).addTo(map);
        })
        .catch(err => console.error("Errore nel caricamento della mappa:", err));
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    initMap();
});
