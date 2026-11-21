# Week Number Plugin for TRMNL

Display the current ISO 8601 week number on your TRMNL e-ink display.

![Plugin Icon](icon.svg)

## Features

- 📅 Shows the current week number (1-53)
- 🗓️ Displays the week date range (Monday - Sunday)
- 📊 Supports all TRMNL layouts (full, half-vertical, half-horizontal, quadrant)
- 🌍 Uses the ISO 8601 week date standard
- 🔄 Updates automatically with your TRMNL refresh schedule

## What is ISO 8601 Week Numbering?

The ISO 8601 week date system is an international standard where:
- Week 1 is the first week with a Thursday in the new year
- Weeks start on Monday and end on Sunday
- Each year has 52 or 53 weeks

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
Large week number with year and date range

### Half Vertical
Week number with year (perfect for mashups)

### Half Horizontal
Compact week display

### Quadrant
Minimal week number for multi-plugin layouts

## Use Cases

- 📊 Track project sprints and milestones
- 📆 Plan quarterly goals and objectives
- 🗓️ Reference week numbers for scheduling
- 📈 Monitor progress in week-based workflows

## Deployment

Pushes to `main` are tested (`npm test` starts the server and checks `/health`) and scanned for vulnerable dependencies and committed secrets (Trivy), then
deployed by GitHub Actions (`.github/workflows/deploy.yml`), which runs `deployment/deploy.sh` on the server. The
server connection comes from repository secrets.

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/czagallo/trmnl-weeks/issues).

## License

MIT License - See LICENSE file for details

---

Made with ❤️ for TRMNL
