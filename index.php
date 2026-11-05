<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';
$user = require_login();
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20261105-mall1">
  </head>
  <body>
    <main class="page">
      <section class="calculator" aria-labelledby="app-title">
        <nav class="top-nav" aria-label="Main navigation">
          <a href="<?= e(app_url('index.php')) ?>" aria-current="page">Calculator</a>
          <a class="nav-notifications" href="<?= e(app_url('notifications.php')) ?>">Notifications<span id="notificationDot" class="notification-dot" hidden></span></a>
          <a href="<?= e(app_url('settings.php')) ?>">Settings</a>
          <?php if (($user['role'] ?? 'user') === 'admin'): ?>
            <a href="<?= e(app_url('admin.php')) ?>">Admin</a>
          <?php endif; ?>
          <a href="<?= e(app_url('logout.php')) ?>">Logout</a>
        </nav>

        <div class="account-strip">
          Signed in as <strong><?= e((string) $user['username']) ?></strong>
        </div>

        <section class="hero-clock" aria-label="Live clock">
          <span>Global Malaysia Time</span>
          <strong id="currentTime">--:--:--</strong>
          <small id="currentDate">--</small>
          <small id="clockSource">Syncing time...</small>
        </section>

        <header class="header-row">
          <div>
            <p class="eyebrow">Parking fee tool</p>
            <h1 id="app-title">Parking Calculator</h1>
            <p class="subtitle">Enter your parking entry time to see the live fee and the best time to leave.</p>
          </div>
        </header>

        <section class="input-panel" aria-label="Parking time inputs">
          <div class="panel-heading">
            <h2>Entry Details</h2>
            <button id="useNow" class="secondary-button" type="button">Use Current Time</button>
          </div>

          <div class="mall-controls" aria-label="Mall and parking rate selection">
            <label class="field">
              <span>Shopping Mall</span>
              <select id="mallSelect">
                <option value="starling">The Starling Mall</option>
                <option value="sunway">Sunway Pyramid</option>
                <option value="utama">1 Utama Shopping Centre</option>
              </select>
            </label>
            <label class="field">
              <span>Parking Area / Membership</span>
              <select id="parkingType"><option value="standard">Basement / Multi-level</option></select>
            </label>
            <label class="field" hidden>
              <span>Public Holiday / Eve of Public Holiday</span>
              <select id="holidayRate">
                <option value="no">No — normal weekday / weekend</option>
                <option value="yes">Yes — holiday or its eve</option>
              </select>
            </label>
          </div>
          <p id="mallRateNote" class="mall-rate-note" role="note"></p>
          <a id="mallRateSource" class="mall-rate-source" href="https://parkinginmalaysia.com/the-starling-mall-parking-rates/" target="_blank" rel="noopener noreferrer">View rate source</a>

          <div class="form-grid">
            <label class="field">
              <span>Entry Date</span>
              <input id="entryDate" type="date">
            </label>

            <label class="field">
              <span>Entry Time</span>
              <input id="entryTime" type="time">
            </label>

            <label class="field">
              <span>Check Exit Time</span>
              <input id="exitTime" type="datetime-local">
            </label>
          </div>
        </section>

        <div id="alert" class="alert" role="status" hidden></div>

        <section class="planner-grid single" aria-label="Budget planner">
          <article class="tool-panel">
            <div class="panel-heading">
              <h2>Budget Planner</h2>
            </div>
            <div class="planner-row">
              <label class="field">
                <span>Target Budget</span>
                <input id="budgetAmount" type="number" min="0" step="1" value="3" inputmode="decimal">
              </label>
              <div class="planner-result">
                <span>Exit By</span>
                <strong id="budgetExit">--</strong>
                <small id="budgetHint">Enter an amount to plan your exit time.</small>
              </div>
            </div>
          </article>
        </section>

        <section class="summary-grid" aria-label="Parking summary">
          <article class="metric primary">
            <span>Fee If Exit Now</span>
            <strong id="currentFee">RM0.00</strong>
            <small id="currentBand">Waiting for entry time</small>
          </article>

          <article class="metric">
            <span>Parked Time</span>
            <strong id="elapsedTime">0m</strong>
            <small id="elapsedHint">Live timer</small>
          </article>

          <article class="metric">
            <span>Exit Before</span>
            <strong id="leaveBy">--</strong>
            <small id="nextCharge">to avoid the next charge</small>
          </article>

          <article class="metric planned">
            <span>Checked Exit Fee</span>
            <strong id="plannedFee">RM0.00</strong>
            <small id="plannedDuration">Choose an exit time</small>
          </article>
        </section>

        <section class="timeline-section" aria-labelledby="timeline-title">
          <div class="section-title">
            <h2 id="timeline-title">Parking Rates</h2>
            <p>Any part of a charge period is counted.</p>
          </div>
          <ol id="rateTimeline" class="rate-timeline"></ol>
        </section>
      </section>
    </main>

    <script>
      window.PARKING_USER = <?= json_encode(['username' => $user['username'], 'email' => $user['email'] ?? '', 'phone' => $user['phone'] ?? '', 'role' => $user['role'] ?? 'user', 'guest' => (($user['role'] ?? 'user') === 'guest'), 'sid' => request_sid()]) ?>;
    </script>
    <script src="mall-rates.js?v=20261105-mall1"></script>
    <script src="script.js?v=20261105-mall1"></script>
  </body>
</html>
