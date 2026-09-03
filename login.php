<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

if (current_user() !== null) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_same_origin_post();
    if ((string) ($_POST['guest'] ?? '') === '1') {
        session_regenerate_id(true);
        $sid = create_guest_session();
        header('Location: index.php?sid=' . rawurlencode($sid));
        exit;
    }
    $identifier = trim((string) ($_POST['identifier'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (strpos($identifier, '@') !== false) {
        $emailError = validate_email_address(normalize_email($identifier));
        if ($emailError !== null) {
            $error = $emailError;
        }
    }

    $user = $error === '' ? find_user($identifier) : null;

    if ($error === '' && $user !== null && password_verify($password, (string) $user['password_hash'])) {
        if (!account_is_active($user)) {
            $_SESSION['pending_signup_user'] = (string) $user['username'];
            header('Location: verify_signup.php');
            exit;
        }
        session_regenerate_id(true);
        $sid = create_login_session((string) $user['username']);
        header('Location: index.php?sid=' . rawurlencode($sid));
        exit;
    }

    if ($error === '') {
        $error = 'Invalid username/email or password.';
    }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="login-title">
        <img class="brand-mark brand-logo" src="parking_header_logo.png" alt="Parking Calculator logo">
        <p class="eyebrow">Parking fee tool</p>
        <h1 id="login-title">Welcome Back</h1>
        <p class="subtitle">Log in with your username or email to continue.</p>

        <?php if ($error !== ''): ?>
          <div class="alert" data-type="warning"><?= e($error) ?></div>
        <?php endif; ?>

        <form method="post" class="auth-form">
          <label class="field">
            <span>Username or Email</span>
            <input name="identifier" autocomplete="username" required>
          </label>

          <label class="field password-field">
            <span>Password</span>
            <span class="password-control"><input name="password" type="password" autocomplete="current-password" required><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
          </label>

          <button class="primary-button" type="submit">Log In</button>
        </form>

        <form method="post" class="auth-form guest-form">
          <input type="hidden" name="guest" value="1">
          <button class="secondary-button guest-button" type="submit">Continue as Guest</button>
          <p class="form-note">Guest users can use the calculator, but alerts require a signed-up account.</p>
        </form>

        <p class="auth-switch"><a href="forgot_password.php">Forgot password?</a></p>
        <p class="auth-switch">No account yet? <a href="signup.php">Create account</a></p>
      </section>
    </main>
      <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
