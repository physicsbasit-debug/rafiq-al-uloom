import { execFileSync } from 'node:child_process';

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type AppRole = 'student' | 'teacher' | 'reviewer';
export type AccountStatus = 'pending' | 'active' | 'suspended';

export interface LocalSupabaseEnvironment {
  apiUrl: string;
  restUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
}

export interface AuthIdentity {
  user: User;
  email: string;
  password: string;
  role: AppRole;
  status: AccountStatus;
  client: SupabaseClient;
  accessToken: string;
}

export interface ProfileRecord {
  id: string;
  display_name: string | null;
  role: AppRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

function parseSupabaseEnvironment(output: string): Record<string, string> {
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

        const key = line.slice(0, separator);
        const rawValue = line.slice(separator + 1);
        return [key, rawValue.replace(/^"|"$/g, '')];
      })
  );
}

export function readLocalSupabaseEnvironment(): LocalSupabaseEnvironment {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const env = parseSupabaseEnvironment(output);

  const apiUrl = env.API_URL;
  const restUrl = env.REST_URL ?? (apiUrl ? `${apiUrl.replace(/\/$/, '')}/rest/v1` : undefined);
  const publishableKey = env.PUBLISHABLE_KEY ?? env.ANON_KEY;
  const serviceRoleKey = env.SERVICE_ROLE_KEY;

  if (!apiUrl || !restUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      'Supabase local API_URL, PUBLISHABLE_KEY or ANON_KEY, and SERVICE_ROLE_KEY are unavailable. Run npx supabase start first.'
    );
  }

  return { apiUrl, restUrl, publishableKey, serviceRoleKey };
}

export function createIsolatedSupabaseClient(apiUrl: string, key: string): SupabaseClient {
  return createClient(apiUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function findLocalSupabaseDatabaseContainer(): string {
  const output = execFileSync(
    'docker',
    ['ps', '--filter', 'name=supabase_db_', '--format', '{{.Names}}'],
    { encoding: 'utf8' }
  );
  const container = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!container) {
    throw new Error('Local Supabase database container is not running.');
  }

  return container;
}

export function psqlAdmin(sql: string): string {
  const container = findLocalSupabaseDatabaseContainer();

  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    {
      encoding: 'utf8',
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  ).trim();
}

export class SupabaseAuthFixtures {
  readonly adminClient: SupabaseClient;
  readonly anonymousClient: SupabaseClient;

  private readonly createdUserIds = new Set<string>();
  private readonly runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  constructor(readonly env: LocalSupabaseEnvironment) {
    // This service-role client is administrative only. It must never call signInWithPassword.
    this.adminClient = createIsolatedSupabaseClient(env.apiUrl, env.serviceRoleKey);
    this.anonymousClient = createIsolatedSupabaseClient(env.apiUrl, env.publishableKey);
  }

  async createIdentity(
    label: string,
    role: AppRole = 'student',
    status: AccountStatus = 'pending'
  ): Promise<AuthIdentity> {
    const email = `c2-${label}-${this.runId}@example.com`;
    const password = `Rafiq-C2-${this.runId}-A9!`;
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create ${label} fixture: ${error?.message ?? 'missing user'}`);
    }

    this.createdUserIds.add(data.user.id);

    if (role !== 'student' || status !== 'pending') {
      const { error: updateError } = await this.adminClient
        .from('profiles')
        .update({ role, status })
        .eq('id', data.user.id);

      if (updateError) {
        throw new Error(`Failed to configure ${label} profile: ${updateError.message}`);
      }
    }

    // Every identity gets its own publishable-key client and a real user session.
    const client = createIsolatedSupabaseClient(this.env.apiUrl, this.env.publishableKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      throw new Error(
        `Failed to sign in ${label} fixture: ${signInError?.message ?? 'missing session'}`
      );
    }

    return {
      user: data.user,
      email,
      password,
      role,
      status,
      client,
      accessToken: signInData.session.access_token,
    };
  }

  async readProfile(userId: string): Promise<ProfileRecord> {
    const { data, error } = await this.adminClient
      .from('profiles')
      .select('id, display_name, role, status, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to read profile ${userId}: ${error.message}`);
    }

    return data as ProfileRecord;
  }

  async updateProfile(
    userId: string,
    values: Partial<Pick<ProfileRecord, 'display_name' | 'role' | 'status'>>
  ): Promise<ProfileRecord> {
    const { data, error } = await this.adminClient
      .from('profiles')
      .update(values)
      .eq('id', userId)
      .select('id, display_name, role, status, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to update profile ${userId}: ${error.message}`);
    }

    return data as ProfileRecord;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(`Failed to delete fixture user ${userId}: ${error.message}`);
    }
    this.createdUserIds.delete(userId);
  }

  async cleanup(): Promise<void> {
    const failures: string[] = [];

    for (const userId of [...this.createdUserIds].reverse()) {
      const { error } = await this.adminClient.auth.admin.deleteUser(userId);
      if (error) failures.push(`${userId}: ${error.message}`);
      else this.createdUserIds.delete(userId);
    }

    if (failures.length > 0) {
      throw new Error(`Failed to clean Supabase auth fixtures:\n${failures.join('\n')}`);
    }
  }
}
