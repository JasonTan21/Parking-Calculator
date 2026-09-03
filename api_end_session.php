<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
require_same_origin_post();
delete_login_session(request_sid());
echo json_encode(['ok' => true]);
