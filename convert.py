import csv
import json
import os

input_file = 'dati.csv'
output_file = 'dati.json'

data = []

with open(input_file, mode='r', encoding='utf-8') as f:
    reader = csv.reader(f)
    # Skip first 3 lines
    next(reader)
    next(reader)
    next(reader)
    
    for row in reader:
        if not row or len(row) < 9: 
            continue
            
        # extract data
        id_str = row[0].strip()
        if not id_str:
            continue
            
        localita = row[1].strip()
        nazione = row[6].strip()
        continente = row[7].strip()
        
        # Normalizzazione continenti
        c_lower = continente.lower()
        if 'europe' in c_lower or 'italy' in c_lower or 'europa' in c_lower:
            continente = 'Europa'
        elif 'africa' in c_lower or 'sudafrica' in c_lower:
            continente = 'Africa'
        elif 'asia' in c_lower:
            continente = 'Asia'
        elif 'oceania' in c_lower:
            continente = 'Oceania'
        elif 'nord' in c_lower or 'usa' in c_lower or 'north' in c_lower:
            continente = 'Nord America'
        elif 'sud' in c_lower or 'centr' in c_lower or 'america' in c_lower:
            continente = 'Sud America'
        else:
            continente = 'Sconosciuto'
            
        tipologia = row[8].strip()
        
        # Build "nome", if localita is missing use something else
        nome = localita if localita else f"Campione {id_str}"
        
        # Build "provenienza" string
        prov_parts = []
        if nazione: prov_parts.append(nazione)
        if row[2].strip(): prov_parts.append(row[2].strip())
        provenienza = ", ".join(prov_parts) if prov_parts else "Sconosciuta"
        
        if not continente:
            continente = "Sconosciuto"
            
        # build description
        desc_parts = []
        if row[5].strip(): desc_parts.append(f"Bacino/Mare: {row[5].strip()}")
        if tipologia: desc_parts.append(f"Tipologia: {tipologia}")
        if row[11].strip(): desc_parts.append(f"Peculiarità: {row[11].strip()}")
        
        descrizione = " - ".join(desc_parts) if desc_parts else "Nessuna descrizione disponibile."
        
        item = {
            "id": id_str,
            "nome": nome,
            "provenienza": provenienza,
            "continente": continente,
            "immagine": f"images/{id_str}.jpg", # assuming image named as id
            "descrizione": descrizione
        }
        data.append(item)

# Write out JSON
with open(output_file, mode='w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print(f"Conversione completata. {len(data)} campioni esportati in {output_file}")
