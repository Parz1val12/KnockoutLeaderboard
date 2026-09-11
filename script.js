function renderMonthLeaderboard() {
  const tableBody = document.getElementById('month-leaderboard-body');
  if (!tableBody) return; // Exit if not on month.html

  const players = JSON.parse(localStorage.getItem('monthlyWins')) || [];
  players.sort((a, b) => b.wins - a.wins);

  tableBody.innerHTML = '';

  let currentRank = 1;
  let prevWins = null;

  players.forEach((player, index) => {
    if (prevWins !== null && player.wins < prevWins) {
      currentRank = index + 1;
    }
    prevWins = player.wins;

    let rankDisplay = currentRank;
    if (currentRank === 1) rankDisplay = '🥇';
    else if (currentRank === 2) rankDisplay = '🥈';
    else if (currentRank === 3) rankDisplay = '🥉';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rankDisplay}</td>
      <td>${player.name}</td>
      <td>${player.wins}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Fire both functions on page load (they won't conflict)
document.addEventListener('DOMContentLoaded', () => {
  renderPodium();
  renderMonthLeaderboard();
});