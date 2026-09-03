<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
$user = require_login();
require_same_origin_post();
$username = (string) $user['username'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $items = array_values(array_filter(
        read_notifications(),
        static fn(array $item): bool => (string) $item['username'] === $username
    ));
    usort($items, static fn(array $a, array $b): int => strcmp((string) $b['created_at'], (string) $a['created_at']));
    echo json_encode(['notifications' => $items]);
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

$action = (string) ($payload['action'] ?? '');
$items = read_notifications();

if ($action === 'add') {
    add_notification(
        $username,
        (string) ($payload['title'] ?? 'Notification'),
        (string) ($payload['message'] ?? ''),
        (string) ($payload['type'] ?? 'system')
    );
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'mark_read') {
    $id = (string) ($payload['id'] ?? '');
    foreach ($items as &$item) {
        if ((string) $item['username'] === $username && ($id === 'all' || (string) $item['id'] === $id)) {
            $item['read_at'] = gmdate('c');
        }
    }
    unset($item);
    write_notifications($items);
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'clear') {
    $items = array_values(array_filter(
        $items,
        static fn(array $item): bool => (string) $item['username'] !== $username
    ));
    write_notifications($items);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown notification action.']);
