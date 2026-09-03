<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
$user = require_login();

if ((string) ($user['role'] ?? 'user') !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access only.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$users = array_map(static function (array $account): array {
    return [
        'username' => (string) $account['username'],
        'email' => (string) ($account['email'] ?? ''),
        'phone' => (string) ($account['phone'] ?? ''),
        'role' => (string) ($account['role'] ?? 'user'),
        'status' => (string) ($account['status'] ?? 'active'),
        'password_hash' => (string) $account['password_hash'],
        'profile_picture' => (string) ($account['profile_picture'] ?? ''),
        'created_at' => (string) ($account['created_at'] ?? ''),
        'updated_at' => (string) ($account['updated_at'] ?? ''),
        'created_display' => malaysia_display_time((string) ($account['created_at'] ?? '')),
        'updated_display' => malaysia_display_time((string) ($account['updated_at'] ?? '')),
    ];
}, read_users());

usort($users, static fn(array $a, array $b): int => strcasecmp((string) $a['username'], (string) $b['username']));

echo json_encode(['users' => $users]);
