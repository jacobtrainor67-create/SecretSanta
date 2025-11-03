# Secret Santa Email (Resend + Vercel)

A tiny web app to collect names & emails, generate a Secret Santa drawing with **manual locks & exclusions**, and email each participant their match using **[Resend](https://resend.com)**. Deployable on **Vercel** from a GitHub repo.

## ✨ Features
- Add participants (**name + email**)
- **Lock** a giver to a specific receiver
- **Exclude** specific receivers per giver
- Guaranteed **no self-matches**
- Preview messages before sending
- **Email delivery** via Resend (free API)
- Test Mode (validate only, don’t send)

## 🧱 Tech
- Frontend: vanilla HTML/CSS/JS
- Backend: Vercel Serverless Function (`/api/send-email.js`) calling Resend
- Env: `RESEND_API_KEY` (Project Settings → Environment Variables)

## 🚀 Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. In **Vercel**: New Project → Import your repo.
3. In *Project Settings → Environment Variables*, add:
   - `RESEND_API_KEY` = your Resend API key
   - (optional) `DEFAULT_FROM` = `onboarding@resend.dev` (or your verified domain address)
4. Deploy. Open your URL and you’re ready.

> For local dev, install Vercel CLI and run `npx vercel dev`. Create `.env.local` with `RESEND_API_KEY=...`.

## 🧪 Test Mode
- Toggle **Test mode** to avoid sending real emails.
- The API validates payloads and returns a success summary without contacting Resend.

## 🧠 Matching with Constraints
- **Lock**: Force “Alice must give to Bob”
- **Exclude**: Prevent “Dave cannot give to Carol or Eve”
- The solver uses a backtracking search with randomization and always prevents self-matches.

If an assignment is impossible, you’ll get an error explaining which constraints likely conflict.

## 📧 Email
- Default `from`: `onboarding@resend.dev` (works immediately)
- You can verify a domain in Resend to send from your own address later.
- Subject and body are templated. Available variables:
  - `{{giver}}`, `{{receiver}}`, `{{event}}`, `{{organizer}}`

## 📄 Files
- `index.html` – App UI (names, emails, lock/exclude)
- `style.css` – Styling
- `script.js` – Matching + client logic
- `api/send-email.js` – Serverless function to Resend email
- `vercel.json` – Minimal config
- `package.json` – (no deps needed, uses native fetch)
- `.env.example` – Example env

## 🧯 Troubleshooting
- **401/403 from API**: Check `RESEND_API_KEY` exists in the Vercel environment.
- **Mails not received**: Check spam folder; consider domain verification & DMARC for best deliverability.
- **Constraint errors**: Remove some exclusions or locks; ensure no two givers lock the same receiver.

## 📜 License
MIT
