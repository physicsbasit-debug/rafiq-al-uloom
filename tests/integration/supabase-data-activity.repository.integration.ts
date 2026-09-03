import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

function readLocalSupabaseEnvironment(): Record<string, string> {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 1) {
          throw new Error(`Invalid Supabase environment line: ${line}`);
        }
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, '')];
      })
  );
}

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Phase 5-4B Supabase Data Activity parity', () => {
  it('يطابق getDataActivitiesByLesson بين Supabase وLocal', async () => {
    const env = readLocalSupabaseEnvironment();
    const apiUrl = env.API_URL;
    const serviceRoleKey = env.SERVICE_ROLE_KEY;

    if (!apiUrl || !serviceRoleKey) {
      throw new Error('Supabase local API_URL/SERVICE_ROLE_KEY are unavailable.');
    }

    const client = createClient(apiUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const repository = createSupabaseContentRepository(client);
    const lessonId = 'g10-phy-waves-l2';

    const remote = await repository.getDataActivitiesByLesson(lessonId);
    const local = await asyncLocalContentRepository.getDataActivitiesByLesson(lessonId);

    expect(remote).toEqual(local);
    expect(remote).toHaveLength(1);
    expect(remote[0]?.objectiveIds).toEqual(['l2-o2']);
    expect(remote[0]?.config.engineKind).toBe('data_graph_v1');
    expect(remote[0]?.status).toBe('approved');
  }, 30_000);
});
