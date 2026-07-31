# Fix UI Consistency, Lyric Scrolling, and Progress Bar Issues

The goal is to resolve the regressions introduced in the previous refactor:
1.  **Progress Bar**: Fix the "cannot drag" issue by decoupling the slider value from the audio playback during user interaction.
2.  **Lyric Scrolling**: Ensure the active lyric is perfectly centered vertically using a more reliable scrolling calculation and CSS layout.
3.  **UI Consistency**: Refine the visual style to be more professional, cohesive, and less "noisy", while keeping the "Strawberry Music" identity.

## Proposed Changes

### [Component] [PlayerBar.vue](file:///D:/dev/project/chrelyonly-music-system-view/src/views/playList/components/PlayerBar.vue)
-   Implement local `isDragging` state to prevent incoming `currentTime` props from fighting user dragging.
-   Use `v-model` with a local shadow variable for the slider.
-   Refine the slider and control button styles for a cleaner look.

### [Component] [LyricPanel.vue](file:///D:/dev/project/chrelyonly-music-system-view/src/views/playList/components/LyricPanel.vue)
-   Adjust `.lyrics-scroll` padding to use fixed viewport units (`vh`) for reliable centering of first/last lines.
-   Ensure `.lyrics-scroll` is `position: relative` for correct `offsetTop` measurements.
-   Refine the active lyric transition and shadow effects.

### [Component] [AlbumPanel.vue](file:///D:/dev/project/chrelyonly-music-system-view/src/views/playList/components/AlbumPanel.vue)
-   Simplify the record player and cover art styling for a more elegant appearance.

### [Component] [PlayerDrawer.vue](file:///D:/dev/project/chrelyonly-music-system-view/src/views/playList/components/PlayerDrawer.vue)
-   Update colors and spacing to match the refined theme.

### [View] [playList.vue](file:///D:/dev/project/chrelyonly-music-system-view/src/views/playList/playList.vue)
-   Ensure event handlers are correctly wired up to the updated components.
-   Polish the background blurred layer for better contrast.

## Verification Plan

### Automated Tests
-   N/A (UI-centric changes)

### Manual Verification
-   **Progress Bar**: Drag the slider while a song is playing and ensure the knob follows the mouse smoothly and seeks the audio correctly upon release.
-   **Lyric Scrolling**: Observe multiple songs and verify the active lyric stays in the vertical center of the panel.
-   **UI Review**: Check both desktop and mobile layouts for visual consistency and professional feel.
