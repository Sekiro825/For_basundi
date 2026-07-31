# Graph Report - For_basundi  (2026-07-31)

## Corpus Check
- 59 files · ~9,312,882 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 218 nodes · 239 edges · 16 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `getAdminSupabase()` - 16 edges
2. `run_generation()` - 7 edges
3. `apply_style_1()` - 6 edges
4. `apply_style_3()` - 6 edges
5. `parseEpub()` - 6 edges
6. `makeInstax()` - 5 edges
7. `OneEuroFilter` - 5 edges
8. `playRandomGame()` - 5 edges
9. `getUserRole()` - 4 edges
10. `getAuthor()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `AdminPage()` --calls--> `getAdminSupabase()`  [INFERRED]
  app\admin\page.js → app\lib\supabase.js
- `submitDeliveryAction()` --calls--> `getAdminSupabase()`  [INFERRED]
  app\comfort\actions.js → app\lib\supabase.js
- `saveHighlightAction()` --calls--> `getAdminSupabase()`  [INFERRED]
  app\comfort\actions.js → app\lib\supabase.js
- `getAdminSupabase()` --calls--> `PhotoboothPage()`  [INFERRED]
  app\lib\supabase.js → app\photobooth\page.js
- `getAdminSupabase()` --calls--> `setGiftReveal()`  [INFERRED]
  app\lib\supabase.js → app\surprises\actions.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (16): addAlbumPhoto(), addLoveNote(), verifyAdmin(), AdminPage(), addAlbumPhotoFromUser(), addComment(), getAuthor(), toggleReaction() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (16): apply_style_1(), apply_style_2(), apply_style_3(), crop_center_square(), draw_7segment_digit(), draw_datestamp(), draw_heart(), draw_smiley() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (5): PhotoboothClient(), loadDetector(), silenceMediapipeInfoLogs(), useFaceTracker(), useWebRTCRoom()

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (4): AlbumPage(), getUserRole(), Nav(), PhotoboothPage()

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (3): createKeypointSmoothers(), createOneEuroFilter(), OneEuroFilter

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (5): findMatches(), hasValidMoves(), makeBoard(), shuffle(), shuffleCandies()

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (4): authorName(), prettyName(), PrintCard(), UploadStation()

### Community 8 - "Community 8"
Cohesion: 0.57
Nodes (6): getRole(), markGiftWon(), revealNextGift(), setGiftReveal(), verifyAdmin(), verifyLoggedIn()

### Community 9 - "Community 9"
Cohesion: 0.52
Nodes (6): cleanChapterHtml(), extractWithTar(), main(), parseEpub(), readAllFilesRecursive(), slugify()

### Community 10 - "Community 10"
Cohesion: 0.6
Nodes (5): drawSquareCropped(), ensureFont(), getHumanDate(), loadImage(), makeInstax()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (1): PhotoSelectorHandler

### Community 13 - "Community 13"
Cohesion: 0.73
Nodes (5): applyGravity(), findMatches(), hasValidMoves(), makeBoard(), playRandomGame()

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (3): checkAndResetPhysics(), drawProp(), toPoint()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (2): create_polaroid(), draw_little_heart()

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (2): get_image_info(), main()

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): getBaseFilename(), uploadAndInsert()

## Knowledge Gaps
- **3 isolated node(s):** `Style 1: Romantic Rose-Gold & Doodles`, `Style 2: Retro Vintage Typewriter with Timestamp`, `Style 3: Cyberpunk Neon Stickers & Cyan Washi Tape`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (6 nodes): `PhotoSelectorHandler`, `.do_GET()`, `.do_POST()`, `.translate_path()`, `serve_photos.py`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `create_polaroid()`, `draw_little_heart()`, `parse_date()`, `run_collage.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `get_image_info()`, `main()`, `scan_photos.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `getBaseFilename()`, `upload_custom_list.js`, `uploadAndInsert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAdminSupabase()` connect `Community 0` to `Community 8`, `Community 4`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `PhotoboothPage()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `getAdminSupabase()` (e.g. with `addLoveNote()` and `addAlbumPhoto()`) actually correct?**
  _`getAdminSupabase()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Style 1: Romantic Rose-Gold & Doodles`, `Style 2: Retro Vintage Typewriter with Timestamp`, `Style 3: Cyberpunk Neon Stickers & Cyan Washi Tape` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._