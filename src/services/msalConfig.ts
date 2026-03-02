import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID || '').trim();
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID || 'common').trim();

export const isOutlookConfigured = clientId.length > 0;

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message) => {
        if (_level === LogLevel.Error) console.error('[MSAL]', message);
      },
    },
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export async function initializeMsal(): Promise<boolean> {
  await msalInstance.initialize();
  const result = await msalInstance.handleRedirectPromise();
  return result !== null;
}

export const loginRequest = {
  scopes: ['User.Read', 'Mail.Read'],
};
