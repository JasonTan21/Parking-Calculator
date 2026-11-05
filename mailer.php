<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;

function send_app_email(
    string $recipient,
    string $subject,
    string $message
): bool {
    $host = getenv('SMTP_HOST') ?: '';
    $username = getenv('SMTP_USER') ?: '';
    $password = getenv('SMTP_PASS') ?: '';
    $sender = getenv('SMTP_FROM') ?: '';

    if (
        $host === '' ||
        $username === '' ||
        $password === '' ||
        !filter_var($sender, FILTER_VALIDATE_EMAIL)
    ) {
        error_log('Parking Calculator: SMTP not configured.');
        return false;
    }

    try {
        $mail = new PHPMailer(true);

        $mail->isSMTP();
        $mail->Host = $host;
        $mail->SMTPAuth = true;
        $mail->Username = $username;
        $mail->Password = $password;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->CharSet = 'UTF-8';
        $mail->setFrom($sender, 'Parking Calculator');
        $mail->addAddress($recipient);

        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $message;

        return $mail->send();

    } catch (\Throwable $error) {
        error_log('Parking Calculator mail failure: ' . $error->getMessage());
        return false;
    }
}

