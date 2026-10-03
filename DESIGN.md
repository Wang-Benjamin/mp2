---
version: alpha
name: "Art Collection — Chicago"
description: "A quiet digital gallery inspired by museum exhibition labels and the Art Institute collection."
colors:
  paper: "#f5f7f5"
  white: "#ffffff"
  ink: "#192523"
  muted: "#66736f"
  line: "#dde4e0"
  primary: "#3e665c"
  primary-dark: "#284f45"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
  body:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
omitted:
  - section: rounded
    reason: "Most surfaces have square edges; only the mark and arrow controls are circular."
  - section: spacing
    reason: "Responsive spacing is defined with CSS clamp values in src/App.css."
components:
  artworkList: {}
  artworkGallery: {}
  artworkDetail: {}
  search: {}
  filterSelect: {}
---

# Art Collection — Chicago Design System

## Overview

The interface borrows its hierarchy from a museum gallery: artworks command the space, while labels, fine rules, and restrained controls help visitors orient themselves. It serves people exploring art on desktop and mobile. The variable-height image wall is the signature; all surrounding UI remains quiet and consistent.

The product uses English UI copy and displays artwork titles and artist names exactly as the API provides them. The app supports one light theme. The colors and type roles above are mirrored by CSS custom properties in `src/index.css`; component geometry and responsive rules live in `src/App.css`.

## Colors

Paper and white separate the page from controls without heavy cards. Ink is primary text, muted is secondary text, and line marks boundaries. Green identifies active navigation, actions, and focus. Empty media surfaces use a subdued green-gray so missing images do not compete with artworks.

## Typography

Newsreader carries titles and gallery captions. Source Sans 3 carries controls, descriptions, and metadata. Uppercase tracking is reserved for short museum-style labels. Artwork titles remain in their original casing and can wrap naturally.

## Layout

The page has a 1660px maximum width and responsive side insets. Collection rows keep the image left and text right; their metadata wraps on narrow screens. The gallery uses CSS columns so every image keeps its natural aspect ratio. Detail pages use two columns on desktop and stack the image over information below 760px. Width and height image attributes reserve space before media loads.

## Elevation & Depth

Borders and surface tones provide most hierarchy. Shadows are limited to the displayed detail image and side navigation arrows. Gallery cards do not use raised containers.

## Shapes

Inputs, cards, and buttons are square edged. The brand mark, loading indicator, and detail side arrows are circular exceptions. Line strokes stay fine and quiet.

## Components

Search and filter fields have clear labels, visible focus, and stable dimensions. A search clear button appears whenever text is present. Artwork rows and gallery images use native links with hover and focus feedback. Loading, empty, and error states occupy reserved space with concise recovery actions. Motion is limited to short color, lift, and image-scale transitions; reduced-motion preferences remove them.

## Do's and Don'ts

- Do preserve artwork proportions and the API's title and artist text.
- Do keep the same visual language for Back, filters, and navigation across views.
- Don't crop gallery art into a uniform tile ratio.
- Don't add decorative text or effects that compete with the collection.
