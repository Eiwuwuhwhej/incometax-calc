# Indian Freelancer Tax Calculator (FY 2026-27)

A highly optimized, fully static web application built to help Indian freelancers and independent professionals calculate their income tax liability. The calculator evaluates different tax regimes and methods to recommend the most beneficial filing option.

## Features

- **Comprehensive Tax Comparison:** Automatically compares the Old vs. New Tax Regimes, side-by-side with Section 44ADA (Presumptive Taxation) and the Regular Method.
- **Best Option Recommendation:** Highlights the scenario with the lowest tax liability and recommends the correct ITR form (ITR-3 or ITR-4).
- **Advance Tax Schedule:** Calculates quarterly advance tax installment dues based on the estimated net payable tax.
- **Visual Breakdown:** Uses a dynamic doughnut chart to visualize Take-Home Pay vs. Taxes vs. Business Expenses.
- **Export to PDF:** Allows users to download their calculation report for later reference.
- **Educational Section:** Includes a dedicated "Know About Inputs" page that explains the terminology in plain English.

## Performance Optimizations

This project has been heavily optimized for fast loading and low bandwidth usage:

- **Dynamic Script Loading:** Heavy libraries (`Chart.js` and `html2pdf.js`) are lazy-loaded dynamically *only* when the user triggers the calculation or the PDF export.
- **Minified Assets:** CSS and JavaScript are minified for production to reduce file sizes.
- **Preconnect Headers:** Establishes early connections to external CDNs for faster dynamic script resolution.
- **Caching Configuration:** Includes ready-to-deploy `.htaccess` (Apache) and `vercel.json` (Vercel) configurations to ensure browsers cache static assets effectively.

## Getting Started

This is a static website requiring no build tools or servers to run locally.

### Running Locally

1. Simply clone the repository or download the files.
2. Open `index.html` in your web browser.

### Minifying Assets (Optional)

If you make changes to `styles.css` or `script.js` and want to update the production files (`styles.min.css`, `script.min.js`), you can use the included Python script.

Requirements:

- Python 3.x
- `jsmin` package (`pip install jsmin`)

Run the build script:

```bash
python minify.py
```

## Deployment

You can host this site on any static web host such as GitHub Pages, Vercel, Netlify, or an Apache/Nginx web server.

- **Apache:** The included `.htaccess` file will automatically handle cache headers.
- **Vercel:** The included `vercel.json` file handles cache headers.

## Tech Stack

- HTML5
- Vanilla CSS3
- Vanilla JavaScript
- [Chart.js](https://www.chartjs.org/) (Loaded dynamically)
- [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) (Loaded dynamically)
