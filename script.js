/* =========================================================
   MCCC SE Knockout Leaderboard - Realtime Database (SDK v10)
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase Configuration (Replace with your Firebase Console credentials)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Admin Configuration
const ADMIN_PIN = "1234"; // Set your desired admin access PIN

// DOM Element References
const holeSelect = document.getElementById('hole-select');
const leaderboardBody = document.getElementById('leaderboard-body');
const authContainer = document.getElementById('auth-container');
const inputContainer = document.getElementById('input-container');
const pinInput = document.getElementById('pin-input');
const pinSubmitBtn = document.getElementById('pin-submit');
const pinError = document.getElementById('pin-error');
const scoreForm = document.getElementById('score-form');
const playerInputsContainer = document.getElementById('player-inputs');

// ---------------------------------------------------------
// 1. Leaderboard Realtime Fetch & Rendering
// ---------------------------------------------------------

function fetchLeaderboard(holeNumber) {
  if (!leaderboardBody) return;

  const scoresRef = ref(db, `scores/hole_${holeNumber}`);

  onValue(scoresRef, (snapshot) => {
    leaderboardBody.innerHTML = '';

    if (!snapshot.exists()) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; padding: 20px; color: var(--text-secondary);">
            No scores posted for Hole ${holeNumber} yet.
          </td>
        </tr>`;
      return;
    }

    const data = snapshot.val();

    // Convert object to array and sort ascending (Golf scoring: lower is better)
    const playersArray = Object.entries(data).map(([id, player]) => ({
      id,
      name: player.name || id,
      score: parseInt(player.score, 10) || 0
    })).sort((a, b) => a.score - b.score);

    // Build Table Rows
    playersArray.forEach((player, index) => {
      const row = document.createElement('tr');

      let rankDisplay = index + 1;
      if (index === 0) rankDisplay = '<span role="img" aria-label="1st Place">🥇</span>';
      else if (index === 1) rankDisplay = '<span role="img" aria-label="2nd Place">🥈</span>';
      else if (index === 2) rankDisplay = '<span role="img" aria-label="3rd Place">🥉</span>';

      row.innerHTML = `
        <td>${rankDisplay}</td>
        <td class="player-name">${escapeHtml(player.name)}</td>
        <td>${player.score}</td>
      `;

      leaderboardBody.appendChild(row);
    });
  }, (error) => {
    console.error("Firebase Read Error:", error);
    if (leaderboardBody) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color: var(--danger-color); padding: 20px;">
            Error loading leaderboard. Verify Firebase Realtime Database Security Rules.
          </td>
        </tr>`;
    }
  });
}

// ---------------------------------------------------------
// 2. Admin PIN Authentication
// ---------------------------------------------------------

function verifyPin() {
  if (!pinInput) return;

  const enteredPin = pinInput.value.trim();

  if (enteredPin === ADMIN_PIN) {
    if (pinError) pinError.textContent = '';
    if (authContainer) authContainer.style.display = 'none';
    if (inputContainer) {
      inputContainer.style.display = 'block';
      loadScoreInputRows(holeSelect ? holeSelect.value : "1");
    }
  } else {
    if (pinError) {
      pinError.textContent = 'Incorrect PIN. Please try again.';
      pinError.style.animation = 'none';
      pinError.offsetHeight; // Force DOM reflow to re-trigger CSS keyframe
      pinError.style.animation = 'shakeError 0.4s ease-in-out';
    }
    pinInput.value = '';
    pinInput.focus();
  }
}

// ---------------------------------------------------------
// 3. Score Entry & Database Submission
// ---------------------------------------------------------

function loadScoreInputRows(holeNumber) {
  if (!playerInputsContainer) return;

  const scoresRef = ref(db, `scores/hole_${holeNumber}`);

  onValue(scoresRef, (snapshot) => {
    playerInputsContainer.innerHTML = '';
    const data = snapshot.exists() ? snapshot.val() : {};

    // Default roster structure if hole node is currently empty
    const defaultPlayers = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    const playerKeys = Object.keys(data).length > 0 ? Object.keys(data) : defaultPlayers;

    playerKeys.forEach((key) => {
      const playerData = data[key] || { name: key, score: 0 };
      const row = document.createElement('div');
      row.className = 'input-row';
      row.style.marginBottom = '10px';

      row.innerHTML = `
        <span class="player-name">${escapeHtml(playerData.name || key)}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn-decrement" data-target="${key}">-</button>
          <input type="number" id="input-${key}" data-player="${escapeHtml(playerData.name || key)}" value="${playerData.score}" style="width: 60px; text-align: center;">
          <button type="button" class="btn-increment" data-target="${key}">+</button>
        </div>
      `;

      playerInputsContainer.appendChild(row);
    });

    // Attach step adjusters
    playerInputsContainer.querySelectorAll('.btn-decrement').forEach(btn => {
      btn.addEventListener('click', () => adjustScore(btn.dataset.target, -1));
    });

    playerInputsContainer.querySelectorAll('.btn-increment').forEach(btn => {
      btn.addEventListener('click', () => adjustScore(btn.dataset.target, 1));
    });
  }, { onlyOnce: true });
}

function adjustScore(targetId, delta) {
  const inputEl = document.getElementById(`input-${targetId}`);
  if (inputEl) {
    let current = parseInt(inputEl.value, 10) || 0;
    inputEl.value = Math.max(0, current + delta);
  }
}

function submitScores(e) {
  if (e) e.preventDefault();
  const currentHole = holeSelect ? holeSelect.value : "1";
  const inputs = playerInputsContainer.querySelectorAll('input[type="number"]');

  const updates = {};
  inputs.forEach(input => {
    const key = input.id.replace('input-', '');
    const name = input.dataset.player;
    const score = parseInt(input.value, 10) || 0;

    updates[`scores/hole_${currentHole}/${key}`] = { name, score };
  });

  update(ref(db), updates)
    .then(() => {
      alert(`Scores for Hole ${currentHole} updated successfully!`);
    })
    .catch((err) => {
      console.error("Failed to save scores:", err);
      alert("Error saving scores. Check browser console for details.");
    });
}

// Utility: Prevent HTML Injection
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------
// 4. Initialization & Event Binding
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Load initial leaderboard data
  if (holeSelect) {
    fetchLeaderboard(holeSelect.value);

    holeSelect.addEventListener('change', (e) => {
      const selectedHole = e.target.value;
      fetchLeaderboard(selectedHole);

      // Refresh admin form if currently visible
      if (inputContainer && inputContainer.style.display !== 'none') {
        loadScoreInputRows(selectedHole);
      }
    });
  }

  // Bind PIN verification listeners
  if (pinSubmitBtn) {
    pinSubmitBtn.addEventListener('click', verifyPin);
  }

  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyPin();
    });
  }

  // Bind score submission form
  if (scoreForm) {
    scoreForm.addEventListener('submit', submitScores);
  }
});