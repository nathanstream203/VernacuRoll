const reel = document.getElementById('reel');
const definitionDisplay = document.getElementById('definition');
const button = document.getElementById('generate-btn');
const loadingScreen = document.getElementById('loading-screen');

let adjectives = [];       // array of { word, definition, example, pronunciation }
let adjectivesData = [];   // original JSON data

// Fetch JSON and enrich with API
async function loadWords() {
  try {
    const res = await fetch('words.json');
    const data = await res.json();
    adjectivesData = data.adjectives;

    for (const a of adjectivesData) {
      const apiData = await fetchWordAPI(a.word);
      adjectives.push(apiData);
    }

    // hide loading screen & show machine
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      document.querySelector('.machine').style.visibility = 'visible';
      button.disabled = false;
    }, 300);

    loadSavedWord();
  } catch (err) {
    console.error("Failed to load words:", err);
  }
}

// fetch word data from dictionary API
async function fetchWordAPI(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error('Word not found');

    const data = await res.json();
    const entry = data[0];

    // Find first valid definition
    let definition = '';
    let example = '';
    for (const meaning of entry.meanings || []) {
      for (const def of meaning.definitions || []) {
        if (def.definition) {
          definition = def.definition;
          example = def.example || '';
          break;
        }
      }
      if (definition) break;
    }

    // Pronunciation
    const pronunciation = entry.phonetics?.find(p => p.text)?.text?.toLowerCase() || '';

    return { word, definition, example, pronunciation };

  } catch (err) {
    console.warn(`Failed to fetch word "${word}":`, err);
    // return empty fields so it can reroll
    return { word, definition: '', example: '', pronunciation: '' };
  }
}

// Get a valid word (reroll if API fails)
async function getValidWord() {
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const idx = Math.floor(Math.random() * adjectives.length);
    const wordObj = adjectives[idx];

    if (wordObj.definition) return wordObj; // valid
    attempts++;
  }
  // fallback: any word even if missing definition
  return adjectives[Math.floor(Math.random() * adjectives.length)];
}

// load saved word
function loadSavedWord() {
  const savedData = localStorage.getItem('adjespin_saved');
  if (!savedData) return;

  const savedWordObj = JSON.parse(savedData);

  // Display in reel
  reel.innerHTML = `<div class="reel-item">${savedWordObj.word}</div>`;

  // Display definition, pronunciation, example
  definitionDisplay.innerHTML = `
    <div style="display:flex; gap:0.5rem;">
      <strong>${savedWordObj.word}</strong>
      ${savedWordObj.pronunciation ? `<span style="color:#ccc; font-weight:normal;">(${savedWordObj.pronunciation})</span>` : ''}
    </div>
    <div style="margin-top:0.2rem;">${savedWordObj.definition}</div>
    ${savedWordObj.example ? `<div style="font-style:italic; margin-top:0.2rem;">"${savedWordObj.example}"</div>` : ''}
  `;

  definitionDisplay.dataset.lastWord = savedWordObj.word;
}

// Spin button
button.addEventListener('click', async () => {
  if (!adjectives.length) return;

  reel.innerHTML = '';
  reel.style.transition = 'none';
  reel.style.transform = 'translateY(0)';
  definitionDisplay.textContent = '';

  const spinCount = 10;
  const itemHeight = 50;

  // Pick a valid word
  const finalWordObj = await getValidWord();

  for (let i = 0; i < spinCount; i++) {
    const randomWord = adjectives[Math.floor(Math.random() * adjectives.length)].word;
    const item = document.createElement('div');
    item.className = 'reel-item';
    item.textContent = randomWord;
    reel.appendChild(item);
  }

  const finalItem = document.createElement('div');
  finalItem.className = 'reel-item';
  finalItem.textContent = finalWordObj.word;
  reel.appendChild(finalItem);

  void reel.offsetWidth;
  const totalTranslate = spinCount * itemHeight;
  reel.style.transition = 'transform 1s cubic-bezier(0.33, 1, 0.68, 1)';
  reel.style.transform = `translateY(-${totalTranslate}px)`;

  reel.addEventListener('transitionend', function handler() {
    // Display word, pronunciation, definition, example
    definitionDisplay.innerHTML = '';

    const wordLine = document.createElement('div');
    wordLine.style.display = 'flex';
    wordLine.style.gap = '0.5rem';

    const wordEl = document.createElement('strong');
    wordEl.textContent = finalWordObj.word;

    const pronEl = document.createElement('span');
    pronEl.textContent = finalWordObj.pronunciation || '';
    pronEl.style.color = '#ccc';
    pronEl.style.fontWeight = 'normal';

    wordLine.appendChild(wordEl);
    wordLine.appendChild(pronEl);
    definitionDisplay.appendChild(wordLine);

    const defEl = document.createElement('div');
    defEl.textContent = finalWordObj.definition;
    defEl.style.marginTop = '0.2rem';
    definitionDisplay.appendChild(defEl);

    if (finalWordObj.example) {
      const exEl = document.createElement('div');
      exEl.textContent = `"${finalWordObj.example}"`;
      exEl.style.fontStyle = 'italic';
      exEl.style.marginTop = '0.2rem';
      definitionDisplay.appendChild(exEl);
    }

    // Save to localStorage
    definitionDisplay.dataset.lastWord = finalWordObj.word;
    localStorage.setItem('adjespin_saved', JSON.stringify(finalWordObj));

    reel.removeEventListener('transitionend', handler);
  });
});

// start loading words
document.addEventListener('DOMContentLoaded', loadWords);
