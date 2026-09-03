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
    <title>Parking Settings</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="page">
      <section class="calculator settings-page" aria-labelledby="settings-title">
        <nav class="top-nav" aria-label="Main navigation">
          <a href="<?= e(app_url('index.php')) ?>">Calculator</a>
          <a class="nav-notifications" href="<?= e(app_url('notifications.php')) ?>">Notifications<span id="notificationDot" class="notification-dot" hidden></span></a>
          <a href="<?= e(app_url('settings.php')) ?>" aria-current="page">Settings</a>
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
          <p class="eyebrow">Parking fee tool</p>
          <h1 id="settings-title">Settings</h1>
          <p class="subtitle">Adjust alerts, display mode, fonts, and text color for your parking calculator.</p>
        </header>

        <div id="alert" class="alert" role="status" hidden></div>

        <section class="settings-layout" aria-label="Application settings">
          <article class="tool-panel settings-card">
            <div class="panel-heading">
              <h2>Profile</h2>
              <a class="secondary-button link-button" href="<?= e(app_url('logout.php')) ?>">Sign In Different Account</a>
            </div>

            <form id="profileForm" class="profile-form" enctype="multipart/form-data" <?= (($user['role'] ?? 'user') === 'guest') ? 'data-guest-locked="1"' : '' ?>>
              <div class="profile-picture-row">
                <div class="profile-picture-control">
                  <button id="profilePictureButton" class="profile-picture-button" type="button" aria-label="Change profile picture">
                    <img id="profilePreview" class="profile-avatar" src="<?= e((string) ($user['profile_picture'] ?? '')) ?>" alt="Profile picture" hidden>
                    <span id="profileInitial" class="profile-avatar empty-avatar" <?= (($user['profile_picture'] ?? '') !== '') ? 'hidden' : '' ?>><?= e(strtoupper(substr((string) $user['username'], 0, 1))) ?></span>
                  </button>
                  <div class="profile-avatar-actions" aria-label="Profile picture actions">
                    <button id="changeProfilePicture" class="avatar-action" type="button">Edit</button>
                    <button id="removeProfilePictureButton" class="avatar-action danger" type="button" <?= (($user['profile_picture'] ?? '') === '') ? 'disabled' : '' ?>>Remove</button>
                  </div>
                </div>
                <div class="profile-upload">
                  <label class="field">
                    <span>Profile Picture</span>
                    <input id="profilePicture" name="profile_picture" type="file" accept="image/jpeg,image/png,image/gif,image/webp">
                  </label>
                  <input id="removeProfilePicture" name="remove_profile_picture" type="hidden" value="0">
                  <small>JPG, PNG, GIF, or WebP. Maximum 2 MB.</small>
                </div>
              </div>

              <div class="settings-grid two">
                <label class="field">
                  <span>Username</span>
                  <input id="profileUsername" name="username" value="<?= e((string) $user['username']) ?>" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="username" required>
                </label>

                <label class="field">
                  <span>Email</span>
                  <input id="profileEmail" name="email" type="email" value="<?= e((string) ($user['email'] ?? '')) ?>" autocomplete="email" <?= (($user['role'] ?? 'user') === 'admin') ? '' : 'required' ?>>
                </label>

                <label class="field">
                  <span>Phone Number</span>
                  <input id="profilePhone" name="phone" type="tel" value="<?= e(phone_input_value((string) ($user['phone'] ?? ''))) ?>" autocomplete="tel" inputmode="numeric" placeholder="162345678" pattern="\d{8,10}" <?= (($user['role'] ?? 'user') === 'admin') ? '' : 'required' ?>>
                  <small>Enter numbers only after +60. Example: 162345678</small>
                </label>

                <label class="field full-span password-field">
                  <span>New Password</span>
                  <span class="password-control"><input id="profilePassword" name="password" type="password" autocomplete="new-password" minlength="7" pattern="(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}" placeholder="Leave blank to keep current password"><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
                </label>

                <label class="field full-span password-field">
                  <span>Verify New Password</span>
                  <span class="password-control"><input id="profilePasswordConfirm" name="password_confirm" type="password" autocomplete="new-password" minlength="7" placeholder="Repeat new password"><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
                </label>
              </div>

              <p class="form-note"><?php if (($user['role'] ?? 'user') === 'guest'): ?>Create an account to save a profile and enable alerts.<?php else: ?>Password changes must be at least 7 characters and include one number and one special character.<?php endif; ?></p>
              <button class="primary-button profile-save" type="submit">Save Profile</button>
            </form>
          </article>

          <article class="tool-panel settings-card danger-zone">
            <div class="panel-heading">
              <h2>Account Safety</h2>
            </div>

            <form id="deleteAccountForm" class="auth-form compact-form">
              <label class="field">
                <span>Confirm Password</span>
                <span class="password-control"><input id="deletePassword" type="password" autocomplete="current-password" placeholder="Required before deleting account" <?= (($user['role'] ?? 'user') === 'admin') ? 'disabled' : '' ?>><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
              </label>
              <label class="field password-field">
                <span>Verify Password</span>
                <span class="password-control"><input id="deletePasswordConfirm" type="password" autocomplete="current-password" placeholder="Repeat password" <?= (($user['role'] ?? 'user') === 'admin') ? 'disabled' : '' ?>><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
              </label>
              <p class="form-note">
                <?php if (($user['role'] ?? 'user') === 'admin'): ?>
                  The initial admin account cannot be deleted from Settings.
                <?php else: ?>
                  Deleting your account removes your profile, saved calculator state, and notifications.
                <?php endif; ?>
              </p>
              <button id="deleteAccountButton" class="secondary-button danger-button" type="submit" <?= (($user['role'] ?? 'user') === 'admin') ? 'disabled' : '' ?>>Delete Account</button>
            </form>
          </article>

          <article class="tool-panel settings-card">
            <div class="panel-heading">
              <h2>Alerts</h2>
              <button id="enableAlerts" class="secondary-button" type="button">Enable Alerts</button>
            </div>

            <div class="settings-grid two">
              <label class="field">
                <span>Alert Before Planned Exit</span>
                <select id="alertBefore">
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="25">25 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </label>

              <label class="field">
                <span>Email Alert</span>
                <select id="emailAlert">
                  <option value="on">Send email alert</option>
                  <option value="off">Browser alert only</option>
                </select>
              </label>

              <label class="field">
                <span>WhatsApp Alert</span>
                <select id="whatsappAlert">
                  <option value="off">Off</option>
                  <option value="on">Open WhatsApp alert</option>
                </select>
              </label>


              <div class="status-box">
                <span>Browser Alert Status</span>
                <strong id="alertStatus">Not enabled</strong>
                <small>Uses browser notification and device vibration when supported.</small>
              </div>

              <div class="status-box">
                <span>Email Destination</span>
                <strong id="emailStatus"><?= ($user['email'] ?? '') !== '' ? e((string) $user['email']) : 'No email on this account' ?></strong>
                <small>Email alerts are sent through the Apache/PHP mail configuration.</small>
              </div>

              <div class="status-box">
                <span>WhatsApp Destination</span>
                <strong id="whatsappStatus"><?= ($user['phone'] ?? '') !== '' ? e((string) $user['phone']) : 'No phone number on this account' ?></strong>
                <small>WhatsApp opens a prepared reminder on this device when the alert time arrives.</small>
              </div>
            </div>
          </article>

          <article class="tool-panel settings-card">
            <div class="panel-heading">
              <h2>Display</h2>
            </div>

            <div class="settings-grid two">
              <label class="field">
                <span>Mode</span>
                <select id="themeMode">
                  <option value="system">Follow system</option>
                  <option value="light">Light mode</option>
                  <option value="dark">Night mode</option>
                </select>
              </label>

              <label class="field">
                <span>Font</span>
                <select id="fontChoice"></select>
              </label>

              <label class="field">
                <span>Live Clock Format</span>
                <select id="clockFormat">
                  <option value="12">AM / PM</option>
                  <option value="24">24-hour</option>
                </select>
              </label>

              <label class="field">
                <span>Language</span>
                <select id="languageChoice"></select>
              </label>

              <label class="field full-span">
                <span>Custom Font Name</span>
                <input id="customFont" type="text" placeholder="Example: Aptos, Inter, Roboto">
              </label>
            </div>
          </article>

          <article class="tool-panel settings-card">
            <div class="panel-heading">
              <h2>Font Color</h2>
            </div>

            <div class="settings-grid color-grid">
              <label class="field full-span">
                <span>Color Style</span>
