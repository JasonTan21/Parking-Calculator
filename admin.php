<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';
$user = require_login();

if (($user['role'] ?? 'user') !== 'admin') {
    http_response_code(403);
    echo 'Admin access only.';
    exit;
}

$users = read_users();
?>
<?php
function sort_accounts_by_username(array $accounts): array {
    usort($accounts, static fn(array $a, array $b): int => strcasecmp((string) ($a['username'] ?? ''), (string) ($b['username'] ?? '')));
    return $accounts;
}

$admins = sort_accounts_by_username(array_values(array_filter($users, static fn(array $account): bool => (string) ($account['role'] ?? 'user') === 'admin')));
$normalUsers = sort_accounts_by_username(array_values(array_filter($users, static fn(array $account): bool => (string) ($account['role'] ?? 'user') !== 'admin')));
function render_user_rows(array $accounts): void {
    foreach ($accounts as $account):
        $picture = (string) ($account['profile_picture'] ?? '');
        $username = (string) $account['username'];
?>
  <tr data-username="<?= e($username) ?>" data-email="<?= e((string) ($account['email'] ?? '')) ?>" data-phone="<?= e((string) ($account['phone'] ?? '')) ?>" data-role="<?= e((string) ($account['role'] ?? 'user')) ?>" data-status="<?= e((string) ($account['status'] ?? 'active')) ?>" data-picture="<?= e($picture) ?>" data-joined="<?= e(malaysia_display_time((string) ($account['created_at'] ?? ''))) ?>" data-updated="<?= e(malaysia_display_time((string) ($account['updated_at'] ?? ''))) ?>">
    <td>
      <?php if ($picture !== ''): ?>
        <img class="table-avatar profile-open" src="<?= e($picture) ?>" alt="">
      <?php else: ?>
        <span class="table-avatar empty-avatar profile-open"><?= e(strtoupper(substr($username, 0, 1))) ?></span>
      <?php endif; ?>
    </td>
    <td><?= e($username) ?></td>
    <td class="wrap-cell"><?= e((string) ($account['email'] ?? '')) ?></td>
    <td><?= e((string) ($account['phone'] ?? '')) ?></td>
    <td><?= e((string) ($account['role'] ?? 'user')) ?></td>
    <td><?= e((string) ($account['status'] ?? 'active')) ?></td>
    <td><code><?= e((string) $account['password_hash']) ?></code></td>
    <td><?= e(malaysia_display_time((string) ($account['created_at'] ?? ''))) ?></td>
    <td><?= e(malaysia_display_time((string) ($account['updated_at'] ?? ''))) ?></td>
  </tr>
<?php
    endforeach;
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="page">
      <section class="calculator settings-page" aria-labelledby="admin-title">
        <nav class="top-nav" aria-label="Main navigation">
          <a href="<?= e(app_url('index.php')) ?>">Calculator</a>
          <a class="nav-notifications" href="<?= e(app_url('notifications.php')) ?>">Notifications<span id="notificationDot" class="notification-dot" hidden></span></a>
          <a href="<?= e(app_url('settings.php')) ?>">Settings</a>
          <a href="<?= e(app_url('admin.php')) ?>" aria-current="page">Admin</a>
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
          <p class="eyebrow">Administrator</p>
          <h1 id="admin-title">Users</h1>
          <p class="subtitle">Review account records. Passwords remain hashed and are never shown as plain text.</p>
        </header>

        <article class="tool-panel settings-card admin-table-card">
          <div class="panel-heading"><h2>Admin Accounts</h2></div>
          <div class="table-scroll">
            <table class="admin-table">
              <thead>
                <tr><th>Photo</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Password Hash</th><th>Joined</th><th>Updated</th></tr>
              </thead>
              <tbody id="adminAccountBody" data-role-group="admin"><?php render_user_rows($admins); ?></tbody>
            </table>
          </div>
        </article>

        <article class="tool-panel settings-card admin-table-card">
          <div class="panel-heading"><h2>User Accounts</h2></div>
          <div class="table-scroll">
            <table class="admin-table">
              <thead>
                <tr><th>Photo</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Password Hash</th><th>Joined</th><th>Updated</th></tr>
              </thead>
              <tbody id="adminUserBody" data-role-group="user"><?php render_user_rows($normalUsers); ?></tbody>
            </table>
          </div>
        </article>

        <div id="userModal" class="modal-backdrop" hidden>
          <section class="modal-card user-detail-card" role="dialog" aria-modal="true" aria-labelledby="userModalTitle">
            <button class="modal-close" type="button" data-modal-close aria-label="Close">x</button>
            <div id="userModalBody"></div>
          </section>
        </div>
      </section>
    </main>

    <script>
      window.PARKING_USER = <?= json_encode(['username' => $user['username'], 'email' => $user['email'] ?? '', 'phone' => $user['phone'] ?? '', 'role' => $user['role'] ?? 'user', 'guest' => (($user['role'] ?? 'user') === 'guest'), 'sid' => request_sid()]) ?>;
    </script>
    <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
