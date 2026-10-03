# Art Collection UX Contract

## Product context

- Audience: visitors exploring the Art Institute of Chicago's artwork data.
- Primary jobs: find an artwork, browse a visual gallery, and read its details.
- Locale: English controls; artwork metadata retains API wording and script.
- Accessibility target: WCAG 2.2 AA.
- Source of feature requirements: `README.md` and the user-approved implementation plan.
- Source of data behavior: [Art Institute API documentation](https://api.artic.edu/docs/).
- Visual contract: `DESIGN.md`; runtime tokens live in `src/index.css`.

## Canonical UI map

| Capability | Owner | Behavior |
|---|---|---|
| Search | `CollectionsPage` | 300 ms debounce, clear action, abort stale requests, URL query state. |
| Filter/select | Native `select` in Collections and Gallery | Keyboard-native selection; values stored in URL. |
| Artwork media | `ArtworkImage` | Public-domain IIIF image or accessible placeholder. |
| Loading/empty/error | `StatusPanel` | Stable area, concise explanation, retry or clear action. |
| Scrollbar | `src/index.css` | Global visible document scrollbar. |

## Navigation and data

- `/` redirects to `/collections`; `/gallery` and `/artworks/:id` are specific routes under the Vite base path.
- Collections starts with 20 public-domain image-bearing artworks and loads 20 more per click. Search matches titles and artists across the catalog, also loading 20 per click. Sorting applies to all currently loaded results and places missing values last.
- Gallery starts with 20 artworks and loads 20 more per click. Highlighted artworks appear first, followed by the wider public-domain image-bearing catalog. Type, artist, period, and department filters combine with AND logic; filtered pages fetch matching artworks so each click adds 20 visible works when available.
- A detail URL carries its source view and controls. Previous and Next use that source's displayed order. The Back link restores the source URL, and scroll position is remembered for the session. A direct detail URL without source context has disabled navigation arrows.
- Missing artwork metadata is described plainly. Only public-domain artwork images are displayed; other artworks remain searchable and get an image placeholder.

## Resilience and verification

- API requests have a timeout. Search requests are aborted when replaced, and older responses cannot overwrite newer query state.
- The app never silently replaces failed live API data with mock data. Retry stays near the failed view.
- Verify list search/sort/load-more, combined gallery filters, detail navigation and direct links, API error and missing-media states, keyboard interaction, reduced motion, desktop and mobile layouts, lint, and production build.
