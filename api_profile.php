<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';

header('Content-Type: application/json');
$user = require_login();
require_same_origin_post();
if ((string) ($user['role'] ?? 'user') === 'guest') {
    http_response_code(403);
    echo json_encode(['error' => 'Guest users must create an account before editing a profile.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['profile' => user_profile($user)]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$users = read_users();
$index = find_user_index($users, (string) $user['username']);
if ($index === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Account was not found. Please log in again.']);
    exit;
}

$currentUsername = (string) $users[$index]['username'];
$newUsername = normalize_username((string) ($_POST['username'] ?? $currentUsername));
$newEmail = normalize_email((string) ($_POST['email'] ?? ($users[$index]['email'] ?? '')));
$newPhone = normalize_phone((string) ($_POST['phone'] ?? ($users[$index]['phone'] ?? '')));
$newPassword = (string) ($_POST['password'] ?? '');
$newPasswordConfirm = (string) ($_POST['password_confirm'] ?? '');
$oldEmail = (string) ($users[$index]['email'] ?? '');
$oldPhone = (string) ($users[$index]['phone'] ?? '');
$oldPicture = (string) ($users[$index]['profile_picture'] ?? '');
$removePicture = (string) ($_POST['remove_profile_picture'] ?? '0') === '1';
$isAdmin = (string) ($users[$index]['role'] ?? 'user') === 'admin';

$usernameError = validate_username($newUsername);
if ($usernameError !== null) {
    http_response_code(400);
    echo json_encode(['error' => $usernameError]);
    exit;
}

$emailError = validate_email_address($newEmail, !$isAdmin);
if ($emailError !== null) {
    http_response_code(400);
    echo json_encode(['error' => $emailError]);
    exit;
}

$phoneError = validate_phone_number($newPhone, !$isAdmin);
if ($phoneError !== null) {
    http_response_code(400);
    echo json_encode(['error' => $phoneError]);
    exit;
}

if (value_used_by_other_user('username', $newUsername, $currentUsername)) {
    http_response_code(409);
    echo json_encode(['error' => 'That username is already taken.']);
    exit;
}

if ($newEmail !== '' && value_used_by_other_user('email', $newEmail, $currentUsername)) {
    http_response_code(409);
    echo json_encode(['error' => 'That email is already registered.']);
    exit;
}

if ($newPhone !== '' && value_used_by_other_user('phone', $newPhone, $currentUsername)) {
    http_response_code(409);
    echo json_encode(['error' => 'That phone number is already registered.']);
    exit;
}

if ($removePicture && $oldPicture !== '') {
    if (strpos($oldPicture, UPLOAD_WEB_DIR . '/') === 0) {
        $oldPath = __DIR__ . '/' . $oldPicture;
        if (is_file($oldPath)) {
            unlink($oldPath);
        }
    }
    $users[$index]['profile_picture'] = '';
}

if ($newPassword !== '') {
    $passwordError = validate_password_rules($newPassword);
    if ($passwordError !== null) {
        http_response_code(400);
        echo json_encode(['error' => $passwordError]);
        exit;
    }
    if ($newPassword !== $newPasswordConfirm) {
        http_response_code(400);
        echo json_encode(['error' => 'New password and verify password must match.']);
        exit;
    }
    $users[$index]['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
}

if (isset($_FILES['profile_picture']) && is_array($_FILES['profile_picture']) && (int) $_FILES['profile_picture']['error'] !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['profile_picture'];
    if ((int) $file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'Profile picture upload failed. Please try another image.']);
        exit;
    }
    if ((int) $file['size'] > 2 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'Profile picture must be 2 MB or smaller.']);
        exit;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file((string) $file['tmp_name']);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    if (!isset($extensions[$mime])) {
        http_response_code(400);
        echo json_encode(['error' => 'Use a JPG, PNG, GIF, or WebP profile picture.']);
        exit;
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    $destination = UPLOAD_DIR . '/' . $filename;
    if (!move_uploaded_file((string) $file['tmp_name'], $destination)) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save the profile picture. Check server folder permissions.']);
        exit;
    }
    $users[$index]['profile_picture'] = UPLOAD_WEB_DIR . '/' . $filename;
}

$users[$index]['username'] = $newUsername;
$users[$index]['email'] = $newEmail;
$users[$index]['phone'] = $newPhone;
$users[$index]['updated_at'] = gmdate('c');
write_users($users);

if ($newUsername !== $currentUsername) {
    move_state_username($currentUsername, $newUsername);
}

$_SESSION['parking_user'] = $newUsername;
if ($newUsername !== $currentUsername) {
    add_notification($newUsername, 'Username updated', 'Your username was updated successfully.', 'profile');
}
if ($newEmail !== $oldEmail) {
    add_notification($newUsername, 'Email updated', 'Your email was updated successfully.', 'profile');
}
if ($newPhone !== $oldPhone) {
    add_notification($newUsername, 'Phone number updated', 'Your phone number was updated successfully.', 'profile');
}
if ($newPassword !== '') {
    add_notification($newUsername, 'Password updated', 'Your new password was updated successfully.', 'security');
}
if ((string) ($users[$index]['profile_picture'] ?? '') !== $oldPicture) {
    add_notification($newUsername, 'Profile picture updated', 'Your profile picture was updated successfully.', 'profile');
}
if ($newUsername === $currentUsername && $newEmail === $oldEmail && $newPhone === $oldPhone && $newPassword === '' && (string) ($users[$index]['profile_picture'] ?? '') === $oldPicture) {
    add_notification($newUsername, 'Profile checked', 'No profile changes were made.', 'profile');
}

echo json_encode(['ok' => true, 'profile' => user_profile($users[$index])]);
