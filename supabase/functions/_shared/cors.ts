const allowedOrigins = [
  'https://annndhnueddd.lovable.app',
  'https://id-preview--efebed19-58d0-45e0-8177-e563cd837af5.lovable.app',
  'https://efebed19-58d0-45e0-8177-e563cd837af5.lovableproject.com',
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') || '';
  const isLovablePreview =
    !!origin && (origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com'));
  const allowedOrigin =
    origin && (allowedOrigins.includes(origin) || isLovablePreview) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

// Keep backward compatibility
export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins[0],
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

