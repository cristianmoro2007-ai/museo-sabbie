const FALLBACK_IMG = "https://placehold.co/600x400/c29b62/111?text=Immagine\\nNon+Disponibile";

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

    // Generate QR Code dynamically pointing to the current exact URL
    const currentUrl = window.location.href;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ""; // clear any previous qr
    
    new QRCode(qrContainer, {
        text: currentUrl,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function showError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error-container').classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', loadDetail);
