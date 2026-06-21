# InshoreIQ – Product Requirements Document (PRD)

## Louisiana Inshore Fishing Intelligence Platform

### Version 0.1 – Proof of Concept (POC)

---

# Executive Summary

## Vision

Build the first AI-powered inshore fishing intelligence platform that recommends where anglers should fish based on real-time environmental conditions, fishing knowledge, and underwater terrain data.

The goal is not to provide data.

The goal is to provide decisions.

Instead of forcing anglers to analyze weather, tides, wind, depth contours, fishing reports, and local knowledge independently, InshoreIQ will synthesize these signals into actionable recommendations.

Example:

> "Tomorrow at 6:30 AM, fish the east shoreline of Lake Campo near Delacroix in 4–6 feet of water using live shrimp under a cork. Incoming tide and southeast wind are pushing bait against the shoreline. Confidence: 88%."

---

# Problem Statement

Current fishing applications provide:

* Weather
* Tide data
* Navigation charts
* Sonar
* Community reports

None answer:

> "Where should I fish right now?"

Anglers spend significant time:

* Checking weather
* Checking tides
* Studying Navionics
* Watching YouTube
* Reading fishing forums
* Calling friends

The process is fragmented and highly dependent on experience.

InshoreIQ will become a fishing decision engine.

---

# POC Scope

## Geographic Coverage

### Primary Pilot Areas

Louisiana

* Delacroix
* Hopedale
* Shell Beach
* Reggio
* Lake Campo
* Bay Eloi
* Bay Gardene
* Black Bay

### Secondary Pilot Areas

Louisiana

* Cocodrie
* Dulac
* Lake Mechant
* Timbalier Area

Mississippi

* Biloxi Marsh
* Bay St. Louis
* Pass Christian

---

# Target Users

## Primary User

Experienced Inshore Angler

Characteristics:

* Owns boat
* Uses Navionics
* Understands tides
* Wants better decisions

Pain Points:

* Too many variables
* Limited time on water
* Fuel costs
* Missed opportunities

---

## Secondary User

Weekend Angler

Characteristics:

* Limited fishing knowledge
* Limited local knowledge
* Wants confidence

Pain Points:

* Doesn't know where to start
* Doesn't understand patterns
* Overwhelmed by information

---

# Species Supported

POC Scope

## Speckled Trout

Focus Areas:

* Reefs
* Points
* Current breaks
* Bayou bends
* Deep holes
* Shorelines

---

## Redfish

Focus Areas:

* Marsh drains
* Shorelines
* Points
* Grass edges
* Shallow flats

---

# Success Criteria

POC Goal

User opens app and receives:

* Best fishing locations
* Recommended fishing depth
* Recommended structure
* Best time windows
* Recommended presentation

Within 30 seconds.

---

# Core Product Features

## Feature 1 – Fishing Opportunity Engine

Purpose:

Convert environmental conditions into location recommendations.

Inputs:

* Wind direction
* Wind speed
* Tide stage
* Tide movement
* Time of day
* Season
* Water temperature
* Recent weather

Outputs:

* Recommended fishing zones
* Fishing confidence score
* Recommended structure
* Recommended depth

Example:

Location:
Lake Campo East Shore

Confidence:
92

Depth:
4–6 feet

Reason:
Incoming tide pushing bait against wind-protected shoreline.

---

## Feature 2 – Fishing Opportunity Map

Interactive map showing:

Green

Excellent fishing opportunity

Yellow

Average fishing opportunity

Red

Poor opportunity

Map overlays:

* Marsh
* Shorelines
* Reefs
* Channels
* Bayous
* Contours

---

## Feature 3 – Smart Spot Recommendations

User presses:

"Where Should I Fish?"

Returns:

Top 5 locations.

Each recommendation includes:

* Location
* Coordinates
* Confidence score
* Recommended depth
* Species suitability
* Recommended lure

---

## Feature 4 – Fishing Window Predictor

Calculates:

Best fishing periods based on:

* Tide movement
* Sunrise
* Sunset
* Moon phase
* Solunar periods

Outputs:

Excellent

Good

Fair

Poor

Hourly forecast.

---

## Feature 5 – Fishing Pattern Explanation

Every recommendation must include reasoning.

