<?php
declare(strict_types=1);

const LOGIN_SESSION_TTL = 7200;

ini_set('session.gc_maxlifetime', (string) LOGIN_SESSION_TTL);
session_set_cookie_params([
    'lifetime' => LOGIN_SESSION_TTL,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

const DATA_DIR = __DIR__ . '/data';
const USER_FILE = DATA_DIR . '/users.txt';
const STATE_FILE = DATA_DIR . '/user_state.txt';
const NOTIFICATION_FILE = DATA_DIR . '/notifications.txt';
const SESSION_FILE = DATA_DIR . '/sessions.txt';
const UPLOAD_DIR = __DIR__ . '/uploads/profile';
const UPLOAD_WEB_DIR = 'uploads/profile';

function ensure_storage(): void
{
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0750, true);
    }

    if (!file_exists(USER_FILE)) {
        $admin = [
            'username' => 'admin',
            'email' => '',
            'password_hash' => password_hash('Admin@123', PASSWORD_DEFAULT),
            'role' => 'admin',
            'profile_picture' => '',
            'created_at' => gmdate('c'),
            'updated_at' => gmdate('c'),
        ];
        file_put_contents(USER_FILE, json_encode($admin) . PHP_EOL, LOCK_EX);
    }

    if (!file_exists(STATE_FILE)) {
        file_put_contents(STATE_FILE, '', LOCK_EX);
    }

    if (!file_exists(NOTIFICATION_FILE)) {
        file_put_contents(NOTIFICATION_FILE, '', LOCK_EX);
    }

    if (!file_exists(SESSION_FILE)) {
        file_put_contents(SESSION_FILE, '', LOCK_EX);
    }

    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    $uploadHtaccess = UPLOAD_DIR . '/.htaccess';
    if (!file_exists($uploadHtaccess)) {
        file_put_contents($uploadHtaccess, "Options -ExecCGI\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8\nRemoveType .php .phtml .php3 .php4 .php5 .php7 .php8\nAddType text/plain .php .phtml .php3 .php4 .php5 .php7 .php8\n", LOCK_EX);
    }
}

