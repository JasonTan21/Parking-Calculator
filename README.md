# Parking Calculator

A PHP parking fee calculator for Starling mall parking rates in Malaysia, with account login, guest access, saved user preferences, notifications, email reminders, and WhatsApp reminder links.

## Features

- Live parking fee calculation from entry date and time
- Planned exit fee checking
- Budget planner, such as RM3 exit planning
- Live Malaysia time clock with 12-hour or 24-hour format
- User accounts with email OTP verification
- Guest mode for calculator-only access
- Per-user synced settings
- Browser notifications and vibration where supported
- Email reminders through Apache/PHP `mail()`
- WhatsApp reminder links using the user's Malaysia phone number
- Profile settings with username, email, phone number, password, and profile picture crop
- Notifications inbox with unread indicator, message details, mark-read, and clear actions
- Admin page with separate admin/user tables sorted A-Z
- Light, dark, and system display modes
- Font, language, and RGB font-color settings

## Parking Rate

- First 2 hours or part thereof: RM1.00
- 3rd hour or part thereof: RM1.00
- 4th hour or part thereof: RM1.00
- 5th hour and above, per hour: RM2.00

## Requirements

- Apache or another PHP-capable web server
- PHP 8 or newer recommended
- PHP `mail()` configured for OTP emails and email alerts
- HTTPS recommended for production

No database is required. Runtime data is stored in text files under `data/`.

## Installation

1. Upload the project files to your Apache web directory.
2. Make sure Apache/PHP can write to:
   - `data/`
   - `uploads/profile/`
3. Open the site in your browser.
4. Log in with the initial admin account.

Initial admin account:

- Username: `admin`
- Password: `Admin@123`

Change the admin password after first login.

## Create Account

1. Open the sign-up page.
2. Enter username, email, phone number, password, and verify password.
3. Enter the phone number without `+60`.
   - Example: `162345678`
   - The system stores it as `+60162345678`.
4. Check email for the 6-digit OTP.
5. Enter the OTP within 1 minute.

## Guest Mode

Guests can use the calculator without creating an account.

Guests cannot receive browser, email, or WhatsApp alerts. Create an account to use alerts and synced account settings.

## Calculator

Use the Calculator page to enter:

- Entry Date
- Entry Time
- Optional Check Exit Time
- Optional Target Budget

The app shows the current fee, parked time, exit-before time, checked exit fee, and budget exit plan.

## Alerts

In Settings, choose how many minutes before the planned exit time to be reminded:

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 25 minutes
- 30 minutes

Available channels:

- Browser alert
- Email alert
- WhatsApp alert link

WhatsApp reminders open a prepared WhatsApp message on the user's device. Fully automatic WhatsApp sending requires a WhatsApp Business API integration, which is not included.

## Settings

Users can change:

- Profile picture
- Username
- Email
- Malaysia phone number
- Password
- Alert timing
- Email alert setting
- WhatsApp alert setting
- Light, dark, or system mode
- Font
- Language
- Clock format
- Font color

## Notifications

The Notifications page shows browser reminder records, email alert results, WhatsApp alert records, and profile/security messages.

Users can open messages, mark them as read, and clear them.

## Admin

Admin users can view admin accounts and user accounts separately.

The admin page shows username, email, phone number, role, status, password hash, joined date, updated date, and profile picture. Passwords are shown only as hashes.

## Data Storage

Runtime files are created inside `data/`, including users, sessions, notifications, and saved settings. These files are ignored by Git because they can contain private data.

Uploaded profile pictures are stored under `uploads/profile/` and are ignored by Git.

## Security Notes

- Passwords are stored with PHP `password_hash()`.
- OTP codes expire after 1 minute.
- Login sessions expire after 2 hours of inactivity.
- Runtime data files should not be committed to GitHub.
- Use HTTPS in production.
- Configure PHP mail securely before using email alerts or OTP delivery.

## Public Domain

This project is released into the public domain under CC0 1.0 Universal. See `LICENSE` for details.
