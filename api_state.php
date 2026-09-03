<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
$user = require_login();
require_same_origin_post();
$username = (string) $user['username'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $states = read_states();
    echo json_encode($states[$username]['state'] ?? new stdClass());
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$states = read_states();
$states[$username] = [
    'username' => $username,
    'state' => $payload,
    'updated_at' => gmdate('c'),
];
write_states($states);

echo json_encode(['ok' => true]);
