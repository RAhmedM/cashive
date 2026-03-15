"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import BeeLoader from "./BeeLoader";
import { ProgressBar } from "./SharedComponents";
import { api } from "@/lib/api";

// ─── Types & Constants ──────────────────────────────────────────

interface SurveyProfile {
  id: string;
  userId: string;
  age: number | null;
  gender: string | null;
  education: string | null;
  employmentStatus: string | null;
  incomeRange: string | null;
  householdSize: number | null;
  hasChildren: boolean | null;
  maritalStatus: string | null;
  industry: string | null;
  interests: string[];
  completionPct: number;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EDUCATION_OPTIONS = [
  { value: "high_school", label: "High School" },
  { value: "some_college", label: "Some College" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "employed_full", label: "Full-time" },
  { value: "employed_part", label: "Part-time" },
  { value: "self_employed", label: "Self-employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
];

const INCOME_OPTIONS = [
  { value: "under_25k", label: "Under $25,000" },
  { value: "25k_50k", label: "$25,000 - $50,000" },
  { value: "50k_75k", label: "$50,000 - $75,000" },
  { value: "75k_100k", label: "$75,000 - $100,000" },
  { value: "100k_150k", label: "$100,000 - $150,000" },
  { value: "over_150k", label: "Over $150,000" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const INTEREST_OPTIONS = [
  "Technology",
  "Gaming",
  "Sports",
  "Music",
  "Movies & TV",
  "Cooking",
  "Travel",
  "Fitness",
  "Fashion",
  "Finance",
  "Education",
  "Health & Wellness",
  "Pets & Animals",
  "Automotive",
  "Home & Garden",
  "Parenting",
  "Art & Design",
  "Science",
  "Politics",
  "Books & Reading",
];

const STEPS = [
  { id: "demographics", title: "Demographics", description: "Basic info about you" },
  { id: "work", title: "Work & Income", description: "Employment and finances" },
  { id: "household", title: "Household", description: "Home and family details" },
  { id: "interests", title: "Interests", description: "What you care about" },
];

// ─── Sub-components ─────────────────────────────────────────────

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-primary">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-xl border border-border bg-bg-deepest px-4 py-3 text-sm text-text-primary outline-none transition-all focus:border-accent-gold focus:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-primary">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : parseInt(v, 10));
        }}
        className="w-full rounded-xl border border-border bg-bg-deepest px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent-gold focus:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]"
      />
    </label>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-text-primary">{label}</span>
      {description && <span className="block text-xs text-text-tertiary">{description}</span>}
      <div className="flex gap-2">
        {[
          { val: true, label: "Yes" },
          { val: false, label: "No" },
        ].map((opt) => (
          <button
            key={String(opt.val)}
            type="button"
            onClick={() => onChange(opt.val)}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              value === opt.val
                ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                : "border-border bg-bg-deepest text-text-secondary hover:border-accent-gold/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InterestsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (interest: string) => {
    if (value.includes(interest)) {
      onChange(value.filter((i) => i !== interest));
    } else {
      onChange([...value, interest]);
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-text-primary">
        Select your interests <span className="text-text-tertiary font-normal">({value.length} selected)</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((interest) => {
          const selected = value.includes(interest);
          return (
            <button
              key={interest}
              type="button"
              onClick={() => toggle(interest)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                selected
                  ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                  : "border-border bg-bg-deepest text-text-secondary hover:border-accent-gold/30 hover:text-text-primary"
              }`}
            >
              {selected && <Check className="inline w-3 h-3 mr-1" />}
              {interest}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Modal Component ───────────────────────────────────────

interface SurveyProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (completionPct: number) => void;
}

export default function SurveyProfileModal({
  open,
  onClose,
  onSaved,
}: SurveyProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  // Form state
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null);
  const [incomeRange, setIncomeRange] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState<number | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [maritalStatus, setMaritalStatus] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [completionPct, setCompletionPct] = useState(0);

  // Load profile on open
  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setStep(0);
    setError(null);
    setLoading(true);

    api
      .get<{ profile: SurveyProfile }>("/api/user/me/survey-profile")
      .then(({ profile }) => {
        setAge(profile.age);
        setGender(profile.gender);
        setEducation(profile.education);
        setEmploymentStatus(profile.employmentStatus);
        setIncomeRange(profile.incomeRange);
        setHouseholdSize(profile.householdSize);
        setHasChildren(profile.hasChildren);
        setMaritalStatus(profile.maritalStatus);
        setIndustry(profile.industry);
        setInterests(profile.interests ?? []);
        setCompletionPct(profile.completionPct);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [open]);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.patch<{ profile: SurveyProfile }>(
        "/api/user/me/survey-profile",
        {
          age,
          gender,
          education,
          employmentStatus,
          incomeRange,
          householdSize,
          hasChildren,
          maritalStatus,
          industry,
          interests,
        }
      );
      setCompletionPct(result.profile.completionPct);
      onSaved?.(result.profile.completionPct);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [
    age, gender, education, employmentStatus, incomeRange,
    householdSize, hasChildren, maritalStatus, industry, interests, onSaved,
  ]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-text-primary">
                Survey Profile
              </h2>
              <p className="text-xs text-text-secondary">
                Complete your profile to qualify for more surveys
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Completion bar */}
          <div className="px-5 pt-4">
            <ProgressBar value={completionPct} max={100} showLabel animated />
          </div>

          {/* Step indicator */}
          {!saved && (
            <div className="flex gap-1 px-5 pt-3">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex-1 rounded-lg px-2 py-2 text-center transition-all ${
                    i === step
                      ? "bg-accent-gold/10 border border-accent-gold/30"
                      : "border border-transparent hover:bg-bg-elevated"
                  }`}
                >
                  <span
                    className={`block text-xs font-semibold ${
                      i === step ? "text-accent-gold" : "text-text-tertiary"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <BeeLoader size="sm" label="Loading profile..." />
              </div>
            ) : saved ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h3 className="font-heading text-lg font-bold text-text-primary mb-1">
                  Profile Saved!
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Your profile is {completionPct}% complete.
                  {completionPct < 100
                    ? " Fill in remaining fields to qualify for more surveys."
                    : " You're all set to receive the best survey matches."}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-accent-gold px-6 py-2.5 text-sm font-semibold text-bg-deepest hover:bg-accent-gold-hover transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {error && (
                  <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                )}

                {/* Step 0: Demographics */}
                {step === 0 && (
                  <>
                    <NumberField
                      label="Age"
                      value={age}
                      min={18}
                      max={120}
                      onChange={setAge}
                      placeholder="Enter your age"
                    />
                    <SelectField
                      label="Gender"
                      value={gender}
                      options={GENDER_OPTIONS}
                      onChange={setGender}
                    />
                    <SelectField
                      label="Education"
                      value={education}
                      options={EDUCATION_OPTIONS}
                      onChange={setEducation}
                    />
                  </>
                )}

                {/* Step 1: Work & Income */}
                {step === 1 && (
                  <>
                    <SelectField
                      label="Employment Status"
                      value={employmentStatus}
                      options={EMPLOYMENT_OPTIONS}
                      onChange={setEmploymentStatus}
                    />
                    <SelectField
                      label="Income Range"
                      value={incomeRange}
                      options={INCOME_OPTIONS}
                      onChange={setIncomeRange}
                    />
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-text-primary">
                        Industry
                      </span>
                      <input
                        type="text"
                        value={industry ?? ""}
                        maxLength={100}
                        placeholder="e.g. Technology, Healthcare, Finance..."
                        onChange={(e) =>
                          setIndustry(e.target.value || null)
                        }
                        className="w-full rounded-xl border border-border bg-bg-deepest px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent-gold focus:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]"
                      />
                    </label>
                  </>
                )}

                {/* Step 2: Household */}
                {step === 2 && (
                  <>
                    <SelectField
                      label="Marital Status"
                      value={maritalStatus}
                      options={MARITAL_OPTIONS}
                      onChange={setMaritalStatus}
                    />
                    <NumberField
                      label="Household Size"
                      value={householdSize}
                      min={1}
                      max={20}
                      onChange={setHouseholdSize}
                      placeholder="Number of people in household"
                    />
                    <ToggleField
                      label="Do you have children?"
                      value={hasChildren}
                      onChange={setHasChildren}
                    />
                  </>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                  <InterestsField value={interests} onChange={setInterests} />
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !saved && (
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-2">
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    className="flex items-center gap-1 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest hover:bg-accent-gold-hover transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg bg-accent-gold px-5 py-2 text-sm font-semibold text-bg-deepest hover:bg-accent-gold-hover transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg-deepest border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
