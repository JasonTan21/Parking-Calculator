<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

if (current_user() !== null) {
    header('Location: ' . app_url('index.php'));
    exit;
}

$error = '';
$notice = '';
$resetUsername = (string) ($_SESSION['password_reset_user'] ?? '');
$verified = !empty($_SESSION['password_reset_verified']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_same_origin_post();
    $action = (string) ($_POST['action'] ?? 'request');

    if ($action === 'request') {
        $username = normalize_username((string) ($_POST['username'] ?? ''));
        $email = normalize_email((string) ($_POST['email'] ?? ''));
        $emailError = validate_email_address($email);
        $users = read_users();
        $index = find_user_index($users, $username);

        if ($emailError !== null) {
            $error = $emailError;
        } elseif ($index === null || strtolower((string) $users[$index]['username']) !== strtolower($username)) {
            $error = 'No account matched that username.';
        } elseif (!account_is_active($users[$index])) {
            $error = 'Please verify this account before resetting its password.';
        } elseif ((string) ($users[$index]['email'] ?? '') === '') {
            $error = 'This account has no recovery email. Please contact the site administrator.';
        } elseif (normalize_email((string) $users[$index]['email']) !== $email) {
            $error = 'The registered email does not match this username.';
        } else {
            $_SESSION['password_reset_user'] = (string) $users[$index]['username'];
            unset($_SESSION['password_reset_verified']);
            $sent = set_password_reset_otp((string) $users[$index]['username']);
            $notice = $sent
                ? 'A password reset OTP was sent. It expires in 1 minute.'
                : 'Could not send OTP email. Please check the server mail configuration.';
            $resetUsername = (string) $users[$index]['username'];
            $verified = false;
        }
    } elseif ($action === 'resend') {
        $freshUser = $resetUsername !== '' ? find_user($resetUsername) : null;
        if ($freshUser === null) {
            $error = 'Start password recovery again.';
        } elseif ((int) ($freshUser['otp_expires_at'] ?? 0) > time()) {
            $error = 'Please wait until the current OTP expires before requesting a new one.';
        } else {
            $sent = set_password_reset_otp($resetUsername);
            $notice = $sent
                ? 'A new password reset OTP was sent. It expires in 1 minute.'
                : 'Could not send OTP email. Please check the server mail configuration.';
        }
    } elseif ($action === 'verify') {
        $otp = trim((string) ($_POST['otp'] ?? ''));
        $users = read_users();
        $index = $resetUsername !== '' ? find_user_index($users, $resetUsername) : null;

        if ($index === null) {
            $error = 'Start password recovery again.';
        } elseif (strlen($otp) !== 6 || !ctype_digit($otp)) {
            $error = 'Enter the 6-digit OTP code.';
        } elseif ((string) ($users[$index]['otp_purpose'] ?? '') !== 'password_reset') {
            $error = 'Request a password reset OTP first.';
        } elseif ((int) ($users[$index]['otp_expires_at'] ?? 0) < time()) {
            $error = 'OTP expired. Please request a new code.';
        } elseif (!password_verify($otp, (string) ($users[$index]['otp_hash'] ?? ''))) {
            $error = 'Invalid OTP code.';
        } else {
            $_SESSION['password_reset_verified'] = true;
            $verified = true;
            $notice = 'OTP verified. Create your new password.';
        }
    } elseif ($action === 'update') {
        $password = (string) ($_POST['password'] ?? '');
        $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');
        $users = read_users();
        $index = $resetUsername !== '' ? find_user_index($users, $resetUsername) : null;

        if (!$verified || $index === null) {
            $error = 'Verify your OTP before changing the password.';
        } else {
            $passwordError = validate_password_rules($password);
            if ($passwordError !== null) {
                $error = $passwordError;
            } elseif ($password !== $passwordConfirm) {
                $error = 'New password and verify password must match.';
            }
        }

        if ($error === '') {
            $users[$index]['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            unset($users[$index]['otp_hash'], $users[$index]['otp_expires_at'], $users[$index]['otp_purpose']);
            $users[$index]['updated_at'] = gmdate('c');
            write_users($users);
            add_notification((string) $users[$index]['username'], 'Password changed', 'Your new password was updated successfully.', 'security');
            unset($_SESSION['password_reset_user'], $_SESSION['password_reset_verified']);
            $notice = 'Password updated. You can now log in with the new password.';
            $resetUsername = '';
            $verified = false;
        }
    } elseif ($action === 'cancel') {
        unset($_SESSION['password_reset_user'], $_SESSION['password_reset_verified']);
        $resetUsername = '';
        $verified = false;
    }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Forgot Password - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="forgot-title">
        <img class="brand-mark brand-logo" src="parking_header_logo.png" alt="Parking Calculator logo">
        <p class="eyebrow">Account recovery</p>
        <h1 id="forgot-title">Reset Password</h1>
        <p class="subtitle">Enter your username and registered email, then verify the OTP sent to your email.</p>

        <?php if ($error !== ''): ?>
          <div class="alert" data-type="warning"><?= e($error) ?></div>
        <?php endif; ?>
        <?php if ($notice !== ''): ?>
          <div class="alert" data-type="notice"><?= e($notice) ?></div>
        <?php endif; ?>

        <?php if ($resetUsername === ''): ?>
          <form method="post" class="auth-form">
            <input type="hidden" name="action" value="request">
            <label class="field">
              <span>Username</span>
              <input name="username" autocomplete="username" required>
            </label>

            <label class="field">
              <span>Registered Email</span>
              <input name="email" type="email" autocomplete="email" required>
            </label>

            <button class="primary-button" type="submit">Send OTP</button>
          </form>
        <?php elseif (!$verified): ?>
          <form method="post" class="auth-form">
            <input type="hidden" name="action" value="verify">
            <label class="field">
              <span>OTP Code</span>
              <input name="otp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required>
            </label>
            <button class="primary-button" type="submit">Verify OTP</button>
          </form>

          <form method="post" class="auth-form compact-form">
            <input type="hidden" name="action" value="resend">
            <button class="secondary-button" type="submit">Request New OTP</button>
          </form>
        <?php else: ?>
          <form method="post" class="auth-form">
            <input type="hidden" name="action" value="update">
            <label class="field password-field">
              <span>New Password</span>
              <span class="password-control"><input name="password" type="password" autocomplete="new-password" minlength="7" pattern="(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}" required><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
            </label>

            <label class="field password-field">
              <span>Verify Password</span>
              <span class="password-control"><input name="password_confirm" type="password" autocomplete="new-password" minlength="7" required><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
            </label>

            <p class="form-note">Minimum 7 characters, including one number and one special character.</p>
            <button class="primary-button" type="submit">Update Password</button>
          </form>
        <?php endif; ?>

        <?php if ($resetUsername !== ''): ?>
          <form method="post" class="auth-form compact-form">
            <input type="hidden" name="action" value="cancel">
            <button class="secondary-button danger-button" type="submit">Start Again</button>
          </form>
        <?php endif; ?>

        <p class="auth-switch">Remembered it? <a href="login.php">Log in</a></p>
      </section>
    </main>
    <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
