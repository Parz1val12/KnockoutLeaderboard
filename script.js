// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrlCVJamy8lHUZOebVQ8qVg4MVuUDzl04",
  authDomain: "knockout-leaderboard.firebaseapp.com",
  projectId: "knockout-leaderboard",
  storageBucket: "knockout-leaderboard.firebasestorage.app",
  messagingSenderId: "872753954535",
  appId: "1:872753954535:web:c03c9b75d72fb2aa8d6c42",
  measurementId: "G-Z764K0F1B1"
};

// Initialize Firebase & Cloud Firestore safely
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Permanent List of Classmates
const defaultClassmates = [
  { name: "Ian", wins: 0 },
  { name: "Ben", wins: 0 },
  { name: "Fetty", wins: 0 },
  { name: "Delvin", wins: 0 },
  { name: "Russel", wins: 0 },
  { name: "Landon", wins: 0 },
  { name: "Cody", wins: 0 },
  { name: "Jacob", wins: 0 },
  { name: "Nick", wins: 0 },
  { name: "Carson", wins: 0 },
  { name: "Bryson", wins: 0 },
  { name: "Grant", wins: 0 },
  { name: "Hailey", wins: 0 },
  { name: "Mr. McMaster", wins: 0 }
];
const WHITE_BORDER = "1471";
const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

function getCurrentMonth() {
  return MONTHS[new Date().getMonth()];
}

// Automatically populates any month dropdown on the page
function populateMonthDropdowns() {
  const currentMonth = getCurrentMonth();

  const monthSelect = document.getElementById('month-select');
  if (monthSelect && monthSelect.options.length === 0) {
    MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    });

    const yearOnlyOpt = document.createElement('option');
    yearOnlyOpt.value = 'Year Only';
    yearOnlyOpt.textContent = 'Year Only';
    monthSelect.appendChild(yearOnlyOpt);
  }

  const monthViewSelect = document.getElementById('month-view-select');
  if (monthViewSelect && monthViewSelect.options.length === 0) {
    MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentMonth) opt.selected = true;
      monthViewSelect.appendChild(opt);
    });
  }
}

// Merge Firestore wins with hardcoded master classmate list
async function getPlayers(key) {
  let firestorePlayers = [];
  try {
    const docRef = db.collection("leaderboard").doc(key);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      await docRef.set({ players: defaultClassmates });
      firestorePlayers = defaultClassmates;
    } else {
      firestorePlayers = doc.data().players || [];
    }
  } catch (err) {
    console.warn("Firestore access error/offline mode. Falling back to default list:", err);
    return JSON.parse(JSON.stringify(defaultClassmates));
  }

  // Ensure all master names exist, retaining wins from Firestore if present
  return defaultClassmates.map(masterPlayer => {
    const matched = firestorePlayers.find(p => p.name === masterPlayer.name);
    return {
      name: masterPlayer.name,
      wins: matched ? matched.wins : 0
    };
  });
}

// Save player list back to Firestore
async function savePlayers(key, players) {
  try {
    await db.collection("leaderboard").doc(key).set({ players });
  } catch (err) {
    console.error("Failed to save to Firestore:", err);
  }
}

