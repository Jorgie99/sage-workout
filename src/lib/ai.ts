// Optional "Ask Claude for a review". Runs only when the user has saved their
// own Anthropic API key in Settings. The request goes straight from this
// device to api.anthropic.com — there is no server in between.
//
// The SDK is loaded on demand so it adds nothing to the app's start-up.

import type { Suggestion } from './coach';
import type { ExerciseMap } from './exercises';
import { MUSCLE_LABEL, PATTERN_LABEL } from './exercises';
import type { Profile, Routine } from './types';
import { toDisplayWeight } from './units';

export interface AiSuggestion {
  what: string;
  why: string;
  fix: string;
}

export class AiReviewError extends Error {}

const SYSTEM = `You are a calm, encouraging strength coach reviewing someone's weekly resistance-training routines inside a workout app. Their goal is full-body "toning": building muscle everywhere with sensible weekly volume.

You are given their profile, their routines, and the findings of the app's built-in rule checks (which are based on ACSM and NSCA guidance and peer-reviewed meta-analyses).

Give 2 to 5 short suggestions that add something beyond the built-in findings — exercise choice, ordering, how the routines fit together across the week, progression, or anything the rules missed. Do not simply repeat a built-in finding. If the plan is already solid, say so in one suggestion and offer one or two small refinements.

Rules:
- Be specific to these routines; name exercises.
- Stay within mainstream, evidence-based training advice. No diet, supplement or medical advice, and no spot-reduction claims.
- Tone: warm, direct, never preachy.
- "what" is one short sentence stating the observation. "why" is one sentence with the reason. "fix" is one short, concrete action.`;

const SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          what: { type: 'string' },
          why: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['what', 'why', 'fix'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const;

/** The plain-data summary sent to the model. Exported so it can be shown / tested. */
export function buildReviewPayload(
  routines: Routine[],
  profile: Profile,
  exercises: ExerciseMap,
  ruleFindings: Record<string, Suggestion[]>,
) {
  const unit = profile.weightUnit;
  return {
    profile: {
      sex: profile.sex === 'na' ? 'not given' : profile.sex,
      experience: profile.experience ?? 'not given',
      bodyWeight: profile.weightKg != null ? `${toDisplayWeight(profile.weightKg, unit)} ${unit}` : 'not given',
      heightCm: profile.heightCm != null ? Math.round(profile.heightCm) : 'not given',
    },
    goal: 'full-body toning (build muscle, moderate reps)',
    routines: routines.map((r) => ({
      name: r.name,
      timesPerWeek: r.timesPerWeek,
      exercises: r.items.map((item) => {
        const e = exercises[item.exerciseId];
        return {
          name: e?.name ?? 'Unknown exercise',
          pattern: e ? PATTERN_LABEL[e.pattern] : undefined,
          primaryMuscles: e?.primary.map((m) => MUSCLE_LABEL[m]),
          type: e ? (e.compound ? 'compound' : 'isolation') : undefined,
          sets: item.sets.map((s) => ({
            [e?.timed ? 'seconds' : 'reps']: s.reps,
            weight: s.weightKg != null ? `${toDisplayWeight(s.weightKg, unit)} ${unit}` : 'not set',
          })),
          note: item.note || undefined,
        };
      }),
      builtInFindings: (ruleFindings[r.id] ?? []).map((s) => ({ what: s.what, suggestedFix: s.fix?.label })),
    })),
  };
}

export async function requestReview(opts: {
  apiKey: string;
  model: string;
  routines: Routine[];
  profile: Profile;
  exercises: ExerciseMap;
  ruleFindings: Record<string, Suggestion[]>;
}): Promise<AiSuggestion[]> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // dangerouslyAllowBrowser sends the `anthropic-dangerous-direct-browser-access: true`
  // header. That is safe here only because the key is the user's own and never
  // leaves their device except in this request.
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  const payload = buildReviewPayload(opts.routines, opts.profile, opts.exercises, opts.ruleFindings);

  try {
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `Here is my training plan as JSON:\n\n${JSON.stringify(payload, null, 2)}` }],
    });

    if (response.stop_reason === 'refusal') {
      throw new AiReviewError('Claude declined to review this. Try again, or rely on the built-in coach.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new AiReviewError('The reply was cut off. Please try again.');
    }
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    return parseSuggestions(text);
  } catch (err) {
    if (err instanceof AiReviewError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiReviewError('That API key was not accepted. Check it in Settings.');
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      throw new AiReviewError('This API key does not have access to that model.');
    }
    if (err instanceof Anthropic.NotFoundError) {
      throw new AiReviewError(`The model "${opts.model}" was not found. Check the model ID in Settings.`);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiReviewError('Rate limited by Anthropic. Wait a moment and try again.');
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new AiReviewError(`Anthropic rejected the request: ${err.message}`);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AiReviewError('Could not reach Anthropic. You may be offline — the built-in coach still works.');
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiReviewError(`Anthropic returned an error (${err.status ?? 'unknown'}). Try again shortly.`);
    }
    throw new AiReviewError('Something went wrong asking Claude. Please try again.');
  }
}

export function parseSuggestions(text: string): AiSuggestion[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AiReviewError('Claude replied in an unexpected format. Please try again.');
  }
  const list = (data as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) throw new AiReviewError('Claude replied in an unexpected format. Please try again.');
  return list
    .filter((s): s is AiSuggestion => !!s && typeof s.what === 'string' && typeof s.why === 'string' && typeof s.fix === 'string')
    .slice(0, 6);
}
