# Parking Calculator

A PHP parking fee calculator for selected Malaysian malls, with account login, guest access, saved user preferences, notifications, email reminders, and WhatsApp reminder links.

## Features

- Mall switcher: The Starling, Sunway Pyramid and 1 Utama (parking-type and 1PAY options)
- Weekday / weekend rates by entry date; manual public-holiday/eve override for Sunway Pyramid
- Live parking fee calculation from entry date and time
- Planned exit fee checking
- Budget planner, such as RM3 exit planning
- Live Malaysia time clock with 12-hour or 24-hour format
- User accounts with email OTP verification
- Guest mode for calculator-only access
- Per-user synced settings
- Browser notifications and vibration where supported
- Email reminders and OTP messages using PHPMailer with authenticated SMTP
- WhatsApp reminder links using the user's Malaysia phone number
- Profile settings with username, email, phone number, password, and profile picture crop
- Notifications inbox with unread indicator, message details, mark-read, and clear actions
- Admin page with separate admin/user tables sorted A-Z
- Light, dark, and system display modes
- Font, language, and RGB font-color settings

## Parking Rate

The Starling's original rate formula is preserved. Sunway Pyramid rates: [official FAQ](https://www.sunwaypyramid.com/faq/carpark-what-are-the-parking-rates-54887754c20fce497eea890aff8ec1fb). 1 Utama rates: [official services page](https://www.1utama.com.my/services/). Last reviewed: 5 November 2026.

**Estimates only.** Verify the rates displayed at the car park. Weekend rates use the entry date; public holidays/eves are manual for Sunway Pyramid. Non-Starling fee/budget calculations cover a maximum of 24 hours, and longer stays are not modeled. Discounts, daily reset, multi-day, special parking and payment grace may vary.

### The Starling (existing rate model)

- First 2 hours or part thereof: RM1.00
- 3rd hour or part thereof: RM1.00
- 4th hour or part thereof: RM1.00
- 5th hour and above, per hour: RM2.00

## Requirements

- Apache or another PHP-capable web server
- PHP 8 or newer recommended
- PHPMailer dependencies (`composer install`) and an SMTP provider for OTP emails and email alerts
- HTTPS recommended for production

No database is required. Runtime data is stored in text files under `data/`.

## Installation

1. Upload the project files to your Apache web directory.
2. Make sure Apache/PHP can write to:
   - `data/`
   - `uploads/profile/`
3. Open the site in your browser.

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


## Malaysia mall expansion (November 2026)

Six more selectable mall profiles have been added to the existing three:

- **Mid Valley Megamall** — Standard/Premier; weekday/weekend/PH, special fourth hour, 2026 revised rates. [Official 2026 rate sheet](https://www.midvalley.com.my/pdf/MVM_New_CarParkRates_2026.pdf)
- **The Gardens Mall** — Standard/Premier; weekday/weekend/PH, special fourth hour. [Official rates](https://www.thegardensmall.com.my/parking)
- **IOI City Mall** — Standard/Premier; weekday/weekend/PH. [Operator FAQ](https://ioicitymall.freshdesk.com/support/solutions/articles/150000192800-what-are-the-parking-rate-) and [parking rate listing](https://parking.com.my/item/ioi-city-mall-putrajaya/)
- **Sunway Velocity Mall** — Standard/Preferred; weekday/weekend/PH and daily caps. [Official rates](https://www.sunwayvelocitymall.com/getting-here)
- **Pavilion Bukit Jalil** — Standard; weekday/weekend/PH and RM15 daily cap. [Official rates](https://www.pavilion-bukitjalil.com/about)
- **Pavilion Kuala Lumpur** — Standard; RM40 daily cap, RM10 weekday evening-entry offer. [Official rates](https://www.pavilion-kl.com/about/)

Rates reviewed on 2026-11-05. Holidays must be selected manually; the weekday/weekend calculation uses the entry date. Estimates are restricted to one parking day (up to 24 hours) and **do not** compute daily resets, cross-midnight tariff changes, overnight penalties, ticket validation rules, merchant rebates, membership offers, or exit-after-payment grace periods. Confirm the final payable amount at each mall's machine/rate board.
