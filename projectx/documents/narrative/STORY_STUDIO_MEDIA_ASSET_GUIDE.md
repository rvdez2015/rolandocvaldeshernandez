# Story Studio Media Asset Guide

## Purpose

Story Studio Sprint 1.1 adds a media asset loader so generated NotebookLM audio, video tours, and infographics can be inserted into Project X without rewriting the page.

## Folder Structure

```text
projectx/assets/story-studio/
  audio/
    project-x-story.mp3
  video/
    project-x-story.mp4
  infographics/
    project-x-architecture.png
  transcripts/
    project-x-story-transcript.md
```

## How to Add Media

1. Generate the audio, video, or infographic.
2. Rename it using the registered filename.
3. Place it in the matching folder.
4. Commit and push to GitHub.
5. Hard refresh the Story Studio page.

## Registered General Story Assets

| Asset | Path |
|---|---|
| Audio | `projectx/assets/story-studio/audio/project-x-story.mp3` |
| Video | `projectx/assets/story-studio/video/project-x-story.mp4` |
| Infographic | `projectx/assets/story-studio/infographics/project-x-architecture.png` |

## Media Registry

The registry is stored in:

```text
projectx/data/story-studio/stories.json
```

Each story may define `audio`, `video`, `infographic`, and `transcript` assets. Story Studio checks whether each file exists and displays either the media player or a clear placeholder.