Example:

"Strong incoming tide combined with southeast wind is concentrating bait near the oyster shoreline. Speckled trout commonly stage in 4–6 feet of water under these conditions."

---

# Knowledge Engine

## Fishing Intelligence Database

Stores structured observations.

Example:

Species:
Speckled Trout

Condition:
Incoming Tide

Structure:
Oyster Reef

Depth:
5 Feet

Season:
Summer

Confidence:
High

Source:
Expert Observation

---

# Initial Knowledge Sources

## YouTube

Potential Sources

* Marsh Man Masson
* Captain Devin LaFont
* Local Louisiana Guides
* Delacroix-focused channels

---

## Forums

Potential Sources

* Louisiana Sportsman
* Tidalfish
* Regional Facebook groups

---

## Articles

* Fishing reports
* Guide reports
* Magazine content
* NOAA references

---

# Mapping Strategy

## Phase 1

Public Bathymetry

Sources:

* NOAA Bathymetric Data
* USACE Surveys
* Public GIS Layers

Purpose:

Avoid Navionics licensing requirements during POC.

---

## Phase 2

Evaluate Garmin/Navionics licensing.

Potential capability:

* Contour analysis
* Drop-offs
* Deep holes
* Ledges

---

# Environmental Data Sources

## Weather

Candidate APIs

* NOAA
* OpenWeather
* WeatherAPI

Data Needed

* Wind direction
* Wind speed
* Temperature
* Pressure
* Cloud cover

---

## Tides

Candidate APIs

* NOAA Tides and Currents

Data Needed

* Tide height
* Tide movement
* Tide timing

---

## Solunar

Data Needed

* Moon phase
* Major periods
* Minor periods

---

# Scoring Engine

## Fishing Opportunity Score

Range:

0–100

Factors:

| Factor          | Weight |
| --------------- | ------ |
| Tide            | 25%    |
| Wind            | 20%    |
| Structure Match | 20%    |
| Depth Match     | 15%    |
| Season          | 10%    |
| Solunar         | 10%    |

---

# User Workflow

## Scenario

User launches app.

System automatically:

1. Detects current location
2. Loads current weather
3. Loads tide information
4. Calculates fishing score
5. Highlights recommended locations

User selects location.

System displays:

* Why it was recommended
* Recommended species
* Recommended depth
* Recommended lure
* Recommended time

---

# Technical Architecture

## Frontend

Preferred

React Native

Platforms

* iPhone
* Android
* iPad
* Tablet

Web

Next.js

---

## Backend

Azure Functions

Responsibilities:

* Weather retrieval
* Tide retrieval
* Scoring calculations
* Recommendation generation

---

## Database

PostgreSQL + PostGIS

Stores:

* Fishing locations
* Depth zones
* Structure data
* Fishing observations
* User catches

---

## AI Services

Azure OpenAI

Uses:

* Knowledge extraction
* Recommendation explanation
* Future fishing copilot

---

# Future Features

## User Catch Logging

Record:

* Species
* Weight
* Length
* Location
* Conditions

Purpose:

Train recommendation engine.

---

## Fishing Copilot

User asks:

"Where should I fish tomorrow in Delacroix?"

Copilot returns:

* Launch recommendation
* Route
* Locations
* Techniques
* Confidence

---

## Community Intelligence

Aggregate:

* Catch reports
* User observations
* Local patterns

---

# POC Deliverables

## Deliverable 1

Environmental Data Platform

Weather + Tide ingestion.

---

## Deliverable 2

Fishing Scoring Engine

Rule-based recommendation system.

---

## Deliverable 3

Interactive Fishing Map

Pilot geography only.

---

## Deliverable 4

Top 5 Recommended Spots

Dynamic recommendations.

---

## Deliverable 5

Explanation Engine

Human-readable reasoning.

---

# POC Success Metrics

Target:

* 100+ pilot users
* 500+ fishing sessions
* Recommendation click-through >50%
* User satisfaction >80%
* Demonstrated improvement over manual planning

---

# Long-Term Vision

Create the leading Gulf Coast fishing intelligence platform that transforms decades of fishing knowledge, environmental science, and real-time conditions into a personalized fishing copilot capable of telling anglers:

"When, where, how, and why to fish."
