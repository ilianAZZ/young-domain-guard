# Privacy Policy — Young Domain Guard

**Last updated:** February 6, 2026

Young Domain Guard is a browser extension that warns users when they visit recently registered domain names. This privacy policy explains how the extension handles user data.

## Data Collection

Young Domain Guard does **not** collect, store, transmit, or sell any personal data. Specifically, the extension does not collect:

- Personal information (name, email, address, etc.)
- Browsing history
- Authentication credentials
- Financial information
- Location data
- Health data
- User activity or keystrokes
- Website content

## Local Storage

The extension stores the following data **locally on your device only**, using the Chrome Storage API:

- **Alert threshold setting**: the number of days below which a domain is considered "young" (default: 30 days). This is a single numeric value configured by the user.

An in-memory cache of recent domain check results (domain name, registration date, age, status) is maintained temporarily to avoid redundant API calls. This cache has a 4-hour time-to-live and is never persisted to disk or transmitted to any server.

## External Requests

The extension makes requests to the public **RDAP (Registration Data Access Protocol)** API at `https://rdap.org` to retrieve domain registration dates. These requests contain only the domain name being checked and no user-identifying information.

No other external requests are made. No analytics, telemetry, or tracking services are used.

## Remote Code

The extension does not load or execute any remote code. All code is bundled locally within the extension package.

## Data Sharing

No data is shared with third parties. No data leaves your device except the domain name queries sent to the public RDAP API as described above.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected on this page with an updated date.

## Contact

If you have questions about this privacy policy, you can open an issue on the GitHub repository:
<https://github.com/ilianAZZ/young-domain-guard/issues>
