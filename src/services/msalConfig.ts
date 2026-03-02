import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
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

export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();
}

export const loginRequest = {
  scopes: ['User.Read', 'Mail.Read'],
};
