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

$email = (string) ($user['email'] ?? '');
if ($email === '') {
    http_response_code(400);
    echo json_encode(['error' => 'This account has no email address.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$plannedExit = trim((string) ($payload['plannedExit'] ?? ''));
$minutesBefore = (int) ($payload['minutesBefore'] ?? 0);

if ($plannedExit === '' || $minutesBefore <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing alert details.']);
    exit;
}

$subject = 'Parking Exit Reminder';
$message = "Hi {$user['username']},\n\n";
$message .= "This is your parking reminder.\n";
$message .= "Planned exit time: {$plannedExit}\n";
$message .= "Alert timing: {$minutesBefore} minutes before exit\n\n";
$message .= "Please prepare to leave before your parking fee changes.\n";
$headers = [
    'From: Parking Calculator <non-reply@theusefulhacker.my>',
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = mail($email, $subject, $message, implode("\r\n", $headers));

if (!$sent) {
    add_notification((string) $user['username'], 'Email alert failed', 'The parking reminder email could not be sent. Check Apache/PHP mail configuration.', 'email');
    http_response_code(500);
    echo json_encode(['error' => 'Email could not be sent. Please check Apache/PHP mail configuration.']);
    exit;
}

add_notification((string) $user['username'], 'Email alert sent', 'Parking reminder email sent to ' . $email . ' for ' . $plannedExit . '.', 'email');
echo json_encode(['ok' => true]);
