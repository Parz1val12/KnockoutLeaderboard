// Default list of classmates and initial win counts
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
  { name: "Hailey", wins: 0 }
];

const ADMIN_PIN = "Zelda123!";
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

  // Input page dropdown (includes Year Only)
  const monthSelect = document.getElementById('month-select');
  if (monthSelect && monthSelect.options.length === 0) {
    MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentMonth) {
        opt.selected = true;
      }
      monthSelect.appendChild(opt);
    });

    const yearOnlyOpt = document.createElement('option');
    yearOnlyOpt.value = 'Year Only';
    yearOnlyOpt.textContent = 'Year Only';
    monthSelect.appendChild(yearOnlyOpt);
  }

  // Monthly view page dropdown
  const monthViewSelect = document.getElementById('month-view-select');
  if (monthViewSelect && monthViewSelect.options.length === 0) {
    MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentMonth) {
        opt.selected = true;
      }
      monthViewSelect.appendChild(opt);
    });
  }
}

// Load data or initialize default list if key doesn't exist
function getPlayers(key) {
  const storedData = localStorage.getItem(key);
  if (!storedData) {
    localStorage.setItem(key, JSON.stringify(defaultClassmates));
    return JSON.parse(JSON.stringify(defaultClassmates));
  }
  return JSON.parse(storedData);
}

// Unified leaderboard renderer with screen reader accessibility
function renderLeaderboard(tbodyId, storageKey, maxRows = null) {
  const tableBody = document.getElementById(tbodyId);
  if (!tableBody) return;

  const players = getPlayers(storageKey);
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

// Render monthly leaderboard based on the month page dropdown
function renderMonthView() {
  const select = document.getElementById('month-view-select');
  if (!select) return;

  renderLeaderboard('month-leaderboard-body', `monthlyWins_${select.value}`);
}

// Passcode authentication for input.html
function checkAdminAccess() {
  const pinInput = document.getElementById('admin-pin');
  const authContainer = document.getElementById('auth-container');
  const inputContainer = document.getElementById('input-container');
  const errorMsg = document.getElementById('pin-error');

  if (pinInput && pinInput.value === ADMIN_PIN) {
    authContainer.style.display = 'none';
    inputContainer.style.display = 'block';
    renderInputPage();
  } else if (errorMsg) {
    errorMsg.textContent = 'Incorrect PIN';
  }
}

// Adjust input values up or down
function changeDelta(index, amount) {
  const inputEl = document.getElementById(`delta-${index}`);
  if (inputEl) {
    let val = parseInt(inputEl.value) || 0;
    inputEl.value = val + amount;
  }
}

// Render student list in A-Z order for input page
function renderInputPage() {
  const listContainer = document.getElementById('input-list');
  if (!listContainer) return;

  const monthSelect = document.getElementById('month-select');
  const selectedMonth = monthSelect && monthSelect.value ? monthSelect.value : getCurrentMonth();
  
  let storageKey = selectedMonth === 'Year Only' ? 'yearlyWins' : `monthlyWins_${selectedMonth}`;
  let players = getPlayers(storageKey);
  players.sort((a, b) => a.name.localeCompare(b.name));

  listContainer.innerHTML = '';

  players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = 'input-row';
    row.style.margin = '10px 0';
    row.innerHTML = `
      <span class="player-name">${player.name} (Current: ${player.wins})</span>
      <button type="button" onclick="changeDelta(${index}, -1)">-</button>
      <input type="number" id="delta-${index}" value="0" data-name="${player.name}" style="width: 50px; text-align: center;" />
      <button type="button" onclick="changeDelta(${index}, 1)">+</button>
    `;
    listContainer.appendChild(row);
  });
}

// Apply changes based on selection, then reset inputs to 0
function submitWins() {
  const monthSelect = document.getElementById('month-select');
  const selectedMonth = monthSelect && monthSelect.value ? monthSelect.value : getCurrentMonth();
  const inputs = document.querySelectorAll('[id^="delta-"]');

  if (selectedMonth === 'Year Only') {
    let yearlyPlayers = getPlayers('yearlyWins');
    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      const delta = parseInt(input.value) || 0;
      const yPlayer = yearlyPlayers.find(p => p.name === name);
      if (yPlayer) yPlayer.wins = Math.max(0, yPlayer.wins + delta);
    });
    localStorage.setItem('yearlyWins', JSON.stringify(yearlyPlayers));
  } else {
    const monthKey = `monthlyWins_${selectedMonth}`;
    let monthlyPlayers = getPlayers(monthKey);
    let yearlyPlayers = getPlayers('yearlyWins');

    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      const delta = parseInt(input.value) || 0;

      const mPlayer = monthlyPlayers.find(p => p.name === name);
      if (mPlayer) mPlayer.wins = Math.max(0, mPlayer.wins + delta);

      const yPlayer = yearlyPlayers.find(p => p.name === name);
      if (yPlayer) yPlayer.wins = Math.max(0, yPlayer.wins + delta);
    });

    localStorage.setItem(monthKey, JSON.stringify(monthlyPlayers));
    localStorage.setItem('yearlyWins', JSON.stringify(yearlyPlayers));
  }

  renderInputPage();
}

document.addEventListener('DOMContentLoaded', () => {
  populateMonthDropdowns();
  const currentMonth = getCurrentMonth();
  renderLeaderboard('podium-body', `monthlyWins_${currentMonth}`, 5);  // Home: Current Month Top 5
  renderLeaderboard('yearly-podium-body', 'yearlyWins', 5);             // Home: All-Year Top 5
  renderMonthView();                                                    // Month: Full Selected Month List
  renderLeaderboard('allyear-leaderboard-body', 'yearlyWins');          // Year: Full List
});