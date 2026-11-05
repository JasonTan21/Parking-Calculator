# 🅿️ Malaysia Parking Calculator

A web-based **Multi-Mall Parking Calculator** designed for shopping malls across Malaysia.

Built with **PHP, JavaScript, HTML, and CSS**, the application helps drivers estimate parking fees, monitor parking duration, plan their exit time, and manage parking reminders.

The system currently supports **29 Malaysian shopping malls**, with different parking rates based on location, parking category, weekday, weekend, public holiday, and applicable membership options.

### 🌐 Live Website

**[parking.theusefulhacker.my](https://parking.theusefulhacker.my/)**

---

## ✨ Features

### 🚗 Multi-Mall Parking Calculator

- Select from 29 supported shopping malls in Malaysia.
- Automatically apply the selected mall's parking-rate structure.
- Choose parking categories where supported, including Standard, Premier, Preferred, Valet, and Motorcycle.
- Support applicable membership rates, including 1 Utama's 1PAY.
- Calculate weekday and weekend parking fees.
- Manually select public-holiday rates where applicable.
- Support different charging periods, hourly rates, daily maximums, entry grace periods, and selected evening-entry pricing.
- Remember the user's selected mall and parking options.

### ⏱️ Live Parking Fee Calculation

- Enter parking entry date and time.
- Monitor elapsed parking duration.
- View estimated parking fees in Malaysian Ringgit (MYR).
- Check the next parking-fee increase.
- Calculate estimated fees for a planned exit time.
- View a breakdown of the selected parking-rate structure.

### 💰 Budget Planner

- Set a target parking budget.
- Calculate the latest estimated exit time within that budget.
- View the next applicable parking charge.
- Automatically update calculations when switching malls.

### 🔔 Parking Reminders

- Browser notifications.
- Email reminders through authenticated SMTP.
- WhatsApp reminder links.
- Custom reminder timing from 5 to 30 minutes before the planned exit.
- Notification history with read and unread status.

**Note:** Browser-based reminders require the application to remain active. WhatsApp reminders open a prepared message rather than sending automatically.

### 👤 User Accounts

- User registration and login.
- Email OTP verification.
- Guest access to the calculator.
- User profile management.
- Profile picture upload and cropping.
- Password management.
- Per-user saved preferences and settings.
- Account session management.

### 🎨 Customization

- Light mode, dark mode, and system theme.
- Font customization.
- Language settings.
- Custom font colors.
- 12-hour and 24-hour clock formats.
- Responsive layout for desktop and mobile devices.

---

## 🏬 Supported Shopping Malls

The application currently includes **29 shopping malls** across Kuala Lumpur, Selangor, Putrajaya, Cyberjaya, and surrounding areas.

### Kuala Lumpur

1. Mid Valley Megamall
2. The Gardens Mall
3. Pavilion Kuala Lumpur
4. Pavilion Bukit Jalil
5. Suria KLCC
6. The Exchange TRX
7. Berjaya Times Square
8. Lot 10
9. Sunway Putra Mall
10. Sunway Velocity Mall
11. MyTOWN Shopping Centre
12. EkoCheras Mall
13. KL Gateway Mall
14. Pearl Point / Pearl Shopping Gallery
15. Ombak KLCC

### Petaling Jaya & Damansara

16. 1 Utama Shopping Centre
17. The Starling Mall
18. Paradigm Mall Petaling Jaya
19. the Curve

### Subang Jaya & Puchong

20. Sunway Pyramid
21. Sunway Square
22. NU Empire
23. One City
24. SetiaWalk
25. IOI Mall Puchong

### Other Klang Valley Locations

26. IOI City Mall — Putrajaya
27. DPULZE Shopping Centre — Cyberjaya
28. KLGCC Mall — Bukit Kiara
29. Mitsui Outlet Park KLIA — Sepang

Additional Malaysian shopping malls can be introduced by extending the parking-rate configuration.

---

## 🧮 Parking Rate System

Each mall has its own parking-rate profile.

Depending on the selected mall, calculations may consider:

- Initial parking charges.
- Subsequent hourly charges.
- Weekday and weekend rates.
- Public-holiday rates.
- Parking category.
- Membership eligibility.
- Entry grace periods.
- Daily maximum charges.
- Special evening-entry rates.
- Applicable service tax.

### Important Parking Rate Disclaimer

**All displayed parking fees are estimates and should not be treated as guaranteed charges.**

- Parking rates may change without notice.
- Public holidays must be selected manually where applicable.
- Certain malls may have special membership or promotional rates.
- Some parking-rate information comes from third-party parking listings.
- Multi-day parking and overnight penalties are not fully modeled.
- Daily reset rules, merchant rebates, ticket validation, and exit-after-payment grace periods may differ.
- The multi-mall estimation engine is generally limited to the first 24 hours of parking.
- The Starling's original calculator formula is preserved for compatibility.

Always refer to the official parking-rate information displayed at the mall before making payment.

Parking-rate source links and relevant notices are available within the application's mall selection interface.

**Parking profiles last reviewed: November 2026.**

---

## 🧭 How to Use

### Step 1 — Choose a Shopping Mall

Select a shopping mall from the dropdown menu.

### Step 2 — Choose the Parking Category

Select the relevant parking area or membership rate, if available.

### Step 3 — Set Entry Date and Time

Enter the parking entry date and time, or select **Use Current Time**.

### Step 4 — View Parking Information

The calculator displays:

- Fee If Exit Now
- Parked Time
- Exit Before
- Checked Exit Fee
- Parking Rate Breakdown

### Step 5 — Plan Your Budget

Enter your target parking budget to calculate an estimated exit time.

### Step 6 — Configure Reminders

Registered users can configure available notification options through Settings.

---

## 🔐 Authentication & Account Management

### Account Registration

New users can create accounts using:

- Username
- Email address
- Malaysian phone number
- Password

Email verification is performed using a six-digit OTP.

OTP codes expire after one minute.

### Guest Mode

Guests can use the calculator without registering.

Some features, including account-specific reminders and synced preferences, require login.

### User Settings

Registered users can manage their profile, display preferences, contact details, and reminder settings.

### Administrator Features

Authorized administrator accounts can view user and administrator information through the administration interface.

Passwords are stored as hashes rather than plaintext.

---

## 🔔 Notification System

Supported reminder methods include:

| Notification | Description |
|---|---|
| Browser | Local browser notification when permitted |
| Email | Email reminder using PHPMailer and configured SMTP |
| WhatsApp | Opens a prepared WhatsApp message |
| Notification History | View recorded notifications and their status |

Reminder intervals:

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 25 minutes
- 30 minutes

The current application does not include a continuously running background notification service or automatic WhatsApp Business API delivery.

---

## 📌 Future Improvements

Potential enhancements include:

- Additional malls throughout Malaysia.
- Searchable mall selection.
- Mall filtering by state and city.
- More parking categories and membership plans.
- Automatically maintained parking-rate information.
- Public-holiday calendar integration.
- More accurate overnight and multi-day fee handling.
- Favorite malls and recently visited malls.
- Parking history and statistics.
- Improved rate-source management and verification.

---

## 📄 License

This project is released into the public domain under **CC0 1.0 Universal**.

See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Developer

**Jason Tan**

GitHub: [@JasonTan21](https://github.com/JasonTan21)

Portfolio: [folio.theusefulhacker.my](https://folio.theusefulhacker.my/)

---

**Malaysia Parking Calculator — Making parking fee estimation easier, one mall at a time.**