<select id="fontColorPreset"></select>
              </label>

              <label class="field">
                <span>Red</span>
                <input id="fontRed" type="number" min="0" max="255" value="23">
              </label>

              <label class="field">
                <span>Green</span>
                <input id="fontGreen" type="number" min="0" max="255" value="32">
              </label>

              <label class="field">
                <span>Blue</span>
                <input id="fontBlue" type="number" min="0" max="255" value="42">
              </label>

              <div class="color-preview">
                <span>Preview</span>
                <strong id="fontColorPreview">RGB</strong>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>

    <div id="profileCropModal" class="modal-backdrop" hidden>
      <section class="modal-card crop-card" role="dialog" aria-modal="true" aria-labelledby="cropTitle">
        <button class="modal-close" type="button" data-modal-close aria-label="Close">x</button>
        <h2 id="cropTitle">Adjust Profile Picture</h2>
        <canvas id="profileCropCanvas" width="320" height="320"></canvas>
        <label class="field">
          <span>Zoom</span>
          <input id="cropZoom" type="range" min="1" max="3" step="0.05" value="1">
        </label>
        <div class="button-row">
          <button id="cropCancel" class="secondary-button" type="button">Cancel</button>
          <button id="cropApply" class="primary-button" type="button">Use Picture</button>
        </div>
      </section>
    </div>

    <script>
      window.PARKING_USER = <?= json_encode(['username' => $user['username'], 'email' => $user['email'] ?? '', 'phone' => $user['phone'] ?? '', 'role' => $user['role'] ?? 'user', 'guest' => (($user['role'] ?? 'user') === 'guest'), 'sid' => request_sid()]) ?>;
    </script>
    <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
