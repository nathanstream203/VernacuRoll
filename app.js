const reel = document.getElementById('reel');
const definitionDisplay = document.getElementById('definition');
const button = document.getElementById('generate-btn');
const loadingScreen = document.getElementById('loading-screen');

let adjectives = [];       // array of { word, definition, example, pronunciation }
let adjectivesData = [];   // original JSON data for fallback

// Fetch JSON and enrich with API / fallback
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
    loadingScreen.style.opacity = '0'; // fade out
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      document.querySelector('.machine').style.visibility = 'visible';
      button.disabled = false;
    }, ); // match CSS transition

    loadSavedWord();
  } catch (err) {
    console.error("Failed to load words:", err);
  }
}

function getFirstExample(entry) {
  if (!entry.meanings) return '';
  for (const meaning of entry.meanings) {
    if (!meaning.definitions) continue;
    for (const def of meaning.definitions) {
      if (def.example) return def.example;
    }
  }
  return ''; // fallback
}

function getFirstPronunciation(entry) {
  if (!entry.phonetics) return '';
  for (const phon of entry.phonetics) {
    if (phon.text) return phon.text.toLowerCase();
  }
  return '';
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

    return {
      word,
      definition,
      example,
      pronunciation
    };

  } catch (err) {
    console.warn(`Failed to fetch word "${word}":`, err);
    // return empty fields instead of fallback JSON
    return {
      word,
      definition: '',
      example: '',
      pronunciation: ''
    };
  }
}


// load saved word from localStorage
function loadSavedWord() {
  const savedData = localStorage.getItem('adjespin_saved');
  if (!savedData) return;

  const savedWordObj = JSON.parse(savedData);

  // Display in reel
  reel.innerHTML = `<div class="reel-item">${savedWordObj.word}</div>`;

  // Display definition, pronunciation, example
  definitionDisplay.innerHTML = `
    <div>
      <span style="font-weight:bold;">${savedWordObj.word}</span>
      ${savedWordObj.pronunciation ? ` <span>(${savedWordObj.pronunciation})</span>` : ''}
    </div>
    <div>${savedWordObj.definition}</div>
    ${savedWordObj.example ? `<div style="font-style:italic;">"${savedWordObj.example}"</div>` : ''}
  `;

  // Save last word for spinning logic
  definitionDisplay.dataset.lastWord = savedWordObj.word;
}


// Spin button logic (same as before, just pick from adjectives array)
button.addEventListener('click', () => {
  if (!adjectives.length) return;

  reel.innerHTML = '';
  reel.style.transition = 'none';
  reel.style.transform = 'translateY(0)';
  definitionDisplay.textContent = '';

  const spinCount = 10;
  const itemHeight = 50;

  let finalWordObj;
  do {
    const idx = Math.floor(Math.random() * adjectives.length);
    finalWordObj = adjectives[idx];
  } while (finalWordObj.word === definitionDisplay.dataset.lastWord);

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
  // Build elements manually instead of innerHTML
  definitionDisplay.innerHTML = ''; // clear

  const wordLine = document.createElement('div');
  wordLine.style.display = 'flex';
  wordLine.style.gap = '0.5rem'; // spacing between word and pronunciation

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

// start loading words on DOMContentLoaded
document.addEventListener('DOMContentLoaded', loadWords);
