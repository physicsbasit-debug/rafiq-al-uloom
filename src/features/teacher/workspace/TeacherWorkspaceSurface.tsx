import { useMemo } from 'react';

import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import { GatewayAiAuthoringProvider } from '@services/ai-authoring';
import { getCurrentAccessToken } from '@services/auth/auth.service';

function resolveAiGatewayUrl(baseUrl: string | undefined): string {
  const normalized = baseUrl?.trim().replace(/\/+$/, '') ?? '';
  return normalized ? `${normalized}/functions/v1/ai-authoring-gateway` : '';
}

export default function TeacherWorkspaceSurface() {
  const aiProvider = useMemo(
    () =>
      new GatewayAiAuthoringProvider({
        gatewayUrl: resolveAiGatewayUrl(import.meta.env.VITE_SUPABASE_URL),
        publicApiKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        getAccessToken: getCurrentAccessToken,
      }),
    []
  );

  return <TeacherWorkspace aiProvider={aiProvider} />;
}
