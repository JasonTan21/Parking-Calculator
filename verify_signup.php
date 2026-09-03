<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

if (current_user() !== null) {
    header('Location: index.php');
    exit;
}

$pendingUsername = (string) ($_SESSION['pending_signup_user'] ?? '');
$user = $pendingUsername !== '' ? find_user($pendingUsername) : null;

if ($user === null || account_is_active($user)) {
    header('Location: signup.php');
    exit;
}

$error = '';
$notice = (string) ($_SESSION['otp_send_failed'] ?? '');
unset($_SESSION['otp_send_failed']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_same_origin_post();
    $action = (string) ($_POST['action'] ?? 'verify');

    if ($action === 'resend') {
        $freshUser = find_user($pendingUsername);
        if ($freshUser === null) {
            $error = 'Pending account was not found. Please sign up again.';
        } elseif ((int) ($freshUser['otp_expires_at'] ?? 0) > time()) {
            $error = 'Please wait until the current OTP expires before requesting a new one.';
        } else {
            $sent = set_signup_otp($pendingUsername);
            $notice = $sent
                ? 'A new OTP code was sent. It will expire in 1 minute.'
                : 'Could not send the OTP email. Please check the server mail configuration.';
        }
    } elseif ($action === 'cancel') {
        $users = array_values(array_filter(
            read_users(),
            static fn(array $account): bool => strtolower((string) $account['username']) !== strtolower($pendingUsername)
        ));
        write_users($users);
        unset($_SESSION['pending_signup_user']);
        header('Location: signup.php');
        exit;
    } else {
        $otp = trim((string) ($_POST['otp'] ?? ''));
        $users = read_users();
        $index = find_user_index($users, $pendingUsername);

        if ($index === null) {
            $error = 'Pending account was not found. Please sign up again.';
        } elseif (strlen($otp) !== 6 || !ctype_digit($otp)) {
            $error = 'Enter the 6-digit OTP code.';
        } elseif ((int) ($users[$index]['otp_expires_at'] ?? 0) < time()) {
            $error = 'OTP expired. Please request a new code.';
        } elseif (!password_verify($otp, (string) ($users[$index]['otp_hash'] ?? ''))) {
            $error = 'Invalid OTP code.';
        } else {
            $users[$index]['status'] = 'active';
            unset($users[$index]['otp_hash'], $users[$index]['otp_expires_at']);
            $users[$index]['updated_at'] = gmdate('c');
            write_users($users);
            add_notification($pendingUsername, 'Account verified', 'Welcome to Parking Calculator. Your account is ready.', 'account');

            session_regenerate_id(true);
            unset($_SESSION['pending_signup_user']);
            $sid = create_login_session($pendingUsername);
            header('Location: index.php?sid=' . rawurlencode($sid));
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify Email - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="verify-title">
        <img class="brand-mark brand-logo" src="parking_header_logo.png" alt="Parking Calculator logo">
        <p class="eyebrow">Email verification</p>
        <h1 id="verify-title">Enter OTP Code</h1>
        <p class="subtitle">We sent a 6-digit code to <?= e((string) ($user['email'] ?? 'your email')) ?>. It expires after 1 minute.</p>

        <?php if ($error !== ''): ?>
          <div class="alert" data-type="warning"><?= e($error) ?></div>
        <?php endif; ?>
        <?php if ($notice !== ''): ?>
          <div class="alert" data-type="notice"><?= e($notice) ?></div>
        <?php endif; ?>

        <form method="post" class="auth-form">
          <input type="hidden" name="action" value="verify">
          <label class="field">
            <span>OTP Code</span>
            <input name="otp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required>
          </label>
          <button class="primary-button" type="submit">Verify Account</button>
        </form>

        <form method="post" class="auth-form compact-form">
          <input type="hidden" name="action" value="resend">
          <button class="secondary-button" type="submit">Request New OTP</button>
        </form>

        <form method="post" class="auth-form compact-form">
          <input type="hidden" name="action" value="cancel">
          <button class="secondary-button danger-button" type="submit">Use Different Email</button>
        </form>
      </section>
    </main>
      <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
