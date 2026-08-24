---
version: alpha
name: "Frequency-Based Extraction"
description: "Design tokens extracted from frequency analysis without LLM interpretation."
colors:
  text: "#ffffff"
  text-2: "#959595"
  text-3: "#a8a8a8"
  text-4: "#1d9bf0"
  text-5: "#0a0a0a"
  text-6: "#293c5b"
  local-accent: "#373737"
  local-accent-2: "#080808"
  local-accent-3: "#000000"
  local-accent-4: "#121212"
typography:
  type-1:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
  type-2:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: "500"
    lineHeight: "24px"
  type-3:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "14px"
  type-4:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "18px"
  type-5:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "18px"
rounded:
  radius-1: "12px"
  radius-2: "7px"
  radius-3: "33px"
  radius-4: "2px"
  radius-5: "50px"
spacing:
  space-1: "15px"
  space-2: "20px"
  space-3: "5px"
  space-4: "10px"
  space-5: "40px"
  space-6: "8px"
  space-7: "150px"
  space-8: "24px"
  space-9: "50px"
  space-10: "2px"
---

## Overview

Design tokens extracted from frequency analysis without LLM interpretation.

**Signature traits:**

- Evidence was insufficient to extract distinctive signature traits for this system.

## Colors

The palette uses 10 validated color tokens across 1 theme profile. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

### Text Scale

- **Text** (#ffffff): Frequency rank #1 (860 occurrences); token importance textCandidate: repeated text-role usage (854 hits). Role: text. {authored: rgb(255, 255, 255), space: rgb, alpha: 0}
- **Text-2** (#959595): Frequency rank #2 (200 occurrences); token importance textCandidate: repeated text-role usage (200 hits). Role: text. {authored: rgb(149, 149, 149), space: rgb}
- **Text-3** (#a8a8a8): Frequency rank #3 (74 occurrences); token importance textCandidate: repeated text-role usage (74 hits). Role: text. {authored: rgb(168, 168, 168), space: rgb}
- **Text-4** (#1d9bf0): Frequency rank #4 (42 occurrences); token importance textCandidate: repeated text-role usage (42 hits). Role: text. {authored: rgb(29, 155, 240), space: rgb}
- **Text-5** (#0a0a0a): Frequency rank #5 (25 occurrences); token importance textCandidate: repeated text-role usage (25 hits). Role: text. {authored: rgb(10, 10, 10), space: rgb}
- **Text-6** (#293c5b): Frequency rank #9 (6 occurrences); token importance textCandidate: repeated text-role usage (6 hits). Role: text. {authored: rgb(41, 60, 91), space: rgb}

### Interactive

- **Local-accent** (#373737): Frequency rank #6 (15 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(55, 55, 55), space: rgb}
- **Local-accent-2** (#080808): Frequency rank #7 (14 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(8, 8, 8), space: rgb}
- **Local-accent-3** (#000000): Frequency rank #8 (12 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(0, 0, 0), space: rgb}
- **Local-accent-4** (#121212): Frequency rank #10 (5 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(18, 18, 18), space: rgb}

## Typography

Typography uses Inter across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Uses Inter throughout for a uniform feel. Weight range spans regular, medium. Sizes range from 12px to 16px.

### Type Scale Evidence

| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frequency rank #1 | Inter | 16px | 400 | 24px | normal | Inter, Inter Fallback | Extracted token |
| Frequency rank #2 | Inter | 16px | 500 | 24px | normal | Inter, Inter Fallback | Extracted token |
| Frequency rank #3 | Inter | 12px | 500 | 14px | normal | Inter, Inter Fallback | Extracted token |
| Frequency rank #4 | Inter | 14px | 500 | 18px | normal | Inter, Inter Fallback | Extracted token |
| Frequency rank #5 | Inter | 14px | 400 | 18px | normal | Inter, Inter Fallback | Extracted token |

## Layout

Layout rhythm is inferred from spacing tokens and responsive breakpoint evidence.

### Spacing System

| Token    | Value | Px  | Notes                   |
| -------- | ----- | --- | ----------------------- |
| space-10 | 2px   | 2   | Extracted spacing token |
| space-3  | 5px   | 5   | Extracted spacing token |
| space-6  | 8px   | 8   | Extracted spacing token |
| space-4  | 10px  | 10  | Extracted spacing token |
| space-1  | 15px  | 15  | Extracted spacing token |
| space-2  | 20px  | 20  | Extracted spacing token |
| space-8  | 24px  | 24  | Extracted spacing token |
| space-5  | 40px  | 40  | Extracted spacing token |
| space-9  | 50px  | 50  | Extracted spacing token |
| space-7  | 150px | 150 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence

| Shadow Token | Layers | Details                     |
| ------------ | ------ | --------------------------- |
| n/a          | 0      | No validated shadow payload |

### Interaction Signals

| Theme | Signal | Evidence |
| --- | --- | --- |
| Light | backdrop-filter | blur(12px) ; blur(16px) |
| Light | outline-color | rgb(255, 255, 255) ; rgb(149, 149, 149) ; rgba(0, 0, 0, 0) |
| Light | outline-width | 3px ; 0px |
| Light | outline-offset | 0px |
| Light | transform | matrix(1, 0, 0, 1, 0, 5) ; matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 1, 0, -125.18) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles

| Token    | Value | Px  | Role Mapping         |
| -------- | ----- | --- | -------------------- |
| radius-4 | 2px   | 2   | Hairline corner      |
| radius-2 | 7px   | 7   | Control corner       |
| radius-1 | 12px  | 12  | Control corner       |
| radius-3 | 33px  | 33  | Large surface corner |
| radius-5 | 50px  | 50  | Large surface corner |

### Geometry Evidence

| Radius Token | Shape | Units |
| ------------ | ----- | ----- |
| radius-1     | 12px  | px    |
| radius-2     | 7px   | px    |
| radius-3     | 33px  | px    |
| radius-4     | 2px   | px    |
| radius-5     | 50px  | px    |

## Components

(none detected)

## Do's and Don'ts

Guardrails tie generation choices back to validated tokens, component patterns, and evidence-backed hierarchy.

| Do | Don't |
| --- | --- |
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints

| Name         | Width    | Key Changes                                |
| ------------ | -------- | ------------------------------------------ |
| Mobile       | <= 352px | (max-width: 352px)                         |
| Mobile       | <= 425px | (max-width: 425px)                         |
| Mobile       | <= 440px | (max-width: 440px)                         |
| Mobile       | <= 480px | (max-width: 480px)                         |
| Mobile       | <= 576px | (max-width: 576px)                         |
| Breakpoint 6 | <= 768px | (max-width: 768px)                         |
| Breakpoint 7 | <= 960px | (max-width: 960px)                         |
| Mobile       | >= 576px | (min-width: 576px) and (max-height: 660px) |
| Breakpoint 9 | Unknown  | (max-height: 480px)                        |

## Agent Prompt Guide

### Example Component Prompts

- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide

1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
