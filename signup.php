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
    $username = normalize_username((string) ($_POST['username'] ?? ''));
    $email = normalize_email((string) ($_POST['email'] ?? ''));
    $phone = normalize_phone((string) ($_POST['phone'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');

    $usernameError = validate_username($username);
    $emailError = validate_email_address($email);
    $phoneError = validate_phone_number($phone);

    if ($usernameError !== null) {
        $error = $usernameError;
    } elseif ($emailError !== null) {
        $error = $emailError;
    } elseif ($phoneError !== null) {
        $error = $phoneError;
    } elseif (username_exists($username)) {
        $error = 'That username is already taken.';
    } elseif (email_exists($email)) {
        $error = 'That email is already registered.';
    } elseif (phone_exists($phone)) {
        $error = 'That phone number is already registered.';
    } else {
        $passwordError = validate_password_rules($password);
        if ($passwordError !== null) {
            $error = $passwordError;
        } elseif ($password !== $passwordConfirm) {
            $error = 'Password and verify password must match.';
        }
    }

    if ($error === '') {
        $users = read_users();
        $users[] = [
            'username' => $username,
            'email' => strtolower($email),
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => 'user',
            'status' => 'pending',
            'profile_picture' => '',
            'created_at' => gmdate('c'),
            'updated_at' => gmdate('c'),
        ];
        write_users($users);
        $_SESSION['pending_signup_user'] = $username;
        $_SESSION['otp_send_failed'] = set_signup_otp($username) ? '' : 'OTP email could not be sent. Please check server mail configuration or request a new OTP.';

        header('Location: verify_signup.php');
        exit;
    }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign Up - Parking Calculator</title>
    <link rel="icon" href="parking_website_icon.png" type="image/png">
    <link rel="stylesheet" href="styles.css?v=20260901-session2h">
  </head>
  <body>
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="signup-title">
        <img class="brand-mark brand-logo" src="parking_header_logo.png" alt="Parking Calculator logo">
        <p class="eyebrow">Parking fee tool</p>
        <h1 id="signup-title">Create Account</h1>
        <p class="subtitle">Sign up with your email and Malaysia phone number before using the calculator.</p>

        <?php if ($error !== ''): ?>
          <div class="alert" data-type="warning"><?= e($error) ?></div>
        <?php endif; ?>

        <form method="post" class="auth-form">
          <label class="field">
            <span>Username</span>
            <input name="username" autocomplete="username" minlength="3" maxlength="24" required>
          </label>

          <label class="field">
            <span>Email</span>
            <input name="email" type="email" autocomplete="email" required>
          </label>

          <label class="field">
            <span>Phone Number</span>
            <input name="phone" type="tel" autocomplete="tel" inputmode="numeric" placeholder="162345678" pattern="\d{8,10}" required>
            <small>Enter numbers only after +60. Example: 162345678</small>
          </label>

          <label class="field password-field">
            <span>Password</span>
            <span class="password-control"><input name="password" type="password" autocomplete="new-password" minlength="7" pattern="(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}" required><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
          </label>

          <label class="field password-field">
            <span>Verify Password</span>
            <span class="password-control"><input name="password_confirm" type="password" autocomplete="new-password" minlength="7" required><button class="password-toggle" type="button" aria-label="Show password">Show</button></span>
          </label>

          <p class="form-note">Minimum 7 characters, including one number and one special character.</p>
          <button class="primary-button" type="submit">Create Account</button>
        </form>

        <p class="auth-switch">Already have an account? <a href="login.php">Log in</a></p>
      </section>
    </main>
      <script src="script.js?v=20260901-session2h"></script>
  </body>
</html>
