# Architecture — Adaptive Workout App
# Version: 1.0
# =============================================================
# Defines how the system is built.
# Claude Code reads this before making technical decisions.
# =============================================================

## Model Registry
reasoning-model: claude-sonnet-4-6
summarization-model: claude-haiku-4-5-20251001
review-model: claude-opus-4-6

## Tech Stack
Platform: React Native / Expo SDK 55
Language: TypeScript strict mode
Navigation: Expo Router
State management: zustand
Local storage: SQLite+SQLCipher
Audio: expo-speech + expo-audio.
Testing: Jest / jest-expo / testing-library/react-native

## AI Layer
Reasoning tasks (plan generation, adaptation): reasoning-model
Summarization (session summaries): summarization-model
Code review: review-model

All AI calls must follow the pattern in the ai-layer agent.
Fallback for plan generation: return last known plan.
Fallback for summarization: skip, use raw data.

## Data Flow
[Describe how data moves: user action → state → AI call → UI update]

## Feature Flags
New flags default to false always.
Naming: FEATURE_SCREAMING_SNAKE_CASE
