"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot } from "@inshoreiq/shared/domain";
import { buildApiUrl, getApiBaseUrl } from "@/lib/api-base";
import styles from "../app/page.module.css";

function displaySpecies(value: string): string {
  return value.replaceAll("_", " ");
}

function endpointLabel(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}/${path}` : path;
}

export default function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => buildApiUrl("dashboard"), []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!apiUrl) {
        setError(
          "Set NEXT_PUBLIC_API_BASE_URL to your Azure Functions base URL before using the static site.",
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(apiUrl, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Dashboard request failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as DashboardSnapshot;
        if (!cancelled) {
          setDashboard(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <span className={styles.kicker}>InshoreIQ POC</span>
              <h1>Loading live fishing intelligence...</h1>
              <p className={styles.description}>
                Pulling current Windy and NOAA conditions for the Delacroix cluster.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!dashboard || error) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <span className={styles.kicker}>InshoreIQ POC</span>
              <h1>API configuration needed</h1>
              <p className={styles.description}>
                {error ??
                  "Set NEXT_PUBLIC_API_BASE_URL to the hosted Azure Functions API before deploying to GitHub Pages."}
              </p>
              <div className={styles.noticePanel}>
                <strong>Expected format</strong>
                <code>https://your-function-app.azurewebsites.net/api</code>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const topRecommendation = dashboard.recommendations.recommendations[0];

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.kicker}>InshoreIQ POC</span>
            <h1>Where should I fish right now?</h1>
            <p className={styles.description}>
              A static GitHub Pages frontend backed by Azure Functions, live Windy weather,
              NOAA tides, deterministic scoring, and explanation-ready recommendations.
            </p>
            <div className={styles.environmentGrid}>
              <div className={styles.environmentItem}>
                <span className={styles.environmentLabel}>Window</span>
                <strong>{dashboard.recommendations.environment.label}</strong>
              </div>
              <div className={styles.environmentItem}>
                <span className={styles.environmentLabel}>Wind</span>
                <strong>
                  {dashboard.recommendations.environment.windDirection} at{" "}
                  {dashboard.recommendations.environment.windSpeedMph} mph
                </strong>
              </div>
              <div className={styles.environmentItem}>
                <span className={styles.environmentLabel}>Tide</span>
                <strong>
                  {dashboard.recommendations.environment.tideMovement} /{" "}
                  {dashboard.recommendations.environment.tideStage}
                </strong>
              </div>
              <div className={styles.environmentItem}>
                <span className={styles.environmentLabel}>Water temp</span>
                <strong>{dashboard.recommendations.environment.waterTempF} F</strong>
              </div>
            </div>

            {dashboard.recommendations.environment.dataSources?.length ? (
              <div className={styles.sourceList}>
                <span className={styles.environmentLabel}>Live providers</span>
                <ul>
                  {dashboard.recommendations.environment.dataSources.map((source) => (
                    <li key={`${source.type}-${source.name}`}>
                      <strong>{source.name}</strong>
                      <span>{source.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className={styles.heroCard}>
            <span className={`${styles.badge} ${styles[topRecommendation.confidenceLabel]}`}>
              {topRecommendation.confidenceLabel}
            </span>
            <h2>{topRecommendation.zoneName}</h2>
            <p>{topRecommendation.explanation ?? topRecommendation.reason}</p>
            <dl className={styles.heroStats}>
              <div>
                <dt>Species</dt>
                <dd>{displaySpecies(topRecommendation.species)}</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>
                  {topRecommendation.depthFeet.min}-{topRecommendation.depthFeet.max} ft
                </dd>
              </div>
              <div>
                <dt>Lure</dt>
                <dd>{topRecommendation.recommendedLure}</dd>
              </div>
              <div>
                <dt>Explanation</dt>
                <dd>{topRecommendation.explanationSource ?? "template"}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.kicker}>Top 5 spots</span>
              <h2>Recommended launch plan</h2>
            </div>
            <p className={styles.sectionCopy}>
              Live weather and tides now drive the same deterministic PRD weighting model.
            </p>
          </div>

          <div className={styles.recommendationGrid}>
            {dashboard.recommendations.recommendations.map((recommendation) => (
              <article
                key={`${recommendation.zoneId}-${recommendation.species}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.rank}>#{recommendation.rank}</span>
                    <h3>{recommendation.zoneName}</h3>
                    <p>
                      {recommendation.bodyOfWater} · {recommendation.structureType}
                    </p>
                  </div>
                  <span className={`${styles.badge} ${styles[recommendation.confidenceLabel]}`}>
                    {recommendation.score}
                  </span>
                </div>

                <div className={styles.recommendationMeta}>
                  <span>{displaySpecies(recommendation.species)}</span>
                  <span>
                    {recommendation.depthFeet.min}-{recommendation.depthFeet.max} ft
                  </span>
                  <span>{recommendation.recommendedLure}</span>
                </div>

                <p className={styles.cardCopy}>
                  {recommendation.explanation ?? recommendation.reason}
                </p>
                <span className={styles.explanationTag}>
                  explanation: {recommendation.explanationSource ?? "template"}
                </span>

                <div className={styles.breakdownGrid}>
                  <div>
                    <span>Tide</span>
                    <strong>{recommendation.breakdown.tide}</strong>
                  </div>
                  <div>
                    <span>Wind</span>
                    <strong>{recommendation.breakdown.wind}</strong>
                  </div>
                  <div>
                    <span>Structure</span>
                    <strong>{recommendation.breakdown.structure}</strong>
                  </div>
                  <div>
                    <span>Depth</span>
                    <strong>{recommendation.breakdown.depth}</strong>
                  </div>
                  <div>
                    <span>Season</span>
                    <strong>{recommendation.breakdown.season}</strong>
                  </div>
                  <div>
                    <span>Solunar</span>
                    <strong>{recommendation.breakdown.solunar}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.doubleColumn}>
          <article className={styles.card}>
            <div className={styles.sectionHeaderCompact}>
              <div>
                <span className={styles.kicker}>Opportunity map</span>
                <h2>Pilot water heat map</h2>
              </div>
              <p className={styles.sectionCopy}>
                Colors represent each zone&apos;s strongest species opportunity under current
                live conditions.
              </p>
            </div>

            <div className={styles.mapCanvas}>
              <div className={styles.mapWatermark}>Breton Sound pilot</div>
              {dashboard.mapOverlay.features.map((feature) => (
                <div
                  key={feature.zoneId}
                  className={`${styles.mapSpot} ${styles[feature.rating]}`}
                  style={{ left: `${feature.mapX}%`, top: `${feature.mapY}%` }}
                >
                  <strong>{feature.zoneName}</strong>
                  <span>{displaySpecies(feature.species)}</span>
                  <em>{feature.score}</em>
                </div>
              ))}
            </div>

            <div className={styles.legend}>
              <span>
                <i className={`${styles.legendSwatch} ${styles.excellent}`} />
                excellent
              </span>
              <span>
                <i className={`${styles.legendSwatch} ${styles.good}`} />
                good
              </span>
              <span>
                <i className={`${styles.legendSwatch} ${styles.fair}`} />
                fair
              </span>
              <span>
                <i className={`${styles.legendSwatch} ${styles.poor}`} />
                poor
              </span>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.sectionHeaderCompact}>
              <div>
                <span className={styles.kicker}>Fishing windows</span>
                <h2>Hourly confidence</h2>
              </div>
              <p className={styles.sectionCopy}>
                Best window: {dashboard.windows.bestWindow.timeLabel} at{" "}
                {dashboard.windows.bestWindow.score}.
              </p>
            </div>

            <div className={styles.windowList}>
              {dashboard.windows.windows.map((window) => (
                <div key={window.timeLabel} className={styles.windowRow}>
                  <div>
                    <strong>{window.timeLabel}</strong>
                    <span>
                      {window.recommendedZone} · {displaySpecies(window.recommendedSpecies)}
                    </span>
                  </div>
                  <div className={styles.windowScore}>
                    <span className={`${styles.badge} ${styles[window.rating]}`}>
                      {window.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.kicker}>Backend contract</span>
              <h2>Azure Functions API surfaces</h2>
            </div>
            <p className={styles.sectionCopy}>
              The GitHub Pages frontend now talks directly to the hosted Functions API.
            </p>
          </div>

          <div className={styles.endpointGrid}>
            <div className={styles.endpointCard}>
              <code>{endpointLabel("dashboard")}</code>
              <p>Current opportunity snapshot with explanations and telemetry headers.</p>
            </div>
            <div className={styles.endpointCard}>
              <code>{endpointLabel("recommendations")}</code>
              <p>Top spot recommendations with deterministic and AI-ready explanations.</p>
            </div>
            <div className={styles.endpointCard}>
              <code>{endpointLabel("map")}</code>
              <p>Zone-level map overlay data with opportunity colors and live scores.</p>
            </div>
            <div className={styles.endpointCard}>
              <code>{endpointLabel("windows")}</code>
              <p>Hourly forecast windows ranked from live environmental inputs.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

