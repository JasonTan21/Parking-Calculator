<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
$user = require_login();
require_same_origin_post();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if ((string) ($user['role'] ?? 'user') === 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'The initial admin account cannot be deleted from Settings.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$password = (string) ($payload['password'] ?? '');
$passwordConfirm = (string) ($payload['password_confirm'] ?? '');
if ($password === '' || $password !== $passwordConfirm) {
    http_response_code(400);
    echo json_encode(['error' => 'Password and verify password must match.']);
    exit;
}
if (!password_verify($password, (string) $user['password_hash'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Password confirmation is incorrect.']);
    exit;
}

$username = (string) $user['username'];
$users = array_values(array_filter(
    read_users(),
    static fn(array $account): bool => strtolower((string) $account['username']) !== strtolower($username)
));
write_users($users);
delete_state_for_user($username);
delete_notifications_for_user($username);

$picture = (string) ($user['profile_picture'] ?? '');
if ($picture !== '' && strpos($picture, UPLOAD_WEB_DIR . '/') === 0) {
    $path = __DIR__ . '/' . $picture;
    if (is_file($path)) {
        unlink($path);
    }
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
}
session_destroy();

echo json_encode(['ok' => true]);
