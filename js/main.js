let allData = [];
let filteredData = [];

// Pagination state
let currentPage = 1;
const itemsPerPage = 30;

const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const continentFilter = document.getElementById('continentFilter');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('page-info');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

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
        pagination.classList.remove('hidden');
        
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
    
    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToRender = filteredData.slice(startIndex, endIndex);
    
    if (itemsToRender.length === 0) {
        gallery.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--fg-muted); font-family: var(--font-display); font-style: italic; font-size: 1.2rem; padding: 3rem;">Nessun campione trovato.</p>`;
    } else {
        itemsToRender.forEach((item) => {
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
    
    // Update pagination controls
    pageInfo.textContent = `Pagina ${currentPage} / ${totalPages} — ${filteredData.length} risultati`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
    
    btnPrev.style.opacity = currentPage === 1 ? '0.4' : '1';
    btnPrev.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    
    btnNext.style.opacity = currentPage === totalPages ? '0.4' : '1';
    btnNext.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
}

function filterData() {
    const term = searchInput.value.toLowerCase();
    const continent = continentFilter.value;
    
    filteredData = allData.filter(item => {
        const matchesTerm = item.nome.toLowerCase().includes(term) || item.provenienza.toLowerCase().includes(term);
        const matchesContinent = continent === 'all' || 
                                 item.continente === continent ||
                                 (continent === 'Americhe' && (item.continente === 'Nord America' || item.continente === 'Sud America'));
        return matchesTerm && matchesContinent;
    });
    
    currentPage = 1;
    renderPage();
}

// Event Listeners
searchInput.addEventListener('input', filterData);
continentFilter.addEventListener('change', filterData);

btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

btnNext.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// ── Google GeoChart ──
google.charts.load('current', {
  'packages':['geochart'],
});
google.charts.setOnLoadCallback(drawRegionsMap);

function drawRegionsMap() {
  const mapData = google.visualization.arrayToDataTable([
    ['Continente', 'Area'],
    ['002', 'Africa'], 
    ['150', 'Europa'], 
    ['019', 'Americhe'],
    ['142', 'Asia'], 
    ['009', 'Oceania']  
  ]);

  const options = {
    resolution: 'continents',
    backgroundColor: 'transparent',
    datalessRegionColor: '#e8e3d9',
    defaultColor: '#e8e3d9',
    colorAxis: {colors: ['#b8542a', '#b8542a']},
    legend: 'none',
    tooltip: { trigger: 'none' }
  };

  const container = document.getElementById('regions_div');
  if(!container) return;
  const chart = new google.visualization.GeoChart(container);
  
  google.visualization.events.addListener(chart, 'select', function() {
    const selection = chart.getSelection();
    if (selection.length > 0) {
      const code = mapData.getValue(selection[0].row, 0);
      let filterValue = 'all';
      
      if(code === '002') filterValue = 'Africa';
      else if(code === '150') filterValue = 'Europa';
      else if(code === '019') filterValue = 'Americhe';
      else if(code === '142') filterValue = 'Asia';
      else if(code === '009') filterValue = 'Oceania';
      
      continentFilter.value = filterValue;
      filterData();
      
      setTimeout(() => {
          document.querySelector('.controls-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });

  chart.draw(mapData, options);
}

// Initialize
window.addEventListener('DOMContentLoaded', loadData);
