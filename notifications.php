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
    <title>Notifications - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="page">
      <section class="calculator settings-page" aria-labelledby="notifications-title">
        <nav class="top-nav" aria-label="Main navigation">
          <a href="<?= e(app_url('index.php')) ?>">Calculator</a>
          <a class="nav-notifications" href="<?= e(app_url('notifications.php')) ?>" aria-current="page">Notifications<span id="notificationDot" class="notification-dot" hidden></span></a>
          <a href="<?= e(app_url('settings.php')) ?>">Settings</a>
          <?php if (($user['role'] ?? 'user') === 'admin'): ?>
            <a href="<?= e(app_url('admin.php')) ?>">Admin</a>
          <?php endif; ?>
          <a href="<?= e(app_url('logout.php')) ?>">Logout</a>
        </nav>

        <div class="account-strip">
          Signed in as <strong><?= e((string) $user['username']) ?></strong>
          <?php if (($user['email'] ?? '') !== ''): ?>
            <span><?= e((string) $user['email']) ?></span>
          <?php endif; ?>
        </div>

        <section class="hero-clock" aria-label="Live clock">
          <span>Global Malaysia Time</span>
          <strong id="currentTime">--:--:--</strong>
          <small id="currentDate">--</small>
          <small id="clockSource">Syncing time...</small>
        </section>

        <header class="settings-header">
          <p class="eyebrow">Message center</p>
          <h1 id="notifications-title">Notifications</h1>
          <p class="subtitle">Review browser reminders, email alert status, security updates, and account changes.</p>
        </header>

        <div id="alert" class="alert" role="status" hidden></div>

        <article class="tool-panel settings-card">
          <div class="panel-heading">
            <h2>Messages</h2>
            <div class="button-row">
              <button id="markAllRead" class="secondary-button" type="button">Mark All Read</button>
              <button id="clearNotifications" class="secondary-button danger-button" type="button">Clear</button>
            </div>
          </div>
          <div id="notificationList" class="notification-list" aria-live="polite"></div>
        </article>
      </section>
    </main>

    <div id="messageModal" class="modal-backdrop" hidden>
      <section class="modal-card message-detail-card" role="dialog" aria-modal="true" aria-labelledby="messageModalTitle">
        <button class="modal-close" type="button" data-modal-close aria-label="Close">x</button>
        <h2 id="messageModalTitle">Notification</h2>
        <p id="messageModalBody"></p>
      </section>
    </div>

    <script>
      window.PARKING_USER = <?= json_encode(['username' => $user['username'], 'email' => $user['email'] ?? '', 'phone' => $user['phone'] ?? '', 'role' => $user['role'] ?? 'user', 'guest' => (($user['role'] ?? 'user') === 'guest'), 'sid' => request_sid()]) ?>;
    </script>
    <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
