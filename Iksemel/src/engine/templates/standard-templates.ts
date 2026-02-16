/**
 * Built-in standard templates for the XFEB broadcast domain.
 *
 * These templates provide out-of-the-box report configurations matching
 * common broadcast workflows: scheduling, EPG delivery, rights management,
 * compliance reporting, and commercial break analysis.
 */

import type { TemplateSpec } from "./types";

// ─── Daily Schedule ────────────────────────────────────────────────────

const dailySchedule: TemplateSpec = {
  schemaVersion: "1.0",
  id: "tpl-daily-schedule",
  name: "Daily Schedule",
  description:
    "Standard daily broadcast schedule showing programme titles, time slots, " +
    "channels, and genres. Grouped by channel for easy per-channel review.",
  category: "schedule",
  tags: ["schedule", "daily", "channel", "programme", "time-slot"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  author: "XFEB",
  thumbnail: "Grid view of daily programme schedule grouped by channel",

  config: {
    fieldPatterns: [
      "Programme/Title",
      "Slot/StartTime",
      "Slot/EndTime",
      "Channel/Name",
      "Programme/Genre",
    ],
    columns: [
      { xpath: "Programme/Title", header: "Programme Title", format: "text", align: "left", width: 220 },
      { xpath: "Slot/StartTime", header: "Start Time", format: "datetime", align: "center", width: 140 },
      { xpath: "Slot/EndTime", header: "End Time", format: "datetime", align: "center", width: 140 },
      { xpath: "Channel/Name", header: "Channel", format: "text", align: "left", width: 160 },
      { xpath: "Programme/Genre", header: "Genre", format: "text", align: "left", width: 120 },
    ],
    format: "xlsx",
    rowSource: "//Slot",
    stylePreset: "corporate",
    styleOverrides: {},
    groupBy: "Channel/Name",
    sortBy: null,
    metadata: {
      name: "Daily Schedule",
      description: "Daily broadcast schedule report",
      category: "Schedule",
      tags: ["schedule", "daily"],
    },
  },
};

// ─── EPG Delivery ──────────────────────────────────────────────────────

const epgDelivery: TemplateSpec = {
  schemaVersion: "1.0",
  id: "tpl-epg-delivery",
  name: "EPG Delivery",
  description:
    "Electronic Programme Guide delivery format with titles, synopses, " +
    "broadcast times, ratings, and language metadata. Designed for EPG " +
    "ingest systems.",
  category: "epg",
  tags: ["epg", "programme-guide", "synopsis", "rating", "language"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  author: "XFEB",
  thumbnail: "Listing of EPG entries with synopsis and broadcast metadata",

  config: {
    fieldPatterns: [
      "Title",
      "Synopsis",
      "StartTime",
      "EndTime",
      "Rating",
      "Language",
    ],
    columns: [
      { xpath: "Title", header: "Title", format: "text", align: "left", width: 200 },
      { xpath: "Synopsis", header: "Synopsis", format: "text", align: "left", width: 300 },
      { xpath: "StartTime", header: "Start", format: "datetime", align: "center", width: 140 },
      { xpath: "EndTime", header: "End", format: "datetime", align: "center", width: 140 },
      { xpath: "Rating", header: "Rating", format: "text", align: "center", width: 80 },
      { xpath: "Language", header: "Language", format: "text", align: "center", width: 100 },
    ],
    format: "html",
    rowSource: "//Programme",
    stylePreset: "clean",
    styleOverrides: {},
    groupBy: null,
    sortBy: null,
    metadata: {
      name: "EPG Delivery",
      description: "Electronic Programme Guide delivery export",
      category: "EPG",
      tags: ["epg", "delivery"],
    },
  },
};

// ─── Rights Overview ───────────────────────────────────────────────────

const rightsOverview: TemplateSpec = {
  schemaVersion: "1.0",
  id: "tpl-rights-overview",
  name: "Rights Overview",
  description:
    "Comprehensive rights management overview showing programme titles, " +
    "rights holders, territories, licence windows, and licence types. " +
    "Grouped by rights holder for contract review.",
  category: "rights",
  tags: ["rights", "licence", "territory", "rights-holder", "contract"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  author: "XFEB",
  thumbnail: "Rights table grouped by rights holder with licence windows",

  config: {
    fieldPatterns: [
      "Programme/Title",
      "RightsHolder",
      "Territory",
      "StartDate",
      "EndDate",
      "LicenseType",
    ],
    columns: [
      { xpath: "Programme/Title", header: "Programme Title", format: "text", align: "left", width: 200 },
      { xpath: "RightsHolder", header: "Rights Holder", format: "text", align: "left", width: 180 },
      { xpath: "Territory", header: "Territory", format: "text", align: "left", width: 120 },
      { xpath: "StartDate", header: "Start Date", format: "date", align: "center", width: 120 },
      { xpath: "EndDate", header: "End Date", format: "date", align: "center", width: 120 },
      { xpath: "LicenseType", header: "Licence Type", format: "text", align: "left", width: 140 },
    ],
    format: "xlsx",
    rowSource: "//Rights",
    stylePreset: "modern",
    styleOverrides: {},
    groupBy: "RightsHolder",
    sortBy: null,
    metadata: {
      name: "Rights Overview",
      description: "Rights and licensing overview report",
      category: "Rights",
      tags: ["rights", "licence"],
    },
  },
};

// ─── Compliance Report ─────────────────────────────────────────────────

const complianceReport: TemplateSpec = {
  schemaVersion: "1.0",
  id: "tpl-compliance-report",
  name: "Compliance Report",
  description:
    "Regulatory compliance report listing channels, programme titles, " +
    "content ratings, warnings, and broadcast dates. Sorted by broadcast " +
    "date descending for recent-first review.",
  category: "compliance",
  tags: ["compliance", "rating", "content-warnings", "regulatory", "broadcast"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  author: "XFEB",
  thumbnail: "Compliance table sorted by broadcast date with ratings and warnings",

  config: {
    fieldPatterns: [
      "Channel",
      "Programme/Title",
      "Rating",
      "ContentWarnings",
      "BroadcastDate",
    ],
    columns: [
      { xpath: "Channel", header: "Channel", format: "text", align: "left", width: 160 },
      { xpath: "Programme/Title", header: "Programme Title", format: "text", align: "left", width: 200 },
      { xpath: "Rating", header: "Rating", format: "text", align: "center", width: 80 },
      { xpath: "ContentWarnings", header: "Content Warnings", format: "text", align: "left", width: 200 },
      { xpath: "BroadcastDate", header: "Broadcast Date", format: "date", align: "center", width: 130 },
    ],
    format: "word",
    rowSource: "//Broadcast",
    stylePreset: "corporate",
    styleOverrides: {},
    groupBy: null,
    sortBy: { field: "BroadcastDate", dir: "desc" },
    metadata: {
      name: "Compliance Report",
      description: "Regulatory compliance report",
      category: "Compliance",
      tags: ["compliance", "regulatory"],
    },
  },
};

// ─── Commercial Breaks ─────────────────────────────────────────────────

const commercialBreaks: TemplateSpec = {
  schemaVersion: "1.0",
  id: "tpl-commercial-breaks",
  name: "Commercial Breaks",
  description:
    "Commercial break analysis showing break positions, durations, " +
    "advertiser details, and individual spot information. Grouped by " +
    "break position for scheduling review.",
  category: "commercial",
  tags: ["commercial", "break", "advertiser", "spot", "scheduling"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  author: "XFEB",
  thumbnail: "Commercial break listing grouped by break position with spot details",

  config: {
    fieldPatterns: [
      "BreakPosition",
      "BreakDuration",
      "Advertiser",
      "SpotTitle",
      "SpotDuration",
    ],
    columns: [
      { xpath: "BreakPosition", header: "Break Position", format: "text", align: "center", width: 130 },
      { xpath: "BreakDuration", header: "Break Duration", format: "number", align: "center", width: 130 },
      { xpath: "Advertiser", header: "Advertiser", format: "text", align: "left", width: 180 },
      { xpath: "SpotTitle", header: "Spot Title", format: "text", align: "left", width: 200 },
      { xpath: "SpotDuration", header: "Spot Duration", format: "number", align: "center", width: 120 },
    ],
    format: "csv",
    rowSource: "//Spot",
    stylePreset: "broadcast",
    styleOverrides: {},
    groupBy: "BreakPosition",
    sortBy: null,
    metadata: {
      name: "Commercial Breaks",
      description: "Commercial break and spot analysis",
      category: "Commercial",
      tags: ["commercial", "spots"],
    },
  },
};

// ─── Exported Collection ───────────────────────────────────────────────

/**
 * All built-in standard templates, ready to be loaded into a TemplateStore.
 */
export const STANDARD_TEMPLATES: readonly TemplateSpec[] = [
  dailySchedule,
  epgDelivery,
  rightsOverview,
  complianceReport,
  commercialBreaks,
] as const;
