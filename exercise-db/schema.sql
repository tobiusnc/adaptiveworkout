-- Exercise Definition Database Schema
-- Standalone reference database — not part of the app's runtime storage.
-- Standard SQL; compatible with SQLite (local dev) and PostgreSQL (production).

CREATE TABLE IF NOT EXISTS exercise_definition (
  id                    TEXT PRIMARY KEY NOT NULL,
  name                  TEXT NOT NULL UNIQUE,
  aliases               TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings

  -- Human-facing content (NOT sent to AI — tags carry all AI-relevant info)
  instructions          TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings; rendered as bullet list
  form_cues             TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings; displayed during execution
  youtube_search_query  TEXT NOT NULL DEFAULT '',

  -- Future media
  media_url             TEXT,
  media_thumbnail_url   TEXT,

  -- Tags (terse, AI-facing)
  movement              TEXT NOT NULL DEFAULT '[]',       -- e.g. ["push_h"]
  primary_muscles       TEXT NOT NULL DEFAULT '[]',       -- e.g. ["chest","triceps","delt_a"]
  secondary_muscles     TEXT NOT NULL DEFAULT '[]',       -- e.g. ["core"]
  equipment             TEXT NOT NULL DEFAULT '[]',       -- e.g. ["band"]; ["bw"] for bodyweight
  body_position         TEXT NOT NULL DEFAULT '[]',       -- e.g. ["prone"]
  joint_stress          TEXT NOT NULL DEFAULT '[]',       -- e.g. ["shoulder","wrist"]
  category              TEXT NOT NULL DEFAULT '[]',       -- e.g. ["str"]
  plane                 TEXT NOT NULL DEFAULT '[]',       -- e.g. ["sag"]
  anchor_point          TEXT NOT NULL DEFAULT '[]',       -- e.g. ["anchor_high"]; [] if none

  -- Numeric attributes
  difficulty            INTEGER NOT NULL DEFAULT 1,       -- 1-5
  complexity            INTEGER NOT NULL DEFAULT 1,       -- 1-5 (skill/coordination, independent of difficulty)
  hr_impact             INTEGER NOT NULL DEFAULT 3,       -- 1-5 (1=significantly lowers, 3=maintains, 5=significantly raises)
  space_overhead        INTEGER NOT NULL DEFAULT 1,       -- 1-3 (1=none/seated, 2=arms raised, 3=jumping/overhead press)
  space_horizontal      INTEGER NOT NULL DEFAULT 1,       -- 1-3 (1=stationary, 2=small area, 3=lunges/sprawls)
  grip_demand           INTEGER NOT NULL DEFAULT 1,       -- 1-3 (1=none, 2=moderate, 3=grip-intensive)
  noise_level           INTEGER NOT NULL DEFAULT 1,       -- 1-3 (1=silent, 2=moderate, 3=loud/impact)

  -- Defaults for plan generation
  default_step_type     TEXT NOT NULL DEFAULT 'rep',      -- 'timed' or 'rep'
  typical_duration_range TEXT,                             -- JSON tuple [min, max] in seconds; null if rep-based
  typical_rep_range     TEXT,                              -- JSON tuple [min, max]; null if timed

  -- Flags
  is_unilateral         INTEGER NOT NULL DEFAULT 0,
  is_compound           INTEGER NOT NULL DEFAULT 0,
  has_jumping           INTEGER NOT NULL DEFAULT 0,
  stretch_loaded        INTEGER NOT NULL DEFAULT 0,
  weightable            INTEGER NOT NULL DEFAULT 0,

  -- Relationship hints (exercise names, not IDs — flexible, not FK constraints)
  substitutes           TEXT NOT NULL DEFAULT '[]',       -- JSON array of exercise names
  progressions          TEXT NOT NULL DEFAULT '[]',       -- harder exercises, ordered easiest-to-hardest
  regressions           TEXT NOT NULL DEFAULT '[]',       -- easier exercises, ordered hardest-to-easiest

  -- Metadata
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_variant (
  id                      TEXT PRIMARY KEY NOT NULL,
  exercise_definition_id  TEXT NOT NULL,
  name                    TEXT NOT NULL,
  cue_override            TEXT,
  FOREIGN KEY (exercise_definition_id) REFERENCES exercise_definition(id) ON DELETE CASCADE
);

-- Index for the join key from app Exercise.name → exercise_definition.name
CREATE INDEX IF NOT EXISTS idx_exercise_definition_name ON exercise_definition(name);
