import type {
  DashboardSnapshot,
  EnvironmentalSnapshot,
  ExplanationSource,
  Recommendation,
  RecommendationsResponse,
} from "../../../shared/domain";

const DEFAULT_AZURE_OPENAI_API_VERSION = "2024-10-21";

function sanitizeText(value: string): string {
  return value.replace(/```json|```/gi, "").trim();
}

function templateExplanation(
  recommendation: Recommendation,
  environment: EnvironmentalSnapshot,
): string {
  return `${recommendation.zoneName} sets up well because ${environment.tideMovement} tide, ${environment.windDirection} wind, and ${recommendation.structureType} habitat line up for ${recommendation.species.replace(
    "_",
    " ",
  )}. Focus on ${recommendation.depthFeet.min}-${recommendation.depthFeet.max} feet with ${recommendation.recommendedLure.toLowerCase()}, especially during ${environment.timeOfDay}.`;
}

function withTemplateExplanations(
  recommendations: Recommendation[],
  environment: EnvironmentalSnapshot,
): Recommendation[] {
  return recommendations.map((recommendation) => ({
    ...recommendation,
    explanation: templateExplanation(recommendation, environment),
    explanationSource: "template" satisfies ExplanationSource,
  }));
}

function azureOpenAiConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT,
  );
}

async function generateAzureOpenAiExplanations(
  recommendations: Recommendation[],
  environment: EnvironmentalSnapshot,
): Promise<Map<string, string>> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_AZURE_OPENAI_API_VERSION;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Azure OpenAI explanation settings are incomplete.");
  }

  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  const url = `${normalizedEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const promptPayload = recommendations.map((recommendation) => ({
    key: `${recommendation.zoneId}:${recommendation.species}`,
    zoneName: recommendation.zoneName,
    species: recommendation.species,
    score: recommendation.score,
    structuredReason: recommendation.reason,
    tideMovement: environment.tideMovement,
    windDirection: environment.windDirection,
    windSpeedMph: environment.windSpeedMph,
    timeOfDay: environment.timeOfDay,
    recommendedLure: recommendation.recommendedLure,
    depthFeet: recommendation.depthFeet,
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You rewrite structured fishing recommendation reasons into concise, confident guidance. Return strict JSON only.",
        },
        {
          role: "user",
          content: `Rewrite these fishing spot explanations as a JSON array with { "key": string, "explanation": string }. Keep each explanation under 45 words and do not change the recommendation itself.\n${JSON.stringify(
            promptPayload,
          )}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI explanation request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Azure OpenAI explanation response was empty.");
  }

  const parsed = JSON.parse(sanitizeText(content)) as {
    explanations?: Array<{ key: string; explanation: string }>;
  };
  const entries = Array.isArray(parsed.explanations) ? parsed.explanations : [];

  return new Map(entries.map((entry) => [entry.key, entry.explanation]));
}

export async function enrichRecommendationsWithExplanations(
  recommendations: Recommendation[],
  environment: EnvironmentalSnapshot,
): Promise<Recommendation[]> {
  const templated = withTemplateExplanations(recommendations, environment);

  if (!azureOpenAiConfigured()) {
    return templated;
  }

  try {
    const aiExplanations = await generateAzureOpenAiExplanations(templated, environment);
    return templated.map((recommendation) => {
      const key = `${recommendation.zoneId}:${recommendation.species}`;
      const aiExplanation = aiExplanations.get(key);

      return aiExplanation
        ? {
            ...recommendation,
            explanation: aiExplanation,
            explanationSource: "azure-openai" satisfies ExplanationSource,
          }
        : recommendation;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown explanation error.";
    console.warn(`[explanations] Falling back to template explanations: ${message}`);
    return templated;
  }
}

export async function enrichRecommendationsResponse(
  response: RecommendationsResponse,
): Promise<RecommendationsResponse> {
  return {
    ...response,
    recommendations: await enrichRecommendationsWithExplanations(
      response.recommendations,
      response.environment,
    ),
  };
}

export async function enrichDashboardSnapshot(
  snapshot: DashboardSnapshot,
): Promise<DashboardSnapshot> {
  const recommendations = await enrichRecommendationsWithExplanations(
    snapshot.recommendations.recommendations,
    snapshot.recommendations.environment,
  );

  return {
    ...snapshot,
    recommendations: {
      ...snapshot.recommendations,
      recommendations,
    },
  };
}

