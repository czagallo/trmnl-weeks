# Week Number Plugin for TRMNL

Display the current ISO 8601 week number on your TRMNL e-ink display.

![Plugin Icon](icon.svg)

## Features

- 📅 Shows the current week number (1-53)
- 🗓️ Displays the week date range (Monday - Sunday) and a day strip with today highlighted
- 🕐 Uses the time zone set on your TRMNL account
- 📊 Supports all TRMNL layouts (full, half-vertical, half-horizontal, quadrant)
- 🌍 Uses the ISO 8601 week date standard
- 🔄 Updates automatically with your TRMNL refresh schedule

## What is ISO 8601 Week Numbering?

The ISO 8601 week date system is an international standard where:
- Week 1 is the first week with a Thursday in the new year
- Weeks start on Monday and end on Sunday
- Each year has 52 or 53 weeks
- The week belongs to the year of its Thursday, so Jan 1-3 can be in the previous year's
  last week (Jan 1 2027 is week 53 of 2026) and Dec 29-31 in next year's week 1.
  The plugin shows this ISO week-year, not the calendar year.

This is commonly used in business, planning, and project management worldwide.

## Installation

1. Go to your [TRMNL dashboard](https://usetrmnl.com)
2. Navigate to Plugins
3. Search for "Week Number"
4. Click Install
5. Add to a playlist to display on your device

## Layouts

The plugin adapts to all TRMNL screen layouts:

### Full Screen
Large week number with its week-year, Monday and Sunday dates, a Mon-Sun day strip and a bar showing how far through the year you are

### Half Vertical
Week number and year, Monday and Sunday dates, day strip and year bar

### Half Horizontal
Week number beside stacked date rows and the day strip

### Quadrant
Week number and year; on TRMNL X also the dates and the day strip

All layouts use the TRMNL framework's responsive classes, so type grows on TRMNL X and in portrait.

## Use Cases

- 📊 Track project sprints and milestones
- 📆 Plan quarterly goals and objectives
- 🗓️ Reference week numbers for scheduling
- 📈 Monitor progress in week-based workflows

## Development

```bash
npm install
npm run dev     # http://127.0.0.1:3000, POST /markup
npm test        # unit tests (node --test) + /health smoke test
```

## Deployment

Pushes to `main` are tested (`npm test` runs the unit tests, then starts the server and checks `/health`) and scanned for vulnerable dependencies and committed secrets (Trivy), then
deployed by GitHub Actions (`.github/workflows/deploy.yml`), which runs `deployment/deploy.sh` on the server. The
server connection comes from repository secrets.

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/czagallo/trmnl-weeks/issues).

## License

MIT License - See LICENSE file for details

---

Made with ❤️ for TRMNL