// Unified leaderboard renderer
async function renderLeaderboard(tbodyId, storageKey, maxRows = null) {
  const tableBody = document.getElementById(tbodyId);
  if (!tableBody) return;

  const players = await getPlayers(storageKey);
  players.sort((a, b) => b.wins - a.wins);

  tableBody.innerHTML = '';

  let currentRank = 1;
  let prevWins = null;
  let renderedCount = 0;

  players.forEach((player, index) => {
    if (prevWins !== null && player.wins < prevWins) {
      currentRank = index + 1;
    }
    prevWins = player.wins;

    if (maxRows && renderedCount >= maxRows) return;

    let rankDisplay = currentRank;
    if (currentRank === 1) {
      rankDisplay = '<span role="img" aria-label="1st Place">🥇</span>';
    } else if (currentRank === 2) {
      rankDisplay = '<span role="img" aria-label="2nd Place">🥈</span>';
    } else if (currentRank === 3) {
      rankDisplay = '<span role="img" aria-label="3rd Place">🥉</span>';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td aria-label="Rank ${currentRank}">${rankDisplay}</td>
      <td>${player.name}</td>
      <td>${player.wins}</td>
    `;
    tableBody.appendChild(row);
    renderedCount++;
  });
}

function renderMonthView() {
  const select = document.getElementById('month-view-select');
  if (!select) return;

  renderLeaderboard('month-leaderboard-body', `monthlyWins_${select.value}`);
}

function checkWhiteBorder() {
  const pinInput = document.getElementById('admin-pin') || document.getElementById('user-key');
  const authContainer = document.getElementById('auth-container');
  const inputContainer = document.getElementById('input-container');
  const errorMsg = document.getElementById('pin-error') || document.getElementById('key-error');

  if (pinInput && pinInput.value === WHITE_BORDER) {
    if (authContainer) authContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'block';
    renderInputPage();
  } else if (errorMsg) {
    errorMsg.textContent = 'Invalid Code';
  }
}

function changeDelta(index, amount) {
  const inputEl = document.getElementById(`delta-${index}`);
  if (inputEl) {
    let val = parseInt(inputEl.value) || 0;
    inputEl.value = val + amount;
  }
}

async function renderInputPage() {
  const listContainer = document.getElementById('input-list');
  if (!listContainer) return;

  const monthSelect = document.getElementById('month-select');
  const selectedMonth = monthSelect && monthSelect.value ? monthSelect.value : getCurrentMonth();
  
  let storageKey = selectedMonth === 'Year Only' ? 'yearlyWins' : `monthlyWins_${selectedMonth}`;
  let players = await getPlayers(storageKey);
  players.sort((a, b) => a.name.localeCompare(b.name));

  listContainer.innerHTML = '';

  players.forEach((player, index) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'input-row';
    rowDiv.style.margin = '10px 0';
    rowDiv.innerHTML = `
      <span class="player-name">${player.name} (Current: ${player.wins})</span>
      <button type="button" onclick="changeDelta(${index}, -1)">-</button>
      <input type="number" id="delta-${index}" value="0" data-name="${player.name}" style="width: 50px; text-align: center;" />
      <button type="button" onclick="changeDelta(${index}, 1)">+</button>
    `;
    listContainer.appendChild(rowDiv);
  });
}

async function submitWins() {
  const monthSelect = document.getElementById('month-select');
  const selectedMonth = monthSelect && monthSelect.value ? monthSelect.value : getCurrentMonth();
  const inputs = document.querySelectorAll('[id^="delta-"]');

  if (selectedMonth === 'Year Only') {
    let yearlyPlayers = await getPlayers('yearlyWins');
    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      const delta = parseInt(input.value) || 0;
      const yPlayer = yearlyPlayers.find(p => p.name === name);
      if (yPlayer) yPlayer.wins = Math.max(0, yPlayer.wins + delta);
    });
    await savePlayers('yearlyWins', yearlyPlayers);
  } else {
    const monthKey = `monthlyWins_${selectedMonth}`;
    let monthlyPlayers = await getPlayers(monthKey);
    let yearlyPlayers = await getPlayers('yearlyWins');

    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      const delta = parseInt(input.value) || 0;

      const mPlayer = monthlyPlayers.find(p => p.name === name);
      if (mPlayer) mPlayer.wins = Math.max(0, mPlayer.wins + delta);

      const yPlayer = yearlyPlayers.find(p => p.name === name);
      if (yPlayer) yPlayer.wins = Math.max(0, yPlayer.wins + delta);
    });

    await savePlayers(monthKey, monthlyPlayers);
    await savePlayers('yearlyWins', yearlyPlayers);
  }

  await renderInputPage();
}

document.addEventListener('DOMContentLoaded', () => {
  populateMonthDropdowns();
  const currentMonth = getCurrentMonth();
  renderLeaderboard('podium-body', `monthlyWins_${currentMonth}`, 3);
  renderLeaderboard('yearly-podium-body', 'yearlyWins', 3);
  renderMonthView();
  renderLeaderboard('allyear-leaderboard-body', 'yearlyWins');

  const pinInput = document.getElementById('admin-pin') || document.getElementById('user-key');
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        checkWhiteBorder();
      }
    });
  }
});