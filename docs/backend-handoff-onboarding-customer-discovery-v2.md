# Backend Handoff: Customer Discovery Onboarding V2

## Objective

Replace the legacy beta-segmentation payload with the customer-discovery questionnaire now implemented on the frontend. The API must store each answer as a first-class field so responses can be filtered and exported without parsing packed text.

Keep the public route:

```http
POST /api/v1/onboarding/responses
```

## Request Contract

```json
{
  "profile": "solana_developer",
  "realExperience": ["built_simple_project", "rust_experience"],
  "preferredFormats": ["guided_modules", "research_labs"],
  "blockchainSecurityProfile": "solana_security_beginner",
  "securityLearningAttempt": "active",
  "studyTechniques": ["official_docs", "writeups_or_case_studies"],
  "difficultAreas": ["vulnerability_identification", "exploit_reproduction"],
  "hardestPracticeStep": "Turning an audit report into a reproducible exploit.",
  "practiceSignals": ["execute_exploit", "see_state_changes"],
  "securityRelevance": 5,
  "problemIntensity": 4,
  "problemIntensityReason": "I do not have a reliable practice path.",
  "betaIntent": "try_this_week",
  "contact": "builder@example.com",
  "source": "landing_onboarding",
  "utmSource": null,
  "utmMedium": null,
  "utmCampaign": null
}
```

## Enumerations

### `profile`

- `solana_developer`
- `web3_developer_new_to_solana`
- `backend_or_rust_developer`
- `student_or_junior_builder`
- `security_researcher_or_auditor`
- `community_bootcamp_or_team`

### `realExperience`

- `not_built_anything`
- `built_simple_project`
- `worked_anchor_or_solana_programs`
- `rust_experience`
- `joined_hackathons`
- `contributed_real_projects`

`not_built_anything` must be mutually exclusive with every other value.

### `securityLearningAttempt`

- `active`
- `lightly`
- `tried_and_stopped`
- `interested_not_started`
- `not_priority`

### `blockchainSecurityProfile`

- `no_security_background`
- `web2_security_basics`
- `web3_security_basics`
- `solana_security_beginner`
- `ctf_or_audit_learning`
- `professional_auditor_researcher`

### `studyTechniques`

- `official_docs`
- `small_projects`
- `videos_or_workshops`
- `ai_assisted`
- `writeups_or_case_studies`
- `ctfs_or_challenges`
- `mentor_or_peer_feedback`

### `difficultAreas`

- `solana_account_model`
- `rust_or_anchor`
- `svm_runtime`
- `vulnerability_identification`
- `exploit_reproduction`
- `cpi_signers_authority`
- `impact_or_reporting`

### `preferredFormats`

- `guided_modules`
- `research_labs`
- `audit_environments`
- `scored_challenges`
- `mentor_feedback`
- `final_report_or_certificate`

### `practiceSignals`

- `execute_exploit`
- `see_state_changes`
- `validation_checks`
- `real_cases`
- `feedback_or_explanation`
- `final_report`

### `betaIntent`

- `try_this_week`
- `try_later`
- `maybe`
- `not_now`

## Validation

- All enum fields and arrays are required and must contain supported values.
- Multi-select arrays must contain at least one unique value.
- `hardestPracticeStep`: trimmed length 10-600.
- `securityRelevance`: integer from 1 through 5.
- `problemIntensity`: integer from 1 through 5.
- `problemIntensityReason`: nullable, trimmed maximum 240.
- `contact`: required when `betaIntent` is `try_this_week`, `try_later`, or `maybe`; nullable when it is `not_now`; maximum 320.
- Preserve the current public rate limit and string sanitization.
- Do not infer or require a contact channel. The field may contain email, Telegram, or X.

## Persistence

Add first-class columns for the fields above. Use JSON/JSONB arrays if the current database supports them; otherwise use a normalized child table. Do not store the new answers inside `additional_notes` or `future_labs_interest` after migration.

Retain the existing lifecycle fields:

- `id`
- `status`
- `source`
- UTM fields
- `created_at`
- `updated_at`
- privacy-safe IP hash and request metadata already used by the endpoint

Existing legacy rows must remain readable. A nullable `schema_version` with new submissions set to `2` is sufficient if a full data backfill is not useful.

## Admin Queries

Update `GET /api/v1/onboarding/responses` with filters for:

- `profile`
- `blockchainSecurityProfile`
- `securityLearningAttempt`
- `difficultArea`
- `preferredFormat`
- `securityRelevanceMin`
- `securityRelevanceMax`
- `problemIntensityMin`
- `problemIntensityMax`
- `betaIntent`
- `status`
- date range, limit, and offset

Update the CSV export so array fields are joined with `;` and each v2 answer has its own column.

## Analytics

Keep `onboarding_response_submitted`. Add only non-PII dimensions:

- `schemaVersion: 2`
- `profile`
- `blockchainSecurityProfile`
- `securityLearningAttempt`
- `securityRelevance`
- `problemIntensity`
- `betaIntent`
- counts for multi-select fields

Do not include `contact`, `hardestPracticeStep`, or `problemIntensityReason` in analytics properties.

## Compatibility And Cutover

The frontend currently maps the v2 answers into the legacy request contract so the deployed form remains operational. Once this contract is deployed:

1. Confirm the v2 request against the deployed endpoint.
2. Replace the compatibility serializer in `app/components/onboarding-questionnaire-model.ts` with the direct v2 payload.
3. Remove the legacy field mappings and packed metadata.

## Acceptance Tests

- A complete interested response with contact returns `200`.
- `not_now` succeeds without contact.
- Interested responses without contact return `422`.
- Unsupported enum values return `422`.
- Empty arrays and contradictory exclusive options return `422`.
- Problem intensity outside 1-5 returns `422`.
- Long-form limits are enforced after trimming.
- Admin filters return only matching rows.
- CSV contains one column per v2 field and semicolon-joined arrays.
- Rate limiting and authorization behavior remain unchanged.