function read_users(): array
{
    ensure_storage();
    $rows = file(USER_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $users = [];

    foreach ($rows as $row) {
        $user = json_decode($row, true);
        if (is_array($user) && isset($user['username'], $user['password_hash'])) {
            $users[] = $user;
        }
    }

    return $users;
}

function write_users(array $users): void
{
    ensure_storage();
    $lines = array_map(static fn(array $user): string => json_encode($user), $users);
    file_put_contents(USER_FILE, implode(PHP_EOL, $lines) . PHP_EOL, LOCK_EX);
}


function read_login_sessions(): array
{
    ensure_storage();
    $rows = file(SESSION_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $sessions = [];

    foreach ($rows as $row) {
        $session = json_decode($row, true);
        if (is_array($session) && isset($session['sid'], $session['username']) && (int) ($session['expires_at'] ?? 0) > time()) {
            $sessions[(string) $session['sid']] = $session;
        }
    }

    return $sessions;
}

function write_login_sessions(array $sessions): void
{
    ensure_storage();
    $lines = array_map(static fn(array $session): string => json_encode($session), array_values($sessions));
    file_put_contents(SESSION_FILE, implode(PHP_EOL, $lines) . (count($lines) ? PHP_EOL : ''), LOCK_EX);
}

function request_sid(): string
{
    $sid = (string) ($_GET['sid'] ?? $_POST['sid'] ?? ($_SERVER['HTTP_X_PARKING_SESSION'] ?? ''));
    return preg_match('/^[a-f0-9]{48}$/', $sid) ? $sid : '';
}

function create_login_session(string $username): string
{
    $sessions = read_login_sessions();
    $sid = bin2hex(random_bytes(24));
    $sessions[$sid] = [
        'sid' => $sid,
        'username' => $username,
        'role' => 'user',
        'php_session_id' => session_id(),
        'created_at' => gmdate('c'),
        'expires_at' => time() + LOGIN_SESSION_TTL,
    ];
    write_login_sessions($sessions);
    $_SESSION['parking_sid'] = $sid;
    $_SESSION['parking_user'] = $username;
    return $sid;
}

function create_guest_session(): string
{
    $sessions = read_login_sessions();
    $sid = bin2hex(random_bytes(24));
    $sessions[$sid] = [
        'sid' => $sid,
        'username' => 'Guest',
        'role' => 'guest',
        'php_session_id' => session_id(),
        'created_at' => gmdate('c'),
        'expires_at' => time() + LOGIN_SESSION_TTL,
    ];
    write_login_sessions($sessions);
    $_SESSION['parking_sid'] = $sid;
    $_SESSION['parking_user'] = 'Guest';
    return $sid;
}

function delete_login_session(string $sid): void
{
    if ($sid === '') {
        return;
    }
    $sessions = read_login_sessions();
    unset($sessions[$sid]);
    write_login_sessions($sessions);
}

function app_url(string $path): string
{
    $sid = request_sid();
    if ($sid === '') {
        return $path;
    }
    return $path . (strpos($path, '?') === false ? '?' : '&') . 'sid=' . rawurlencode($sid);
}

function normalize_username(string $username): string
{
    return trim($username);
}

function normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function normalize_phone(string $phone): string
{
    $phone = preg_replace('/[\s\-().]/', '', trim($phone));
    if ($phone === '') {
        return '';
    }
    if (strpos($phone, '0060') === 0) {
        $phone = '+60' . substr($phone, 4);
    } elseif (strpos($phone, '+60') === 0) {
        $phone = '+60' . substr($phone, 3);
    } elseif (strpos($phone, '60') === 0) {
        $phone = '+' . $phone;
    } elseif (strpos($phone, '0') === 0) {
        $phone = '+6' . $phone;
    } elseif (preg_match('/^\d{8,10}$/', $phone)) {
        $phone = '+60' . $phone;
    }
    return $phone;
}

function phone_input_value(string $phone): string
{
    $phone = normalize_phone($phone);
    return strpos($phone, '+60') === 0 ? substr($phone, 3) : $phone;
}

function validate_phone_number(string $phone, bool $required = true): ?string
{
    if ($phone === '' && !$required) {
        return null;
    }
    if (!preg_match('/^\+60\d{8,10}$/', $phone)) {
        return 'Please enter a valid Malaysia phone number without +60. Example: 162345678.';
    }
    return null;
}

function validate_username(string $username): ?string
{
    if (!preg_match('/^[A-Za-z0-9_]{3,24}$/', $username)) {
        return 'Username must be 3-24 characters and use only letters, numbers, or underscore.';
    }
    return null;
}

function validate_email_address(string $email, bool $required = true): ?string
{
    if ($email === '' && !$required) {
        return null;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160) {
        return 'Please enter a valid email address.';
    }

    $parts = explode('@', strtolower($email));
    $domain = $parts[1] ?? '';
    $domainParts = explode('.', $domain);
    $tld = end($domainParts) ?: '';
    if (!preg_match('/^[a-z0-9.-]+\.[a-z]{2,24}$/', $domain) || strpos($domain, '..') !== false) {
        return 'Please enter a valid email domain.';
    }

    $knownTypos = [
        'gmail.co' => 'gmail.com',
        'gmail.con' => 'gmail.com',
        'gamil.com' => 'gmail.com',
        'gmial.com' => 'gmail.com',
        'hotmai.com' => 'hotmail.com',
        'hotmal.com' => 'hotmail.com',
        'outlook.co' => 'outlook.com',
        'yahoo.co' => 'yahoo.com',
    ];
    if (isset($knownTypos[$domain])) {
        return 'Please check your email domain. Did you mean ' . $knownTypos[$domain] . '?';
    }

    if ($domain === 'gmail.com' && substr_count($email, '@') === 1) {
        return null;
    }

    return null;
}

function find_user(string $identifier): ?array
{
    $identifier = strtolower(trim($identifier));
    foreach (read_users() as $user) {
        $username = strtolower((string) $user['username']);
        $email = strtolower((string) ($user['email'] ?? ''));
        if ($identifier === $username || ($email !== '' && $identifier === $email)) {
            return $user;
        }
    }
    return null;
}

function find_user_index(array $users, string $identifier): ?int
{
    $identifier = strtolower(trim($identifier));
    foreach ($users as $index => $user) {
        $username = strtolower((string) $user['username']);
        $email = strtolower((string) ($user['email'] ?? ''));
        if ($identifier === $username || ($email !== '' && $identifier === $email)) {
            return $index;
        }
    }
    return null;
}

function username_exists(string $username): bool
{
    return find_user($username) !== null;
}

function email_exists(string $email): bool
{
    if ($email === '') {
        return false;
    }
    return find_user($email) !== null;
}

function phone_exists(string $phone): bool
{
    $phone = normalize_phone($phone);
    if ($phone === '') {
        return false;
    }
    foreach (read_users() as $user) {
        if (normalize_phone((string) ($user['phone'] ?? '')) === $phone) {
            return true;
        }
    }
    return false;
}

function account_is_active(array $user): bool
{
    return (string) ($user['status'] ?? 'active') === 'active';
}

function generate_otp(): string
{
    return (string) random_int(100000, 999999);
}

function send_otp_email(string $email, string $username, string $otp, string $purpose = 'verification'): bool
{
    $subject = $purpose === 'password_reset' ? 'Parking Calculator password reset code' : 'Parking Calculator verification code';
    $message = "Hi {$username},\n\n";
    $message .= $purpose === 'password_reset'
        ? "Your Parking Calculator password reset code is: {$otp}\n\n"
        : "Your Parking Calculator verification code is: {$otp}\n\n";
    $message .= "This code expires in 1 minute.\n";
    $headers = [
        'From: Parking Calculator <no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '>',
        'Content-Type: text/plain; charset=UTF-8',
    ];

    return mail($email, $subject, $message, implode("\r\n", $headers));
}

function set_account_otp(string $username, string $purpose): bool
{
    $users = read_users();
    $index = find_user_index($users, $username);
    if ($index === null) {
        return false;
    }

    $otp = generate_otp();
    $users[$index]['otp_hash'] = password_hash($otp, PASSWORD_DEFAULT);
    $users[$index]['otp_expires_at'] = time() + 60;
    $users[$index]['otp_purpose'] = $purpose;
    $users[$index]['updated_at'] = gmdate('c');
    write_users($users);

    return send_otp_email((string) ($users[$index]['email'] ?? ''), (string) $users[$index]['username'], $otp, $purpose);
}

function set_signup_otp(string $username): bool
{
    return set_account_otp($username, 'signup');
}

function set_password_reset_otp(string $username): bool
{
    return set_account_otp($username, 'password_reset');
}

function value_used_by_other_user(string $field, string $value, string $currentUsername): bool
{
    $value = strtolower(trim($value));
    foreach (read_users() as $user) {
        if (strtolower((string) $user['username']) === strtolower($currentUsername)) {
            continue;
        }
        if (strtolower((string) ($user[$field] ?? '')) === $value) {
            return true;
        }
    }
    return false;
}

function validate_password_rules(string $password): ?string
{
    if (strlen($password) < 7) {
        return 'Password must be at least 7 characters.';
    }
    if (!preg_match('/\d/', $password)) {
        return 'Password must include at least one number.';
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        return 'Password must include at least one special character.';
    }
    return null;
}

function current_user(): ?array
{
    $sid = request_sid();
    if ($sid === '') {
        $sid = (string) ($_SESSION['parking_sid'] ?? '');
        if (!preg_match('/^[a-f0-9]{48}$/', $sid)) {
            return null;
        }
    }

    $sessions = read_login_sessions();
    if (!isset($sessions[$sid])) {
        return null;
    }

    $boundSessionId = (string) ($sessions[$sid]['php_session_id'] ?? '');
    if ($boundSessionId === '') {
        if ((string) ($_SESSION['parking_sid'] ?? '') !== $sid) {
            return null;
        }
        $sessions[$sid]['php_session_id'] = session_id();
        write_login_sessions($sessions);
    } elseif (!hash_equals($boundSessionId, session_id())) {
        return null;
    }

    $sessions[$sid]['expires_at'] = time() + LOGIN_SESSION_TTL;
    write_login_sessions($sessions);

    $params = session_get_cookie_params();
    $cookieOptions = [
        'expires' => time() + LOGIN_SESSION_TTL,
        'path' => $params['path'] ?? '/',
        'secure' => (bool) ($params['secure'] ?? false),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    if (!empty($params['domain'])) {
        $cookieOptions['domain'] = $params['domain'];
    }
    setcookie(session_name(), session_id(), $cookieOptions);

    if ((string) ($sessions[$sid]['role'] ?? '') === 'guest') {
        $_SESSION['parking_sid'] = $sid;
        $_SESSION['parking_user'] = 'Guest';
        return [
            'username' => 'Guest',
            'email' => '',
            'phone' => '',
            'role' => 'guest',
            'status' => 'active',
            'profile_picture' => '',
            'created_at' => (string) ($sessions[$sid]['created_at'] ?? ''),
            'updated_at' => (string) ($sessions[$sid]['created_at'] ?? ''),
        ];
    }

    $user = find_user((string) $sessions[$sid]['username']);
    if ($user !== null && account_is_active($user)) {
        $_SESSION['parking_sid'] = $sid;
        $_SESSION['parking_user'] = (string) $user['username'];
        return $user;
    }

    return null;
}

function require_login(): array
{
    $user = current_user();
    if ($user === null) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function require_same_origin_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $header) {
        if (empty($_SERVER[$header])) {
            continue;
        }
        $requestHost = strtolower((string) (parse_url((string) $_SERVER[$header], PHP_URL_HOST) ?? ''));
        if ($requestHost !== '' && $host !== '' && $requestHost !== $host) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Request origin is not allowed.']);
            exit;
        }
    }
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}


function malaysia_display_time(string $value): string
{
    if ($value === '') {
        return '';
    }
    try {
        $date = new DateTimeImmutable($value);
        return $date->setTimezone(new DateTimeZone('Asia/Kuala_Lumpur'))->format('d M Y, g:i A');
    } catch (Throwable $error) {
        return $value;
    }
}

function read_states(): array
{
    ensure_storage();
    $rows = file(STATE_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $states = [];

    foreach ($rows as $row) {
        $state = json_decode($row, true);
        if (is_array($state) && isset($state['username'])) {
            $states[(string) $state['username']] = $state;
        }
    }

    return $states;
}

function write_states(array $states): void
{
    ensure_storage();
    $lines = array_map(static fn(array $state): string => json_encode($state), array_values($states));
    file_put_contents(STATE_FILE, implode(PHP_EOL, $lines) . PHP_EOL, LOCK_EX);
}

function move_state_username(string $oldUsername, string $newUsername): void
{
    $states = read_states();
    if (!isset($states[$oldUsername])) {
        return;
    }
    $states[$newUsername] = $states[$oldUsername];
    $states[$newUsername]['username'] = $newUsername;
    $states[$newUsername]['updated_at'] = gmdate('c');
    unset($states[$oldUsername]);
    write_states($states);
}

function delete_state_for_user(string $username): void
{
    $states = read_states();
    unset($states[$username]);
    write_states($states);
}

function read_notifications(): array
{
    ensure_storage();
    $rows = file(NOTIFICATION_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $items = [];

    foreach ($rows as $row) {
        $item = json_decode($row, true);
        if (is_array($item) && isset($item['id'], $item['username'])) {
            $items[] = $item;
        }
    }

    return $items;
}

function write_notifications(array $items): void
{
    ensure_storage();
    $lines = array_map(static fn(array $item): string => json_encode($item), $items);
    file_put_contents(NOTIFICATION_FILE, implode(PHP_EOL, $lines) . (count($lines) ? PHP_EOL : ''), LOCK_EX);
}

function add_notification(string $username, string $title, string $message, string $type = 'system'): void
{
    $items = read_notifications();
    $items[] = [
        'id' => bin2hex(random_bytes(12)),
        'username' => $username,
        'type' => preg_replace('/[^a-z0-9_-]/i', '', $type) ?: 'system',
        'title' => substr(trim($title), 0, 120),
        'message' => substr(trim($message), 0, 500),
        'created_at' => gmdate('c'),
        'read_at' => '',
    ];
    write_notifications($items);
}

function delete_notifications_for_user(string $username): void
{
    $items = array_values(array_filter(
        read_notifications(),
        static fn(array $item): bool => (string) $item['username'] !== $username
    ));
    write_notifications($items);
}

function user_profile(array $user): array
{
    return [
        'username' => (string) $user['username'],
        'email' => (string) ($user['email'] ?? ''),
        'phone' => (string) ($user['phone'] ?? ''),
        'role' => (string) ($user['role'] ?? 'user'),
        'profile_picture' => (string) ($user['profile_picture'] ?? ''),
        'created_at' => (string) ($user['created_at'] ?? ''),
        'updated_at' => (string) ($user['updated_at'] ?? ''),
    ];
}

ensure_storage();
