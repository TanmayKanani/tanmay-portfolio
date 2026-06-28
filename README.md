# Tanmay Kanani — Portfolio

A fast, animated single-page portfolio — CSE student, competitive programmer,
and full-stack developer.

Static site (HTML + CSS + vanilla JS) with GSAP for motion. Live coding stats
(LeetCode + Codeforces) and the activity heatmap are fetched client-side, and
the contact form delivers to email via Web3Forms — no backend required.

## Run locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Serve over http (not `file://`) so the live API calls and the contact form work.

## Structure

- `index.html` — markup
- `style.css` — styles
- `script.js` — interactions, live stats, activity heatmap, contact form
- `Tanmay_Kanani_Resume.pdf` — résumé

## Contact form

Submissions go through [Web3Forms](https://web3forms.com) (no server). The
public access key lives in `data-access-key` on the contact `<form>`. After
deploying, add the live domain under the form's *Allowed Domains* in Web3Forms.

## Deploy

Any static host works (Vercel, Netlify, GitHub Pages) — it's just these files.
